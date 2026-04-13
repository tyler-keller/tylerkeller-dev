from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from pydantic import BaseModel
from zoneinfo import ZoneInfo
from typing import Optional
from groq import Groq
import requests
import sqlite3
import secrets
import shutil
import uuid
import json
import os

load_dotenv()

IS_DEV = os.environ.get("APP-ENV") == "dev"
SECRET_KEY = os.environ.get("SECRET-KEY")
TODOIST_API_KEY = os.getenv("TODOIST_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

DENVER_TZ = ZoneInfo("America/Denver")
UTC_TZ = ZoneInfo("UTC")

BASE_DIR = "/var/www/tylerkeller-dev/api"

DATA_DIR = os.path.join(BASE_DIR, "data")
STATES_DIR = os.path.join(DATA_DIR, "states")

DEV_DB_FILE = os.path.join(DATA_DIR, "dev.db")
PROD_DB_FILE = os.path.join(DATA_DIR, "prod.db")
DB_FILE = DEV_DB_FILE if IS_DEV else PROD_DB_FILE
STATUS_FILE = os.path.join(DATA_DIR, "status.json") 

MEDIA_DIR = os.path.join(DATA_DIR, "media")
PHOTOS_DIR = os.path.join(MEDIA_DIR, "photos")
AUDIO_DIR = os.path.join(MEDIA_DIR, "audio")

LEGACY_DIR = os.path.join(PHOTOS_DIR, "legacy")
PROGRESS_DIR = os.path.join(PHOTOS_DIR, "progress")
JOURNAL_DIR = os.path.join(AUDIO_DIR, "journal")

WHISPER_MODEL = "whisper-large-v3"
LLM_MODEL = "openai/gpt-oss-120b"

client = Groq(
    api_key=GROQ_API_KEY,
)

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

class DefaultShortcutPayload(BaseModel):
    type: str

class ActivityPayload(BaseModel):
    source: str
    duration_seconds: int

class AWEventItem(BaseModel):
    timestamp: str
    duration: float
    data: dict

class AWBatchPayload(BaseModel):
    machine: str
    bucket: str
    events: list[AWEventItem]

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
    c.execute("PRAGMA journal_mode=WAL")
    c.execute('''CREATE TABLE IF NOT EXISTS events
                (id INTEGER PRIMARY KEY, event_name TEXT, start_time TEXT, end_time TEXT, media_path TEXT, metadata TEXT)''')

    # safely attempt to add the column if it doesn't exist in an older database
    try:
        c.execute("ALTER TABLE events ADD COLUMN metadata TEXT")
    except sqlite3.OperationalError:
        pass

    c.execute('''CREATE TABLE IF NOT EXISTS aw_events (
                id        INTEGER PRIMARY KEY,
                machine   TEXT    NOT NULL,
                bucket    TEXT    NOT NULL,
                timestamp TEXT    NOT NULL,
                duration  REAL    NOT NULL,
                data      TEXT    NOT NULL,
                UNIQUE(machine, bucket, timestamp)
            )''')
    c.execute("CREATE INDEX IF NOT EXISTS idx_aw_machine_bucket ON aw_events (machine, bucket)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_aw_timestamp ON aw_events (timestamp)")

    conn.commit()
    conn.close()

def insert_event(event_name: str, start_time: str, end_time: Optional[str] = None, media_path: Optional[str] = None, metadata: Optional[str] = None) -> int:
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO events (event_name, start_time, end_time, media_path, metadata) VALUES (?, ?, ?, ?, ?)",
              (event_name, start_time, end_time, media_path, metadata))
    row_id = c.lastrowid
    conn.commit()
    conn.close()
    return row_id or 0

