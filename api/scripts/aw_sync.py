#!/usr/bin/env python3
"""
ActivityWatch → tylerkeller.dev sync daemon.

Queries the local ActivityWatch API, pushes window + AFK events to the
dashboard server in batches.  Tracks a per-bucket cursor so each run only
ships new events; the server uses INSERT OR IGNORE so concurrent pushes from
multiple machines are safe.

────────────────────────────────────────────────────────────────────────────
REQUIRED ENV VARS
  AW_SYNC_KEY   your dashboard API key (same as the X-Key header)
  AW_SYNC_URL   dashboard API base URL  (default: https://api.tylerkeller.dev)

OPTIONAL ENV VARS
  AW_URL            local ActivityWatch URL  (default: http://localhost:5600)
  AW_SYNC_MACHINE   hostname label sent with each batch (default: system hostname)
  AW_SYNC_INTERVAL  seconds between syncs in daemon mode  (default: 300)

USAGE
  python aw_sync.py          # daemon — loops forever
  python aw_sync.py --once   # one-shot sync and exit
  python aw_sync.py --reset  # wipe cursor and re-sync everything, then exit

────────────────────────────────────────────────────────────────────────────
STARTUP — macOS (launchd)

  1. Copy the template plist from this directory:
       cp dev.tylerkeller.aw-sync.plist ~/Library/LaunchAgents/
  2. Edit it to set your AW_SYNC_KEY and paths.
  3. Load it:
       launchctl load ~/Library/LaunchAgents/dev.tylerkeller.aw-sync.plist

────────────────────────────────────────────────────────────────────────────
STARTUP — Linux (systemd user service)

  Create ~/.config/systemd/user/aw-sync.service:

    [Unit]
    Description=ActivityWatch → tylerkeller.dev sync
    After=network-online.target

    [Service]
    Type=simple
    Environment="AW_SYNC_KEY=<your-key>"
    Environment="AW_SYNC_URL=https://api.tylerkeller.dev"
    ExecStart=/usr/bin/python3 /path/to/api/scripts/aw_sync.py
    Restart=on-failure
    RestartSec=60

    [Install]
    WantedBy=default.target

  Then:
    systemctl --user daemon-reload
    systemctl --user enable --now aw-sync
    systemctl --user status aw-sync

────────────────────────────────────────────────────────────────────────────
"""

import os
import sys
import json
import time
import socket
import argparse
import logging
from datetime import datetime, timedelta
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("requests is required: pip install requests")

# ── config ───────────────────────────────────────────────────────────────────
AW_URL         = os.getenv("AW_URL", "http://localhost:5600")
SERVER_URL      = os.getenv("AW_SYNC_URL", "https://api.tylerkeller.dev")
API_KEY         = os.getenv("AW_SYNC_KEY", "")
MACHINE         = os.getenv("AW_SYNC_MACHINE", socket.gethostname())
SYNC_INTERVAL   = int(os.getenv("AW_SYNC_INTERVAL", "300"))
BATCH_SIZE      = 500
CURSOR_FILE     = Path.home() / ".config" / "aw-sync" / "cursor.json"

# bucket type prefixes to sync — covers window watcher and AFK watcher
BUCKET_PREFIXES = ("aw-watcher-window", "aw-watcher-afk")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("aw-sync")


# ── cursor persistence ────────────────────────────────────────────────────────

def load_cursor() -> dict:
    if CURSOR_FILE.exists():
        try:
            return json.loads(CURSOR_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def save_cursor(cursor: dict):
    CURSOR_FILE.parent.mkdir(parents=True, exist_ok=True)
    CURSOR_FILE.write_text(json.dumps(cursor, indent=2))


# ── ActivityWatch API ─────────────────────────────────────────────────────────

def get_buckets() -> list[dict]:
    r = requests.get(f"{AW_URL}/api/0/buckets", timeout=10)
    r.raise_for_status()
    return list(r.json().values())


def get_events(bucket_id: str, since: str | None) -> list[dict]:
    params: dict = {"limit": 10000}
    if since:
        params["start"] = since
    r = requests.get(
        f"{AW_URL}/api/0/buckets/{bucket_id}/events",
        params=params,
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


# ── dashboard API ─────────────────────────────────────────────────────────────

def push_batch(bucket: str, events: list[dict]) -> int:
    payload = {
        "machine": MACHINE,
        "bucket": bucket,
        "events": [
            {
                "timestamp": e["timestamp"],
                "duration": float(e["duration"]),
                "data": e["data"],
            }
            for e in events
        ],
    }
    r = requests.post(
        f"{SERVER_URL}/activity/sync",
        json=payload,
        headers={"X-Key": API_KEY},
        timeout=30,
    )
    r.raise_for_status()
    return r.json().get("inserted", 0)


# ── sync logic ────────────────────────────────────────────────────────────────

def sync_once(cursor: dict) -> dict:
    try:
        buckets = get_buckets()
    except requests.RequestException as e:
        log.warning(f"ActivityWatch not reachable: {e}")
        return cursor

    for bucket in buckets:
        bucket_id: str = bucket["id"]

        if not any(bucket_id.startswith(p) for p in BUCKET_PREFIXES):
            continue

        since = cursor.get(bucket_id)

        try:
            events = get_events(bucket_id, since)
        except requests.RequestException as e:
            log.warning(f"{bucket_id}: fetch failed — {e}")
            continue

        if not events:
            log.debug(f"{bucket_id}: no new events")
            continue

        total_inserted = 0
        failed = False
        for i in range(0, len(events), BATCH_SIZE):
            chunk = events[i : i + BATCH_SIZE]
            try:
                total_inserted += push_batch(bucket_id, chunk)
            except requests.RequestException as e:
                log.warning(f"{bucket_id}: push failed at offset {i} — {e}")
                failed = True
                break

        if not failed:
            # advance cursor past the latest timestamp to skip re-fetching
            latest_ts = max(e["timestamp"] for e in events)
            latest_dt = datetime.fromisoformat(latest_ts.replace("Z", "+00:00"))
            cursor[bucket_id] = (latest_dt + timedelta(milliseconds=1)).isoformat()
            save_cursor(cursor)

        log.info(
            f"{bucket_id}: {len(events)} fetched, {total_inserted} new"
            + (" (partial — push error)" if failed else "")
        )

    return cursor


# ── entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Sync ActivityWatch to tylerkeller.dev")
    parser.add_argument("--once", action="store_true", help="sync once and exit")
    parser.add_argument("--reset", action="store_true", help="wipe cursor, re-sync all history, then exit")
    args = parser.parse_args()

    if not API_KEY:
        sys.exit("AW_SYNC_KEY env var is required")

    if args.reset:
        if CURSOR_FILE.exists():
            CURSOR_FILE.unlink()
            log.info("cursor wiped — will re-sync full history")
        sync_once({})
        return

    if args.once:
        sync_once(load_cursor())
        return

    log.info(f"aw-sync daemon started  machine={MACHINE}  interval={SYNC_INTERVAL}s")
    while True:
        try:
            sync_once(load_cursor())
        except Exception as e:
            log.error(f"unexpected error: {e}")
        time.sleep(SYNC_INTERVAL)


if __name__ == "__main__":
    main()
