from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from typing import Optional
import sqlite3
import json
import os

app = FastAPI()

origins = [
    "https://dashboard.tylerkeller.dev", 
    "http://localhost:8000" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

IS_DEV = os.environ.get("APP-ENV") == "dev"
SECRET_KEY = os.environ.get("SECRET-KEY")

DENVER_TZ = ZoneInfo("America/Denver")
UTC_TZ = ZoneInfo("UTC")

BASE_DIR = "/var/www/tylerkeller-dev/api"

DATA_DIR = os.path.join(BASE_DIR, "data")
STATES_DIR = os.path.join(DATA_DIR, "states")

DEV_DB_FILE = os.path.join(DATA_DIR, "dev.db")
PROD_DB_FILE = os.path.join(DATA_DIR, "prod.db")
DB_FILE = DEV_DB_FILE if IS_DEV else PROD_DB_FILE
STATUS_FILE = os.path.join(DATA_DIR, "status.json") 

class DefaultShortcutPayload(BaseModel):
    type: str

class MorningRoutinePayload(BaseModel):
    type: str
    photo: bytes

class ActivityPayload(BaseModel):
    source: str
    duration_seconds: int

class ToggleState(BaseModel):
    status: str
    last_change_at: str
    row_id: Optional[int] = None

def now_denver():
    return datetime.now(DENVER_TZ)

def now_utc():
    return datetime.now(UTC_TZ)

def get_state_path(event_name: str) -> str:
    return os.path.join(STATES_DIR, f"{event_name}.json")

def has_suffix(event_name: str) -> bool:
    return event_name.endswith("_start") or event_name.endswith("_end")

def strip_suffix(event_name: str) -> str:
    if event_name.endswith("_start"):
        return event_name[:-6]
    elif event_name.endswith("_end"):
        return event_name[:-4]
    return event_name

def load_state(event_name: str) -> ToggleState:
    path = get_state_path(event_name)
    if os.path.exists(path):
        with open(path, 'r') as f:
            return ToggleState(**json.load(f))
    return ToggleState(status="stopped", last_change_at="", row_id=None)

def save_state(event_name: str, state: ToggleState):
    path = get_state_path(event_name)
    os.makedirs(STATES_DIR, exist_ok=True)
    with open(path, 'w') as f:
        json.dump(state.model_dump(), f)

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS events 
                 (id INTEGER PRIMARY KEY, event_name TEXT, start_time TEXT, end_time TEXT)''')
    conn.commit()
    conn.close()

def insert_event(event_name: str, start_time: str, end_time: Optional[str] = None) -> int:
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO events (event_name, start_time, end_time) VALUES (?, ?, ?)",
              (event_name, start_time, end_time))
    row_id = c.lastrowid
    conn.commit()
    conn.close()
    return row_id or 0

def update_event(row_id: int, end_time: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE events SET end_time = ? WHERE id = ?", (end_time, row_id))
    conn.commit()
    conn.close()

init_db()

def verify_key(x_key: str = Header(None)):
    if x_key != SECRET_KEY:
        raise HTTPException(401, "Invalid key")

@app.get("/version")
def version():
    return {"version": "v1.0.1_database-restructure"}

@app.post("/login")
def login(x_key: str = Header(None)):
    verify_key(x_key)
    return {"status": "ok"}

@app.post("/event")
async def handle_event(payload: DefaultShortcutPayload, x_key: str = Header(None)):
    verify_key(x_key)
    
    event_type = payload.type
    base_event = strip_suffix(event_type)
    now = now_utc()
    is_end = event_type.endswith("_end")
    
    state = load_state(base_event)
    
    if is_end or state.status != "stopped":
        if state.row_id:
            update_event(state.row_id, now.isoformat())
        state.status = "stopped"
        state.row_id = None
    else:
        row_id = insert_event(base_event, now.isoformat())
        state.status = "running"
        state.row_id = row_id
    
    state.last_change_at = now.isoformat()
    save_state(base_event, state)
    
    return {"status": "ok"}

@app.post("/event/morning_routine")
async def handle_event(payload: MorningRoutinePayload, x_key: str = Header(None)):
    verify_key(x_key)
    
    event_type = payload.type
    base_event = strip_suffix(event_type)
    now = now_utc()
    is_end = event_type.endswith("_end")
    
    state = load_state(base_event)
    
    if is_end or state.status != "stopped":
        if state.row_id:
            update_event(state.row_id, now.isoformat())
        state.status = "stopped"
        state.row_id = None
    else:
        row_id = insert_event(base_event, now.isoformat())
        state.status = "running"
        state.row_id = row_id
    
    state.last_change_at = now.isoformat()
    save_state(base_event, state)
    
    return {"status": "ok"}

@app.post("/activity")
async def handle_activity(payload: ActivityPayload, x_key: str = Header(None)):
    verify_key(x_key)
    insert_event(f"activity_{payload.source}", now_utc().isoformat())
    return {"status": "ok"}

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def get_last_event(event_name: str) -> Optional[dict]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM events WHERE event_name = ? ORDER BY id DESC LIMIT 1", (event_name,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def get_today_activities() -> list:
    today = now_denver().date().isoformat()
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM events WHERE event_name LIKE 'activity_%' AND start_time LIKE ?", (f"{today}%",))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_events_this_week(event_name: Optional[str] = None) -> list:
    today = now_utc().date()
    week_ago = today - timedelta(days=7)
    conn = get_db_connection()
    c = conn.cursor()
    if event_name:
        c.execute("SELECT * FROM events WHERE event_name = ? AND start_time >= ?", 
                  (event_name, week_ago.isoformat()))
    else:
        c.execute("SELECT * FROM events WHERE start_time >= ?", (week_ago.isoformat(),))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_current_context() -> str:
    contexts = ["home", "school", "work", "run", "lift", "muay_thai"]
    for ctx in contexts:
        state = load_state(ctx)
        if state.status == "running":
            return ctx
    return "unknown"

def get_total_activity_minutes_today() -> int:
    activities = get_today_activities()
    total_seconds = 0
    for activity in activities:
        duration = activity.get("duration_seconds")
        if duration:
            total_seconds += duration
    return total_seconds // 60

def convert_to_denver(dt_str: str) -> str:
    if not dt_str:
        return dt_str
    try:
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt_utc = dt.replace(tzinfo=timezone.utc)
        else:
            dt_utc = dt.astimezone(timezone.utc)
        dt_denver = dt_utc.astimezone(DENVER_TZ)
        return dt_denver.strftime("%Y-%m-%dT%H:%M:%S")
    except:
        return dt_str

@app.get("/status")
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