def update_event_end_time(row_id: int, end_time: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE events SET end_time = ? WHERE id = ?", (end_time, row_id))
    conn.commit()
    conn.close()

def update_event_metadata(row_id: int, metadata_dict: dict):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE events SET metadata = ? WHERE id = ?", (json.dumps(metadata_dict), row_id))
    conn.commit()
    conn.close()

init_db()

def verify_key(x_key: str = Header(None)):
    if not x_key or not secrets.compare_digest(x_key, SECRET_KEY):
        raise HTTPException(status_code=401, detail="Invalid key")

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
    
    if is_end or state.status != "stopped" or event_type in ['morning_routine', 'evening_routine', 'insulin']:
        if state.row_id:
            update_event_end_time(state.row_id, now.isoformat())
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
async def handle_morning_routine(
    type: str = Form(...),
    photo: UploadFile = File(...),
    weight: Optional[float] = Form(None),
    x_key: str = Header(None)
):
    verify_key(x_key)
    
    file_extension = photo.filename.split('.')[-1] if '.' in photo.filename else 'jpg'
    unique_filename = f"{now_utc().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = os.path.join(PROGRESS_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
        
    base_event = strip_suffix(type)
    now = now_utc()
    
    db_media_path = f"data/media/photos/progress/{unique_filename}"
    
    metadata = json.dumps({"weight": weight}) if weight is not None else None
    row_id = insert_event(base_event, now.isoformat(), media_path=db_media_path, metadata=metadata)
    
    return {"status": "ok", "file_saved": db_media_path, "row_id": row_id}

# update the endpoint to use the background task
@app.post("/event/evening_routine")
async def handle_evening_routine(
    background_tasks: BackgroundTasks,
    type: str = Form(...),
    audio: UploadFile = File(...),
    x_key: str = Header(None)
):
    verify_key(x_key)
    
    file_extension = audio.filename.split('.')[-1]
    unique_filename = f"{now_utc().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = os.path.join(JOURNAL_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
        
    base_event = strip_suffix(type)
    now = now_utc()
    db_media_path = f"data/media/audio/journal/{unique_filename}"
    
    row_id = insert_event(base_event, now.isoformat(), media_path=db_media_path)
    
    # background task... so shortcut doesn't hang while a 10 min ting is transcribed
    background_tasks.add_task(process_evening_routine, row_id, file_path)
    
    return {"status": "ok", "file_saved": db_media_path, "processing": "background"}
    
# background worker
def process_evening_routine(row_id: int, file_path: str):
    with open(file_path, "rb") as file:
        transcription = client.audio.transcriptions.create(
            file=(file_path, file.read()),
            model=WHISPER_MODEL,
            temperature=0,
            response_format="json",
            language="en"
        )
    
    text = transcription.text
    
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {
                "role": "system", 
                "content": "Summarize the journal entry. Extract any relevant tags (i.e. 'work', 'health', 'fitness', 'relationships', 'social', 'learning', 'growth', etc.). Extract all tasks that need completion. For task due_strings, use any of the following: 'today', 'tomorrow', 'next week', '<weekday>' (e.g. 'Friday'), '<date>' (e.g. 'April 1st'). If no deadline is implied, use 'today'."
            },
            {
                "role": "user",
                "content": text,
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "journal_summary",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "tasks": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "content": {"type": "string"},
                                    "description": {"type": "string"},
                                    "priority": {"type": "integer", "enum": [1, 2, 3, 4]},
                                    "due_string": {"type": "string"}
                                },
                                "required": ["content", "description", "priority", "due_string"],
                                "additionalProperties": False
                            }
                        }
                    },
                    "required": ["summary", "tags", "tasks"],
                    "additionalProperties": False
                }
            }
        }
    )

    result = json.loads(response.choices[0].message.content or "{}")
    extracted_tasks = result.get("tasks", [])
    
    tasks_created = False
    if extracted_tasks:
        tasks_created = process_todoist_tasks(extracted_tasks)

    metadata = {
        "transcription": text,
        "summary": result.get("summary"),
        "tags": result.get("tags"),
        "tasks_extracted": extracted_tasks, 
        "all_tasks_created": tasks_created
    }
    
    update_event_metadata(row_id, metadata)

def process_todoist_tasks(tasks: list) -> bool:
    if not tasks:
        return False
        
    headers = {
        "Authorization": f"Bearer {TODOIST_API_KEY}",
        "Content-Type": "application/json"
    }
    
    all_successful = True
    
    for task in tasks:
        # the rest api takes a flat json object per task
        payload = {
            "content": task.get("content"),
            "description": task.get("description", ""),
            "priority": task.get("priority", 1),
            "due_string": task.get("due_string", "today") 
        }
        
        try:
            response = requests.post(
                "https://api.todoist.com/api/v1/tasks", 
                json=payload, 
                headers=headers
            )
            response.raise_for_status()
            
        except requests.exceptions.RequestException as e:
            print(f"todoist sync failed for task '{payload['content']}': {e}")
            if response is not None:
                print(f"response body: {response.text}")
            all_successful = False
            
    return all_successful

@app.post("/activity")
async def handle_activity(payload: ActivityPayload, x_key: str = Header(None)):
    verify_key(x_key)
    insert_event(f"activity_{payload.source}", now_utc().isoformat())
    return {"status": "ok"}

@app.post("/activity/sync")
async def sync_activity(payload: AWBatchPayload, x_key: str = Header(None)):
    verify_key(x_key)
    conn = get_db_connection()
    c = conn.cursor()
    inserted = 0
    for ev in payload.events:
        c.execute(
            "INSERT OR IGNORE INTO aw_events (machine, bucket, timestamp, duration, data) VALUES (?, ?, ?, ?, ?)",
            (payload.machine, payload.bucket, ev.timestamp, ev.duration, json.dumps(ev.data))
        )
        inserted += c.rowcount
    conn.commit()
    conn.close()
    return {"inserted": inserted, "received": len(payload.events)}

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

