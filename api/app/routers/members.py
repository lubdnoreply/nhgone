from fastapi import APIRouter, HTTPException, Query
from app.services.mews_client import mews_client
from app.services.sync_service import sync_service
from app.services.encryption import encryption_service
from typing import List, Optional

router = APIRouter(prefix="/members", tags=["Members"])

@router.get("/live")
async def get_live_members(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    property_name: Optional[str] = Query(None)
):
    """
    Fetch live members (customers) from MEWS API.
    """
    try:
        transformed = await sync_service.get_mapped_members(
            property_name=property_name,
            start_date=start_date,
            end_date=end_date
        )
        return {"status": "success", "data": transformed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync-manual")
async def sync_manual_members(payload: dict):
    try:
        property_name = payload.get("property")
        members_data = payload.get("data", [])
        
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
            
        batch = []
        for m in members_data:
            mews_id = m.get("Identifier")
            if not mews_id: continue
            
            batch.append({
                "mews_id": mews_id,
                "property": property_name,
                "data": encryption_service.encrypt_data(m)
            })
            
        if batch:
            sync_service.supabase.table("members_sync").upsert(batch).execute()
                
        return {"status": "success", "inserted": len(batch)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/managed")
async def get_managed_members(
    property: str = None,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    try:
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
            
        query = sync_service.supabase.table("members_sync").select("data, synced_at").order("synced_at", desc=True)
        if property and property != "All" and property != "null":
            query = query.eq("property", property)
            
        if start_date:
            if "T" in start_date and not start_date.endswith("Z"):
                start_date = f"{start_date}:00Z"
            query = query.gte("synced_at", start_date)
            
        if end_date:
            if "T" in end_date and not end_date.endswith("Z"):
                end_date = f"{end_date}:00Z"
            query = query.lte("synced_at", end_date)
            
        res = query.execute()
        data = []
        for r in res.data:
            item = encryption_service.decrypt_data(r["data"])
            item["Import Date"] = r["synced_at"]
            data.append(item)
            
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/managed")
async def delete_saved_members(payload: dict):
    try:
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
        ids = payload.get("mews_ids", [])
        if not ids: return {"status": "success", "deleted": 0}
        sync_service.supabase.table("members_sync").delete().in_("mews_id", ids).execute()
        return {"status": "success", "deleted": len(ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def sync_member_legacy(data: dict):
    # Keeping old sync for compatibility if needed, but redirects to members table
    try:
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
        encrypted_data = encryption_service.encrypt_data(data)
        res = sync_service.supabase.table("members").upsert(encrypted_data, on_conflict="mews_id").execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
