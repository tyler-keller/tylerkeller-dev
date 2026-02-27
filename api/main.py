from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime, timedelta
from dotenv import load_dotenv
from typing import Optional
import sqlite3
import json
import os
import re

load_dotenv()

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

BASE_DIR = "/var/www/tylerkeller-dev/api"

DATA_DIR = os.path.join(BASE_DIR, "data")
STATES_DIR = os.path.join(DATA_DIR, "states")
ENV_FILE = os.path.join(BASE_DIR, ".ENV")

DEV_DB_FILE = os.path.join(DATA_DIR, "dev.db")
PROD_DB_FILE = os.path.join(DATA_DIR, "history.db")
STATUS_FILE = os.path.join(DATA_DIR, "status.json") 

IS_DEV = os.environ.get("APP-ENV") == "dev"
DB_FILE = DEV_DB_FILE if IS_DEV else PROD_DB_FILE

SECRET_KEY = os.environ.get("SECRET-KEY")

class ShortcutPayload(BaseModel):
    type: str

class ActivityPayload(BaseModel):
    source: str
    duration_seconds: int

class ToggleState(BaseModel):
    status: str
    last_change_at: str
    row_id: Optional[int] = None

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
async def handle_event(payload: ShortcutPayload, x_key: str = Header(None)):
    verify_key(x_key)
    
    event_type = payload.type
    base_event = strip_suffix(event_type)
    now = datetime.now()
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
    insert_event(f"activity_{payload.source}", datetime.now().isoformat())
    return {"status": "ok"}
