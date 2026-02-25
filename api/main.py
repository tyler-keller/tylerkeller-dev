from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import sqlite3
import json
import os
import re

# --- cors (allow dashboard to talk to api) ---

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

# --- config ---
BASE_DIR = "/var/www/tylerkeller-dev/api"

DATA_DIR = os.path.join(BASE_DIR, "data")
ENV_FILE = os.path.join(BASE_DIR, ".ENV")

DB_FILE = os.path.join(DATA_DIR, "history.db")
print(DB_FILE)
RUN_STATE_FILE = os.path.join(DATA_DIR, "run.json")
LIFT_STATE_FILE = os.path.join(DATA_DIR, "lift.json")
STATUS_FILE = os.path.join(DATA_DIR, "status.json") 

# --- models ---
class ShortcutPayload(BaseModel):
    type: str

class ActivityPayload(BaseModel):
    source: str
    duration_seconds: int

class ToggleState(BaseModel):
    status: str  # "running", "lifting", "stopped"
    last_change_at: str

# --- database (append-only log) ---
def log_event(event_type: str, details: Optional[str] = None):
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS events 
                     (id INTEGER PRIMARY KEY, timestamp TEXT, event_type TEXT, details TEXT)''')
        c.execute("INSERT INTO events (timestamp, event_type, details) VALUES (?, ?, ?)",
                  (datetime.now().isoformat(), event_type, details))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"db error: {e}")

# --- file helpers ---
def load_toggle_state(filepath: str, default_status: str = "stopped") -> ToggleState:
    with open(filepath, 'r') as f:
        return ToggleState(**json.load(f))

def save_toggle_state(filepath: str, state: ToggleState):
    print(state.model_dump())
    with open(filepath, 'w') as f:
        json.dump(state.model_dump(), f)

# --- auth ---
def get_secret(name):
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE) as f:
            content = f.read()
            match = re.search(rf'{name}="([^"]+)"', content)
            if match: return match.group(1)
    return None

SECRET_KEY = get_secret('SECRET-KEY')

def verify_key(x_key: str = Header(None)):
    if x_key != SECRET_KEY:
        raise HTTPException(401, "Invalid key")

# --- core logic ---

@app.get("/version")
def version():
    return {"version": "v1.0.0-firstgit"}

@app.post("/login")
def login(x_key: str = Header(None)):
    verify_key(x_key)
    return {"status": "ok"}

@app.post("/event")
async def handle_event(payload: ShortcutPayload, x_key: str = Header(None)):
    verify_key(x_key)
    
    now = datetime.now()
    event_type = payload.type
    
    # --- run toggle ---
    if event_type == "run":
        state = load_toggle_state(RUN_STATE_FILE, "stopped")
        last_time = datetime.fromisoformat(state.last_change_at)
        
        event_to_log = None
        details_to_log = None

        if state.status == "running":
            if now - last_time < timedelta(hours=2):
                # meaningful stop
                state.status = "stopped"
                state.last_change_at = now.isoformat()
                event_to_log = "run_end"
            else:
                # stale run -> auto-close old one, start new one
                # we log the cleanup immediately because it refers to the PAST event
                log_event("run_end", "auto_closed_stale")
                
                state.status = "running"
                state.last_change_at = now.isoformat()
                event_to_log = "run_start"
        else:
            # start new run
            state.status = "running"
            state.last_change_at = now.isoformat()
            event_to_log = "run_start"
            
        # save first. if this crashes, we never log the event below.
        save_toggle_state(RUN_STATE_FILE, state)
        if event_to_log:
            log_event(event_to_log, details_to_log)

    # --- lift toggle ---
    elif event_type == "lift":
        state = load_toggle_state(LIFT_STATE_FILE, "stopped")
        last_time = datetime.fromisoformat(state.last_change_at)
        
        event_to_log = None
        details_to_log = None
        
        if state.status == "lifting":
            if now - last_time < timedelta(hours=2):
                state.status = "stopped"
                state.last_change_at = now.isoformat()
                event_to_log = "lift_end"
            else:
                log_event("lift_end", "auto_closed_stale")
                state.status = "lifting"
                state.last_change_at = now.isoformat()
                event_to_log = "lift_start"
        else:
            state.status = "lifting"
            state.last_change_at = now.isoformat()
            event_to_log = "lift_start"
            
        # save first
        save_toggle_state(LIFT_STATE_FILE, state)
        if event_to_log:
            log_event(event_to_log, details_to_log)

    # --- simple events ---
    else:
        log_event(event_type)

    return {"status": "ok"}

@app.post("/activity")
async def handle_activity(payload: ActivityPayload, x_key: str = Header(None)):
    verify_key(x_key)
    log_event(f"activity_{payload.source}", str(payload.duration_seconds))
    return {"status": "ok"}
