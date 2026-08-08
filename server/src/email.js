// Email sending.
//   • DRY-RUN (default): writes each message as a .eml file to server/outbox/
//     and logs it — nothing leaves your machine. Safe for testing.
//   • LIVE: only when SMTP_* is configured. Respects a per-batch safety cap,
//     skips unsubscribed leads, and records every send as an event.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { config, flags } from './config.js';
import { store } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outbox = path.resolve(__dirname, '../outbox');
fs.mkdirSync(outbox, { recursive: true });

let transporter = null;
if (flags.hasSmtp) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
}

function writeToOutbox(msg) {
  const safe = (msg.to || 'unknown').replace(/[^a-z0-9@._-]/gi, '_');
  const file = path.join(outbox, `${Date.now()}_${safe}.eml`);
  const eml =
`From: ${msg.from}\nTo: ${msg.to}\nSubject: ${msg.subject}\nDate: ${new Date().toUTCString()}\n\n${msg.body}\n`;
  fs.writeFileSync(file, eml);
  return file;
}

// Send to one lead. Returns a result object; never throws for a single failure.
async function sendOne(lead, { subject, body }) {
  if (!lead.email) return { id: lead.id, ok: false, reason: 'no-email' };
  if (lead.status === 'unsubscribed') return { id: lead.id, ok: false, reason: 'unsubscribed' };

  const msg = { from: config.smtp.from || config.business.email, to: lead.email, subject, body };

  if (!flags.hasSmtp) {
    const file = writeToOutbox(msg);
    store.update(lead.id, { status: 'contacted', lastEmailAt: new Date().toISOString() });
    store.logEvent({ type: 'email_dryrun', leadId: lead.id, to: lead.email, subject, file });
    return { id: lead.id, ok: true, mode: 'dry-run', file };
  }

  try {
    await transporter.sendMail({ ...msg, text: body });
    store.update(lead.id, { status: 'contacted', lastEmailAt: new Date().toISOString() });
    store.logEvent({ type: 'email_sent', leadId: lead.id, to: lead.email, subject });
    return { id: lead.id, ok: true, mode: 'live' };
  } catch (err) {
    store.logEvent({ type: 'email_error', leadId: lead.id, to: lead.email, error: String(err) });
    return { id: lead.id, ok: false, reason: String(err.message || err) };
  }
}

// Send a batch. `items` = [{ lead, subject, body }]. Enforces the safety cap.
export async function sendBatch(items) {
  const cap = config.maxEmailsPerBatch;
  const capped = items.slice(0, cap);
  const results = [];
  for (const it of capped) {
    results.push(await sendOne(it.lead, it));
  }
  return {
    mode: flags.hasSmtp ? 'live' : 'dry-run',
    requested: items.length,
    attempted: capped.length,
    capped: items.length > cap,
    cap,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

export const emailMode = () => (flags.hasSmtp ? 'live' : 'dry-run');
