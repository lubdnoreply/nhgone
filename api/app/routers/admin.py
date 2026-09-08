import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from app.config import settings, get_supabase_client
from app.services.encryption import encryption_service
from app.services.email_service import (
    email_service, WELCOME_TEMPLATE_KEY, ST_FILES_DAILY_TEMPLATE_KEY,
    INTERNAL_WELCOME_TEMPLATE_KEY, PASSWORD_RESET_TEMPLATE_KEY,
    GOOGLE_SIGNIN_NOTICE_TEMPLATE_KEY, APPROVED_TEMPLATE_KEY,
    RR4_TM30_DAILY_TEMPLATE_KEY, ST_COMPARE_TEMPLATE_KEY, RR4_COMPARE_TEMPLATE_KEY,
)
from app.services.sync_service import sync_service
from app.services import compare_mail, ftp_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

class UserCreateRequest(BaseModel):
    email: str
    role: str = "User"
    full_name: str = ""
    # "google" (default) - a random, never-shown password is generated purely
    # so the Supabase Auth row exists; the user signs in via Google OAuth,
    # which Supabase links to this account by email. "internal" - for users
    # without a Google account on this email (e.g. a shared/contractor
    # address): a real password is generated and emailed to them directly,
    # for the login page's "Internal Auth" email/password form.
    auth_method: str = "google"
    # The requesting admin's own email, supplied by the frontend rather than
    # derived server-side - this app has no session/JWT verification on the
    # backend (every role_permissions gate is client-side only, same as
    # everywhere else here), so there is no server-trusted "current user" to
    # read. Left blank for the self-register/approve paths, which create a
    # profile without any admin acting on it.
    created_by: str = ""

class SelfRegisterRequest(BaseModel):
    id: str
    email: str
    full_name: str = ""

class ApproveUserRequest(BaseModel):
    role: str

class SyncScheduleUpdate(BaseModel):
    sync_hour: int
    sync_minute: int
    sync_enabled: bool

class PropertyApiSettingsUpdate(BaseModel):
    property_name: str
    client_name: str
    client_token: str
    access_token: str
    # Per-property code used in the legacy pipe-delimited ST statistics
    # export (field 17) - e.g. "SM" for Lub d Bangkok Siam. Not sensitive,
    # so it isn't in encryption.py's SENSITIVE_FIELDS.
    st_property_code: Optional[str] = None
    # Comma-separated MEWS resource category types this property's ST report
    # counts, mirroring its own export schedule's "Space types" filter (e.g.
    # "Room,Bed" for most, "Room,Suite" for Koh Tao / Marasca Samui). Blank
    # falls back to Room,Bed - see sync_service._resolve_st_space_types.
    st_space_types: Optional[str] = None
    # The property's real registered Thai name for RR4/TM30 filings - see
    # sync_service._resolve_rr4_property_thai_name. Blank falls back to the
    # hardcoded _RR4_PROPERTY_THAI_NAMES/_RR3_PROPERTY_THAI_NAMES chain.
    rr4_property_thai_name: Optional[str] = None

class SyncRetrySettingsUpdate(BaseModel):
    retry_count: int = 2
    retry_interval_minutes: int = 60

class FtpSettingsUpdate(BaseModel):
    host: str
    port: int = 21
    username: Optional[str] = None
    # Omitted/blank preserves the existing encrypted password, same
    # semantics as SmtpSettingsUpdate.password below.
    password: Optional[str] = None
    remote_path: str = ""
    enabled: bool = False
    upload_hour: int = 4
    upload_minute: int = 0
    upload_st_files: bool = True
    upload_rv_files: bool = False

class SmtpSettingsUpdate(BaseModel):
    host: str
    port: int = 587
    username: Optional[str] = None
    password: Optional[str] = None
    from_email: str
    from_name: Optional[str] = None
    use_tls: bool = True

class SmtpTestRequest(BaseModel):
    to_email: str

class EmailTemplateUpdate(BaseModel):
    subject: str
    html_template: str

class StFilesEmailSettingsUpdate(BaseModel):
    subject: str
    html_template: str
    recipients: str
    send_hour: int
    send_minute: int
    enabled: bool = True
    # Only read/saved by the two compare/verification mails (_save_compare_
    # settings) - the ST/RR4/TM30 daily digest saves that also use this model
    # never send them, so they default to "" and are simply not included in
    # those endpoints' own hand-built payload dicts.
    cc: str = ""
    bcc: str = ""

