"""
Offline Reminder App - Kivy GUI version (build this into an .apk).

A self-contained single-file app: add work + deadline, stored locally on the
phone (offline), and it e-mails you before the deadline via Gmail SMTP.

Build into an APK with buildozer (see README.md in this folder).
"""

import json
import os
import smtplib
import ssl
import threading
from datetime import datetime, timedelta
from email.message import EmailMessage

from kivy.app import App
from kivy.clock import Clock
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.popup import Popup
from kivy.uix.scrollview import ScrollView
from kivy.uix.textinput import TextInput

# On Android the app's private storage; on desktop, the current folder.
try:
    from android.storage import app_storage_path  # type: ignore

    BASE_DIR = app_storage_path()
except Exception:  # noqa: BLE001 - not on Android
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_FILE = os.path.join(BASE_DIR, "tasks.json")
CONFIG_FILE = os.path.join(BASE_DIR, "config.json")

DEFAULT_CONFIG = {
    "sender_email": "your_gmail_here@gmail.com",
    "app_password": "xxxx xxxx xxxx xxxx",
    "recipient_email": "coserveu@gmail.com",
    "default_remind_before": "1h",
}


# --------------------------- storage + logic -------------------------------

def load_config():
    if not os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "w") as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)
        return dict(DEFAULT_CONFIG)
    with open(CONFIG_FILE) as f:
        cfg = json.load(f)
    for k, v in DEFAULT_CONFIG.items():
        cfg.setdefault(k, v)
    return cfg


def load_tasks():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE) as f:
        return json.load(f)


def save_tasks(tasks):
    with open(DATA_FILE, "w") as f:
        json.dump(tasks, f, indent=2)


def parse_duration(text):
    text = str(text).strip().lower()
    if not text:
        return None
    try:
        amount = float(text[:-1])
    except ValueError:
        return None
    return {"m": timedelta(minutes=amount),
            "h": timedelta(hours=amount),
            "d": timedelta(days=amount)}.get(text[-1])


def parse_deadline(text):
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(text.strip(), fmt)
        except ValueError:
            continue
    return None


def send_email(cfg, subject, body):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = cfg["sender_email"]
    msg["To"] = cfg["recipient_email"]
    msg.set_content(body)
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context, timeout=30) as server:
        server.login(cfg["sender_email"], cfg["app_password"].replace(" ", ""))
        server.send_message(msg)


def check_and_send(cfg):
    now = datetime.now()
    tasks = load_tasks()
    changed = False
    for t in tasks:
        if t.get("done") or t.get("notified"):
            continue
        try:
            remind_at = datetime.fromisoformat(t["remind_at"])
        except (KeyError, ValueError):
            continue
        if now >= remind_at:
            subject = f"Reminder: '{t['title']}' due at {t['deadline']}"
            body = (f"Task: {t['title']}\nDeadline: {t['deadline']}\n\n"
                    f"Reminder sent {t['remind_before']} before the deadline.\n"
                    f"— Your Offline Reminder App")
            try:
                send_email(cfg, subject, body)
                t["notified"] = True
                changed = True
            except Exception:  # noqa: BLE001 - retry next tick if offline
                pass
    if changed:
        save_tasks(tasks)


# ------------------------------- UI ----------------------------------------

def _popup(title, message):
    Popup(title=title,
          content=Label(text=message),
          size_hint=(0.85, 0.4)).open()


