// Optional AI email writer.
//   • If LLM_BASE_URL is set (e.g. a free OpenAI-compatible relay like the
//     freellmapi project), we ask it to personalise the outreach email.
//   • Otherwise, or on any failure, we fall back to a solid built-in template.
//
// NOTE: public "free, no-key" LLM relays are unreliable and can disappear.
// The template fallback means your outreach never breaks because of that.
import { config, flags } from './config.js';
import { SERVICES } from './services.js';

function templateEmail(lead) {
  const b = config.business;
  const name = lead.name || 'there';
  const lines = SERVICES.map((s) => `  • ${s.title} — ${s.blurb}`).join('\n');
  const subject = lead.hasWebsite
    ? `${b.name}: grow ${lead.name || 'your business'} with our services`
    : `${lead.name || 'Your business'} has no website yet — let ${b.name} help`;

  const hook = lead.hasWebsite
    ? `We help businesses like ${lead.name || 'yours'} handle websites, apps, accounting, taxes and compliance under one roof.`
    : `We noticed ${lead.name || 'your business'} may not have a website yet. In today's market, that means customers searching online can't find you — and we can fix that quickly.`;

  const body =
`Hi ${name},

${hook}

At ${b.name}, we're a single umbrella for everything a growing business needs:

${lines}

If any of these would help, just reply to this email or call ${b.phone}.
We'd be glad to give you a free, no-obligation consultation.

Warm regards,
${b.name}
${b.phone} | ${b.email}
${b.website}

—
You received this because your business was listed publicly. If you'd prefer
not to hear from us, reply "UNSUBSCRIBE" and we'll remove you immediately.`;

  return { subject, body };
}

export async function composeEmail(lead, { tone = 'friendly', extra = '' } = {}) {
  if (!flags.hasLlm) return { ...templateEmail(lead), generatedBy: 'template' };

  const b = config.business;
  const serviceList = SERVICES.map((s) => `${s.title}: ${s.blurb}`).join('; ');
  const prompt =
`You are writing a short, ${tone}, professional B2B outreach email in simple English (India audience).
Sender business: ${b.name} (${b.website}, ${b.phone}).
Recipient business: ${lead.name || 'a local business'}${lead.category ? `, a ${lead.category}` : ''}${lead.address ? `, located at ${lead.address}` : ''}.
Recipient ${lead.hasWebsite ? 'HAS a website' : 'has NO website'}.
Services we offer: ${serviceList}.
${extra ? `Extra note: ${extra}` : ''}
Return ONLY valid JSON: {"subject": "...", "body": "..."}.
The body must end with an unsubscribe line inviting them to reply UNSUBSCRIBE.`;

  try {
    const res = await fetch(`${config.llm.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.llm.apiKey ? { Authorization: `Bearer ${config.llm.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.llm.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    const json = JSON.parse(content.replace(/^```json\s*|\s*```$/g, ''));
    if (json.subject && json.body) return { ...json, generatedBy: 'llm' };
  } catch {
    /* fall through to template */
  }
  return { ...templateEmail(lead), generatedBy: 'template-fallback' };
}
