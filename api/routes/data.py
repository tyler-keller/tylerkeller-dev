from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import FileResponse, RedirectResponse
from datetime import datetime, timedelta
from typing import Optional
from config import (
    PROGRESS_DIR, JOURNAL_DIR, FITBIT_STATE_FILE, FITBIT_CLIENT_ID, FITBIT_REDIRECT_URI,
    SECRET_KEY, DENVER_TZ, UTC_TZ, PRODUCE_APPS, BROWSER_APPS, SYSTEM_NOISE
)
from auth import verify_key
from db import get_db_connection, get_last_event, get_events_this_week, get_total_activity_minutes_today
from utils import convert_to_denver, get_current_context, now_denver, now_utc
from services.sheet import get_daily_sheet_data
from services.score import get_score_data
from services.fitbit import save_fitbit_tokens, _fitbit_basic_auth
import urllib.parse
import requests
import secrets
import json
import os

router = APIRouter()


@router.get("/status")
def get_status(x_key: str = Header(None)):
    verify_key(x_key)

    last_insulin = get_last_event("insulin")
    current_context = get_current_context()
    activity_minutes_today = get_total_activity_minutes_today()

    this_week_events = get_events_this_week()
    workouts_this_week = [e for e in this_week_events if e["event_name"] in ["run", "lift", "muay_thai"]]

    today = now_utc().date().isoformat()
    today_events = [e for e in this_week_events if e["start_time"].startswith(today)]

    def convert_event_times(event):
        event = dict(event)
        if event.get("start_time"):
            event["start_time"] = convert_to_denver(event["start_time"])
        if event.get("end_time"):
            event["end_time"] = convert_to_denver(event["end_time"])
        return event

    return {
        "last_insulin": convert_to_denver(last_insulin["start_time"]) if last_insulin else "",
        "current_context": current_context,
        "activity_minutes_today": activity_minutes_today,
        "workouts_this_week": len(workouts_this_week),
        "today_events": [convert_event_times(e) for e in today_events],
        "this_week_events": [convert_event_times(e) for e in this_week_events]
    }


@router.get("/data/sheet")
def get_data_sheet(x_key: str = Header(None)):
    verify_key(x_key)
    return get_daily_sheet_data()


@router.get("/data/progress_photos")
def get_progress_photos(range: str = "all_time", x_key: str = Header(None)):
    verify_key(x_key)

    files = sorted(os.listdir(PROGRESS_DIR))
    photos = []
    now = now_denver()

    for fname in files:
        if not fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue

        date_str = fname.split('_')[0]
        try:
            photo_date = datetime.strptime(date_str, '%Y%m%d').replace(tzinfo=DENVER_TZ)
        except ValueError:
            continue

        if range == "this_month" and photo_date.month != now.month:
            continue
        elif range == "this_year" and photo_date.year != now.year:
            continue

        photos.append({
            "filename": fname,
            "date": photo_date.strftime("%Y-%m-%d"),
            "url": f"/data/media/photos/progress/{fname}"
        })

    return photos


