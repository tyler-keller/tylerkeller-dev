from datetime import datetime, timedelta
from typing import Optional
from config import (
    DB_FILE, FITBIT_TOKENS_FILE, FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET,
    DENVER_TZ, UTC_TZ
)
import asyncio
import base64
import requests
import sqlite3
import json
import os


def load_fitbit_tokens() -> Optional[dict]:
    if not os.path.exists(FITBIT_TOKENS_FILE):
        return None
    with open(FITBIT_TOKENS_FILE) as f:
        return json.load(f)


def save_fitbit_tokens(tokens: dict):
    tokens["expires_at"] = (datetime.now(UTC_TZ) + timedelta(seconds=tokens["expires_in"])).isoformat()
    with open(FITBIT_TOKENS_FILE, "w") as f:
        json.dump(tokens, f)


def _fitbit_basic_auth() -> str:
    return base64.b64encode(f"{FITBIT_CLIENT_ID}:{FITBIT_CLIENT_SECRET}".encode()).decode()


def refresh_fitbit_tokens(tokens: dict) -> dict:
    resp = requests.post(
        "https://api.fitbit.com/oauth2/token",
        headers={
            "Authorization": f"Basic {_fitbit_basic_auth()}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"grant_type": "refresh_token", "refresh_token": tokens["refresh_token"]},
    )
    resp.raise_for_status()
    new_tokens = resp.json()
    save_fitbit_tokens(new_tokens)
    return new_tokens


def get_fitbit_access_token() -> Optional[str]:
    tokens = load_fitbit_tokens()
    if not tokens:
        return None
    expires_at = datetime.fromisoformat(tokens["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC_TZ)
    if datetime.now(UTC_TZ) >= expires_at - timedelta(minutes=5):
        tokens = refresh_fitbit_tokens(tokens)
    return tokens["access_token"]


def sync_fitbit_sleep(date_str: str) -> bool:
    token = get_fitbit_access_token()
    if not token:
        return False
    resp = requests.get(
        f"https://api.fitbit.com/1.2/user/-/sleep/date/{date_str}.json",
        headers={"Authorization": f"Bearer {token}"},
    )
    if resp.status_code != 200:
        print(f"Fitbit sleep fetch failed for {date_str}: {resp.status_code} {resp.text}")
        return False

    data = resp.json()
    sleep_records = data.get("sleep", [])
    if not sleep_records:
        return True

    main_sleep = next((s for s in sleep_records if s.get("isMainSleep")), sleep_records[0])
    summary_stages = data.get("summary", {}).get("stages", {})

    stages = json.dumps({
        "deep":  summary_stages.get("deep", 0),
        "light": summary_stages.get("light", 0),
        "rem":   summary_stages.get("rem", 0),
        "wake":  summary_stages.get("wake", 0),
    })

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        """INSERT OR REPLACE INTO fitbit_sleep
           (date, start_time, end_time, duration_ms, minutes_asleep, minutes_awake, efficiency, stages)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            date_str,
            main_sleep.get("startTime"),
            main_sleep.get("endTime"),
            main_sleep.get("duration"),
            main_sleep.get("minutesAsleep"),
            main_sleep.get("minutesAwake"),
            main_sleep.get("efficiency"),
            stages,
        ),
    )
    conn.commit()
    conn.close()
    return True


async def fitbit_sleep_sync_loop():
    if load_fitbit_tokens():
        today = datetime.now(DENVER_TZ).date()
        for i in range(30):
            date_str = (today - timedelta(days=i)).isoformat()
            await asyncio.to_thread(sync_fitbit_sleep, date_str)
        print("Fitbit sleep backfill complete")
    while True:
        await asyncio.sleep(3600)
        today = datetime.now(DENVER_TZ).date()
        for i in range(2):
            await asyncio.to_thread(sync_fitbit_sleep, (today - timedelta(days=i)).isoformat())