class StFilesPerPropertySendNow(BaseModel):
    property_name: str

class Rr4Tm30EmailSettingsUpdate(BaseModel):
    subject: str
    html_template: str
    recipients: str
    send_hour: int
    send_minute: int
    enabled: bool = True

class Rr4Tm30PerPropertySendNow(BaseModel):
    property_name: str

@router.post("/users")
async def create_user(request: UserCreateRequest):
    """
    Pre-register a user by email + role. A strong random password is always
    generated so the Supabase Auth row exists, but nobody is ever told it -
    "google" throws it away entirely (Google OAuth is the real credential,
    linked by email); "internal" emails a Supabase recovery link instead (the
    same generate_link mechanism POST /auth/forgot-password uses) so the user
    sets their own password on /reset-password rather than receiving one.
    """
    is_internal = request.auth_method == "internal"
    try:
        admin_supabase = get_supabase_client()
        random_password = secrets.token_urlsafe(32)
        auth_res = admin_supabase.auth.admin.create_user({
            "email": request.email,
            "password": random_password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": request.full_name,
                "role": request.role
            }
        })
        if not auth_res or not auth_res.user:
            raise HTTPException(status_code=400, detail="Failed to create auth user")
        user_id = auth_res.user.id
        try:
            admin_supabase.table("profiles").upsert({
                "id": user_id,
                "email": request.email,
                "full_name": request.full_name,
                "role": request.role,
                "status": "Active",
                "auth_method": "internal" if is_internal else "google",
                # The emailed password is a delivery mechanism, not a
                # credential the user chose - Navigation.tsx blocks the app
                # behind a forced change screen until they replace it. Google
                # accounts have no password to change, so the flag stays off.
                "must_change_password": is_internal,
                "created_by": request.created_by or None,
                # Admin-created accounts start Active with no separate Approve
                "approved_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as profile_error:
            # The auth user already exists at this point. Leaving it behind
            # would take the address hostage - a retry would fail with "email
            # already registered" while the person still can't sign in
            # (no profile => the auth guard rejects them). Undo it so the
            # admin can simply fix the cause and create the user again.
            logger.error(f"Profile row failed for {request.email}, rolling back auth user: {profile_error}")
            try:
                admin_supabase.auth.admin.delete_user(user_id)
            except Exception as cleanup_error:
                logger.error(f"Rollback of orphaned auth user {user_id} failed: {cleanup_error}")
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Could not create the profile row: {profile_error}. "
                    "If this mentions an unknown 'auth_method' or 'must_change_password' column, "
                    "the profiles table still needs those two columns added."
                ),
            )

        email_sent = False
        email_error = None
        set_password_link = None
        try:
            if is_internal:
                link_res = admin_supabase.auth.admin.generate_link({
                    "type": "recovery",
                    "email": request.email,
                    "options": {"redirect_to": f"{settings.APP_BASE_URL}/reset-password"},
                })
                set_password_link = link_res.properties.action_link
                email_service.send_internal_welcome_email(request.email, set_password_link, request.full_name)
            else:
                # Google flow - no credentials or links in the email; the
                # throwaway password above is never shown to anyone.
                email_service.send_welcome_email(request.email, None, request.full_name)
            email_sent = True
        except Exception as e:
            email_error = str(e)

        return {
            "status": "success",
            "message": f"User {request.email} pre-registered successfully",
            "user_id": user_id,
            "email_sent": email_sent,
            "email_error": email_error,
            # Only surfaced for internal accounts, and only so the admin has
            # something to hand the user directly if the email above failed -
            # a Google-flow account has no link or password to share.
            "set_password_link": set_password_link,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/self-register")
async def self_register(request: SelfRegisterRequest):
    """
    Auto-provisions a pending profile the first time someone logs in (Google or
    email/password) with no existing profiles row, instead of Navigation.tsx's
    old behavior of immediately kicking them out as unauthorized. They land on
    a "waiting for approval" screen until a Super Admin approves them via
    approve_user below. Role/status are fixed here ("User"/"Pending")
    regardless of what's posted - only the Approve action can grant Active
    status (or change the role away from the Role Settings grid's default).
    """
    try:
        admin_supabase = get_supabase_client()
        existing = admin_supabase.table("profiles").select("id").eq("id", request.id).limit(1).execute()
        if existing.data:
            return {"status": "success", "message": "Profile already exists"}
        admin_supabase.table("profiles").insert({
            "id": request.id,
            "email": request.email,
            "full_name": request.full_name,
            "role": "User",
            "status": "Pending",
        }).execute()
        return {"status": "success", "message": "Pending profile created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users/{user_id}/approve")
async def approve_user(user_id: str, request: ApproveUserRequest):
    """
    Super Admin approval step for a pending self-registered user: sets their
    real role and flips status to Active, which unlocks the normal app (see
    Navigation.tsx's pending-status gate). Emails them that they're approved
    (Admin > Templates > System Email > Approved). A failed send doesn't fail
    the approval itself.

    Also stamps approved_at - a self-registration's first Google OAuth
    handshake creates the Pending profile AND a real Supabase Auth
    last_sign_in_at simultaneously (see get_last_logins), all before this
    step ever runs, so profiles.created_at and that first sign-in always sit
    within milliseconds of each other regardless of when Approve happens.
    approved_at gives User Management's Create Time/Last Log-in columns an
    honest reference point: Create Time shows approved_at (when the account
    actually became usable) and Last Log-in hides that stale pre-approval
    handshake until a real post-approval sign-in exists.
    """
    try:
        admin_supabase = get_supabase_client()
        res = admin_supabase.table("profiles").update({
            "role": request.role,
            "status": "Active",
            "approved_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="User not found")

        profile = res.data[0]
        email_sent = False
        email_error = None
        try:
            email_service.send_approved_email(profile["email"], request.role, profile.get("full_name") or "")
            email_sent = True
        except Exception as e:
            email_error = str(e)

        return {"status": "success", "message": "User approved", "email_sent": email_sent, "email_error": email_error}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/last-logins")
async def get_last_logins():
    """Real last-sign-in timestamps, keyed by user id, straight from
    Supabase Auth's own last_sign_in_at - NOT profiles.last_login, whose
    column default is now() and is never written again after the row is
    created, so it silently just shows account-creation time forever
    regardless of how many times the user has actually signed in since
    (confirmed directly: 15 of 27 real accounts had a last_sign_in_at
    materially later than their created_at, and 4 had never signed in at
    all despite profiles.last_login claiming a timestamp for them). This
    needs the service-role client - auth.users isn't reachable with the
    anon key User Management's own fetchUsers() uses to read profiles
    directly, client-side."""
    try:
        admin_supabase = get_supabase_client()
        result = {}
        page = 1
        while True:
            batch = admin_supabase.auth.admin.list_users(page=page, per_page=200)
            if not batch:
                break
            for u in batch:
                result[u.id] = u.last_sign_in_at.isoformat() if u.last_sign_in_at else None
            if len(batch) < 200:
                break
            page += 1
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """
    Removes a user's profile. No email is sent (the Rejection email feature
    was removed by request - deletions/rejections are silent now).

    What happens to the underlying Supabase Auth user depends on the status
    being deleted from:
      * Pending  - kept. This is a signup rejection, not a real account
        removal, and self_register above relies on the Auth user still
        existing: if they sign in again, it re-creates a fresh Pending
        profile so they can be reviewed again rather than being silently
        locked out.
      * Active/Inactive - deleted along with the profile. This is a
        deliberate "remove this account" action, and leaving the Auth user
        behind orphaned took the email address hostage - POST /admin/users
        would fail with "already registered" on any attempt to reuse it,
        with no way to recover short of finding and deleting that row by
        hand (which is exactly what came up twice in one day before this
        existed).
    """
    try:
        admin_supabase = get_supabase_client()
        existing = admin_supabase.table("profiles").select("email, status").eq("id", user_id).limit(1).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="User not found")
        email = existing.data[0]["email"]
        was_pending = existing.data[0].get("status") == "Pending"

        admin_supabase.table("profiles").delete().eq("id", user_id).execute()

        if not was_pending:
            try:
                admin_supabase.auth.admin.delete_user(user_id)
            except Exception as e:
                # Profile is already gone either way - log and continue
                # rather than failing a delete that, from the admin's point
                # of view, already succeeded.
                logger.error(f"Auth user cleanup failed for {email} ({user_id}): {e}")

        return {"status": "success", "message": "User deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sync/properties")
async def get_sync_properties():
    """
    Fetch all properties and their sync schedule settings.
    """
    try:
        admin_supabase = get_supabase_client()
        res = admin_supabase.table("property_api_settings").select("*").order("property_name").execute()
        decrypted_data = [encryption_service.decrypt_data(row) for row in res.data]
        return {"status": "success", "data": decrypted_data}
    except Exception as e:
        print(f"Error in get_sync_properties: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync/properties")
async def create_property_settings(request: PropertyApiSettingsUpdate):
    try:
        admin_supabase = get_supabase_client()
        data = request.dict()
        encrypted_data = encryption_service.encrypt_data(data)
        
        res = admin_supabase.table("property_api_settings").insert(encrypted_data).execute()
        return {"status": "success", "data": res.data[0] if res.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sync/properties/{property_id}")
async def update_property_settings(property_id: str, request: PropertyApiSettingsUpdate):
    try:
        admin_supabase = get_supabase_client()
        data = request.dict()
        encrypted_data = encryption_service.encrypt_data(data)

        admin_supabase.table("property_api_settings").update(encrypted_data).eq("id", property_id).execute()
        return {"status": "success", "message": "Property settings updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sync/retry-settings")
async def get_sync_retry_settings():
    """
    Global policy for main.py's retry_scheduled_syncs: how many times, and
    how many minutes apart, a property's Data Mart sync is auto-retried
    after its own scheduled run if a table is still missing or errored that
    day. Reuses sync_service's lookup (same one the retry job itself calls)
    so this always reflects what will actually run, including the built-in
    fallback (2 retries, 60 min apart) before the settings row has been saved.
    """
    try:
        data = await sync_service.get_sync_retry_settings()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync/retry-settings")
async def save_sync_retry_settings(request: SyncRetrySettingsUpdate):
    """
    Upsert the single global retry-policy row. Clamped server-side: 0-6
    retries (0 disables the retry pass entirely), 5-720 minutes between them
    - the interval floors at 5 since retry_scheduled_syncs' dedicated cron
    only ticks every 5 minutes in production (see its own docstring), so a
    finer value would just resolve to that same 5-minute bucket anyway.
    """
    try:
        retry_count = max(0, min(request.retry_count, 6))
        retry_interval_minutes = max(5, min(request.retry_interval_minutes, 720))
        admin_supabase = get_supabase_client()
        existing = admin_supabase.table("sync_retry_settings").select("id").limit(1).execute()
        payload = {"retry_count": retry_count, "retry_interval_minutes": retry_interval_minutes}
        if existing.data:
            admin_supabase.table("sync_retry_settings").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            admin_supabase.table("sync_retry_settings").insert(payload).execute()
        return {"status": "success", "message": "Retry settings saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ftp-settings")
async def get_ftp_settings_route():
    """
    Fetch the single global FTP upload settings row (Admin > Sync > FTP
    Upload). The real password is never returned - only whether one is
    set - same convention as GET /admin/smtp.
    """
    try:
        data = ftp_service.get_ftp_settings()
        data["password_set"] = bool(data.get("password"))
        data.pop("password", None)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ftp-settings")
async def save_ftp_settings(request: FtpSettingsUpdate):
    """
    Upsert the single global FTP settings row. If password is omitted/
    blank, the existing encrypted password (if any) is preserved instead
    of wiped - same convention as POST /admin/smtp.
    """
    try:
        admin_supabase = get_supabase_client()
        existing = admin_supabase.table("ftp_settings").select("id, password").limit(1).execute()

        payload = request.dict(exclude={"password"})
        if request.password:
            payload["password"] = encryption_service.encrypt(request.password)
        elif existing.data:
            payload["password"] = existing.data[0].get("password")

        if existing.data:
            admin_supabase.table("ftp_settings").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            admin_supabase.table("ftp_settings").insert(payload).execute()

        return {"status": "success", "message": "FTP settings saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ftp-settings/upload-now")
async def upload_ftp_now():
    """
    Manual "Upload Test Now" trigger (Admin > Sync > FTP Upload) - connects
    and uploads immediately, bypassing the schedule, for whichever report
    type(s) upload_st_files/upload_rv_files currently have checked. Targets
    YESTERDAY's report, same as the real scheduled upload and the same
    reasoning as the email digest's own "Send Test Now" (daily_auto_sync_st_files'
    docstring: "today" would be an incomplete, still-in-progress day) - this
    exercises the exact same path production uses. mark_sent=False so this
    never marks anything as already-uploaded, meaning it can't suppress the
    real scheduled upload for the same day.
    """
    try:
        report_date_str = (datetime.now(ZoneInfo("Asia/Bangkok")).date() - timedelta(days=1)).isoformat()
        result = await sync_service.send_ftp_upload(report_date_str, mark_sent=False, sync_type="manual")
        if not result.get("uploaded"):
            reason = result.get("reason") or "; ".join(result.get("skipped", [])) or "no properties have yesterday's data imported yet"
            raise HTTPException(status_code=400, detail=f"Nothing uploaded - {reason}")
        return {
            "status": "success",
            "message": f"Uploaded {len(result['included'])} file(s)",
            "included": result["included"],
            "skipped": result["skipped"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sync/properties/{property_id}")
async def delete_property_settings(property_id: str):
    try:
        admin_supabase = get_supabase_client()
        admin_supabase.table("property_api_settings").delete().eq("id", property_id).execute()
        return {"status": "success", "message": "Property deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sync/logs")
async def get_sync_logs(
    property: str = None,
    limit: int = 200
):
    """
    Fetch sync logs from the sync_logs table.
    """
    try:
        admin_supabase = get_supabase_client()
        # Join with property_api_settings to get the property name if property_id is present
        query = admin_supabase.table("sync_logs").select("*, property_api_settings(property_name)").order("created_at", desc=True).limit(limit)
        
        if property and property != "All":
            query = query.eq("property", property)
            
        res = query.execute()
        
        # Format the data to ensure 'property' field is populated from the join
        formatted_data = []
        for row in res.data:
            if not row.get("property") and row.get("property_api_settings"):
                row["property"] = row["property_api_settings"].get("property_name")
            formatted_data.append(row)
            
        return {"status": "success", "data": formatted_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/smtp")
async def get_smtp_settings():
    """
    Fetch the single global SMTP settings row. The real password is never
    returned - only whether one is set.
    """
    try:
        admin_supabase = get_supabase_client()
        res = admin_supabase.table("smtp_settings").select("*").limit(1).execute()
        if not res.data:
            return {"status": "success", "data": None}
        row = res.data[0]
        password_set = bool(row.get("password"))
        row.pop("password", None)
        row["password_set"] = password_set
        return {"status": "success", "data": row}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/smtp")
async def save_smtp_settings(request: SmtpSettingsUpdate):
    """
    Upsert the single global SMTP settings row. If password is omitted/blank,
    the existing encrypted password (if any) is preserved instead of wiped.
    """
    try:
        admin_supabase = get_supabase_client()
        existing = admin_supabase.table("smtp_settings").select("id, password").limit(1).execute()

        payload = request.dict(exclude={"password"})
        if request.password:
            payload["password"] = encryption_service.encrypt(request.password)
        elif existing.data:
            payload["password"] = existing.data[0].get("password")

        if existing.data:
            admin_supabase.table("smtp_settings").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            admin_supabase.table("smtp_settings").insert(payload).execute()

        return {"status": "success", "message": "SMTP settings saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/smtp/test")
async def test_smtp_settings(request: SmtpTestRequest):
    try:
        email_service.send_email(
            request.to_email,
            "NHGOne SMTP Test",
            "<p>This is a test email from NHGOne. If you received this, your SMTP settings are working.</p>",
            "This is a test email from NHGOne. If you received this, your SMTP settings are working.",
        )
        return {"status": "success", "message": f"Test email sent to {request.to_email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/email-template")
async def get_email_template():
    """
    Returns the admin-edited welcome email (Admin > Templates > Email), or
    the built-in default (is_default=True) if none saved yet - same
    editable-template pattern as GET /bills/template and GET /rr3/template.
    """
    return {"status": "success", "data": email_service.get_welcome_template()}

@router.post("/email-template")
async def save_email_template(request: EmailTemplateUpdate):
    try:
        admin_supabase = get_supabase_client()
        existing = admin_supabase.table("email_templates").select("id") \
            .eq("template_key", WELCOME_TEMPLATE_KEY).limit(1).execute()
        payload = {
            "template_key": WELCOME_TEMPLATE_KEY,
            "subject": request.subject,
            "html_template": request.html_template,
        }
        if existing.data:
            admin_supabase.table("email_templates").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            admin_supabase.table("email_templates").insert(payload).execute()
        return {"status": "success", "message": "Email template saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/email-template/st-files-daily")
async def get_st_files_daily_email_template():
    """
    Returns the ST Files daily digest's subject/body plus delivery config
    (recipients/send_hour/send_minute/enabled), or the built-in defaults
    (is_default=True) if none saved yet - see
    email_service.get_st_files_daily_settings.
    """
    return {"status": "success", "data": email_service.get_st_files_daily_settings()}

@router.post("/email-template/st-files-daily")
async def save_st_files_daily_email_template(request: StFilesEmailSettingsUpdate):
    try:
        admin_supabase = get_supabase_client()
        existing = admin_supabase.table("email_templates").select("id") \
            .eq("template_key", ST_FILES_DAILY_TEMPLATE_KEY).limit(1).execute()
        payload = {
            "template_key": ST_FILES_DAILY_TEMPLATE_KEY,
            "subject": request.subject,
            "html_template": request.html_template,
            "recipients": request.recipients,
            "send_hour": request.send_hour,
            "send_minute": request.send_minute,
            "enabled": request.enabled,
        }
        if existing.data:
            admin_supabase.table("email_templates").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            admin_supabase.table("email_templates").insert(payload).execute()
        return {"status": "success", "message": "ST Files email settings saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _save_simple_email_template(template_key: str, request: EmailTemplateUpdate, label: str):
    """Shared save for the simple (subject + html_template, no delivery
    config) Admin > Templates > Email tabs - internal welcome, password
    reset, Google sign-in notice, approved. Same upsert-by-template_key
    shape as save_email_template/save_st_files_daily_email_template above."""
    try:
        admin_supabase = get_supabase_client()
        existing = admin_supabase.table("email_templates").select("id") \
            .eq("template_key", template_key).limit(1).execute()
        payload = {
            "template_key": template_key,
            "subject": request.subject,
            "html_template": request.html_template,
        }
        if existing.data:
            admin_supabase.table("email_templates").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            admin_supabase.table("email_templates").insert(payload).execute()
        return {"status": "success", "message": f"{label} template saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/email-template/internal-welcome")
async def get_internal_welcome_email_template():
    """The Internal Auth "set your password" email (Admin > Templates >
    Email > Internal Welcome) - see INTERNAL_WELCOME_TEMPLATE_KEY's docstring
    for why the <<SetPasswordLink>> token needs to survive an edit."""
    return {"status": "success", "data": email_service.get_internal_welcome_template()}

@router.post("/email-template/internal-welcome")
async def save_internal_welcome_email_template(request: EmailTemplateUpdate):
    return _save_simple_email_template(INTERNAL_WELCOME_TEMPLATE_KEY, request, "Internal Welcome")

@router.get("/email-template/password-reset")
async def get_password_reset_email_template():
    """The "Forgot password" email for Internal Auth accounts (Admin >
    Templates > Email > Password Reset)."""
    return {"status": "success", "data": email_service.get_password_reset_template()}

@router.post("/email-template/password-reset")
async def save_password_reset_email_template(request: EmailTemplateUpdate):
    return _save_simple_email_template(PASSWORD_RESET_TEMPLATE_KEY, request, "Password Reset")

@router.get("/email-template/google-signin-notice")
async def get_google_signin_notice_email_template():
    """Sent when a "Forgot password" request lands on a Google-auth account
    (Admin > Templates > Email > Google Sign-in Notice)."""
    return {"status": "success", "data": email_service.get_google_signin_notice_template()}

@router.post("/email-template/google-signin-notice")
async def save_google_signin_notice_email_template(request: EmailTemplateUpdate):
    return _save_simple_email_template(GOOGLE_SIGNIN_NOTICE_TEMPLATE_KEY, request, "Google Sign-in Notice")

@router.get("/email-template/approved")
async def get_approved_email_template():
    """Sent by POST /admin/users/{id}/approve (Admin > Templates > System Email > Approved)."""
    return {"status": "success", "data": email_service.get_approved_template()}

@router.post("/email-template/approved")
async def save_approved_email_template(request: EmailTemplateUpdate):
    return _save_simple_email_template(APPROVED_TEMPLATE_KEY, request, "Approved")

@router.post("/email-template/st-files-daily/send-now")
async def send_st_files_daily_email_now():
    """
    Manual "Send Test Now" trigger (Admin > Templates > Statistic Files >
    All Property) - builds and sends ONLY the bundled email immediately,
    bypassing its schedule. Deliberately does not touch any per-property
    email (that's send_st_files_per_property_email_now below, its own
    fully separate trigger) - the two tabs test independently, matching
    how they run independently in production (send_st_files_bundled_digest
    vs. send_st_files_property_email, on their own separate schedules).
    Targets YESTERDAY's report, same as the real scheduled send (see
    daily_auto_sync_st_files' docstring on why "today" would be an
    incomplete, still-in-progress day). mark_sent=False so this never marks
    anything as already-sent, meaning it can't suppress the real scheduled
    send for the same day.
    """
    try:
        report_date_str = (datetime.now(ZoneInfo("Asia/Bangkok")).date() - timedelta(days=1)).isoformat()
        result = await sync_service.send_st_files_bundled_digest(report_date_str, mark_sent=False, sync_type="manual")
        if not result.get("sent"):
            skipped = "; ".join(result.get("skipped", [])) or "no properties have yesterday's data imported yet"
            raise HTTPException(status_code=400, detail=f"Nothing sent - {skipped}")
        return {
            "status": "success",
            "message": f"Sent for {len(result['included'])} propert(y/ies)",
            "included": result["included"],
            "skipped": result["skipped"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/email-template/st-files-daily-per-property/send-now")
async def send_st_files_per_property_email_now(request: StFilesPerPropertySendNow):
    """
    "Save and Test Email" trigger (Admin > Templates > Statistic Files >
    Per-Property) - sends ONE property's own ST Files email immediately
    using whatever is currently saved for it (the frontend saves first,
    then calls this), independent of that property's own st_files_email_
    hour/_minute schedule. Same YESTERDAY's-report/mark_sent=False
    convention as send_st_files_daily_email_now above, so a test send here
    can never suppress the real scheduled send for today.
    """
    try:
        report_date_str = (datetime.now(ZoneInfo("Asia/Bangkok")).date() - timedelta(days=1)).isoformat()
        result = await sync_service.send_st_files_property_email(
            request.property_name, report_date_str, mark_sent=False, sync_type="manual")
        if not result["sent"]:
            raise HTTPException(status_code=400, detail=result["skipped"])
        return {"status": "success", "message": f"Sent for {request.property_name}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/email-template/rr4-tm30-daily")
async def get_rr4_tm30_daily_email_template():
    """Returns the RR4/TM30 daily digest's subject/body plus delivery
    config, same shape as GET /email-template/st-files-daily."""
    return {"status": "success", "data": email_service.get_rr4_tm30_daily_settings()}

@router.post("/email-template/rr4-tm30-daily")
async def save_rr4_tm30_daily_email_template(request: Rr4Tm30EmailSettingsUpdate):
    try:
        admin_supabase = get_supabase_client()
        existing = admin_supabase.table("email_templates").select("id") \
            .eq("template_key", RR4_TM30_DAILY_TEMPLATE_KEY).limit(1).execute()
        payload = {
            "template_key": RR4_TM30_DAILY_TEMPLATE_KEY,
            "subject": request.subject,
            "html_template": request.html_template,
            "recipients": request.recipients,
            "send_hour": request.send_hour,
            "send_minute": request.send_minute,
            "enabled": request.enabled,
        }
        if existing.data:
            admin_supabase.table("email_templates").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            admin_supabase.table("email_templates").insert(payload).execute()
        return {"status": "success", "message": "RR4/TM30 email settings saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/email-template/rr4-tm30-daily/send-now")
async def send_rr4_tm30_daily_email_now():
    """
    Manual "Send Test Now" trigger (Admin > Templates > RR4/TM30 Files >
    All Property) - same shape as send_st_files_daily_email_now: builds and
    sends ONLY the bundled email immediately, targeting YESTERDAY's report,
    mark_sent=False so it can never suppress the real scheduled send.
    """
    try:
        report_date_str = (datetime.now(ZoneInfo("Asia/Bangkok")).date() - timedelta(days=1)).isoformat()
        result = await sync_service.send_rr4_tm30_bundled_digest(report_date_str, mark_sent=False, sync_type="manual")
        if not result.get("sent"):
            skipped = "; ".join(result.get("skipped", [])) or "no properties have yesterday's data imported yet"
            raise HTTPException(status_code=400, detail=f"Nothing sent - {skipped}")
        return {
            "status": "success",
            "message": f"Sent for {len(result['included'])} propert(y/ies)",
            "included": result["included"],
            "skipped": result["skipped"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/email-template/rr4-tm30-daily-per-property/send-now")
async def send_rr4_tm30_per_property_email_now(request: Rr4Tm30PerPropertySendNow):
    """
    "Save and Test Email" trigger (Admin > Templates > RR4/TM30 Files >
    Per-Property) - same shape as send_st_files_per_property_email_now.
    """
    try:
        report_date_str = (datetime.now(ZoneInfo("Asia/Bangkok")).date() - timedelta(days=1)).isoformat()
        result = await sync_service.send_rr4_tm30_property_email(
            request.property_name, report_date_str, mark_sent=False, sync_type="manual")
        if not result["sent"]:
            raise HTTPException(status_code=400, detail=result["skipped"])
        return {"status": "success", "message": f"Sent for {request.property_name}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------------------- Monitoring
#
# The two sheet-verification mails (Admin > Email Template > System Email >
# Test ST File / Test RR4/TM30 File). Same GET/POST/send-now trio as the ST
# Files and RR4/TM30 digests above, but driven by one shared pair of handlers
# since the only thing that differs between them is which template_key and
# which comparison - see compare_mail.

def _save_compare_settings(template_key: str, request: StFilesEmailSettingsUpdate, label: str):
    try:
        admin_supabase = get_supabase_client()
        existing = admin_supabase.table("email_templates").select("id") \
            .eq("template_key", template_key).limit(1).execute()
        payload = {
            "template_key": template_key,
            "subject": request.subject,
            "html_template": request.html_template,
            "recipients": request.recipients,
            "cc": request.cc,
            "bcc": request.bcc,
            "send_hour": request.send_hour,
            "send_minute": request.send_minute,
            "enabled": request.enabled,
        }

        def upsert(p: dict):
            if existing.data:
                admin_supabase.table("email_templates").update(p).eq("id", existing.data[0]["id"]).execute()
            else:
                admin_supabase.table("email_templates").insert(p).execute()

        try:
            upsert(payload)
        except Exception:
            # cc/bcc (api/sql/email_templates_cc_bcc.sql) not migrated yet -
            # retry without them so Save still works; CC/BCC just won't
            # persist until the migration runs.
            payload.pop("cc", None)
            payload.pop("bcc", None)
            upsert(payload)
        return {"status": "success", "message": f"{label} settings saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _send_compare_now(kind: str):
    """
    "Send Test Now" - runs the comparison and sends it immediately, bypassing
    the schedule. mark_sent=False so a test can never suppress that day's real
    scheduled send. Each property is compared at whatever date its own sheet
    currently holds, which is the same thing the scheduled run does; there is
    no date to pass, because these workbooks only ever hold one pasted export.

    Deliberately just "Sent to <recipients>" - no cells-matched/rows-differ
    summary. That detail belongs in the mail itself (which the admin can just
    go read) and in Admin > Sync's Activity Log, not in a popup whose only job
    is confirming the send actually happened.
    """
    try:
        outcome = await compare_mail.send(kind, mark_sent=False, sync_type="manual")
        if not outcome["sent"]:
            raise HTTPException(status_code=400, detail=f"Nothing sent - {outcome['reason']}")
        return {
            "status": "success",
            "message": f"Sent to {', '.join(outcome['recipients'])}",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/email-template/st-compare")
async def get_st_compare_email_template():
    """Daily ST Files vs Google Sheet verification mail."""
    return {"status": "success", "data": email_service.get_st_compare_settings()}

@router.post("/email-template/st-compare")
async def save_st_compare_email_template(request: StFilesEmailSettingsUpdate):
    return _save_compare_settings(ST_COMPARE_TEMPLATE_KEY, request, "Test ST File")

@router.post("/email-template/st-compare/send-now")
async def send_st_compare_email_now():
    return await _send_compare_now("st")

@router.get("/email-template/rr4-compare")
async def get_rr4_compare_email_template():
    """Daily RR4/TM30 vs generator-sheet verification mail."""
    return {"status": "success", "data": email_service.get_rr4_compare_settings()}

@router.post("/email-template/rr4-compare")
async def save_rr4_compare_email_template(request: StFilesEmailSettingsUpdate):
    return _save_compare_settings(RR4_COMPARE_TEMPLATE_KEY, request, "Test RR4/TM30 File")

@router.post("/email-template/rr4-compare/send-now")
async def send_rr4_compare_email_now():
    return await _send_compare_now("rr4")