@router.get("/data/media/photos/progress/{filename}")
def serve_progress_photo(filename: str, x_key: str = Header(None)):
    verify_key(x_key)
    file_path = os.path.join(PROGRESS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(file_path)


@router.get("/data/journals")
def get_journals(x_key: str = Header(None)):
    verify_key(x_key)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM events WHERE event_name = 'evening_routine' ORDER BY start_time DESC")
    rows = c.fetchall()
    conn.close()

    journals = []
    for row in rows:
        entry = dict(row)
        if entry.get("start_time"):
            entry["start_time"] = convert_to_denver(entry["start_time"])
        if entry.get("end_time"):
            entry["end_time"] = convert_to_denver(entry["end_time"])
        if entry.get("metadata"):
            try:
                entry["metadata"] = json.loads(entry["metadata"])
            except (json.JSONDecodeError, TypeError):
                pass
        journals.append(entry)
    return journals


@router.get("/data/correlations")
def get_correlations(x_key: str = Header(None)):
    verify_key(x_key)

    sheet_list = get_daily_sheet_data()
    days: dict = {d["date"]: d for d in sheet_list}

    for s in get_score_data():
        dk = s["date"]
        if dk not in days:
            days[dk] = {"date": dk}
        days[dk]["bonus_count"] = s["bonus_count"]
        days[dk]["tir_pct"]     = s["details"].get("tir_pct")

    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT start_time, metadata FROM events WHERE event_name='evening_routine' ORDER BY start_time")
    for row in c.fetchall():
        if not row["metadata"]:
            continue
        try:
            meta = json.loads(row["metadata"])
        except (json.JSONDecodeError, TypeError):
            continue
        ts = datetime.fromisoformat(row["start_time"])
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=UTC_TZ)
        dk = ts.astimezone(DENVER_TZ).date().isoformat()
        if dk not in days:
            days[dk] = {"date": dk}
        if meta.get("stress") is not None:
            days[dk]["stress"] = meta["stress"]
        if meta.get("mood") is not None:
            days[dk]["mood"] = meta["mood"]
        if meta.get("energy") is not None:
            days[dk]["energy"] = meta["energy"]

    c.execute("SELECT date, minutes_asleep, efficiency FROM fitbit_sleep")
    for row in c.fetchall():
        dk = row["date"]
        if dk not in days:
            days[dk] = {"date": dk}
        days[dk]["sleep_mins"]       = row["minutes_asleep"]
        days[dk]["sleep_efficiency"] = row["efficiency"]

    conn.close()

    FIELDS = [
        "morning_routine", "evening_routine", "hit", "lift", "muay_thai", "run",
        "school_hours", "home_hours", "work_hours",
        "weight", "produce_mins", "youtube_mins", "bonus_count",
        "stress", "mood", "energy",
        "tir_pct", "sleep_mins", "sleep_efficiency",
    ]
    BOOL_FIELDS = {"morning_routine", "evening_routine", "hit", "lift", "muay_thai", "run"}

    result = []
    for dk in sorted(days):
        d = days[dk]
        if "hit" not in d:
            d["hit"] = bool(d.get("morning_routine") and d.get("evening_routine"))
        row: dict = {"date": dk}
        for f in FIELDS:
            v = d.get(f)
            if v is None:
                row[f] = None
            elif f in BOOL_FIELDS:
                row[f] = 1 if v else 0
            else:
                row[f] = v
        result.append(row)

    return result


@router.get("/data/media/audio/journal/{filename}")
def serve_journal_audio(filename: str, x_key: str = Header(None)):
    verify_key(x_key)
    file_path = os.path.join(JOURNAL_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(file_path)


@router.get("/data/glucose")
def get_glucose(x_key: str = Header(None)):
    verify_key(x_key)
    cutoff = (now_utc() - timedelta(hours=24)).isoformat()
    conn = get_db_connection()
    c = conn.cursor()
    c.execute(
        "SELECT timestamp, mg_dl, trend_direction FROM cgm_readings WHERE timestamp >= ? ORDER BY timestamp ASC",
        (cutoff,)
    )
    rows = c.fetchall()
    conn.close()
    return [{"timestamp": r["timestamp"], "mg_dl": r["mg_dl"], "trend_direction": r["trend_direction"]} for r in rows]


@router.get("/data/weights")
def get_weights(x_key: str = Header(None)):
    verify_key(x_key)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT start_time, metadata FROM events WHERE event_name = 'morning_routine' ORDER BY start_time")
    rows = c.fetchall()
    conn.close()

    weights = []
    for row in rows:
        if not row["metadata"]:
            continue
        try:
            meta = json.loads(row["metadata"])
        except (json.JSONDecodeError, TypeError):
            continue
        weight = meta.get("weight")
        if not weight:
            continue
        date_str = convert_to_denver(row["start_time"])
        date_only = date_str[:10] if date_str else None
        if date_only:
            weights.append({"date": date_only, "weight": float(weight)})
    return weights


@router.get("/data/activity")
def get_activity(days: int = 14, x_key: str = Header(None)):
    verify_key(x_key)
    cutoff = (now_denver().date() - timedelta(days=days)).isoformat()

    conn = get_db_connection()
    c = conn.cursor()
    c.execute(
        """SELECT timestamp, duration, data
           FROM aw_events
           WHERE bucket LIKE 'aw-watcher-window%' AND timestamp >= ?
           ORDER BY timestamp ASC""",
        (cutoff,)
    )
    rows = c.fetchall()
    conn.close()

    days_data: dict = {}

    for row in rows:
        ts = datetime.fromisoformat(row["timestamp"])
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=UTC_TZ)
        day_key = ts.astimezone(DENVER_TZ).date().isoformat()

        if day_key not in days_data:
            days_data[day_key] = {
                "date": day_key,
                "produce_mins": 0.0,
                "youtube_mins": 0.0,
                "browser_mins": 0.0,
                "other_mins":   0.0,
                "app_mins":     {},
            }

        try:
            data = json.loads(row["data"])
        except (json.JSONDecodeError, TypeError):
            continue

        app   = data.get("app") or ""
        title = data.get("title") or ""
        mins  = row["duration"] / 60
        day   = days_data[day_key]

        if not app or app in SYSTEM_NOISE:
            continue

        if app in PRODUCE_APPS:
            day["produce_mins"] += mins
            day["app_mins"][app] = day["app_mins"].get(app, 0) + mins
        elif app in BROWSER_APPS:
            if "YouTube" in title:
                day["youtube_mins"] += mins
            else:
                day["browser_mins"] += mins
                day["app_mins"][app] = day["app_mins"].get(app, 0) + mins
        else:
            day["other_mins"] += mins
            day["app_mins"][app] = day["app_mins"].get(app, 0) + mins

    result = []
    for day in sorted(days_data.values(), key=lambda d: d["date"], reverse=True):
        top_apps = sorted(day["app_mins"].items(), key=lambda x: x[1], reverse=True)[:6]
        result.append({
            "date":         day["date"],
            "produce_mins": round(day["produce_mins"]),
            "youtube_mins": round(day["youtube_mins"]),
            "browser_mins": round(day["browser_mins"]),
            "other_mins":   round(day["other_mins"]),
            "top_apps":     [{"app": a, "mins": round(m)} for a, m in top_apps],
        })

    return result


