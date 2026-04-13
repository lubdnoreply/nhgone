from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from app.config import settings, get_supabase_client

router = APIRouter(prefix="/admin", tags=["admin"])

class UserCreateRequest(BaseModel):
    email: str
    password: str
    role: str = "User"
    full_name: str = ""

class SyncScheduleUpdate(BaseModel):
    sync_hour: int
    sync_minute: int
    sync_enabled: bool

@router.post("/users")
async def create_user(request: UserCreateRequest):
    # ... (existing code stays the same)
    try:
        admin_supabase = get_supabase_client()
        auth_res = admin_supabase.auth.admin.create_user({
            "email": request.email,
            "password": request.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": request.full_name,
                "role": request.role
            }
        })
        if not auth_res or not auth_res.user:
            raise HTTPException(status_code=400, detail="Failed to create auth user")
        user_id = auth_res.user.id
        admin_supabase.table("profiles").upsert({
            "id": user_id,
            "email": request.email,
            "full_name": request.full_name,
            "role": request.role,
            "status": "Active"
        }).execute()
        return {"status": "success", "message": f"User {request.email} created successfully", "user_id": user_id}
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
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/sync/properties/{property_id}")
async def update_sync_schedule(property_id: str, request: SyncScheduleUpdate):
    """
    Update the sync schedule for a specific property.
    """
    try:
        admin_supabase = get_supabase_client()
        admin_supabase.table("property_api_settings").update({
            "sync_hour": request.sync_hour,
            "sync_minute": request.sync_minute,
            "sync_enabled": request.sync_enabled
        }).eq("id", property_id).execute()
        
        return {"status": "success", "message": "Sync schedule updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
