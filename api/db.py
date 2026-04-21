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

    c.execute('''CREATE TABLE IF NOT EXISTS meal_presets (
                id         INTEGER PRIMARY KEY,
                name       TEXT    NOT NULL,
                calories   INTEGER,
                protein_g  REAL,
                carbs_g    REAL,
                fat_g      REAL,
                fiber_g    REAL,
                photo_path TEXT,
                created_at TEXT    NOT NULL
            )''')
    c.execute("CREATE INDEX IF NOT EXISTS idx_meal_presets_name ON meal_presets (name)")

    c.execute('''CREATE TABLE IF NOT EXISTS meals (
                id         INTEGER PRIMARY KEY,
                timestamp  TEXT    NOT NULL,
                meal_type  TEXT,
                preset_id  INTEGER,
                servings   REAL    DEFAULT 1.0,
                name       TEXT,
                calories   INTEGER,
                protein_g  REAL,
                carbs_g    REAL,
                fat_g      REAL,
                fiber_g    REAL,
                photo_path TEXT,
                notes      TEXT,
                metadata   TEXT
            )''')
    c.execute("CREATE INDEX IF NOT EXISTS idx_meals_timestamp ON meals (timestamp)")

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


def insert_meal_preset(name: str, calories: Optional[int], protein_g: Optional[float],
                       carbs_g: Optional[float], fat_g: Optional[float], fiber_g: Optional[float],
                       photo_path: Optional[str] = None, created_at: Optional[str] = None) -> int:
    from datetime import datetime, timezone
    if created_at is None:
        created_at = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO meal_presets (name, calories, protein_g, carbs_g, fat_g, fiber_g, photo_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (name, calories, protein_g, carbs_g, fat_g, fiber_g, photo_path, created_at)
    )
    row_id = c.lastrowid
    conn.commit()
    conn.close()
    return row_id or 0


def get_meal_presets() -> list:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id, name, calories, protein_g, carbs_g, fat_g, fiber_g FROM meal_presets ORDER BY name ASC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_meal_preset_by_id(preset_id: int) -> Optional[dict]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM meal_presets WHERE id = ?", (preset_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def insert_meal(timestamp: str, meal_type: Optional[str], preset_id: Optional[int],
                servings: float, name: Optional[str], calories: Optional[int],
                protein_g: Optional[float], carbs_g: Optional[float], fat_g: Optional[float],
                fiber_g: Optional[float], photo_path: Optional[str] = None,
                notes: Optional[str] = None, metadata: Optional[str] = None) -> int:
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        """INSERT INTO meals (timestamp, meal_type, preset_id, servings, name, calories,
           protein_g, carbs_g, fat_g, fiber_g, photo_path, notes, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (timestamp, meal_type, preset_id, servings, name, calories,
         protein_g, carbs_g, fat_g, fiber_g, photo_path, notes, metadata)
    )
    row_id = c.lastrowid
    conn.commit()
    conn.close()
    return row_id or 0


def get_meals(since_iso: str) -> list:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM meals WHERE timestamp >= ? ORDER BY timestamp DESC", (since_iso,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_daily_nutrition(since_iso: str) -> list:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT
            date(datetime(timestamp, 'localtime')) AS date,
            SUM(calories)  AS total_calories,
            SUM(protein_g) AS total_protein_g,
            SUM(carbs_g)   AS total_carbs_g,
            SUM(fat_g)     AS total_fat_g,
            SUM(fiber_g)   AS total_fiber_g,
            COUNT(*)       AS meal_count
        FROM meals
        WHERE timestamp >= ?
        GROUP BY date(datetime(timestamp, 'localtime'))
        ORDER BY date DESC
    """, (since_iso,))
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
