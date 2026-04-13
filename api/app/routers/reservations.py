from fastapi import APIRouter, HTTPException, Query
from app.services.mews_client import mews_client
from app.services.sync_service import sync_service
from app.models.schemas import ReservationsRequest, ReservationsResponse
from typing import List, Optional
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/reservations", tags=["Reservations"])

@router.get("/live")
async def get_live_reservations(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    cursor: Optional[str] = Query(None),
    property_name: Optional[str] = Query(None)
):
    """
    Fetch live reservations and map them to the 58 columns Mews Reservation Report.
    """
    try:
        result = await sync_service.get_mapped_reservations(
            property_name=property_name,
            start_date=start_date,
            end_date=end_date,
            cursor=cursor
        )
        return {
            "status": "success",
            "data": result["data"],
            "cursor": result["cursor"]
        }
    except Exception as e:
        print(f"Error fetching reservations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/managed")
async def get_managed_reservations():
    """
    Fetch all managed reservations from Supabase.
    """
    try:
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
        
        response = sync_service.supabase.table("reservations").select("*").order("created_at", desc=True).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync-manual")
async def sync_manual_reservations(payload: dict):
    """
    Manually import fetched reservations into the reservations_sync table.
    """
    try:
        property_name = payload.get("property")
        reservations_data = payload.get("data", [])
        
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
            
        inserted = 0
        skipped = 0
        
        # Prepare batch upsert
        batch = []
        for r in reservations_data:
            mews_id = r.get("Identifier")
            if not mews_id:
                continue
                
            batch.append({
                "mews_id": mews_id,
                "property": property_name,
                "data": r
            })
            
        if batch:
            # Using upsert without ignore_duplicates usually updates existing records
            sync_service.supabase.table("reservations_sync").upsert(batch).execute()
            inserted = len(batch)
                
        return {"status": "success", "inserted": inserted, "skipped": skipped}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/saved")
async def get_saved_reservations(
    property: str = None,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """
    Get synced reservations from Supabase with optional date filtering.
    """
    try:
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
            
        query = sync_service.supabase.table("reservations_sync").select("data, synced_at").order("synced_at", desc=True)
        
        if property and property != "All" and property != "null":
            query = query.eq("property", property)
            
        if start_date:
            # Handle datetime-local format from frontend (e.g. 2024-04-13T00:00)
            if "T" in start_date and not start_date.endswith("Z"):
                start_date = f"{start_date}:00Z"
            query = query.gte("synced_at", start_date)
            
        if end_date:
            if "T" in end_date and not end_date.endswith("Z"):
                end_date = f"{end_date}:00Z"
            query = query.lte("synced_at", end_date)
            
        res = query.execute()
        
        # Inject synced_at into the data object for frontend display
        data = []
        for r in res.data:
            item = r["data"]
            item["Import Date"] = r["synced_at"]
            data.append(item)
            
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/saved")
async def delete_saved_reservations(payload: dict):
    """
    Delete multiple reservations from the sync table.
    Expects format: {"mews_ids": ["id1", "id2", ...]}
    """
    try:
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
            
        ids = payload.get("mews_ids", [])
        if not ids:
            return {"status": "success", "deleted": 0}
            
        sync_service.supabase.table("reservations_sync").delete().in_("mews_id", ids).execute()
        return {"status": "success", "deleted": len(ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
