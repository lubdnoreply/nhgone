import asyncio
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from app.services.sync_service import sync_service
from app.services.encryption import encryption_service
import traceback

async def bulk_import():
    try:
        # Fetch all properties
        res = sync_service.supabase.table("property_api_settings").select("property_name").execute()
        properties = [p["property_name"] for p in res.data]
        
        print(f"Found {len(properties)} properties: {properties}")
        
        # Calculate 7 days ago until now (to populate graphs)
        bkk_tz = ZoneInfo("Asia/Bangkok")
        now = datetime.now(bkk_tz)
        start_date = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0).isoformat().replace("+07:00", "Z")
        end_date = now.replace(hour=23, minute=59, second=59).isoformat().replace("+07:00", "Z")
        
        for prop in properties:
            print(f"\n--- Syncing property: {prop} ---")
            try:
                result = await sync_service.get_mapped_reservations(
                    property_name=prop, 
                    start_date=start_date, 
                    end_date=end_date
                )
                
                records = result.get("data", [])
                print(f"Fetched {len(records)} records from MEWS for {prop}")
                
                if not records:
                    continue
                
                batch = []
                for r in records:
                    mews_id = r.get("Identifier")
                    if mews_id:
                        batch.append({
                            "mews_id": mews_id,
                            "property": prop,
                            "data": encryption_service.encrypt_data(r)
                        })
                
                if batch:
                    # Upsert with service role to bypass RLS, chunk in chunks of 50 to avoid payload limits
                    chunk_size = 50
                    inserted = 0
                    for i in range(0, len(batch), chunk_size):
                        chunk = batch[i:i + chunk_size]
                        sync_service.supabase.table("reservations_sync").upsert(chunk, on_conflict="mews_id").execute()
                        inserted += len(chunk)
                        
                    print(f"Successfully inserted/updated {inserted} records in Supabase for {prop}")
                    
            except Exception as prop_err:
                print(f"ERROR syncing {prop}: {str(prop_err)}")
                traceback.print_exc()
                
        print("\n=== BULK IMPORT COMPLETED ===")
    except Exception as e:
        print("Fatal Error:", e)
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(bulk_import())
