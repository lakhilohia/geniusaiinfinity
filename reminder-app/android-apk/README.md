# 📱 Building the Offline Reminder APK

This folder is the **GUI version** of the app (built with
[Kivy](https://kivy.org)). Compiling it produces a real `.apk` you can install
on your Android phone like any other app.

> **You cannot build an APK on the phone itself.** Building needs a **Linux PC**
> (or WSL on Windows, or a cloud Linux box). If you don't want to build, use the
> Termux version in the parent folder instead — it works today with no building.

---

## What the app does

- Add a **work name + deadline + how long before to remind you**
- Tasks are saved **locally on the phone** (offline)
- While the app is open it checks every 60s and **emails you** before a deadline
- A **"Send test email"** button to verify your Gmail setup

Email is sent from a Gmail account using an **App Password** (see the main
README). On first launch the app writes a `config.json` in its private storage —
you'll edit `sender_email` / `app_password` there. For convenience you can also
set the defaults directly in `main.py` (`DEFAULT_CONFIG`) before building.

---

## Build steps (Linux)

```bash
# 1. System deps (Debian/Ubuntu)
sudo apt update
sudo apt install -y git zip unzip openjdk-17-jdk python3-pip \
    autoconf libtool pkg-config zlib1g-dev libncurses5-dev \
    libncursesw5-dev libtinfo5 cmake libffi-dev libssl-dev

# 2. Buildozer
pip install --user buildozer cython

# 3. Build (first run downloads the Android SDK/NDK — can take a while)
cd android-apk
buildozer -v android debug
```

The finished app appears in **`bin/offlinereminder-1.0-debug.apk`**.

Copy that file to your phone and open it to install (you may need to allow
"install from unknown sources").

---

## Notes / limitations

- **Background sending:** Android aggressively suspends apps. This GUI app sends
  reminders reliably **while it is open / in the foreground**. For guaranteed
  background delivery, the **Termux `daemon.py`** approach (parent folder) is
  more dependable, because you can hold a wake-lock.
- **Internet:** the `INTERNET` permission is declared in `buildozer.spec`;
  sending email needs a connection at that moment.
- **`openssl`** is included in `requirements` so Gmail's SSL/SMTP works.

## Files

| File | Purpose |
|---|---|
| `main.py` | The whole Kivy app (UI + storage + email) |
| `buildozer.spec` | Build configuration for the APK |
