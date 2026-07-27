"""
Offline Reminder App - core logic.

Works fully OFFLINE for managing your work + deadlines (data is stored in a
local JSON file on your phone). It only connects to the internet at the
moment a reminder needs to be emailed.

Reminders are sent via e-mail using a Gmail account + "app password".
"""

import json
import os
import smtplib
import ssl
from datetime import datetime, timedelta
from email.message import EmailMessage

# ---------------------------------------------------------------------------
# Paths / config
# ---------------------------------------------------------------------------

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(APP_DIR, "tasks.json")
CONFIG_FILE = os.path.join(APP_DIR, "config.json")

DEFAULT_CONFIG = {
    # The Gmail account the reminders are SENT FROM.
    "sender_email": "your_gmail_here@gmail.com",
    # A Gmail "App Password" (16 chars, NOT your normal password).
    # Create one at: https://myaccount.google.com/apppasswords
    "app_password": "xxxx xxxx xxxx xxxx",
    # Where the reminder e-mails are SENT TO.
    "recipient_email": "coserveu@gmail.com",
    # How often the background checker looks for due reminders (seconds).
    "check_interval_seconds": 60,
    # Default lead time if you don't specify one when adding a task.
    "default_remind_before": "1h",
}


def load_config():
    """Load config.json, creating it from defaults on first run."""
    if not os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "w") as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)
        return dict(DEFAULT_CONFIG)
    with open(CONFIG_FILE) as f:
        cfg = json.load(f)
    # Fill in any missing keys with defaults (forward compatible).
    for k, v in DEFAULT_CONFIG.items():
        cfg.setdefault(k, v)
    return cfg


# ---------------------------------------------------------------------------
# Task storage (offline)
# ---------------------------------------------------------------------------

def load_tasks():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE) as f:
        return json.load(f)


def save_tasks(tasks):
    with open(DATA_FILE, "w") as f:
        json.dump(tasks, f, indent=2)


def _next_id(tasks):
    return max((t["id"] for t in tasks), default=0) + 1


def parse_duration(text):
    """Parse '1h', '30m', '2d', '90m' -> timedelta. Returns None if invalid."""
    text = str(text).strip().lower()
    if not text:
        return None
    unit = text[-1]
    try:
        amount = float(text[:-1])
    except ValueError:
        return None
    if unit == "m":
        return timedelta(minutes=amount)
    if unit == "h":
        return timedelta(hours=amount)
    if unit == "d":
        return timedelta(days=amount)
    return None


def parse_deadline(text):
    """Accept 'YYYY-MM-DD HH:MM' or 'YYYY-MM-DD' (defaults to 09:00)."""
    text = text.strip()
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(text, fmt)
            return dt
        except ValueError:
            continue
    return None


def add_task(title, deadline_dt, remind_before="1h"):
    """Add a task. deadline_dt is a datetime; remind_before like '1h'."""
    tasks = load_tasks()
    delta = parse_duration(remind_before) or timedelta(hours=1)
    remind_at = deadline_dt - delta
    task = {
        "id": _next_id(tasks),
        "title": title,
        "deadline": deadline_dt.isoformat(timespec="minutes"),
        "remind_before": remind_before,
        "remind_at": remind_at.isoformat(timespec="minutes"),
        "notified": False,
        "done": False,
        "created": datetime.now().isoformat(timespec="minutes"),
    }
    tasks.append(task)
    save_tasks(tasks)
    return task


def delete_task(task_id):
    tasks = load_tasks()
    new_tasks = [t for t in tasks if t["id"] != task_id]
    save_tasks(new_tasks)
    return len(new_tasks) != len(tasks)


def mark_done(task_id):
    tasks = load_tasks()
    found = False
    for t in tasks:
        if t["id"] == task_id:
            t["done"] = True
            found = True
    save_tasks(tasks)
    return found


# ---------------------------------------------------------------------------
# E-mail sending (needs internet at send time)
# ---------------------------------------------------------------------------

def send_email(cfg, subject, body):
    """Send an e-mail via Gmail SMTP. Returns (ok, message)."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = cfg["sender_email"]
    msg["To"] = cfg["recipient_email"]
    msg.set_content(body)

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context, timeout=30) as server:
            server.login(cfg["sender_email"], cfg["app_password"].replace(" ", ""))
            server.send_message(msg)
        return True, "sent"
    except Exception as exc:  # noqa: BLE001 - report any failure to caller
        return False, str(exc)


def build_reminder_email(task):
    deadline = task["deadline"]
    subject = f"⏰ Reminder: '{task['title']}' is due at {deadline}"
    body = (
        f"Hi,\n\n"
        f"This is a reminder for your work:\n\n"
        f"  Task     : {task['title']}\n"
        f"  Deadline : {deadline}\n\n"
        f"The deadline is coming up (you asked to be reminded "
        f"{task['remind_before']} before).\n\n"
        f"— Your Offline Reminder App"
    )
    return subject, body


# ---------------------------------------------------------------------------
# The check-and-send step (called by the background daemon)
# ---------------------------------------------------------------------------

def check_and_send(cfg, now=None, sender=None):
    """
    Look through all tasks, send reminders that are due, mark them notified.
    Returns a list of (task_title, ok, info) for anything it tried to send.
    `sender` lets tests inject a fake e-mail function.
    """
    now = now or datetime.now()
    sender = sender or (lambda subject, body: send_email(cfg, subject, body))
    tasks = load_tasks()
    results = []
    changed = False

    for t in tasks:
        if t.get("done") or t.get("notified"):
            continue
        try:
            remind_at = datetime.fromisoformat(t["remind_at"])
        except (KeyError, ValueError):
            continue
        if now >= remind_at:
            subject, body = build_reminder_email(t)
            ok, info = sender(subject, body)
            results.append((t["title"], ok, info))
            if ok:
                t["notified"] = True
                changed = True

    if changed:
        save_tasks(tasks)
    return results