def _ensure_day(days: dict, day_key: str):
    if day_key not in days:
        days[day_key] = {
            "date": day_key,
            "morning_routine": False,
            "evening_routine": False,
            "lift": False,
            "muay_thai": False,
            "run": False,
            "school_minutes": 0,
            "home_minutes": 0,
            "work_minutes": 0,
            "weight": None,
            "segments": []
        }

def _add_timed_segments(days: dict, event_name: str, denver_start, denver_end, minute_key: str | None = None):
    """Split a timed event across all calendar days it spans and add segments + minutes to each."""
    current_date = denver_start.date()
    end_date = denver_end.date()
    while current_date <= end_date:
        dk = current_date.isoformat()
        _ensure_day(days, dk)
        midnight = datetime.combine(current_date, datetime.min.time()).replace(tzinfo=DENVER_TZ)
        next_midnight = midnight + timedelta(days=1)
        seg_start = max(denver_start, midnight)
        seg_end = min(denver_end, next_midnight)
        start_min = int((seg_start - midnight).total_seconds() / 60)
        end_min = int((seg_end - midnight).total_seconds() / 60)
        if minute_key:
            days[dk][minute_key] += end_min - start_min
        if end_min - start_min >= 5:
            days[dk]["segments"].append({"name": event_name, "start": start_min, "end": end_min})
        current_date += timedelta(days=1)

def get_daily_sheet_data() -> list:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM events ORDER BY start_time ASC")
    rows = c.fetchall()
    conn.close()

    days = {}
    for row in rows:
        event = dict(row)
        start_dt = datetime.fromisoformat(event["start_time"])
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=UTC_TZ)
        denver_dt = start_dt.astimezone(DENVER_TZ)
        day_key = denver_dt.date().isoformat()
        _ensure_day(days, day_key)

        event_name = event["event_name"]
        if event_name == "morning_routine":
            days[day_key]["morning_routine"] = True
            if event.get("metadata"):
                try:
                    meta = json.loads(event["metadata"])
                    if meta.get("weight"):
                        days[day_key]["weight"] = float(meta["weight"])
                except (json.JSONDecodeError, TypeError):
                    pass
        elif event_name == "evening_routine":
            days[day_key]["evening_routine"] = True
        elif event_name == "lift":
            days[day_key]["lift"] = True
        elif event_name == "muay_thai":
            days[day_key]["muay_thai"] = True
            if event.get("end_time"):
                end_dt = datetime.fromisoformat(event["end_time"])
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(tzinfo=UTC_TZ)
                denver_end = end_dt.astimezone(DENVER_TZ)
                _add_timed_segments(days, "muay_thai", denver_dt, denver_end)
        elif event_name == "run":
            days[day_key]["run"] = True
        elif event_name == "school":
            if event.get("end_time"):
                end_dt = datetime.fromisoformat(event["end_time"])
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(tzinfo=UTC_TZ)
                denver_end = end_dt.astimezone(DENVER_TZ)
                _add_timed_segments(days, "school", denver_dt, denver_end, "school_minutes")
        elif event_name == "home":
            if event.get("end_time"):
                end_dt = datetime.fromisoformat(event["end_time"])
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(tzinfo=UTC_TZ)
                denver_end = end_dt.astimezone(DENVER_TZ)
                _add_timed_segments(days, "home", denver_dt, denver_end, "home_minutes")
        elif event_name == "work":
            if event.get("end_time"):
                end_dt = datetime.fromisoformat(event["end_time"])
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(tzinfo=UTC_TZ)
                denver_end = end_dt.astimezone(DENVER_TZ)
                _add_timed_segments(days, "work", denver_dt, denver_end, "work_minutes")
    
    sheet = list(days.values())
    sheet.sort(key=lambda d: d["date"], reverse=True)
    
    for day in sheet:
        day["school_hours"] = round(day["school_minutes"] / 60, 2)
        day["home_hours"] = round(day["home_minutes"] / 60, 2)
        day["work_hours"] = round(day["work_minutes"] / 60, 2)
        untracked_minutes = max(0, 1440 - day["home_minutes"] - day["school_minutes"] - day["work_minutes"])
        day["untracked_hours"] = round(untracked_minutes / 60, 2)
    
    return sheet

@app.get("/data/sheet")
def get_data_sheet(x_key: str = Header(None)):
    verify_key(x_key)
    return get_daily_sheet_data()

@app.get("/data/progress_photos")
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

@app.get("/data/media/photos/progress/{filename}")
def serve_progress_photo(filename: str, x_key: str = Header(None)):
    verify_key(x_key)
    from fastapi.responses import FileResponse
    file_path = os.path.join(PROGRESS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(file_path)

@app.get("/data/journals")
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

@app.get("/data/media/audio/journal/{filename}")
def serve_journal_audio(filename: str, x_key: str = Header(None)):
    verify_key(x_key)
    from fastapi.responses import FileResponse
    file_path = os.path.join(JOURNAL_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(file_path)

@app.get("/data/weights")
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