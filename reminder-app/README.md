# ⏰ Offline Reminder App

Set your **work + deadline** and get an **email reminder before the deadline**.
Your tasks are stored **offline** on your phone (a local `tasks.json` file) — the
app only uses the internet at the moment it needs to send a reminder email.

Reminder emails are sent to **coserveu@gmail.com** (you can change this).

There are **two versions** in this repo:

| Version | Folder | Best for |
|---|---|---|
| **Termux (terminal)** | this folder | Easiest to run on Android *right now*, reliable background sending |
| **APK (GUI app)** | `android-apk/` | A real installable app with buttons — needs a PC to build |

---

## Important note about "offline"

A phone app **cannot send email or SMS with the internet fully off** — sending
always needs a connection. This app is "offline" in the sense that **managing
your tasks and deadlines works offline**; it briefly goes online **only to send
the reminder email** when a deadline is approaching. (SMS was skipped for now —
you chose *email only*.)

---

## Part 1 — Run it on Android with Termux (recommended)

### 1. Install Termux
Install **Termux** from the [F-Droid store](https://f-droid.org/en/packages/com.termux/)
(the Play Store version is outdated). Open it.

### 2. Get the app onto your phone
In Termux:
```bash
pkg update -y && pkg install -y git python
git clone https://github.com/lakhilohia/geniusaiinfinity.git
cd geniusaiinfinity/reminder-app
```

### 3. Create your Gmail App Password (one-time)
The app sends email **from a Gmail account** using a 16-character *App Password*
(not your normal password). To create one:

1. Turn on **2-Step Verification**: <https://myaccount.google.com/security>
2. Go to **App Passwords**: <https://myaccount.google.com/apppasswords>
3. Create one (name it "Reminder App") and copy the 16-character code.

### 4. Add your settings
Run the app once to create the config file, then edit it:
```bash
python cli.py      # choose 0 to exit; this creates config.json
nano config.json
```
Fill in:
```json
{
  "sender_email": "the_gmail_you_made_the_app_password_for@gmail.com",
  "app_password": "the 16-char app password",
  "recipient_email": "coserveu@gmail.com",
  "check_interval_seconds": 60,
  "default_remind_before": "1h"
}
```
Save in nano with **Ctrl+O, Enter, Ctrl+X**.

### 5. Use it
```bash
python cli.py
```
A menu appears:
- **1** — add a work + deadline (e.g. deadline `2026-07-30 18:00`, remind `1h` before)
- **2** — see all tasks
- **6** — send a **test email** to make sure your setup works ✅

### 6. Keep reminders sending in the background
Leave the daemon running so it emails you automatically:
```bash
termux-wake-lock     # optional: stops Android from killing it (needs Termux:API)
python daemon.py
```
Keep this Termux session alive. It checks every 60 seconds and emails you when a
deadline is near.

---

## Part 2 — Build the installable APK (optional, needs a Linux PC)

The GUI version lives in [`android-apk/`](android-apk/). See
[`android-apk/README.md`](android-apk/README.md) for full build steps with
**buildozer**. In short, on a Linux PC:
```bash
cd android-apk
pip install buildozer cython
buildozer -v android debug        # produces bin/*.apk
```
Copy the `.apk` to your phone and install it.

---

## Files

| File | What it does |
|---|---|
| `reminder.py` | Core logic: local storage, deadline parsing, email sending |
| `cli.py` | Interactive menu (add / list / delete tasks, test email) |
| `daemon.py` | Background loop that auto-sends reminders |
| `config.example.json` | Template for your settings |
| `test_reminder.py` | Tests (no internet needed): `python test_reminder.py` |
| `android-apk/` | Kivy GUI version + buildozer config for the APK |

> **Privacy:** your real `config.json` (with your app password) and `tasks.json`
> are git-ignored and never uploaded.
