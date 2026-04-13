from fastapi import APIRouter, HTTPException, Query
from app.services.mews_client import mews_client
from app.services.sync_service import sync_service
from typing import List, Optional

router = APIRouter(prefix="/members", tags=["Members"])

@router.get("/live")
async def get_live_members(
    search: Optional[str] = Query(None),
    property_name: Optional[str] = Query(None)
):
    try:
        payload = {
            "Emails": [search] if search else None,
            "Limitation": {"Count": 50}
        }
        response = await mews_client.post("/api/customers/getAll", payload, property_name=property_name)
        
        transformed = []
        for cust in response.get("Customers", []):
            transformed.append({
                "mews_id": cust["Id"],
                "full_name": f"{cust.get('FirstName', '')} {cust.get('LastName', '')}".strip(),
                "email": cust.get("Email"),
                "phone": cust.get("Phone"),
                "loyalty": cust.get("Classification", "Standard")
            })
        return {"status": "success", "data": transformed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def sync_member(data: dict):
    try:
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
        res = sync_service.supabase.table("members").upsert(data, on_conflict="mews_id").execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/managed")
async def get_managed_members():
    try:
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
        res = sync_service.supabase.table("members").select("*").order("created_at", desc=True).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
