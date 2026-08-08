// Loads configuration from a .env file (if present) and process.env.
// Minimal zero-dependency .env parser so we don't pull in extra packages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

const env = process.env;

export const config = {
  port: Number(env.PORT) || 4000,
  business: {
    name: env.BUSINESS_NAME || 'GeniusAI Infinity',
    email: env.BUSINESS_EMAIL || 'hello@geniusaiinfinity.com',
    phone: env.BUSINESS_PHONE || '+91-00000-00000',
    website: env.BUSINESS_WEBSITE || 'https://geniusaiinfinity.com',
    address: env.BUSINESS_ADDRESS || 'India',
  },
  googlePlacesApiKey: env.GOOGLE_PLACES_API_KEY || '',
  llm: {
    baseUrl: env.LLM_BASE_URL || '',
    model: env.LLM_MODEL || '',
    apiKey: env.LLM_API_KEY || '',
  },
  smtp: {
    host: env.SMTP_HOST || '',
    port: Number(env.SMTP_PORT) || 587,
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.SMTP_FROM || env.BUSINESS_EMAIL || '',
  },
  maxEmailsPerBatch: Number(env.MAX_EMAILS_PER_BATCH) || 25,
};

export const flags = {
  hasPlaces: Boolean(config.googlePlacesApiKey),
  hasLlm: Boolean(config.llm.baseUrl),
  hasSmtp: Boolean(config.smtp.host && config.smtp.user),
};
