"""
Quick tests for the reminder core logic (no internet / no real email).

Run:  python test_reminder.py
"""

import os
import tempfile
from datetime import datetime, timedelta

import reminder


def _fresh_env():
    tmp = tempfile.mkdtemp()
    reminder.DATA_FILE = os.path.join(tmp, "tasks.json")
    reminder.CONFIG_FILE = os.path.join(tmp, "config.json")


def test_parse_duration():
    assert reminder.parse_duration("30m") == timedelta(minutes=30)
    assert reminder.parse_duration("2h") == timedelta(hours=2)
    assert reminder.parse_duration("1d") == timedelta(days=1)
    assert reminder.parse_duration("nonsense") is None


def test_parse_deadline():
    assert reminder.parse_deadline("2026-07-30 18:00") == datetime(2026, 7, 30, 18, 0)
    assert reminder.parse_deadline("2026-07-30") == datetime(2026, 7, 30, 0, 0)
    assert reminder.parse_deadline("not a date") is None


def test_add_and_reminder_fires_once():
    _fresh_env()
    cfg = reminder.load_config()
    # deadline in 30 min, remind 1h before => due now
    reminder.add_task("Report", datetime.now() + timedelta(minutes=30), "1h")
    # deadline in 5 days => not due
    reminder.add_task("Later", datetime.now() + timedelta(days=5), "1h")

    sent = []
    sender = lambda s, b: (sent.append(s), (True, "ok"))[1]

    first = reminder.check_and_send(cfg, sender=sender)
    assert len(first) == 1 and first[0][1] is True
    assert len(sent) == 1

    # second run must NOT resend
    second = reminder.check_and_send(cfg, sender=sender)
    assert second == []


def test_delete_and_done():
    _fresh_env()
    reminder.load_config()
    t = reminder.add_task("Temp", datetime.now() + timedelta(days=1), "1h")
    assert reminder.mark_done(t["id"]) is True
    assert reminder.delete_task(t["id"]) is True
    assert reminder.delete_task(9999) is False


if __name__ == "__main__":
    passed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"  ✔ {name}")
            passed += 1
    print(f"\nAll {passed} tests passed.")
