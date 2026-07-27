[app]

# Name shown under the app icon on your phone
title = Offline Reminder

# Internal package identifiers
package.name = offlinereminder
package.domain = com.geniusaiinfinity

# Source
source.dir = .
source.include_exts = py,png,jpg,kv,atlas

version = 1.0

# Python + Kivy, and openssl so smtplib SSL works for Gmail
requirements = python3,kivy,openssl

orientation = portrait
fullscreen = 0

# INTERNET is needed to send the reminder emails.
android.permissions = INTERNET

# Reasonable modern defaults; buildozer downloads the SDK/NDK on first build.
android.api = 33
android.minapi = 24
android.archs = arm64-v8a, armeabi-v7a

# Keep the screen/CPU alive isn't guaranteed for background email; the app
# checks for due reminders every 60s while it is open.

[buildozer]
log_level = 2
warn_on_root = 1
