#!/usr/bin/env python3
"""
Offline Reminder App - interactive menu (for Termux / any terminal).

Run:  python cli.py
"""

from datetime import datetime

import reminder


def _print_header():
    print("\n" + "=" * 44)
    print("     ⏰  OFFLINE REMINDER APP")
    print("=" * 44)


def show_tasks():
    tasks = reminder.load_tasks()
    if not tasks:
        print("\n(No tasks yet. Choose 1 to add one.)")
        return
    print("\nYour tasks:")
    print("-" * 44)
    now = datetime.now()
    for t in sorted(tasks, key=lambda x: x["deadline"]):
        try:
            dl = datetime.fromisoformat(t["deadline"])
            overdue = dl < now and not t.get("done")
        except ValueError:
            overdue = False
        status = "✅ done" if t.get("done") else ("🔴 OVERDUE" if overdue else "⏳ pending")
        sent = " (reminder sent)" if t.get("notified") else ""
        print(f"[{t['id']}] {t['title']}")
        print(f"      deadline: {t['deadline']}  |  remind {t['remind_before']} before")
        print(f"      status  : {status}{sent}")
    print("-" * 44)


def add_flow():
    title = input("\nWork / task name: ").strip()
    if not title:
        print("  ! Name cannot be empty.")
        return
    raw = input("Deadline (YYYY-MM-DD HH:MM), e.g. 2026-07-30 18:00: ").strip()
    deadline = reminder.parse_deadline(raw)
    if not deadline:
        print("  ! Could not understand that date/time. Try again.")
        return
    if deadline < datetime.now():
        print("  ! That deadline is in the past.")
        return
    cfg = reminder.load_config()
    default = cfg.get("default_remind_before", "1h")
    rb = input(f"Remind how long before? (e.g. 30m, 1h, 2d) [default {default}]: ").strip()
    rb = rb or default
    if reminder.parse_duration(rb) is None:
        print("  ! Could not understand that duration; using default.")
        rb = default
    task = reminder.add_task(title, deadline, rb)
    print(f"\n  ✔ Added task [{task['id']}] — you'll be emailed at {task['remind_at']}")


def delete_flow():
    show_tasks()
    raw = input("\nID to delete: ").strip()
    if raw.isdigit() and reminder.delete_task(int(raw)):
        print("  ✔ Deleted.")
    else:
        print("  ! No task with that ID.")


def done_flow():
    show_tasks()
    raw = input("\nID to mark done: ").strip()
    if raw.isdigit() and reminder.mark_done(int(raw)):
        print("  ✔ Marked done.")
    else:
        print("  ! No task with that ID.")


def test_email_flow():
    cfg = reminder.load_config()
    print(f"\nSending a test e-mail to {cfg['recipient_email']} ...")
    ok, info = reminder.send_email(
        cfg,
        "✅ Test e-mail from your Reminder App",
        "If you can read this, your e-mail setup works!",
    )
    if ok:
        print("  ✔ Test e-mail sent successfully.")
    else:
        print(f"  ! Failed: {info}")
        print("    Check sender_email + app_password in config.json.")


def check_now_flow():
    cfg = reminder.load_config()
    results = reminder.check_and_send(cfg)
    if not results:
        print("\n  (Nothing due right now.)")
        return
    for title, ok, info in results:
        mark = "✔ sent" if ok else f"! failed: {info}"
        print(f"  {mark}  — {title}")


MENU = """
Choose an option:
  1) Add a work + deadline
  2) See all my tasks
  3) Mark a task as done
  4) Delete a task
  5) Check for due reminders NOW (send emails)
  6) Send a TEST email (verify setup)
  7) Edit settings (open config.json)
  0) Exit
"""


def main():
    reminder.load_config()  # ensure config.json exists on first run
    while True:
        _print_header()
        print(MENU)
        choice = input("> ").strip()
        if choice == "1":
            add_flow()
        elif choice == "2":
            show_tasks()
        elif choice == "3":
            done_flow()
        elif choice == "4":
            delete_flow()
        elif choice == "5":
            check_now_flow()
        elif choice == "6":
            test_email_flow()
        elif choice == "7":
            print(f"\nEdit this file with your Gmail + app password:\n  {reminder.CONFIG_FILE}")
        elif choice == "0":
            print("\nBye! (Run daemon.py to keep reminders sending in the background.)\n")
            break
        else:
            print("  ! Please choose a number from the menu.")


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\nBye!\n")
