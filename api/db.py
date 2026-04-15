from datetime import datetime, timedelta
from typing import Optional
from config import DB_FILE, DENVER_TZ, UTC_TZ
import sqlite3
import json


def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("PRAGMA journal_mode=WAL")
    c.execute('''CREATE TABLE IF NOT EXISTS events
                (id INTEGER PRIMARY KEY, event_name TEXT, start_time TEXT, end_time TEXT, media_path TEXT, metadata TEXT)''')

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

    c.execute('''CREATE TABLE IF NOT EXISTS cgm_readings (
                id        INTEGER PRIMARY KEY,
                timestamp TEXT    NOT NULL UNIQUE,
                mg_dl     INTEGER NOT NULL,
                trend_direction TEXT NOT NULL
            )''')
    c.execute("CREATE INDEX IF NOT EXISTS idx_cgm_timestamp ON cgm_readings (timestamp)")

    c.execute('''CREATE TABLE IF NOT EXISTS fitbit_sleep (
                id             INTEGER PRIMARY KEY,
                date           TEXT    NOT NULL UNIQUE,
                start_time     TEXT,
                end_time       TEXT,
                duration_ms    INTEGER,
                minutes_asleep INTEGER,
                minutes_awake  INTEGER,
                efficiency     INTEGER,
                stages         TEXT
            )''')
    c.execute("CREATE INDEX IF NOT EXISTS idx_fitbit_sleep_date ON fitbit_sleep (date)")

    conn.commit()
    conn.close()


def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def insert_event(event_name: str, start_time: str, end_time: Optional[str] = None,
                 media_path: Optional[str] = None, metadata: Optional[str] = None) -> int:
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO events (event_name, start_time, end_time, media_path, metadata) VALUES (?, ?, ?, ?, ?)",
        (event_name, start_time, end_time, media_path, metadata)
    )
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


def get_last_event(event_name: str) -> Optional[dict]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM events WHERE event_name = ? ORDER BY id DESC LIMIT 1", (event_name,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def get_events_this_week(event_name: Optional[str] = None) -> list:
    today = datetime.now(UTC_TZ).date()
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


def get_today_activities() -> list:
    today = datetime.now(DENVER_TZ).date().isoformat()
    conn = get_db_connection()
    c = conn.cursor()
    c.execute(
        "SELECT * FROM events WHERE event_name LIKE 'activity_%' AND start_time LIKE ?",
        (f"{today}%",)
    )
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_total_activity_minutes_today() -> int:
    activities = get_today_activities()
    total_seconds = 0
    for activity in activities:
        duration = activity.get("duration_seconds")
        if duration:
            total_seconds += duration
    return total_seconds // 60
