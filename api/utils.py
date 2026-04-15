from datetime import datetime, timezone
from config import DENVER_TZ, UTC_TZ, STATES_DIR, ALIGN_SCRIPT
from models import ToggleState
import subprocess
import json
import os


def now_denver():
    return datetime.now(DENVER_TZ)


def now_utc():
    return datetime.now(UTC_TZ)


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
    except Exception:
        return dt_str


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


def get_current_context() -> str:
    contexts = ["home", "school", "work", "run", "lift", "muay_thai"]
    for ctx in contexts:
        state = load_state(ctx)
        if state.status == "running":
            return ctx
    return "unknown"


def align_photo_inplace(file_path: str):
    """Run align_photos.py --in-place on a single file. Fails silently if deps unavailable."""
    try:
        result = subprocess.run(
            ["python3", ALIGN_SCRIPT, file_path, "--in-place"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode != 0:
            print(f"[align] failed for {file_path}: {result.stderr.strip()}")
        else:
            print(f"[align] {result.stdout.strip()}")
    except Exception as e:
        print(f"[align] skipped ({e})")
