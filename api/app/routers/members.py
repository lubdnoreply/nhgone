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
        all_reservations = []
        if start_date and end_date:
            current_cursor = None
            while True:
                res_payload = {
                    "States": ["Started", "Processed", "Confirmed", "Optional"],
                    "Limitation": {"Count": 500},
                    "StartUtc": {
                        "StartUtc": start_date,
                        "EndUtc": end_date
                    }
                }
                if current_cursor:
                    res_payload["Limitation"]["Cursor"] = current_cursor

                res = await mews_client.post("/api/connector/v1/reservations/getAll/2023-06-06", res_payload, property_name=property_name)
                chunk = res.get("Reservations", [])
                current_cursor = res.get("Cursor")
                all_reservations.extend(chunk)
                
                if not current_cursor or not chunk:
                    break

        # 2. Extract unique Customer IDs
        customer_ids = set()
        for r in all_reservations:
            if r.get("AccountId"):
                customer_ids.add(r["AccountId"])
            if r.get("BookerId"):
                customer_ids.add(r["BookerId"])
        
        customer_ids = list(customer_ids)
        transformed = []

        # 3. Fetch Customer Details in batches
        if customer_ids:
            chunk_size = 500
            for i in range(0, len(customer_ids), chunk_size):
                batch_ids = customer_ids[i:i+chunk_size]
                
                cust_payload = {
                    "Limitation": {"Count": len(batch_ids)},
                    "CustomerIds": batch_ids
                }
                cust_res = await mews_client.post("/api/connector/v1/customers/getAll", cust_payload, property_name=property_name)
                
                for cust in cust_res.get("Customers", []):
                    classifications = cust.get("Classifications", [])
                    loyalty = classifications[0] if classifications else "Standard"
                    
                    transformed.append({
                        "Number": cust.get("Number", ""),
                        "Title": cust.get("Title", ""),
                        "Last Name": cust.get("LastName", ""),
                        "First Name": cust.get("FirstName", ""),
                        "Second Last Name": cust.get("SecondLastName", ""),
                        "Nationality": cust.get("NationalityCode", ""),
                        "Preferred Language": cust.get("PreferredLanguageCode", ""),
                        "Language": cust.get("LanguageCode", ""),
                        "Birth Date": cust.get("BirthDate", ""),
                        "Birth Place": cust.get("BirthPlace", ""),
                        "Occupation": cust.get("Occupation", ""),
                        "Email": cust.get("Email", ""),
                        "Phone": cust.get("Phone", ""),
                        "Tax ID": cust.get("TaxIdentificationNumber", ""),
                        "Loyalty Code": cust.get("LoyaltyCode", ""),
                        "Accounting Code": cust.get("AccountingCode", ""),
                        "Billing Code": cust.get("BillingCode", ""),
                        "Car Registration": cust.get("CarRegistrationNumber", ""),
                        "Dietary": cust.get("DietaryRequirements", ""),
                        "Notes": cust.get("Notes", ""),
                        "Created": cust.get("CreatedUtc", ""),
                        "Updated": cust.get("UpdatedUtc", ""),
                        "Active": cust.get("IsActive", True),
                        "Classifications": ", ".join(cust.get("Classifications", [])) if cust.get("Classifications") else "",
                        "Options": ", ".join(cust.get("Options", [])) if cust.get("Options") else "",
                        "Identifier": cust.get("Id", ""),
                        "mews_id": cust.get("Id", "")
                    })
                    
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
