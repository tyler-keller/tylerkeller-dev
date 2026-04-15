from datetime import datetime, timedelta
from config import DENVER_TZ, UTC_TZ, PRODUCE_APPS, BROWSER_APPS, SYSTEM_NOISE
from db import get_db_connection
from services.sheet import get_daily_sheet_data
import json


def get_score_data() -> list:
    sheet_list = get_daily_sheet_data()
    sheet = {d["date"]: d for d in sheet_list}

    conn = get_db_connection()
    c = conn.cursor()

    c.execute(
        "SELECT timestamp, duration, data FROM aw_events "
        "WHERE bucket LIKE 'aw-watcher-window%' ORDER BY timestamp ASC"
    )
    aw_rows = c.fetchall()

    c.execute("SELECT timestamp, mg_dl FROM cgm_readings ORDER BY timestamp ASC")
    cgm_rows = c.fetchall()

    c.execute(
        "SELECT start_time FROM events WHERE event_name = 'insulin' ORDER BY start_time ASC"
    )
    insulin_rows = c.fetchall()
    conn.close()

    # AW: produce and youtube minutes per day
    aw_by_day: dict = {}
    for row in aw_rows:
        ts = datetime.fromisoformat(row["timestamp"])
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=UTC_TZ)
        dk = ts.astimezone(DENVER_TZ).date().isoformat()
        if dk not in aw_by_day:
            aw_by_day[dk] = {"produce": 0.0, "youtube": 0.0}
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
            aw_by_day[dk]["produce"] += mins
        elif app in BROWSER_APPS and "YouTube" in title:
            aw_by_day[dk]["youtube"] += mins

    # CGM: readings per day (UTC → Denver date)
    cgm_by_day: dict = {}
    for row in cgm_rows:
        ts = datetime.fromisoformat(row["timestamp"])
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=UTC_TZ)
        dk = ts.astimezone(DENVER_TZ).date().isoformat()
        cgm_by_day.setdefault(dk, []).append({"ts": ts, "mg_dl": row["mg_dl"]})

    # Insulin event timestamps (UTC)
    insulin_times = []
    for row in insulin_rows:
        ts = datetime.fromisoformat(row["start_time"])
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=UTC_TZ)
        insulin_times.append(ts)

    # Lift-week counts: ISO week → lift count
    lift_weeks: dict = {}
    for dk, day in sheet.items():
        if day.get("lift"):
            iso = datetime.fromisoformat(dk).date().isocalendar()
            wk = f"{iso.year}-W{iso.week:02d}"
            lift_weeks[wk] = lift_weeks.get(wk, 0) + 1

    # Union of all known dates
    all_dates = sorted(set(list(sheet.keys()) + list(aw_by_day.keys()) + list(cgm_by_day.keys())))

    results = []
    for dk in all_dates:
        day = sheet.get(dk, {})
        aw  = aw_by_day.get(dk)
        cgm = cgm_by_day.get(dk, [])

        hit = bool(day.get("morning_routine") and day.get("evening_routine"))

        produce_mins = round(aw["produce"]) if aw else 0
        youtube_mins = round(aw["youtube"]) if aw else 0

        bonus_produce = bool(aw and produce_mins > youtube_mins and produce_mins > 0)
        bonus_no_yt   = bool(aw and youtube_mins < 60)
        bonus_cardio  = bool(day.get("muay_thai") or day.get("run"))

        iso = datetime.fromisoformat(dk).date().isocalendar()
        wk  = f"{iso.year}-W{iso.week:02d}"
        bonus_lift_week = lift_weeks.get(wk, 0) >= 3

        tir_pct       = None
        bonus_tir     = False
        bonus_insulin = False

        if len(cgm) >= 8:
            in_range = sum(1 for r in cgm if 70 <= r["mg_dl"] <= 180)
            tir_pct  = round(in_range / len(cgm) * 100)
            bonus_tir = tir_pct >= 70

            readings = sorted(cgm, key=lambda r: r["ts"])
            bonus_insulin = True
            in_spike = readings[0]["mg_dl"] > 180
            for r in readings[1:]:
                was_low  = not in_spike
                now_high = r["mg_dl"] > 180
                if was_low and now_high:
                    window = r["ts"] - timedelta(minutes=60)
                    if not any(window <= t <= r["ts"] for t in insulin_times):
                        bonus_insulin = False
                        break
                in_spike = now_high

        bonuses = {
            "produce":   bonus_produce,
            "no_yt":     bonus_no_yt,
            "cardio":    bonus_cardio,
            "lift_week": bonus_lift_week,
            "tir":       bonus_tir,
            "insulin":   bonus_insulin,
        }
        bonus_count = sum(1 for v in bonuses.values() if v)

        results.append({
            "date":        dk,
            "hit":         hit,
            "has_data":    bool(day),
            "bonuses":     bonuses,
            "bonus_count": bonus_count,
            "details": {
                "morning_routine": bool(day.get("morning_routine")),
                "evening_routine": bool(day.get("evening_routine")),
                "produce_mins":    produce_mins,
                "youtube_mins":    youtube_mins,
                "tir_pct":         tir_pct,
                "lifts_this_week": lift_weeks.get(wk, 0),
                "cardio_type": (
                    "muay thai" if day.get("muay_thai") else
                    "run"       if day.get("run")       else None
                ),
            },
        })

    results.sort(key=lambda d: d["date"], reverse=True)
    return results
