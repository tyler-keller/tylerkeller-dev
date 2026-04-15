from datetime import datetime, timedelta
from config import DENVER_TZ, UTC_TZ, PRODUCE_APPS, BROWSER_APPS, SYSTEM_NOISE
from db import get_db_connection
import json


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
            "segments": [],
            "produce_mins": 0,
            "youtube_mins": 0,
            "browser_mins": 0,
            "has_aw_data": False,
            "aw_segments": [],
        }


def _merge_aw_segments(segments: list) -> list:
    """Sort and merge adjacent same-category AW segments (gap ≤ 2 min)."""
    if not segments:
        return []
    segs = sorted(segments, key=lambda s: s["start"])
    merged = [dict(segs[0])]
    for s in segs[1:]:
        last = merged[-1]
        if last["category"] == s["category"] and s["start"] - last["end"] <= 2:
            last["end"] = max(last["end"], s["end"])
        else:
            merged.append(dict(s))
    return merged


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
    c.execute(
        "SELECT timestamp, duration, data FROM aw_events "
        "WHERE bucket LIKE 'aw-watcher-window%' ORDER BY timestamp ASC"
    )
    aw_rows = c.fetchall()
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

    # AW enrichment: produce / youtube / browser per day + timeline segments
    aw_day_mins: dict = {}
    aw_day_segs: dict = {}

    for row in aw_rows:
        ts = datetime.fromisoformat(row["timestamp"])
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=UTC_TZ)
        denver_start = ts.astimezone(DENVER_TZ)
        dk = denver_start.date().isoformat()

        try:
            data = json.loads(row["data"])
        except (json.JSONDecodeError, TypeError):
            continue

        app   = data.get("app") or ""
        title = data.get("title") or ""
        mins  = row["duration"] / 60

        if not app or app in SYSTEM_NOISE:
            continue

        if app in PRODUCE_APPS:
            category = "produce"
        elif app in BROWSER_APPS:
            category = "youtube" if "YouTube" in title else "browser"
        else:
            continue

        aw_day_mins.setdefault(dk, {"produce": 0.0, "youtube": 0.0, "browser": 0.0})
        aw_day_mins[dk][category if category != "youtube" else "youtube"] += mins

        midnight  = datetime.combine(denver_start.date(), datetime.min.time()).replace(tzinfo=DENVER_TZ)
        start_min = max((denver_start - midnight).total_seconds() / 60, 0)
        end_min   = min(start_min + mins, 1440)
        if end_min - start_min >= 0.5:
            aw_day_segs.setdefault(dk, []).append({
                "category": category,
                "start": round(start_min, 1),
                "end":   round(end_min, 1),
            })

    for dk in days:
        aw = aw_day_mins.get(dk)
        days[dk]["has_aw_data"]  = aw is not None
        days[dk]["produce_mins"] = round(aw["produce"])  if aw else 0
        days[dk]["youtube_mins"] = round(aw["youtube"])  if aw else 0
        days[dk]["browser_mins"] = round(aw["browser"])  if aw else 0
        days[dk]["aw_segments"]  = _merge_aw_segments(aw_day_segs.get(dk, []))

    sheet = list(days.values())
    sheet.sort(key=lambda d: d["date"], reverse=True)

    for day in sheet:
        day["school_hours"]    = round(day["school_minutes"] / 60, 2)
        day["home_hours"]      = round(day["home_minutes"] / 60, 2)
        day["work_hours"]      = round(day["work_minutes"] / 60, 2)
        day["produce_hours"]   = round(day["produce_mins"] / 60, 2)
        day["consume_hours"]   = round((day["youtube_mins"] + day["browser_mins"]) / 60, 2)
        untracked_minutes      = max(0, 1440 - day["home_minutes"] - day["school_minutes"] - day["work_minutes"])
        day["untracked_hours"] = round(untracked_minutes / 60, 2)

    return sheet
