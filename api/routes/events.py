from fastapi import APIRouter, Header, UploadFile, File, Form, BackgroundTasks
from typing import Optional
from config import PROGRESS_DIR, JOURNAL_DIR
from auth import verify_key
from db import insert_event, update_event_end_time
from utils import strip_suffix, load_state, save_state, now_utc, align_photo_inplace
from models import DefaultShortcutPayload, ActivityPayload, AWBatchPayload
from services.journal import process_evening_routine
import shutil
import uuid
import json

router = APIRouter()


@router.post("/event")
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


@router.post("/event/morning_routine")
async def handle_morning_routine(
    background_tasks: BackgroundTasks,
    type: str = Form(...),
    photo: UploadFile = File(...),
    weight: Optional[float] = Form(None),
    x_key: str = Header(None)
):
    verify_key(x_key)

    file_extension = photo.filename.split('.')[-1] if '.' in photo.filename else 'jpg'
    unique_filename = f"{now_utc().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = f"{PROGRESS_DIR}/{unique_filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    base_event = strip_suffix(type)
    now = now_utc()

    db_media_path = f"data/media/photos/progress/{unique_filename}"
    metadata = json.dumps({"weight": weight}) if weight is not None else None
    row_id = insert_event(base_event, now.isoformat(), media_path=db_media_path, metadata=metadata)

    background_tasks.add_task(align_photo_inplace, file_path)

    return {"status": "ok", "file_saved": db_media_path, "row_id": row_id}


@router.post("/event/evening_routine")
async def handle_evening_routine(
    background_tasks: BackgroundTasks,
    type: str = Form(...),
    audio: UploadFile = File(...),
    x_key: str = Header(None)
):
    verify_key(x_key)

    file_extension = audio.filename.split('.')[-1]
    unique_filename = f"{now_utc().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = f"{JOURNAL_DIR}/{unique_filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)

    base_event = strip_suffix(type)
    now = now_utc()
    db_media_path = f"data/media/audio/journal/{unique_filename}"

    row_id = insert_event(base_event, now.isoformat(), media_path=db_media_path)

    background_tasks.add_task(process_evening_routine, row_id, file_path)

    return {"status": "ok", "file_saved": db_media_path, "processing": "background"}


@router.post("/activity")
async def handle_activity(payload: ActivityPayload, x_key: str = Header(None)):
    verify_key(x_key)
    insert_event(f"activity_{payload.source}", now_utc().isoformat())
    return {"status": "ok"}


@router.post("/activity/sync")
async def sync_activity(payload: AWBatchPayload, x_key: str = Header(None)):
    verify_key(x_key)
    from db import get_db_connection
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
