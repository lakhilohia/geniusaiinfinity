#!/usr/bin/env python3
"""
Offline Reminder App - background daemon.

Keeps running and checks every `check_interval_seconds` whether any task's
reminder is due; if so, it e-mails you. Leave this running (e.g. in Termux
with `python daemon.py`, ideally kept awake with termux-wake-lock).

Run:  python daemon.py
"""

import time
from datetime import datetime

import reminder


def run():
    cfg = reminder.load_config()
    interval = int(cfg.get("check_interval_seconds", 60))
    print(f"[{datetime.now():%Y-%m-%d %H:%M}] Reminder daemon started.")
    print(f"  Checking every {interval}s. Emails go to: {cfg['recipient_email']}")
    print("  Press Ctrl+C to stop.\n")

    while True:
        # Reload config each loop so edits take effect without a restart.
        cfg = reminder.load_config()
        results = reminder.check_and_send(cfg)
        for title, ok, info in results:
            stamp = f"{datetime.now():%Y-%m-%d %H:%M}"
            if ok:
                print(f"[{stamp}] ✔ Reminder emailed: {title}")
            else:
                print(f"[{stamp}] ! FAILED for '{title}': {info}")
        time.sleep(int(cfg.get("check_interval_seconds", 60)))


if __name__ == "__main__":
    try:
        run()
    except (KeyboardInterrupt, EOFError):
        print("\nDaemon stopped.\n")
