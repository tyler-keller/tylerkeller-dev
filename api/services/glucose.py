from config import DB_FILE, dexcom
import asyncio
import sqlite3


def sync_glucose_readings(backfill: bool = False) -> int:
    if not dexcom:
        return 0
    try:
        if backfill:
            readings = dexcom.get_glucose_readings(minutes=1440, max_count=288) or []
        else:
            current = dexcom.get_current_glucose_reading()
            readings = [current] if current else []
    except Exception as e:
        print(f"Dexcom fetch failed: {e}")
        return 0

    if not readings:
        return 0

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    inserted = 0
    for r in readings:
        try:
            c.execute(
                "INSERT OR IGNORE INTO cgm_readings (timestamp, mg_dl, trend_direction) VALUES (?, ?, ?)",
                (r.datetime.isoformat(), r.mg_dl, r.trend_direction)
            )
            inserted += c.rowcount
        except Exception:
            pass
    conn.commit()
    conn.close()
    return inserted


async def glucose_sync_loop():
    inserted = await asyncio.to_thread(sync_glucose_readings, True)
    print(f"Dexcom backfill: {inserted} readings inserted")
    while True:
        await asyncio.sleep(300)
        await asyncio.to_thread(sync_glucose_readings, False)