@router.get("/data/score")
def get_score(x_key: str = Header(None)):
    verify_key(x_key)
    return get_score_data()


@router.get("/data/sleep")
def get_sleep(days: int = 30, x_key: str = Header(None)):
    verify_key(x_key)
    cutoff = (now_denver().date() - timedelta(days=days)).isoformat()
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM fitbit_sleep WHERE date >= ? ORDER BY date DESC", (cutoff,))
    rows = c.fetchall()
    conn.close()

    results = []
    for row in rows:
        r = dict(row)
        if r.get("stages"):
            try:
                r["stages"] = json.loads(r["stages"])
            except (json.JSONDecodeError, TypeError):
                pass
        results.append(r)
    return results


@router.get("/fitbit/auth")
def fitbit_auth(key: str = None):
    """One-time setup: visit /fitbit/auth?key=<SECRET-KEY> in a browser to connect Fitbit."""
    if not key or not secrets.compare_digest(key, SECRET_KEY):
        raise HTTPException(status_code=401, detail="Invalid key")
    if not FITBIT_CLIENT_ID:
        raise HTTPException(status_code=500, detail="FITBIT_CLIENT_ID not configured")

    state = secrets.token_urlsafe(16)
    with open(FITBIT_STATE_FILE, "w") as f:
        json.dump({"state": state}, f)

    params = {
        "response_type": "code",
        "client_id":     FITBIT_CLIENT_ID,
        "redirect_uri":  FITBIT_REDIRECT_URI,
        "scope":         "sleep",
        "state":         state,
    }
    return RedirectResponse(url="https://www.fitbit.com/oauth2/authorize?" + urllib.parse.urlencode(params))


@router.get("/fitbit/callback")
def fitbit_callback(code: str = None, state: str = None, error: str = None):
    """Fitbit redirects here after authorization. Exchanges code for tokens."""
    if error:
        raise HTTPException(status_code=400, detail=f"Fitbit auth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    if os.path.exists(FITBIT_STATE_FILE):
        with open(FITBIT_STATE_FILE) as f:
            saved = json.load(f)
        if state != saved.get("state"):
            raise HTTPException(status_code=400, detail="State mismatch — possible CSRF")
        os.remove(FITBIT_STATE_FILE)
    else:
        raise HTTPException(status_code=400, detail="No pending OAuth state")

    resp = requests.post(
        "https://api.fitbit.com/oauth2/token",
        headers={
            "Authorization": f"Basic {_fitbit_basic_auth()}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={
            "grant_type":   "authorization_code",
            "code":         code,
            "redirect_uri": FITBIT_REDIRECT_URI,
        },
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Token exchange failed: {resp.text}")

    save_fitbit_tokens(resp.json())
    return {"status": "ok", "message": "Fitbit connected — sleep sync will begin on next restart"}
