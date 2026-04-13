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
    Fetch live reservations from MEWS API ver 2023-06-06.
    By default fetching for the last 24 hours if no dates provided.
    """
    try:
        if not start_date:
            start_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat().replace("+00:00", "Z")
        if not end_date:
            end_date = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # According to 2023-06-06 specification, we use CollidingUtc or CreatedUtc inside a nested object
        payload = {
            "CollidingUtc": {
                "StartUtc": start_date,
                "EndUtc": end_date
            },
            "States": ["Confirmed", "Started", "Processed"],
            "Limitation": {
                "Count": 100
            }
        }
        
        if cursor:
            payload["Limitation"]["Cursor"] = cursor

        # Updated endpoint to ver 2023-06-06
        endpoint = "/api/connector/v1/reservations/getAll/2023-06-06"
        response_data = await mews_client.post(endpoint, payload, property_name=property_name)
        
        # ver 2023-06-06 returns Reservations array. 
        # Note: Customer mapping might require a separate call to customers/getAll if not included.
        # However, for now we will map the accessible fields.
        
        transformed = []
        for res in response_data.get("Reservations", []):
            transformed.append({
                "mews_id": res["Id"],
                "guest_name": f"Account: {res.get('AccountId', 'Unknown')[:8]}...", # Temporary ID display
                "status": res["State"],
                "check_in": res.get("ScheduledStartUtc") or res.get("StartUtc"),
                "check_out": res.get("ScheduledEndUtc") or res.get("EndUtc"),
                "number": res.get("Number")
            })

        return {
            "status": "success",
            "data": transformed,
            "cursor": response_data.get("Cursor")
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