class ReminderRoot(BoxLayout):
    def __init__(self, **kwargs):
        super().__init__(orientation="vertical", padding=dp(10), spacing=dp(8), **kwargs)

        self.add_widget(Label(text="[b]Offline Reminder App[/b]", markup=True,
                              size_hint_y=None, height=dp(36), font_size="20sp"))

        self.title_in = TextInput(hint_text="Work / task name",
                                  size_hint_y=None, height=dp(44), multiline=False)
        self.deadline_in = TextInput(hint_text="Deadline  YYYY-MM-DD HH:MM",
                                     size_hint_y=None, height=dp(44), multiline=False)
        self.remind_in = TextInput(hint_text="Remind before (e.g. 30m, 1h, 2d)",
                                   size_hint_y=None, height=dp(44), multiline=False)
        for w in (self.title_in, self.deadline_in, self.remind_in):
            self.add_widget(w)

        add_btn = Button(text="➕ Add reminder", size_hint_y=None, height=dp(48))
        add_btn.bind(on_release=self.add_task)
        self.add_widget(add_btn)

        # scrollable task list
        self.list_box = BoxLayout(orientation="vertical", size_hint_y=None, spacing=dp(4))
        self.list_box.bind(minimum_height=self.list_box.setter("height"))
        scroll = ScrollView()
        scroll.add_widget(self.list_box)
        self.add_widget(scroll)

        test_btn = Button(text="Send test email", size_hint_y=None, height=dp(40))
        test_btn.bind(on_release=self.test_email)
        self.add_widget(test_btn)

        self.refresh()
        # check reminders every 60s while the app is open
        Clock.schedule_interval(lambda dt: self._bg_check(), 60)

    def add_task(self, *_):
        title = self.title_in.text.strip()
        deadline = parse_deadline(self.deadline_in.text)
        if not title or not deadline:
            _popup("Oops", "Enter a name and a valid deadline\n(YYYY-MM-DD HH:MM).")
            return
        cfg = load_config()
        rb = self.remind_in.text.strip() or cfg.get("default_remind_before", "1h")
        if parse_duration(rb) is None:
            rb = "1h"
        tasks = load_tasks()
        remind_at = deadline - parse_duration(rb)
        tasks.append({
            "id": max((t["id"] for t in tasks), default=0) + 1,
            "title": title,
            "deadline": deadline.isoformat(timespec="minutes"),
            "remind_before": rb,
            "remind_at": remind_at.isoformat(timespec="minutes"),
            "notified": False,
            "done": False,
        })
        save_tasks(tasks)
        self.title_in.text = self.deadline_in.text = self.remind_in.text = ""
        self.refresh()

    def refresh(self):
        self.list_box.clear_widgets()
        tasks = sorted(load_tasks(), key=lambda x: x["deadline"])
        if not tasks:
            self.list_box.add_widget(Label(text="No tasks yet.", size_hint_y=None, height=dp(30)))
            return
        for t in tasks:
            row = BoxLayout(size_hint_y=None, height=dp(56), spacing=dp(4))
            status = "✅" if t.get("done") else ("📧" if t.get("notified") else "⏳")
            row.add_widget(Label(
                text=f"{status} {t['title']}\n{t['deadline']} (remind {t['remind_before']} before)",
                halign="left", valign="middle"))
            del_btn = Button(text="🗑", size_hint_x=None, width=dp(48))
            del_btn.bind(on_release=lambda _b, tid=t["id"]: self.delete_task(tid))
            row.add_widget(del_btn)
            self.list_box.add_widget(row)

    def delete_task(self, tid):
        save_tasks([t for t in load_tasks() if t["id"] != tid])
        self.refresh()

    def _bg_check(self):
        # network call off the UI thread
        threading.Thread(target=lambda: (check_and_send(load_config()),
                                         Clock.schedule_once(lambda dt: self.refresh())),
                         daemon=True).start()

    def test_email(self, *_):
        def work():
            try:
                send_email(load_config(), "Test email from Reminder App",
                           "Your email setup works!")
                Clock.schedule_once(lambda dt: _popup("Sent", "Test email sent!"))
            except Exception as exc:  # noqa: BLE001
                msg = str(exc)
                Clock.schedule_once(lambda dt: _popup("Failed", msg))
        threading.Thread(target=work, daemon=True).start()


class ReminderApp(App):
    def build(self):
        self.title = "Offline Reminder"
        load_config()
        return ReminderRoot()


if __name__ == "__main__":
    ReminderApp().run()
