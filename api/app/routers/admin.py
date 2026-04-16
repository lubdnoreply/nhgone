from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from app.config import settings, get_supabase_client
from app.services.encryption import encryption_service

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

class PropertyApiSettingsUpdate(BaseModel):
    property_name: str
    client_name: str
    client_token: str
    access_token: str

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
        decrypted_data = [encryption_service.decrypt_data(row) for row in res.data]
        return {"status": "success", "data": decrypted_data}
    except Exception as e:
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

@router.delete("/sync/properties/{property_id}")
async def delete_property_settings(property_id: str):
    try:
        admin_supabase = get_supabase_client()
        admin_supabase.table("property_api_settings").delete().eq("id", property_id).execute()
        return {"status": "success", "message": "Property deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
