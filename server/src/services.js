// The catalogue of services GeniusAI Infinity offers.
// Used to build outreach emails and to power the services panel in the UI.
export const SERVICES = [
  {
    id: 'web-dev',
    category: 'Digital',
    title: 'Website Development',
    blurb: 'Modern, mobile-friendly websites for businesses that have none — get found online.',
  },
  {
    id: 'app-dev',
    category: 'Digital',
    title: 'App Development',
    blurb: 'Custom Android / iOS apps, including our own accounting app for your business.',
  },
  {
    id: 'vr',
    category: 'Digital',
    title: 'VR / 360° Views',
    blurb: 'Virtual-reality 360° tours so customers can experience your shop or property online.',
  },
  {
    id: 'design',
    category: 'Design',
    title: 'Graphic & Poster Design',
    blurb: 'Wedding cards, posters, logos, social-media creatives — professional designs on demand.',
  },
  {
    id: 'accounting',
    category: 'Finance',
    title: 'Accounting Services',
    blurb: 'Bookkeeping, ledgers and financial statements, plus our accounting app to manage it all.',
  },
  {
    id: 'itr',
    category: 'Finance',
    title: 'Income-Tax Filing',
    blurb: 'Accurate, on-time ITR filing for individuals and businesses.',
  },
  {
    id: 'gst',
    category: 'Finance',
    title: 'GST Filing & Compliance',
    blurb: 'GST registration, monthly/quarterly returns and full business GST compliance.',
  },
  {
    id: 'roc',
    category: 'Compliance',
    title: 'Company Compliance',
    blurb: 'Company annual returns, ROC filings and end-to-end corporate compliance.',
  },
  {
    id: 'legal',
    category: 'Legal',
    title: 'Legal Services',
    blurb: 'Documentation, contracts and handling of cases with experienced professionals.',
  },
  {
    id: 'govt',
    category: 'Government',
    title: 'Government Applications',
    blurb: 'All kinds of government online applications and scheme filings, done for you.',
  },
];

export function servicesByCategory() {
  const map = {};
  for (const s of SERVICES) {
    (map[s.category] ||= []).push(s);
  }
  return map;
}
