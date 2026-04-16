from fastapi import APIRouter, HTTPException, Query
from app.services.mews_client import mews_client
from app.services.sync_service import sync_service
from app.services.encryption import encryption_service
from typing import List, Optional

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.get("/live")
async def get_live_payments(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    property_name: Optional[str] = Query(None)
):
    try:
        payload = {
            "Limitation": {"Count": 100}
        }
        
        if start_date and end_date:
            payload["CreatedUtc"] = {
                "StartUtc": start_date,
                "EndUtc": end_date
            }
            
        response = await mews_client.post("/api/connector/v1/payments/getAll", payload, property_name=property_name)
        
        transformed = []
        for pay in response.get("Payments", []):
            transformed.append({
                "mews_id": pay["Id"],
                "amount": pay.get("Amount", {}).get("Value"),
                "currency": pay.get("Amount", {}).get("Currency"),
                "status": pay.get("State"),
                "processed_at": pay.get("CreatedUtc")
            })
        return {"status": "success", "data": transformed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def sync_payment(data: dict):
    try:
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
        encrypted_data = encryption_service.encrypt_data(data)
        res = sync_service.supabase.table("payments").upsert(encrypted_data, on_conflict="mews_id").execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/managed")
async def get_managed_payments():
    try:
        if not sync_service.supabase:
            raise Exception("Supabase not initialized")
        res = sync_service.supabase.table("payments").select("*").order("processed_at", desc=True).execute()
        decrypted_data = [encryption_service.decrypt_data(row) for row in res.data]
        return {"status": "success", "data": decrypted_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
