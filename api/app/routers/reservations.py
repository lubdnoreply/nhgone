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
    Fetch live reservations from MEWS API.
    By default fetching for the last 24 hours if no dates provided.
    """
    try:
        if not start_date:
            start_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        if not end_date:
            end_date = datetime.now(timezone.utc).isoformat()

        payload = {
            "StartUtc": start_date,
            "EndUtc": end_date,
            "Cursor": cursor,
            "States": ["Confirmed", "Started", "Processed", "CheckedIn", "CheckedOut"]
        }

        response_data = await mews_client.post("/api/reservations/getAll", payload, property_name=property_name)
        

        # Transform response for frontend (Basic version for now)
        # In a real app, we would map Reservation with Customer to get guest_name
        customers_map = {c["Id"]: f"{c.get('FirstName', '')} {c.get('LastName', '')}".strip() 
                         for c in response_data.get("Customers", [])}
        
        transformed = []
        for res in response_data.get("Reservations", []):
            transformed.append({
                "mews_id": res["Id"],
                "guest_name": customers_map.get(res["CustomerId"], "Unknown Guest"),
                "status": res["State"],
                "check_in": res["StartUtc"],
                "check_out": res["EndUtc"],
            })

        return {
            "status": "success",
            "data": transformed,
            "cursor": response_data.get("Cursor")
        }
    except Exception as e:
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

@router.post("/sync")
async def sync_record(data: dict):
    """
    Import a MEWS record into Supabase.
    """
    try:
        result = await sync_service.sync_reservation(data)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/update/{mews_id}")
async def update_managed_reservation(mews_id: str, data: dict):
    """
    Update a managed reservation in Supabase.
    """
    try:
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
        
        response = sync_service.supabase.table("reservations").update(data).eq("mews_id", mews_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
