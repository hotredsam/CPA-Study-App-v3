
// ===== src/data.jsx =====
// CPA Study Servant — mock data (v2)

const SECTIONS = {
  FAR: { name: 'Financial Accounting & Reporting', hue: 210 },
  REG: { name: 'Regulation',                       hue: 30  },
  AUD: { name: 'Audit & Attestation',              hue: 265 },
  TCP: { name: 'Tax Compliance & Planning',        hue: 145 },
};

const UNITS = {
  FAR: [
    { id: 'far-u1', n: 'U1', name: 'Conceptual framework',        complete: 1.00, qAnswered: 42, topics: 18, cards: 54 },
    { id: 'far-u2', n: 'U2', name: 'Financial statements',        complete: 1.00, qAnswered: 38, topics: 22, cards: 68 },
    { id: 'far-u3', n: 'U3', name: 'Revenue recognition',         complete: 0.62, qAnswered: 24, topics: 16, cards: 52, current: true },
    { id: 'far-u4', n: 'U4', name: 'Leases (ASC 842)',            complete: 0.00, qAnswered: 0,  topics: 14, cards: 48 },
    { id: 'far-u5', n: 'U5', name: 'Intangibles & impairment',    complete: 0.00, qAnswered: 0,  topics: 12, cards: 40 },
    { id: 'far-u6', n: 'U6', name: 'Consolidations',              complete: 0.00, qAnswered: 0,  topics: 19, cards: 64 },
    { id: 'far-u7', n: 'U7', name: 'Deferred taxes & EPS',        complete: 0.00, qAnswered: 0,  topics: 15, cards: 52 },
    { id: 'far-u8', n: 'U8', name: 'Governmental & NFP',          complete: 0.00, qAnswered: 0,  topics: 20, cards: 66 },
  ],
  REG: [
    { id: 'reg-u1', n: 'U1', name: 'Ethics & responsibilities',   complete: 1.00, qAnswered: 24, topics: 14, cards: 42 },
    { id: 'reg-u2', n: 'U2', name: 'Agency & contracts',          complete: 0.40, qAnswered: 12, topics: 18, cards: 58, current: true },
    { id: 'reg-u3', n: 'U3', name: 'Individual taxation',         complete: 0.00, qAnswered: 0,  topics: 22, cards: 76 },
    { id: 'reg-u4', n: 'U4', name: 'Property taxation',           complete: 0.00, qAnswered: 0,  topics: 15, cards: 48 },
    { id: 'reg-u5', n: 'U5', name: 'Corporate taxation',          complete: 0.00, qAnswered: 0,  topics: 20, cards: 66 },
    { id: 'reg-u6', n: 'U6', name: 'Partnership taxation',        complete: 0.00, qAnswered: 0,  topics: 16, cards: 52 },
  ],
  AUD: [
    { id: 'aud-u1', n: 'U1', name: 'Engagement planning',         complete: 0.00, qAnswered: 0, topics: 16, cards: 48 },
    { id: 'aud-u2', n: 'U2', name: 'Internal controls',           complete: 0.00, qAnswered: 0, topics: 22, cards: 68 },
    { id: 'aud-u3', n: 'U3', name: 'Evidence & procedures',       complete: 0.00, qAnswered: 0, topics: 24, cards: 72 },
    { id: 'aud-u4', n: 'U4', name: 'Sampling',                    complete: 0.00, qAnswered: 0, topics: 12, cards: 38 },
    { id: 'aud-u5', n: 'U5', name: 'Reports',                     complete: 0.00, qAnswered: 0, topics: 18, cards: 54 },
  ],
  TCP: [
    { id: 'tcp-u1', n: 'U1', name: 'Entity taxation',             complete: 0.00, qAnswered: 0, topics: 20, cards: 60 },
    { id: 'tcp-u2', n: 'U2', name: 'Property dispositions',       complete: 0.00, qAnswered: 0, topics: 14, cards: 46 },
    { id: 'tcp-u3', n: 'U3', name: 'Partnership tax planning',    complete: 0.00, qAnswered: 0, topics: 16, cards: 52 },
    { id: 'tcp-u4', n: 'U4', name: 'Compensation & benefits',     complete: 0.00, qAnswered: 0, topics: 12, cards: 38 },
  ],
};

const STUDY_STATS = {
  totalHours: 142.4, thisWeekHours: 18.3, targetWeeklyHours: 25,
  streakDays: 12, hoursTarget: 450,
};

const LIVE_PIPELINES = [
  { id: 'rec_0284', title: 'FAR · Revenue allocation drill',  section: 'FAR', stage: 'transcribing', stagePct: 62, etaSec: 74,  questionsTotal: 8, questionsDone: 4, startedMs: Date.now() - 240000 },
  { id: 'rec_0283', title: 'REG · Contract formation',        section: 'REG', stage: 'extracting',   stagePct: 31, etaSec: 180, questionsTotal: 6, questionsDone: 2, startedMs: Date.now() - 95000  },
  { id: 'rec_0282', title: 'FAR · Variable consideration',    section: 'FAR', stage: 'segmenting',   stagePct: 14, etaSec: 420, questionsTotal: 0, questionsDone: 0, startedMs: Date.now() - 22000  },
];

const RECORDINGS = [
  { id: 'rec_0281', title: 'FAR · Revenue recognition set',  sections: ['FAR'],        createdAt: '2026-04-17T14:22:00Z', durationSec: 1842, questionCount: 8, status: 'done', avgCombined: 6.8, model: 'anthropic/claude-sonnet-4.6' },
  { id: 'rec_0279', title: 'Mixed · FAR + REG review',       sections: ['FAR','REG'],  createdAt: '2026-04-16T20:11:00Z', durationSec: 2211, questionCount: 10, status: 'done', avgCombined: 7.7, model: 'anthropic/claude-sonnet-4.6' },
  { id: 'rec_0277', title: 'REG · Individual taxation',      sections: ['REG'],        createdAt: '2026-04-14T09:30:00Z', durationSec: 2014, questionCount: 9, status: 'done', avgCombined: 6.7, model: 'openai/gpt-5' },
];

const OPENROUTER_MODELS = [
  { id: 'anthropic/claude-sonnet-4.6',  label: 'Claude Sonnet 4.6', meta: 'Best vision · $3/Mtok', recommended: true },
  { id: 'anthropic/claude-opus-4.1',    label: 'Claude Opus 4.1',   meta: 'Highest accuracy · $15/Mtok' },
  { id: 'anthropic/claude-haiku-4.5',   label: 'Claude Haiku 4.5',  meta: 'Fast · $1/Mtok' },
  { id: 'openai/gpt-5',                 label: 'GPT-5',             meta: '$5/Mtok' },
  { id: 'openai/gpt-5-mini',            label: 'GPT-5 mini',        meta: '$0.80/Mtok' },
  { id: 'google/gemini-2.5-pro',        label: 'Gemini 2.5 Pro',    meta: '2M context · $2/Mtok' },
  { id: 'deepseek/deepseek-v4',         label: 'DeepSeek V4',       meta: 'Cheapest · $0.14/Mtok' },
  { id: 'qwen/qwen3-max',               label: 'Qwen3 Max',         meta: '$2/Mtok' },
];

const REVIEW_Q = {
  id: 'q_0281_3', recordingId: 'rec_0281', sections: ['FAR'],
  topic: 'ASC 606 — Transaction price allocation', unit: 'far-u3',
  indexInSession: 17, totalInSession: 87, questionNumber: 'Q-17432', durationSec: 234,
  question: 'Orion Co. enters into a contract with a customer to deliver equipment and provide two years of installation support for a single fixed fee of $480,000. The equipment and installation support are determined to be distinct performance obligations. Standalone selling prices are $420,000 for the equipment and $80,000 for the installation support. How much revenue should Orion recognize upon delivery of the equipment?',
  choices: [
    { key: 'A', text: '$480,000 — full contract price at transfer of control of the equipment.' },
    { key: 'B', text: '$403,200 — allocated share of transaction price based on standalone selling prices.' },
    { key: 'C', text: '$420,000 — standalone selling price of the equipment.' },
    { key: 'D', text: '$240,000 — straight-line allocation across obligations.' },
  ],
  userAnswer: 'A', correctAnswer: 'B', wasCorrect: false,
  explanation: 'Under ASC 606, when a contract contains multiple distinct performance obligations, the transaction price is allocated in proportion to standalone selling prices. Equipment share = 420/(420+80) × 480,000 = $403,200.',
  transcript: "Okay so this is a revenue recognition question — equipment plus installation, distinct performance obligations, fixed fee. My instinct is you recognize the full $480k when the equipment is delivered, but that is probably wrong because there are two obligations. So I should allocate based on standalone selling prices. But 420 plus 80 is 500, not 480. I'm getting confused about the ratio. I'll go with A. $480,000. Final answer.",
  scores: { accounting: 4.0, consulting: 6.5, combined: 5.1 },
  feedback: {
    verdict: 'Incorrect',
    gap: 'Allocation when stated prices don\'t sum to transaction price.',
    misstep: 'Assumed "fixed fee" meant full recognition on delivery.',
    technique: 'Named the principle out loud but did not execute the ratio. Reasoning abandoned mid-computation.',
    study: 'ASC 606 §22 — proportional allocation when sum of SSPs differs from transaction price.',
  },
  sources: [
    { id: 's1', textbook: 'Becker FAR 2026', ref: 'Ch. 7.3 — Transaction price allocation', page: 412, relevance: 0.94, excerpt: 'When a contract contains more than one performance obligation, allocate the transaction price to each obligation based on the relative standalone selling price…' },
    { id: 's2', textbook: 'FASB ASC',        ref: '606-10-32-31',                           page: null, relevance: 0.89, excerpt: 'The entity shall allocate the transaction price to each performance obligation identified in the contract on a relative standalone selling price basis…' },
    { id: 's3', textbook: 'Becker FAR 2026', ref: 'Ch. 7 Example 7-14',                     page: 418, relevance: 0.97, excerpt: 'Equipment SSP $420,000, service SSP $80,000, contract $480,000. Equipment allocation = 420/500 × 480,000 = $403,200…' },
    { id: 's4', textbook: 'Ninja FAR Notes', ref: 'ASC 606 quick ref',                      page: 68,  relevance: 0.82, excerpt: 'Shortcut: if SSPs don\'t sum to contract price, take proportional share. Never use stated price directly when multiple obligations exist.' },
  ],
};

// Build 87 review items for the scrollable bar
const REVIEW_SESSION = (() => {
  const items = [];
  for (let i = 1; i <= 87; i++) {
    const correct = i !== 17 && Math.random() > 0.32;
    const score = correct ? 6 + Math.random() * 4 : 2 + Math.random() * 4;
    items.push({
      idx: i,
      topic: ['Transaction price allocation','Variable consideration','Principal vs agent','Contract modifications','Licensing','Warranties','Bundle pricing'][i%7],
      correct,
      score: Math.round(score*10)/10,
      section: i % 5 === 0 ? 'REG' : 'FAR',
      duration: 60 + Math.floor(Math.random()*180),
    });
  }
  items[16] = { idx: 17, topic: REVIEW_Q.topic, correct: false, score: 5.1, section: 'FAR', duration: 234 };
  return items;
})();

const TOPICS = [
  { id: 't1', name: 'Transaction price allocation', unit: 'far-u3', section: 'FAR', coverage: 1.0, mastery: 0.45, errorRate: 0.71, cardsDue: 6, seen: 7,  avgScore: 4.8 },
  { id: 't2', name: 'Variable consideration',        unit: 'far-u3', section: 'FAR', coverage: 1.0, mastery: 0.78, errorRate: 0.18, cardsDue: 2, seen: 11, avgScore: 7.9 },
  { id: 't3', name: 'Principal vs agent',            unit: 'far-u3', section: 'FAR', coverage: 1.0, mastery: 0.62, errorRate: 0.40, cardsDue: 4, seen: 5,  avgScore: 6.2 },
  { id: 't4', name: 'Contract modifications',        unit: 'far-u3', section: 'FAR', coverage: 0.9, mastery: 0.55, errorRate: 0.50, cardsDue: 3, seen: 4,  avgScore: 5.5 },
  { id: 't5', name: 'Licensing revenue',             unit: 'far-u3', section: 'FAR', coverage: 0.8, mastery: 0.00, errorRate: null, cardsDue: 8, seen: 0,  avgScore: null },
  { id: 't6', name: 'Warranties',                    unit: 'far-u3', section: 'FAR', coverage: 0.9, mastery: 0.00, errorRate: null, cardsDue: 5, seen: 0,  avgScore: null },
  { id: 't7', name: 'Agency relationships',          unit: 'reg-u2', section: 'REG', coverage: 1.0, mastery: 0.82, errorRate: 0.15, cardsDue: 1, seen: 9,  avgScore: 8.2 },
  { id: 't8', name: 'Contract formation',            unit: 'reg-u2', section: 'REG', coverage: 1.0, mastery: 0.40, errorRate: 0.55, cardsDue: 5, seen: 6,  avgScore: 5.1 },
  { id: 't9', name: 'Breach & remedies',             unit: 'reg-u2', section: 'REG', coverage: 1.0, mastery: 0.00, errorRate: null, cardsDue: 7, seen: 0,  avgScore: null },
  { id: 't10', name: 'Consideration',                unit: 'reg-u2', section: 'REG', coverage: 0.9, mastery: 0.00, errorRate: null, cardsDue: 4, seen: 0,  avgScore: null },
];

const ANKI_DECK = {
  dueToday: 24, newToday: 12, reviewsToday: 18, streakDays: 12,
  cards: [
    { id: 'c1', front: 'Under ASC 606, how is the transaction price allocated when a contract has multiple distinct performance obligations?',
      back: 'Allocate in proportion to each obligation\'s standalone selling price (SSP).\n\nFormula: (SSP_obligation / Σ SSPs) × transaction price.\n\nDo not use stated prices when SSPs don\'t sum to contract total.',
      topic: 'Transaction price allocation', unit: 'far-u3', section: 'FAR', interval: 3, ease: 2.2, due: 'today',
      source: 'Becker FAR 2026, Ch. 7.3', aiGenerated: true, createdFrom: 'Missed question q_0281_3' },
    { id: 'c2', front: 'When is revenue recognized under ASC 606 for a distinct performance obligation?',
      back: 'When control of the good or service transfers to the customer — either at a point in time or over time, depending on the nature of the obligation.',
      topic: 'Revenue recognition', unit: 'far-u3', section: 'FAR', interval: 1, ease: 2.5, due: 'today', source: 'Becker FAR 2026, Ch. 7.1', aiGenerated: true },
    { id: 'c3', front: 'Variable consideration — what are the two estimation methods under ASC 606?',
      back: '(1) Expected value — probability-weighted sum; use when many possible outcomes.\n(2) Most likely amount — use when only two possible outcomes.',
      topic: 'Variable consideration', unit: 'far-u3', section: 'FAR', interval: 7, ease: 2.8, due: 'today', source: 'Becker FAR 2026, Ch. 7.4', aiGenerated: true },
  ],
};

const ROUTINE = {
  uploadedAt: '2026-04-14', filename: 'study-routine.xml',
  todaysTasks: [
    { id: 'r1', time: '07:00', duration: 30, type: 'anki',     label: 'Anki review — FAR U3',                                                                    url: null, done: true },
    { id: 'r2', time: '08:00', duration: 60, type: 'becker',   label: 'Becker FAR — Unit 3 lecture: Transaction price allocation',                                url: 'https://cpa.becker.com/far/unit-3/transaction-price', done: true },
    { id: 'r3', time: '10:30', duration: 45, type: 'practice', label: 'Becker MCQ set — Revenue allocation (10 questions)',                                       url: 'https://cpa.becker.com/far/practice/revenue-allocation', done: false, current: true },
    { id: 'r4', time: '13:00', duration: 30, type: 'anki',     label: 'Anki review — REG U2',                                                                    url: null, done: false },
    { id: 'r5', time: '14:00', duration: 90, type: 'textbook', label: 'Textbook — FAR Ch. 7.3 worked examples',                                                   url: null, done: false },
    { id: 'r6', time: '16:00', duration: 60, type: 'practice', label: 'Becker MCQ set — Variable consideration',                                                  url: 'https://cpa.becker.com/far/practice/variable-consideration', done: false },
    { id: 'r7', time: '19:00', duration: 30, type: 'review',   label: 'Review today\'s missed questions',                                                         url: null, done: false },
  ],
};

const TEXTBOOKS = [
  { id: 'tb1', title: 'Becker FAR — 2026 Edition',  tags: ['FAR','Becker','Primary'],      pages: 1142, chunks: 3847, topics: 198, cards: 624, status: 'done',     uploadedAt: '2026-03-02', sizeMb: 84 },
  { id: 'tb2', title: 'Becker REG — 2026 Edition',  tags: ['REG','Becker','Primary'],      pages: 892,  chunks: 2961, topics: 154, cards: 488, status: 'done',     uploadedAt: '2026-03-02', sizeMb: 62 },
  { id: 'tb3', title: 'Ninja REG — Quick Notes',    tags: ['REG','Ninja','Supplemental'],  pages: 218,  chunks: 642,  topics: 96,  cards: 210, status: 'done',     uploadedAt: '2026-03-10', sizeMb: 18 },
  { id: 'tb4', title: 'Becker AUD — 2026 Edition',  tags: ['AUD','Becker','Primary'],      pages: 768,  chunks: 2504, topics: 132, cards: 412, status: 'done',     uploadedAt: '2026-03-05', sizeMb: 54 },
  { id: 'tb5', title: 'Becker TCP — 2026 Edition',  tags: ['TCP','Becker','Primary'],      pages: 624,  chunks: 2089, topics: 108, cards: 348, status: 'indexing', statusPct: 48, uploadedAt: '2026-04-16', sizeMb: 44 },
  { id: 'tb6', title: 'FASB Codification',          tags: ['FAR','Authority'],             pages: 2414, chunks: 8102, topics: 402, cards: 0,   status: 'done',     uploadedAt: '2026-03-14', sizeMb: 142 },
];

const TEXTBOOK_VIEW = {
  id: 'tb1', title: 'Becker FAR — 2026 Edition',
  toc: [
    { level: 1, label: 'Chapter 7 · Revenue Recognition',    page: 380 },
    { level: 2, label: '7.1  Introduction and scope',        page: 382 },
    { level: 2, label: '7.2  Five-step model',               page: 394 },
    { level: 2, label: '7.3  Transaction price allocation',  page: 412, current: true },
    { level: 2, label: '7.4  Variable consideration',        page: 430 },
    { level: 2, label: '7.5  Principal vs. agent',           page: 446 },
    { level: 2, label: '7.6  Contract modifications',        page: 458 },
    { level: 1, label: 'Chapter 8 · Leases (ASC 842)',       page: 472 },
  ],
  section: '7.3 — Transaction price allocation', page: 412,
  blocks: [
    { type: 'h', text: '7.3 Transaction price allocation' },
    { type: 'p', text: 'When a contract contains more than one distinct performance obligation, the entity shall allocate the transaction price to each performance obligation on a relative standalone selling price basis. This is the core rule under ASC 606-10-32-31.' },
    { type: 'p', text: 'The standalone selling price ("SSP") is the price at which an entity would sell a promised good or service separately to a customer. When directly observable prices exist, they must be used. When they do not, the entity estimates the SSP using one of three methods:' },
    { type: 'list', items: [
      'Adjusted market assessment approach — evaluate the market in which it sells goods or services and estimate the price a customer in that market would pay.',
      'Expected cost plus a margin approach — forecast expected costs of satisfying the obligation and add an appropriate margin.',
      'Residual approach — only permitted if SSP is highly variable or uncertain; cannot be the default.',
    ]},
    { type: 'callout', title: 'Key formula', text: 'Obligation allocation = (SSP of obligation / Σ of all SSPs) × Transaction price' },
    { type: 'chart', title: 'Figure 7-14 — Allocation when SSPs exceed contract price',
      bars: [ { label: 'Equipment', ssp: 420, alloc: 403.2 }, { label: 'Service', ssp: 80, alloc: 76.8 } ],
      caption: 'Total SSPs ($500k) exceed contract price ($480k); proportional allocation produces an implicit discount applied pro-rata.' },
    { type: 'p', text: 'Example 7-14 below shows the mechanics of allocation when stated or standalone prices do not sum to the transaction price — a frequently tested scenario.' },
    { type: 'example', n: '7-14', body: 'Orion Co. enters into a contract to sell equipment and two years of installation support for $480,000. Standalone selling prices are $420,000 (equipment) and $80,000 (support). Allocate the transaction price.\n\nSolution: Equipment allocation = 420 / (420 + 80) × 480,000 = $403,200. Support allocation = 80 / 500 × 480,000 = $76,800. Upon delivery of the equipment (assuming control transfers at a point in time), Orion recognizes $403,200 in revenue. Support revenue is recognized over the two-year service period.' },
  ],
};

const INDEX_OPTIONS = [
  { id: 'index',     label: 'Build page index',         hint: 'Page numbers, ToC, cross-references',     type: 'toggle', value: true },
  { id: 'tag',       label: 'Auto-tag sections',        hint: 'Section, topic, difficulty',              type: 'toggle', value: true },
  { id: 'chunk',     label: 'Semantic chunk size',      hint: 'Tokens per chunk',                        type: 'range',  value: 800, min: 200, max: 2000, step: 50, unit: 'tok' },
  { id: 'overlap',   label: 'Chunk overlap',            hint: 'Tokens of overlap between chunks',        type: 'range',  value: 100, min: 0,   max: 400,  step: 10, unit: 'tok' },
  { id: 'ocr',       label: 'OCR scanned pages',        hint: 'Tesseract · slower, higher recall',       type: 'toggle', value: false },
  { id: 'formula',   label: 'Extract formulas',         hint: 'LaTeX + prose equivalents',               type: 'toggle', value: true },
  { id: 'example',   label: 'Detect worked examples',   hint: 'Tag + cross-link within chapter',          type: 'toggle', value: true },
  { id: 'glossary',  label: 'Build glossary',           hint: 'Term defs + first occurrence',            type: 'toggle', value: true },
  { id: 'graphs',    label: 'Preserve charts & graphs', hint: 'Render as interactive HTML',              type: 'toggle', value: true },
  { id: 'tables',    label: 'Extract tables',           hint: 'Structured & queryable',                  type: 'toggle', value: true },
  { id: 'crossref',  label: 'Cross-reference ASC/IRC',  hint: 'Link authority standards',                type: 'toggle', value: true },
  { id: 'anki',      label: 'Auto-generate Anki cards', hint: 'Card density',                            type: 'select', value: 'medium', options: ['sparse','medium','dense'] },
  { id: 'topics',    label: 'Topic depth',              hint: '1 = broad · 5 = atomic',                  type: 'range',  value: 3, min: 1, max: 5, step: 1, unit: '' },
  { id: 'citations', label: 'Cite authority standards', hint: 'Link to ASC/IRC when mentioned',          type: 'toggle', value: true },
  { id: 'summary',   label: 'Per-section TL;DR',        hint: 'One-paragraph summary per section',       type: 'toggle', value: false },
];

Object.assign(window, {
  SECTIONS, UNITS, STUDY_STATS, LIVE_PIPELINES, RECORDINGS, OPENROUTER_MODELS,
  REVIEW_Q, REVIEW_SESSION, TOPICS, ANKI_DECK, ROUTINE, TEXTBOOKS, TEXTBOOK_VIEW,
  INDEX_OPTIONS,
});


// ===== src/primitives.jsx =====
// Primitives

function SectionBadge({ section, size = 'sm' }) {
  if (!section) return null;
  const sec = window.SECTIONS[section]; const h = sec ? sec.hue : 0;
  const sizes = { xs:{h:18,fz:9,px:6}, sm:{h:22,fz:10,px:8}, md:{h:26,fz:11,px:10}, lg:{h:32,fz:13,px:14} };
  const s = sizes[size];
  return <span className="mono" style={{
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    height:s.h, padding:`0 ${s.px}px`, borderRadius:3,
    fontSize:s.fz, letterSpacing:'0.08em', fontWeight:600,
    color:`oklch(0.42 0.10 ${h})`, background:`oklch(0.70 0.06 ${h} / 0.22)`,
    border:`1px solid oklch(0.55 0.08 ${h} / 0.35)`, textTransform:'uppercase',
  }}>{section}</span>;
}

function Score({ value, size='md', suffix='/10' }) {
  if (value == null) return <span className="mono dim">—</span>;
  const sz = { sm:14, md:20, lg:32, xl:56 }[size];
  const tone = value >= 7.5 ? 'var(--good)' : value >= 5 ? 'var(--warn)' : 'var(--bad)';
  return <span className="mono tabular" style={{ fontSize:sz, fontWeight:500, color:tone, letterSpacing:'-0.02em' }}>
    {value.toFixed ? value.toFixed(1) : value}
    <span style={{ color:'var(--ink-faint)', fontSize:sz*0.5, marginLeft:2 }}>{suffix}</span>
  </span>;
}

function Bar({ pct, height=6, accent='var(--accent)' }) {
  return <div style={{ position:'relative', height, background:'var(--track)', borderRadius:2, overflow:'hidden' }}>
    <i style={{ position:'absolute', inset:0, right:'auto', width:`${Math.min(100,Math.max(0,pct))}%`, background:accent, borderRadius:2, transition:'width .4s' }} />
  </div>;
}

function Btn({ children, onClick, variant='ghost', size='md', icon, active, style, title, disabled }) {
  const v = {
    primary: { background:'var(--accent)', color:'#fff', border:'1px solid var(--accent-dark)' },
    ghost:   { background:active?'var(--surface-2)':'var(--surface)', color:active?'var(--ink)':'var(--ink-dim)', border:`1px solid ${active?'var(--border-hi)':'var(--border)'}` },
    subtle:  { background:'transparent', color:'var(--ink-dim)', border:'1px solid transparent' },
    danger:  { background:'var(--bad-soft)', color:'var(--bad)', border:'1px solid var(--bad-border)' },
  };
  const sz = { sm:{h:26,fz:12,px:10,g:6}, md:{h:32,fz:13,px:12,g:8}, lg:{h:40,fz:14,px:18,g:10} }[size];
  return <button onClick={disabled?undefined:onClick} title={title} disabled={disabled} className="hov" style={{
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:sz.g,
    height:sz.h, padding:`0 ${sz.px}px`, borderRadius:3,
    fontSize:sz.fz, fontWeight:500, cursor:disabled?'default':'pointer', whiteSpace:'nowrap',
    opacity:disabled?0.45:1,
    ...v[variant], ...(style||{}),
  }}>{icon ? <span style={{ fontSize:sz.fz+2, lineHeight:1, display:'flex' }}>{icon}</span> : null}{children}</button>;
}

function Icon({ name, size=16, color }) {
  const p = { width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke:color||'currentColor', strokeWidth:1.6, strokeLinecap:'round', strokeLinejoin:'round' };
  switch (name) {
    case 'record': return <svg {...p}><circle cx="12" cy="12" r="7" fill={color||'currentColor'} stroke="none"/></svg>;
    case 'stop':   return <svg {...p}><rect x="7" y="7" width="10" height="10" fill="currentColor" stroke="none"/></svg>;
    case 'pause':  return <svg {...p}><rect x="7" y="5" width="3" height="14" fill="currentColor"/><rect x="14" y="5" width="3" height="14" fill="currentColor"/></svg>;
    case 'play':   return <svg {...p}><path d="M7 5 L19 12 L7 19 Z" fill="currentColor"/></svg>;
    case 'mic':    return <svg {...p}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    case 'screen': return <svg {...p}><rect x="3" y="4" width="18" height="13"/><path d="M8 21h8M12 17v4"/></svg>;
    case 'check':  return <svg {...p}><path d="M5 12l4 4L19 7"/></svg>;
    case 'x':      return <svg {...p}><path d="M6 6l12 12M6 18L18 6"/></svg>;
    case 'arrow-right': return <svg {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'arrow-left':  return <svg {...p}><path d="M19 12H5M11 5l-7 7 7 7"/></svg>;
    case 'chevron-right': return <svg {...p}><path d="M9 6l6 6-6 6"/></svg>;
    case 'chevron-down':  return <svg {...p}><path d="M6 9l6 6 6-6"/></svg>;
    case 'chevron-up':    return <svg {...p}><path d="M18 15l-6-6-6 6"/></svg>;
    case 'search': return <svg {...p}><circle cx="11" cy="11" r="6"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'book':   return <svg {...p}><path d="M4 4h14v16H6a2 2 0 0 1-2-2Z"/><path d="M4 18h14"/></svg>;
    case 'book-open': return <svg {...p}><path d="M3 5h8v14H3zM21 5h-8v14h8z"/><path d="M3 5l8 3M21 5l-8 3"/></svg>;
    case 'clock':  return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'trend':  return <svg {...p}><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>;
    case 'home':   return <svg {...p}><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"/></svg>;
    case 'list':   return <svg {...p}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case 'activity': return <svg {...p}><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>;
    case 'settings': return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>;
    case 'plus':   return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'layers': return <svg {...p}><path d="M12 3 2 8l10 5 10-5Z"/><path d="m2 13 10 5 10-5"/><path d="m2 18 10 5 10-5"/></svg>;
    case 'cards':  return <svg {...p}><rect x="3" y="6" width="14" height="14" rx="1"/><path d="M7 3h14v14"/></svg>;
    case 'tag':    return <svg {...p}><path d="M20 12 12 4H4v8l8 8Z"/><circle cx="8" cy="8" r="1.5"/></svg>;
    case 'topics': return <svg {...p}><path d="M4 6h4v4H4zM10 6h10M4 14h4v4H4zM10 14h10M10 18h6"/></svg>;
    case 'dashboard': return <svg {...p}><rect x="3" y="3" width="8" height="10"/><rect x="13" y="3" width="8" height="6"/><rect x="13" y="11" width="8" height="10"/><rect x="3" y="15" width="8" height="6"/></svg>;
    case 'external': return <svg {...p}><path d="M14 4h6v6M10 14 20 4M18 14v6H4V6h6"/></svg>;
    case 'file-xml': return <svg {...p}><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 15l-1.5 2L9 19M15 15l1.5 2L15 19M11 19l2-4"/></svg>;
    case 'ledger': return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 8h18M3 12h18M3 16h18M8 4v16"/></svg>;
    case 'upload': return <svg {...p}><path d="M12 3v12M6 9l6-6 6 6M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>;
    default: return null;
  }
}

function Kbd({ children }) {
  return <span className="mono" style={{
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    minWidth:20, height:20, padding:'0 6px', fontSize:10,
    color:'var(--ink-dim)', background:'var(--surface)', border:'1px solid var(--border)',
    borderBottomWidth:2, borderRadius:3,
  }}>{children}</span>;
}

function Logo({ size=32 }) {
  // Ledger-book logo, arterial red
  return <div style={{ width:size, height:size, borderRadius:4, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 0 rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)', flexShrink:0 }}>
    <svg width={size*0.62} height={size*0.62} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="1"/>
      <path d="M3 9h18M3 14h18M8 4v16"/>
    </svg>
  </div>;
}

function Card({ children, pad=18, style, onClick, title, accent }) {
  return <div onClick={onClick} title={title} className={onClick?'hov':''} style={{
    background:'var(--surface)', border:'1px solid var(--border)', borderRadius:4,
    padding:pad, cursor:onClick?'pointer':'default', position:'relative', ...(style||{})
  }}>
    {accent ? <div style={{ position:'absolute', left:0, top:0, bottom:0, width:2, background:accent }}/> : null}
    {children}
  </div>;
}

function EyebrowHeading({ eyebrow, title, right, sub }) {
  return <header style={{ display:'flex', alignItems:'flex-end', gap:20, marginBottom:20 }}>
    <div style={{ flex:1, minWidth:0 }}>
      <div className="mono eyebrow">{eyebrow}</div>
      <h1 style={{ margin:'4px 0 0', fontSize:28, fontWeight:500, letterSpacing:'-0.02em', color:'var(--ink)', lineHeight:1.1 }}>{title}</h1>
      {sub ? <div style={{ marginTop:8, color:'var(--ink-dim)', fontSize:13, maxWidth:720, lineHeight:1.5 }}>{sub}</div> : null}
    </div>
    {right ? <div style={{ flexShrink:0 }}>{right}</div> : null}
  </header>;
}

function Divider({ vertical, style }) {
  if (vertical) return <div style={{ width:1, alignSelf:'stretch', background:'var(--border)', ...(style||{}) }}/>;
  return <div style={{ height:1, background:'var(--border)', ...(style||{}) }}/>;
}

function fmtDur(sec) { if (sec==null) return '—'; const m=Math.floor(sec/60),s=Math.floor(sec%60); return `${m}:${String(s).padStart(2,'0')}`; }
function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-US',{month:'short', day:'numeric'}); }
function relTime(iso) { const d=(Date.now()-new Date(iso).getTime())/1000; if (d<60) return 'now'; if (d<3600) return `${Math.floor(d/60)}m ago`; if (d<86400) return `${Math.floor(d/3600)}h ago`; return `${Math.floor(d/86400)}d ago`; }
function daysUntil(iso) {
  if (iso === 'TBD') return null;
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000*60*60*24));
  return d;
}

Object.assign(window, { SectionBadge, Score, Bar, Btn, Icon, Kbd, Logo, Card, EyebrowHeading, Divider, fmtDur, fmtDate, relTime, daysUntil });


// ===== src/s-dashboard.jsx =====
// Dashboard (replaces Home)

function ScreenDashboard({ nav }) {
  const hoursPct = Math.round((window.STUDY_STATS.totalHours / window.STUDY_STATS.hoursTarget) * 100);
  const exams = [
    { s: 'FAR', due: '2026-08-31' }, { s: 'REG', due: '2026-08-31' },
    { s: 'AUD', due: '2026-10-15' }, { s: 'TCP', due: 'TBD' },
  ];
  const totalProgress = Object.values(window.UNITS).flat().reduce((a,u)=>a+u.complete,0) / Object.values(window.UNITS).flat().length;

  return <div>
    <EyebrowHeading
      eyebrow="DASHBOARD · Thursday, April 17, 2026"
      title="Good morning. 142 hours in, 23% through."
      sub="You're on unit 3 of FAR. Three tasks done today, four remaining. Next test in 135 days."
      right={<div style={{ display:'flex', gap:8 }}>
        <Btn variant="ghost" icon={<Icon name="cards" size={14}/>} onClick={()=>nav('anki')}>Anki · 24 due</Btn>
        <Btn variant="primary" size="lg" icon={<Icon name="record" size={13}/>} onClick={()=>nav('record')}>Record session</Btn>
      </div>}
    />

    {/* Top stats row */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:20 }}>
      <Stat label="HOURS STUDIED" value={window.STUDY_STATS.totalHours.toFixed(1)} unit={`/ ${window.STUDY_STATS.hoursTarget}`} bar={hoursPct}/>
      <Stat label="OVERALL PROGRESS" value={`${Math.round(totalProgress*100)}`} unit="% of all units" bar={totalProgress*100}/>
      <Stat label="THIS WEEK" value={window.STUDY_STATS.thisWeekHours.toFixed(1)} unit={`hrs of ${window.STUDY_STATS.targetWeeklyHours}`} bar={(window.STUDY_STATS.thisWeekHours/window.STUDY_STATS.targetWeeklyHours)*100}/>
      <Stat label="STREAK" value={window.STUDY_STATS.streakDays} unit="days" trendUp/>
    </div>

    {/* Exams */}
    <div className="mono eyebrow" style={{ marginBottom:10 }}>EXAMS</div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:20 }}>
      {exams.map(e => {
        const units = window.UNITS[e.s];
        const prog = units.reduce((a,u)=>a+u.complete,0) / units.length;
        const days = daysUntil(e.due);
        return <Card key={e.s} accent={`oklch(0.55 0.10 ${window.SECTIONS[e.s].hue})`}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <SectionBadge section={e.s} size="md"/>
            <div className="mono" style={{ fontSize:11, color: days==null?'var(--ink-faint)':days<60?'var(--bad)':'var(--ink-dim)' }}>
              {days==null ? 'TBD' : `${days}d`}
            </div>
          </div>
          <div style={{ fontSize:13, color:'var(--ink)', marginTop:10, fontWeight:500 }}>{window.SECTIONS[e.s].name}</div>
          <div style={{ fontSize:11, color:'var(--ink-dim)', marginTop:2 }}>Due {e.due === 'TBD' ? 'TBD' : fmtDate(e.due)}</div>
          <div style={{ marginTop:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--ink-dim)', marginBottom:6 }}>
              <span className="mono">{Math.round(prog*100)}% complete</span>
              <span className="mono tabular">{units.filter(u=>u.complete===1).length}/{units.length} units</span>
            </div>
            <Bar pct={prog*100} height={4} accent={`oklch(0.50 0.12 ${window.SECTIONS[e.s].hue})`}/>
          </div>
        </Card>;
      })}
    </div>

    <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }}>
      {/* Today's routine */}
      <Card pad={0}>
        <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div className="mono eyebrow">TODAY · FROM study-routine.xml</div>
            <div style={{ fontSize:14, color:'var(--ink)', marginTop:2, fontWeight:500 }}>4 tasks remaining · 3h 45m</div>
          </div>
          <Btn variant="subtle" size="sm" onClick={()=>nav('settings')}>Edit routine →</Btn>
        </div>
        {window.ROUTINE.todaysTasks.map((t,i) => <TaskRow key={t.id} t={t} last={i===window.ROUTINE.todaysTasks.length-1}/>)}
      </Card>

      {/* Current focus */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <Card>
          <div className="mono eyebrow">CURRENT FOCUS</div>
          <SectionBadge section="FAR" size="sm" />
          <div style={{ fontSize:18, color:'var(--ink)', marginTop:8, fontWeight:500, letterSpacing:'-0.01em' }}>Unit 3 · Revenue recognition</div>
          <div style={{ marginTop:12 }}><Bar pct={62} height={4}/></div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--ink-dim)', marginTop:6 }}>
            <span className="mono tabular">24 questions · 16 topics · 52 cards</span>
            <span className="mono tabular">62%</span>
          </div>
          <Divider style={{ margin:'14px 0' }}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <Btn variant="ghost" size="sm" icon={<Icon name="cards" size={13}/>} onClick={()=>nav('anki')}>Practice Anki</Btn>
            <Btn variant="ghost" size="sm" icon={<Icon name="book-open" size={13}/>} onClick={()=>nav('textbook-view')}>Open chapter</Btn>
          </div>
        </Card>

        <Card>
          <div className="mono eyebrow">WEAKEST TOPICS</div>
          {window.TOPICS.filter(t=>t.errorRate!=null).sort((a,b)=>b.errorRate-a.errorRate).slice(0,4).map(t =>
            <div key={t.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
              <SectionBadge section={t.section} size="xs"/>
              <div style={{ flex:1, fontSize:13 }}>{t.name}</div>
              <div className="mono tabular" style={{ fontSize:12, color:'var(--bad)' }}>{Math.round(t.errorRate*100)}%</div>
            </div>
          )}
          <div style={{ paddingTop:8 }}><Btn variant="subtle" size="sm" onClick={()=>nav('topics')}>All topics →</Btn></div>
        </Card>
      </div>
    </div>
  </div>;
}

function Stat({ label, value, unit, bar, trendUp }) {
  return <Card>
    <div className="mono eyebrow">{label}</div>
    <div style={{ display:'flex', alignItems:'baseline', gap:5, marginTop:10 }}>
      <span className="mono tabular" style={{ fontSize:28, fontWeight:500, color:'var(--ink)', letterSpacing:'-0.03em', lineHeight:1 }}>{value}</span>
      <span className="mono" style={{ fontSize:11, color:'var(--ink-faint)' }}>{unit}</span>
      {trendUp ? <span className="mono" style={{ marginLeft:'auto', fontSize:11, color:'var(--good)' }}>↑</span> : null}
    </div>
    {bar != null ? <div style={{ marginTop:10 }}><Bar pct={bar} height={3}/></div> : null}
  </Card>;
}

function TaskRow({ t, last }) {
  const icons = { anki:'cards', becker:'external', practice:'record', textbook:'book', review:'list' };
  return <div style={{
    padding:'12px 18px', borderBottom: last?'none':'1px solid var(--border)',
    display:'grid', gridTemplateColumns:'60px 24px 1fr auto', gap:12, alignItems:'center',
    background: t.current ? 'var(--accent-faint)' : 'transparent',
  }}>
    <div className="mono tabular" style={{ fontSize:12, color: t.done?'var(--ink-faint)':'var(--ink-dim)', textDecoration:t.done?'line-through':'none' }}>{t.time}</div>
    <div style={{
      width:20, height:20, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
      background: t.done ? 'var(--good)' : t.current ? 'var(--accent)' : 'var(--surface-2)',
      border: t.done||t.current ? 'none' : '1px solid var(--border-hi)',
      color: t.done||t.current ? '#fff' : 'var(--ink-faint)',
    }}>
      {t.done ? <Icon name="check" size={12}/> : t.current ? <Icon name="play" size={10}/> : null}
    </div>
    <div style={{ minWidth:0 }}>
      <div style={{ fontSize:13, color: t.done?'var(--ink-dim)':'var(--ink)', textDecoration:t.done?'line-through':'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {t.label}
      </div>
      <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>{t.duration}m · <Icon name={icons[t.type]} size={10}/> <span style={{ textTransform:'uppercase' }}>{t.type}</span></div>
    </div>
    {t.url ? <a href={t.url} target="_blank" rel="noreferrer" style={{ color:'var(--accent)', fontSize:11, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }} onClick={(e)=>e.preventDefault()}>Becker<Icon name="external" size={10}/></a> : null}
  </div>;
}

Object.assign(window, { ScreenDashboard });


// ===== src/s-record.jsx =====
// Record + Pipeline screens

function ScreenRecord({ nav }) {
  const [phase, setPhase] = React.useState('setup');
  const [elapsed, setElapsed] = React.useState(0);
  const [mic, setMic] = React.useState('mic_shure');
  const [source, setSource] = React.useState('display1');
  const [sections, setSections] = React.useState(['FAR']);
  const [model, setModel] = React.useState('anthropic/claude-sonnet-4.6');
  const [paused, setPaused] = React.useState(false);
  const [uploadPct, setUploadPct] = React.useState(0);

  React.useEffect(() => {
    if (phase !== 'recording' || paused) return;
    const t = setInterval(()=>setElapsed(e=>e+1), 1000);
    return ()=>clearInterval(t);
  }, [phase, paused]);

  React.useEffect(() => {
    if (phase !== 'uploading') return;
    const t = setInterval(()=>setUploadPct(p=>{
      if (p >= 100) { clearInterval(t); setTimeout(()=>nav('pipeline'), 400); return 100; }
      return p + 2.3;
    }), 80);
    return ()=>clearInterval(t);
  }, [phase, nav]);

  const toggleSection = (s) => setSections(prev =>
    prev.includes(s) ? prev.filter(x=>x!==s) : [...prev, s]);

  if (phase === 'recording') return <Cockpit elapsed={elapsed} paused={paused} togglePause={()=>setPaused(p=>!p)} onStop={()=>{setPhase('uploading'); setUploadPct(0);}} sections={sections}/>;
  if (phase === 'uploading') return <UploadPanel pct={uploadPct} elapsed={elapsed} sections={sections} model={model}/>;

  return <div>
    <EyebrowHeading
      eyebrow="NEW SESSION"
      title="Prepare recording"
      sub="Confirm capture sources, sections you're drilling, and the grading model."
      right={<Btn variant="subtle" onClick={()=>nav('dashboard')}>Cancel</Btn>}
    />

    <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>
      <Card pad={0}>
        <Group label="Screen source" hint="Capture the practice window">
          {[
            { id:'display1', label:'Display 1 — full screen', meta:'2560 × 1440 · 144 Hz · primary' },
            { id:'display2', label:'Display 2 — full screen', meta:'1920 × 1080 · 60 Hz' },
            { id:'window',   label:'Chrome — Becker Practice', meta:'Window 4182' },
            { id:'tab',      label:'Current browser tab',      meta:'Only if practice runs in-browser' },
          ].map(s => <Picker key={s.id} active={source===s.id} onClick={()=>setSource(s.id)} icon="screen" label={s.label} meta={s.meta}/>)}
        </Group>
        <Divider/>
        <Group label="Microphone" hint="Your verbal reasoning is graded from this">
          {[
            { id:'mic_shure', label:'Shure MV7+ (USB)',     meta:'48 kHz · default' },
            { id:'mic_head',  label:'Logitech G Pro headset', meta:'USB' },
            { id:'mic_built', label:'Built-in array',        meta:'Not recommended' },
          ].map(m => <Picker key={m.id} active={mic===m.id} onClick={()=>setMic(m.id)} icon="mic" label={m.label} meta={m.meta} level={mic===m.id?0.62:0.08}/>)}
        </Group>
        <Divider/>
        <Group label="Sections" hint="Select all that apply — multiple sections are allowed in one session">
          <div style={{ padding:'0 18px 4px', display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
            {Object.entries(window.SECTIONS).map(([k,s]) => {
              const on = sections.includes(k);
              return <button key={k} onClick={()=>toggleSection(k)} className="hov" style={{
                padding:'14px 6px', borderRadius:3, cursor:'pointer',
                background: on ? `oklch(0.70 0.06 ${s.hue} / 0.22)` : 'var(--surface)',
                border: `1px solid ${on ? `oklch(0.55 0.08 ${s.hue} / 0.45)` : 'var(--border)'}`,
                display:'flex', flexDirection:'column', alignItems:'center', gap:4, position:'relative',
              }}>
                {on ? <span style={{ position:'absolute', top:6, right:6, width:14, height:14, borderRadius:7, background:`oklch(0.50 0.10 ${s.hue})`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="check" size={10} color="#fff"/></span> : null}
                <div className="mono" style={{ fontSize:13, fontWeight:600, color:on?`oklch(0.40 0.10 ${s.hue})`:'var(--ink)' }}>{k}</div>
                <div style={{ fontSize:10, color:'var(--ink-faint)', textAlign:'center' }}>{s.name.split('&')[0].trim()}</div>
              </button>;
            })}
          </div>
        </Group>
        <Divider/>
        <Group label="Grading model" hint="Sent via OpenRouter after transcription">
          <div style={{ padding:'0 18px 4px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {window.OPENROUTER_MODELS.map(m => <Picker key={m.id} active={model===m.id} onClick={()=>setModel(m.id)} label={m.label} meta={m.meta} tag={m.recommended?'Recommended':null}/>)}
          </div>
        </Group>
      </Card>

      <div>
        <Card>
          <div className="mono eyebrow">PREFLIGHT</div>
          <Check label="Display captured"/>
          <Check label="Microphone signal detected"/>
          <Check label="Audio levels within range"/>
          <Check label={`OpenRouter API connected`} sub="sk-or-v1-••••••••7c3e"/>
          <Check label="Textbooks indexed for selected sections" sub={`${sections.length} section${sections.length>1?'s':''} · ${sections.reduce((a,s)=>a+window.TEXTBOOKS.filter(tb=>tb.tags.includes(s)).length,0)} books ready`}/>
        </Card>
        <div style={{ marginTop:12 }}>
          <Card>
            <div className="mono eyebrow">SESSION</div>
            <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:6 }}>
              <KV k="Sources" v={`${sections.length} section${sections.length>1?'s':''}`}/>
              <KV k="Selected" v={sections.join(' · ') || 'none'}/>
              <KV k="Model" v={window.OPENROUTER_MODELS.find(m=>m.id===model).label}/>
            </div>
          </Card>
        </div>
        <div style={{ marginTop:12 }}>
          <Btn variant="primary" size="lg" icon={<Icon name="record" size={13}/>} onClick={()=>{setPhase('recording'); setElapsed(0);}} style={{ width:'100%' }} disabled={sections.length===0}>
            Start recording
          </Btn>
          <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:10, textAlign:'center' }}>
            Press <Kbd>⌃</Kbd> <Kbd>R</Kbd> to start · <Kbd>⌃</Kbd> <Kbd>Space</Kbd> to pause
          </div>
        </div>
      </div>
    </div>
  </div>;
}

function Group({ label, hint, children }) {
  return <div style={{ padding:'18px 18px 14px' }}>
    <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:12 }}>
      <div className="mono eyebrow">{label}</div>
      {hint ? <div style={{ fontSize:11, color:'var(--ink-faint)', marginLeft:'auto' }}>{hint}</div> : null}
    </div>
    {children}
  </div>;
}

function Picker({ active, onClick, icon, label, meta, level, tag }) {
  return <button onClick={onClick} className="hov" style={{
    width:'100%', padding:'10px 12px', display:'flex', alignItems:'center', gap:10,
    background: active ? 'var(--accent-faint)' : 'var(--surface)',
    border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
    borderRadius:3, cursor:'pointer', marginBottom:6, textAlign:'left',
  }}>
    {icon ? <div style={{ width:26, height:26, borderRadius:3, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', color: active?'var(--accent)':'var(--ink-dim)' }}><Icon name={icon} size={14}/></div> : null}
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:13, color: active?'var(--ink)':'var(--ink)' }}>{label}</span>
        {tag ? <span className="mono" style={{ fontSize:9, padding:'2px 5px', borderRadius:2, background:'var(--accent-faint)', color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{tag}</span> : null}
      </div>
      <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>{meta}</div>
    </div>
    {level != null ? <div style={{ width:36, height:14, display:'flex', alignItems:'center', gap:1 }}>{Array.from({length:8}).map((_,i)=>(<div key={i} style={{ width:2, height:Math.max(3, 14*Math.random()*level*1.4), background: i<level*8?'var(--accent)':'var(--border-hi)' }}/>))}</div> : null}
    <div style={{ width:14, height:14, borderRadius:7, border:`1px solid ${active?'var(--accent)':'var(--border-hi)'}`, background: active?'var(--accent)':'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {active ? <Icon name="check" size={9} color="#fff"/> : null}
    </div>
  </button>;
}

function Check({ label, sub }) {
  return <div style={{ padding:'8px 0', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
    <div style={{ width:16, height:16, borderRadius:8, background:'var(--good)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <Icon name="check" size={10} color="#fff"/>
    </div>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:12, color:'var(--ink)' }}>{label}</div>
      {sub ? <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:1 }}>{sub}</div> : null}
    </div>
  </div>;
}

function KV({ k, v }) {
  return <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
    <span style={{ color:'var(--ink-faint)' }}>{k}</span>
    <span style={{ color:'var(--ink)' }}>{v}</span>
  </div>;
}

function Cockpit({ elapsed, paused, togglePause, onStop, sections }) {
  return <div style={{
    position:'fixed', inset:0, background:'var(--canvas-2)',
    display:'flex', flexDirection:'column', zIndex:50,
  }}>
    <div style={{ padding:'20px 28px', display:'flex', alignItems:'center', gap:16, borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span className="pulse-dot" style={{ width:8, height:8, borderRadius:4, background:'var(--accent)' }}/>
        <span className="mono" style={{ fontSize:11, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--accent)' }}>{paused?'Paused':'Recording'}</span>
      </div>
      <div style={{ display:'flex', gap:6 }}>{sections.map(s=><SectionBadge key={s} section={s} size="sm"/>)}</div>
      <div style={{ flex:1 }}/>
      <span className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)' }}>Display 1 · Shure MV7+</span>
    </div>
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:40 }}>
      <div className="mono tabular" style={{ fontSize:112, fontWeight:300, color:'var(--ink)', letterSpacing:'-0.04em', lineHeight:1 }}>{fmtDur(elapsed)}</div>
      <div style={{ display:'flex', alignItems:'center', gap:3, height:90 }}>
        {Array.from({length:60}).map((_,i)=>(
          <div key={i} style={{
            width:3, height:`${18 + Math.abs(Math.sin(i * 0.3 + elapsed * 0.7))*72}%`,
            background: paused?'var(--border-hi)':'var(--accent)',
            opacity: paused?0.4:0.9, transition:'height .12s',
          }}/>
        ))}
      </div>
      <div style={{ display:'flex', gap:14 }}>
        <Btn size="lg" variant="ghost" icon={<Icon name={paused?'play':'pause'} size={16}/>} onClick={togglePause}>{paused?'Resume':'Pause'}</Btn>
        <Btn size="lg" variant="danger" icon={<Icon name="stop" size={14}/>} onClick={onStop}>Stop & upload</Btn>
      </div>
    </div>
    <div style={{ padding:'14px 28px', borderTop:'1px solid var(--border)', display:'flex', gap:20, fontSize:11, color:'var(--ink-faint)' }}>
      <span><Kbd>⌃</Kbd> <Kbd>Space</Kbd> Pause</span>
      <span><Kbd>⌃</Kbd> <Kbd>S</Kbd> Stop</span>
      <span><Kbd>⌃</Kbd> <Kbd>M</Kbd> Mark moment</span>
      <span style={{ marginLeft:'auto' }} className="mono tabular">0 marks</span>
    </div>
  </div>;
}

function UploadPanel({ pct, elapsed, sections, model }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:480 }}>
    <Card style={{ width:480, padding:28 }}>
      <div className="mono eyebrow">UPLOADING TO R2</div>
      <div className="mono tabular" style={{ fontSize:48, fontWeight:300, color:'var(--ink)', marginTop:10, letterSpacing:'-0.02em' }}>{pct.toFixed(0)}%</div>
      <div style={{ marginTop:14 }}><Bar pct={pct} height={6}/></div>
      <div style={{ marginTop:18, display:'flex', flexDirection:'column', gap:8 }}>
        <KV k="Duration" v={fmtDur(elapsed)}/>
        <KV k="Sections" v={sections.join(' · ')}/>
        <KV k="Model" v={window.OPENROUTER_MODELS.find(m=>m.id===model).label}/>
        <KV k="Size" v={`~${Math.round(elapsed * 0.11)} MB`}/>
      </div>
      <div style={{ marginTop:16, fontSize:11, color:'var(--ink-faint)' }}>Pipeline will begin automatically once upload completes.</div>
    </Card>
  </div>;
}

// --- Pipeline ---
const STAGES = [
  { id: 'uploading',   label: 'Upload' },
  { id: 'segmenting',  label: 'Segment' },
  { id: 'extracting',  label: 'Extract' },
  { id: 'transcribing',label: 'Transcribe' },
  { id: 'grading',     label: 'Grade' },
];

function ScreenPipeline({ nav }) {
  return <div>
    <EyebrowHeading
      eyebrow="PIPELINE"
      title={`${window.LIVE_PIPELINES.length} recordings processing`}
      sub="One card per in-flight recording. Pipeline stages run in parallel where possible; each card shows its own progress independently."
    />
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {window.LIVE_PIPELINES.map(p => <PipelineCard key={p.id} p={p} onOpen={()=>nav('review')}/>)}
    </div>
  </div>;
}

function PipelineCard({ p, onOpen }) {
  const stageIdx = STAGES.findIndex(s => s.id === p.stage);
  return <Card pad={0}>
    <div style={{ padding:'14px 18px', display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:14, alignItems:'center', borderBottom:'1px solid var(--border)' }}>
      <SectionBadge section={p.section} size="md"/>
      <div>
        <div style={{ fontSize:14, color:'var(--ink)', fontWeight:500 }}>{p.title}</div>
        <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>rec_{p.id.slice(-4)} · started {Math.floor((Date.now()-p.startedMs)/1000)}s ago</div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div className="mono tabular" style={{ fontSize:12, color:'var(--ink)' }}>{p.questionsDone}/{p.questionsTotal || '?'} questions</div>
        <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>~{Math.floor(p.etaSec/60)}m {p.etaSec%60}s left</div>
      </div>
      <Btn size="sm" variant="ghost" icon={<Icon name="chevron-right" size={13}/>} onClick={onOpen}>Preview</Btn>
    </div>

    <div style={{ padding:'16px 18px' }}>
      {/* Stepper */}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${STAGES.length}, 1fr)`, gap:2 }}>
        {STAGES.map((s, i) => {
          const state = i < stageIdx ? 'done' : i === stageIdx ? 'running' : 'pending';
          const pct = i < stageIdx ? 100 : i === stageIdx ? p.stagePct : 0;
          return <div key={s.id}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <div style={{
                width:14, height:14, borderRadius:7,
                background: state==='done'?'var(--good)':state==='running'?'var(--accent)':'var(--surface-2)',
                border: state==='pending' ? '1px solid var(--border-hi)' : 'none',
                display:'flex', alignItems:'center', justifyContent:'center', color:'#fff',
              }}>
                {state==='done' ? <Icon name="check" size={9} color="#fff"/> : state==='running' ? <span className="pulse-dot" style={{ width:6, height:6, background:'#fff', borderRadius:3 }}/> : null}
              </div>
              <div className="mono" style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color: state==='pending'?'var(--ink-faint)':'var(--ink)' }}>{s.label}</div>
            </div>
            <Bar pct={pct} height={3} accent={state==='done'?'var(--good)':'var(--accent)'}/>
          </div>;
        })}
      </div>

      {/* Question grid */}
      {p.questionsTotal > 0 ? (
        <div style={{ marginTop:14, display:'flex', gap:4, flexWrap:'wrap' }}>
          {Array.from({length:p.questionsTotal}).map((_,i) => {
            const done = i < p.questionsDone;
            const active = i === p.questionsDone;
            return <div key={i} className="mono tabular" style={{
              width:26, height:22, borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:600,
              background: done?'var(--good-soft)':active?'var(--accent-faint)':'var(--surface-2)',
              color: done?'var(--good)':active?'var(--accent)':'var(--ink-faint)',
              border: `1px solid ${done?'var(--good-border)':active?'var(--accent-border)':'var(--border)'}`,
            }}>{i+1}</div>;
          })}
        </div>
      ) : null}
    </div>
  </Card>;
}

Object.assign(window, { ScreenRecord, ScreenPipeline });


// ===== src/s-review.jsx =====
// Review screen

function ScreenReview({ nav }) {
  const [showSources, setShowSources] = React.useState(false);
  const [openSources, setOpenSources] = React.useState([]);
  const [currentIdx, setCurrentIdx] = React.useState(17);
  const q = window.REVIEW_Q;
  const session = window.REVIEW_SESSION;

  const toggleSource = (id) => setOpenSources(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);

  return <div style={{ paddingBottom:90 }}>
    <EyebrowHeading
      eyebrow={`REVIEW · ${q.questionNumber} · ${q.topic}`}
      title={<span style={{ display:'flex', alignItems:'center', gap:14 }}>
        Question {currentIdx} of {session.length}
        <span style={{ fontSize:14, fontWeight:400, color: q.wasCorrect?'var(--good)':'var(--bad)', fontFamily:'var(--font-mono)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
          {q.wasCorrect ? '● Correct' : '● Incorrect'}
        </span>
      </span>}
      right={<div style={{ display:'flex', gap:8 }}>
        <Btn variant="ghost" icon={<Icon name="book-open" size={13}/>} onClick={()=>setShowSources(!showSources)} active={showSources}>
          {showSources ? 'Hide' : 'Show'} sources ({q.sources.length})
        </Btn>
        <Btn variant="ghost" icon={<Icon name="arrow-left" size={13}/>} onClick={()=>nav('dashboard')}>Back</Btn>
      </div>}
    />

    <div style={{ display:'grid', gridTemplateColumns: showSources ? '1fr 1fr 360px' : '1fr 360px', gap:14 }}>
      {/* Question + transcript column */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card pad={22}>
          <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center' }}>
            <SectionBadge section="FAR" size="sm"/>
            <span className="mono" style={{ fontSize:11, color:'var(--ink-faint)' }}>{q.topic}</span>
            <span style={{ flex:1 }}/>
            <span className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)' }}>{fmtDur(q.durationSec)}</span>
          </div>
          <p style={{ fontSize:15, lineHeight:1.55, color:'var(--ink)', margin:0 }}>{q.question}</p>
          <div style={{ marginTop:18, display:'flex', flexDirection:'column', gap:6 }}>
            {q.choices.map(c => {
              const isCorrect = c.key === q.correctAnswer;
              const isUser = c.key === q.userAnswer;
              const bg = isCorrect ? 'var(--good-soft)' : isUser ? 'var(--bad-soft)' : 'var(--surface)';
              const border = isCorrect ? 'var(--good-border)' : isUser ? 'var(--bad-border)' : 'var(--border)';
              return <div key={c.key} style={{ padding:'10px 12px', display:'flex', gap:12, alignItems:'flex-start', background:bg, border:`1px solid ${border}`, borderRadius:3 }}>
                <span className="mono" style={{ fontSize:11, fontWeight:600, width:16, color: isCorrect?'var(--good)':isUser?'var(--bad)':'var(--ink-faint)' }}>{c.key}</span>
                <span style={{ flex:1, fontSize:13, color:'var(--ink)' }}>{c.text}</span>
                {isCorrect ? <span className="mono" style={{ fontSize:10, color:'var(--good)', fontWeight:600 }}>CORRECT</span> : null}
                {isUser && !isCorrect ? <span className="mono" style={{ fontSize:10, color:'var(--bad)', fontWeight:600 }}>YOUR ANSWER</span> : null}
              </div>;
            })}
          </div>
        </Card>

        <Card>
          <div className="mono eyebrow" style={{ marginBottom:10 }}>YOUR SPOKEN REASONING · TRANSCRIPT</div>
          <p style={{ fontSize:13, lineHeight:1.7, color:'var(--ink-dim)', margin:0, fontFamily:'var(--font-serif)', fontStyle:'italic' }}>"{q.transcript}"</p>
        </Card>
      </div>

      {/* Sources column (conditional) */}
      {showSources ? (
        <Card pad={0}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            <div className="mono eyebrow">SOURCES · {q.sources.length} RELEVANT EXCERPTS</div>
            <div style={{ fontSize:12, color:'var(--ink-dim)', marginTop:4 }}>Ranked by relevance. Click to expand; click book title to view in textbook.</div>
          </div>
          <div style={{ maxHeight:620, overflowY:'auto' }}>
            {q.sources.sort((a,b)=>b.relevance-a.relevance).map(s => {
              const open = openSources.includes(s.id);
              return <div key={s.id} style={{ borderBottom:'1px solid var(--border)' }}>
                <button onClick={()=>toggleSource(s.id)} className="hov" style={{ width:'100%', padding:'12px 18px', display:'grid', gridTemplateColumns:'1fr auto auto', gap:10, alignItems:'center', background:'transparent', border:'none', textAlign:'left', cursor:'pointer' }}>
                  <div>
                    <div style={{ fontSize:13, color:'var(--ink)', fontWeight:500 }}>{s.textbook}</div>
                    <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>{s.ref}{s.page?` · p.${s.page}`:''}</div>
                  </div>
                  <div className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)' }}>{Math.round(s.relevance*100)}%</div>
                  <Icon name={open?'chevron-up':'chevron-down'} size={14} color="var(--ink-faint)"/>
                </button>
                {open ? <div style={{ padding:'0 18px 14px' }}>
                  <p style={{ fontSize:13, lineHeight:1.6, color:'var(--ink-dim)', margin:'0 0 10px', fontStyle:'italic', borderLeft:'2px solid var(--accent)', paddingLeft:10 }}>{s.excerpt}</p>
                  <Btn size="sm" variant="ghost" icon={<Icon name="book-open" size={12}/>} onClick={()=>nav('textbook-view')}>Open in textbook</Btn>
                </div> : null}
              </div>;
            })}
          </div>
          <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)' }}>
            <Btn variant="ghost" size="sm" onClick={()=>setOpenSources(openSources.length ? [] : q.sources.map(s=>s.id))} style={{ width:'100%' }}>
              {openSources.length ? 'Collapse all' : 'Expand all sources'}
            </Btn>
          </div>
        </Card>
      ) : null}

      {/* AI analysis column */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card>
          <div className="mono eyebrow">COMBINED SCORE</div>
          <div style={{ marginTop:8 }}>
            <Score value={q.scores.combined} size="xl" suffix="/10"/>
          </div>
          <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>weighted · 60% accounting + 40% consulting</div>
          <Divider style={{ margin:'14px 0' }}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><div className="mono eyebrow">ACCOUNTING</div><Score value={q.scores.accounting} size="lg" suffix="/10"/></div>
            <div><div className="mono eyebrow">CONSULTING</div><Score value={q.scores.consulting} size="lg" suffix="/10"/></div>
          </div>
        </Card>
        <Card>
          <KVBlock label="ROOT-CAUSE GAP" value={q.feedback.gap}/>
          <KVBlock label="FIRST MISSTEP" value={q.feedback.misstep}/>
          <KVBlock label="CONSULTING TECHNIQUE" value={q.feedback.technique} last/>
        </Card>
        <Card>
          <div className="mono eyebrow">STUDY NEXT</div>
          <div style={{ fontSize:13, color:'var(--ink)', marginTop:6, fontFamily:'var(--font-serif)', fontStyle:'italic' }}>{q.feedback.study}</div>
          <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            <Btn size="sm" variant="ghost" icon={<Icon name="cards" size={12}/>} onClick={()=>nav('anki')}>Add to Anki</Btn>
            <Btn size="sm" variant="ghost" icon={<Icon name="book-open" size={12}/>} onClick={()=>nav('textbook-view')}>Open chapter</Btn>
          </div>
        </Card>
      </div>
    </div>

    {/* Scrollable question bar */}
    <QuestionBar session={session} current={currentIdx} onSelect={setCurrentIdx}/>
  </div>;
}

function KVBlock({ label, value, last }) {
  return <div style={{ paddingBottom: last?0:12, marginBottom: last?0:12, borderBottom: last?'none':'1px solid var(--border)' }}>
    <div className="mono eyebrow">{label}</div>
    <div style={{ fontSize:13, color:'var(--ink)', marginTop:4, lineHeight:1.5 }}>{value}</div>
  </div>;
}

function QuestionBar({ session, current, onSelect }) {
  const scrollerRef = React.useRef(null);
  React.useEffect(() => {
    if (!scrollerRef.current) return;
    const el = scrollerRef.current.querySelector(`[data-q="${current}"]`);
    if (el) el.scrollIntoView({ block:'nearest', inline:'center', behavior:'instant' });
  }, []);
  return <div style={{
    position:'fixed', left:80, right:16, bottom:16, zIndex:20,
    background:'var(--surface)', border:'1px solid var(--border)', borderRadius:4,
    boxShadow:'0 8px 24px rgba(0,0,0,0.08)', padding:'10px 14px',
    display:'flex', alignItems:'center', gap:10,
  }}>
    <Btn variant="ghost" size="sm" icon={<Icon name="arrow-left" size={12}/>} onClick={()=>onSelect(Math.max(1, current-1))}>Prev</Btn>
    <div ref={scrollerRef} style={{ flex:1, overflowX:'auto', display:'flex', gap:2, padding:'2px 0' }}>
      {session.map(q => {
        const active = q.idx === current;
        const bg = q.correct ? 'var(--good-soft)' : 'var(--bad-soft)';
        const bc = q.correct ? 'var(--good-border)' : 'var(--bad-border)';
        const col = q.correct ? 'var(--good)' : 'var(--bad)';
        return <button key={q.idx} data-q={q.idx} onClick={()=>onSelect(q.idx)} title={`Q${q.idx} · ${q.topic} · ${q.score}/10`} className="hov" style={{
          flexShrink:0, width:28, height:36, borderRadius:3, cursor:'pointer',
          background: active ? col : bg,
          border: `1px solid ${active ? col : bc}`,
          color: active ? '#fff' : col,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-mono)', fontSize:10, fontWeight:600,
          position:'relative',
        }}>
          <span>{q.idx}</span>
          <span style={{ fontSize:9, fontWeight:400, opacity:0.85 }}>{q.score}</span>
        </button>;
      })}
    </div>
    <Btn variant="ghost" size="sm" onClick={()=>onSelect(Math.min(session.length, current+1))}>Next <Icon name="arrow-right" size={12}/></Btn>
    <div style={{ width:1, background:'var(--border)', alignSelf:'stretch', margin:'0 4px' }}/>
    <span className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)' }}>{current}/{session.length}</span>
  </div>;
}

Object.assign(window, { ScreenReview });


// ===== src/s-rest.jsx =====
// Topics + Anki + Textbooks + Textbook-viewer + Settings

function ScreenTopics({ nav }) {
  const [filter, setFilter] = React.useState('all');
  const [sort, setSort] = React.useState('error');
  let items = window.TOPICS;
  if (filter !== 'all') items = items.filter(t => t.section === filter);
  items = [...items].sort((a,b) => {
    if (sort === 'error') return (b.errorRate||0) - (a.errorRate||0);
    if (sort === 'mastery') return a.mastery - b.mastery;
    if (sort === 'cards') return b.cardsDue - a.cardsDue;
    return b.seen - a.seen;
  });
  return <div>
    <EyebrowHeading
      eyebrow="TOPICS"
      title="Topics the AI found in your textbooks"
      sub={`${window.TOPICS.length} topics extracted across ${window.TEXTBOOKS.length} indexed books. Mastery scored from recent question performance and Anki ease.`}
      right={<div style={{ display:'flex', gap:6 }}>
        {['all','FAR','REG','AUD','TCP'].map(f => <Btn key={f} size="sm" variant="ghost" active={filter===f} onClick={()=>setFilter(f)}>{f}</Btn>)}
      </div>}
    />
    <div style={{ display:'flex', gap:6, marginBottom:12 }}>
      {[['error','Highest error rate'],['mastery','Lowest mastery'],['cards','Most cards due'],['seen','Most practiced']].map(([k,l]) =>
        <Btn key={k} size="sm" variant="ghost" active={sort===k} onClick={()=>setSort(k)}>{l}</Btn>)}
    </div>
    <Card pad={0}>
      <div style={{ display:'grid', gridTemplateColumns:'60px 1fr 110px 140px 140px 90px 90px', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface-2)' }}>
        {['SECT','TOPIC','UNIT','MASTERY','ERROR RATE','CARDS','SEEN'].map(h => <div key={h} className="mono eyebrow">{h}</div>)}
      </div>
      {items.map((t,i) => <div key={t.id} style={{ display:'grid', gridTemplateColumns:'60px 1fr 110px 140px 140px 90px 90px', gap:10, padding:'12px 16px', borderBottom: i===items.length-1?'none':'1px solid var(--border)', alignItems:'center' }}>
        <SectionBadge section={t.section} size="xs"/>
        <div style={{ fontSize:13, color:'var(--ink)' }}>{t.name}</div>
        <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)' }}>{t.unit}</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1 }}><Bar pct={t.mastery*100} height={4} accent={t.mastery>0.7?'var(--good)':t.mastery>0.4?'var(--warn)':'var(--bad)'}/></div>
          <span className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)', width:30 }}>{Math.round(t.mastery*100)}%</span>
        </div>
        <div className="mono tabular" style={{ fontSize:12, color: t.errorRate==null?'var(--ink-faint)':t.errorRate>0.5?'var(--bad)':t.errorRate>0.25?'var(--warn)':'var(--good)' }}>
          {t.errorRate==null ? '—' : `${Math.round(t.errorRate*100)}%`}
        </div>
        <div className="mono tabular" style={{ fontSize:12, color: t.cardsDue>0?'var(--accent)':'var(--ink-faint)' }}>{t.cardsDue} due</div>
        <div className="mono tabular" style={{ fontSize:12, color:'var(--ink-dim)' }}>{t.seen}</div>
      </div>)}
    </Card>
  </div>;
}

// ========== ANKI ==========
function ScreenAnki({ nav }) {
  const [mode, setMode] = React.useState('home'); // home | practice | ask
  const [cardIdx, setCardIdx] = React.useState(0);
  const [showBack, setShowBack] = React.useState(false);
  const [selectedUnit, setSelectedUnit] = React.useState('far-u3');
  const [question, setQuestion] = React.useState('');
  const [askResult, setAskResult] = React.useState(null);

  const deck = window.ANKI_DECK;
  const card = deck.cards[cardIdx % deck.cards.length];

  const answer = (grade) => {
    setShowBack(false);
    setCardIdx(i => i + 1);
  };

  const ask = () => {
    if (!question.trim()) return;
    setAskResult({ status:'thinking' });
    setTimeout(() => {
      setAskResult({
        status:'done',
        verdict: 'Legitimate knowledge gap — adding 2 new cards',
        reasoning: 'Your question covers the interaction between variable consideration and the constraint on revenue recognition. Existing cards cover each concept separately but not the interaction. Creating cards to fill this gap.',
        newCards: [
          { front: 'How does the variable consideration constraint interact with performance obligation allocation?', back: 'Constrained variable consideration is allocated to performance obligations in the same proportion as fixed consideration, unless the variable amount relates entirely to one obligation.' },
          { front: 'When does ASC 606 require variable consideration to be constrained?', back: 'When it is probable that a significant reversal of cumulative revenue recognized would occur once the uncertainty is resolved.' },
        ]
      });
    }, 1400);
  };

  if (mode === 'practice') return <AnkiPractice card={card} showBack={showBack} setShowBack={setShowBack} onAnswer={answer} onExit={()=>setMode('home')} idx={cardIdx+1} total={deck.dueToday}/>;

  return <div>
    <EyebrowHeading
      eyebrow="ANKI · DAILY DECK"
      title={`${deck.dueToday} cards due today`}
      sub="Spaced repetition. AI-generated from your textbook index; new cards auto-added when you miss a question whose gap isn't already covered."
    />
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:20 }}>
      <Stat label="DUE TODAY" value={deck.dueToday} unit="cards"/>
      <Stat label="NEW" value={deck.newToday} unit="cards" />
      <Stat label="REVIEWS" value={deck.reviewsToday} unit="cards"/>
      <Stat label="STREAK" value={deck.streakDays} unit="days" trendUp/>
    </div>

    <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14 }}>
      <Card>
        <div className="mono eyebrow">CURRENT UNIT</div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:10 }}>
          <SectionBadge section="FAR" size="md"/>
          <select value={selectedUnit} onChange={e=>setSelectedUnit(e.target.value)} style={{
            flex:1, height:34, padding:'0 10px', border:'1px solid var(--border)', borderRadius:3,
            background:'var(--surface)', color:'var(--ink)', fontSize:13, fontFamily:'inherit',
          }}>
            {Object.entries(window.UNITS).flatMap(([sec, units]) => units.map(u => <option key={u.id} value={u.id}>{sec} · {u.n} — {u.name}</option>))}
          </select>
        </div>
        <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          <MiniStat label="Cards total" value="52"/>
          <MiniStat label="Learned" value="18" tone="good"/>
          <MiniStat label="Due now" value="6" tone="accent"/>
        </div>
        <div style={{ marginTop:14, display:'flex', gap:8 }}>
          <Btn variant="primary" size="lg" icon={<Icon name="play" size={13}/>} onClick={()=>{setMode('practice'); setCardIdx(0); setShowBack(false);}}>Start practice</Btn>
          <Btn variant="ghost" onClick={()=>setMode('ask')} icon={<Icon name="plus" size={13}/>}>Ask AI a question</Btn>
        </div>
      </Card>

      <Card>
        <div className="mono eyebrow">RECENT AUTO-ADDS</div>
        {deck.cards.map(c => <div key={c.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <SectionBadge section={c.section} size="xs"/>
            {c.aiGenerated ? <span className="mono" style={{ fontSize:9, padding:'2px 5px', borderRadius:2, background:'var(--accent-faint)', color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.08em' }}>AI</span> : null}
            <span className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginLeft:'auto' }}>{c.topic}</span>
          </div>
          <div style={{ fontSize:12, color:'var(--ink)', lineHeight:1.4 }}>{c.front}</div>
          {c.createdFrom ? <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:4 }}>from: {c.createdFrom}</div> : null}
        </div>)}
      </Card>
    </div>

    {mode === 'ask' ? <Card style={{ marginTop:14 }}>
      <div className="mono eyebrow">ASK AI · question about an Anki card or concept</div>
      <textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="e.g. What's the difference between variable consideration and contingent consideration?" style={{
        width:'100%', minHeight:80, marginTop:10, padding:'10px 12px',
        background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:3,
        fontSize:13, fontFamily:'inherit', color:'var(--ink)', resize:'vertical',
      }}/>
      <div style={{ marginTop:10, display:'flex', gap:8 }}>
        <Btn variant="primary" size="sm" onClick={ask} disabled={!question.trim()}>Ask</Btn>
        <span style={{ flex:1 }}/>
        <span className="mono" style={{ fontSize:11, color:'var(--ink-faint)', alignSelf:'center' }}>If legitimate & uncovered, AI will add cards to today's stack.</span>
      </div>
      {askResult?.status === 'thinking' ? <div style={{ marginTop:14, padding:12, background:'var(--surface-2)', borderRadius:3, fontSize:12, color:'var(--ink-dim)' }}>Checking existing cards for overlap…</div> : null}
      {askResult?.status === 'done' ? <div style={{ marginTop:14, padding:14, background:'var(--good-soft)', border:'1px solid var(--good-border)', borderRadius:3 }}>
        <div className="mono eyebrow" style={{ color:'var(--good)' }}>{askResult.verdict}</div>
        <div style={{ fontSize:13, color:'var(--ink)', marginTop:6, lineHeight:1.5 }}>{askResult.reasoning}</div>
        <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
          {askResult.newCards.map((c,i) => <div key={i} style={{ padding:10, background:'var(--surface)', borderRadius:3, border:'1px solid var(--border)' }}>
            <div style={{ fontSize:12, color:'var(--ink)', fontWeight:500 }}>{c.front}</div>
            <div style={{ fontSize:12, color:'var(--ink-dim)', marginTop:4 }}>{c.back}</div>
          </div>)}
        </div>
      </div> : null}
    </Card> : null}
  </div>;
}

function MiniStat({ label, value, tone }) {
  const col = tone==='good'?'var(--good)':tone==='accent'?'var(--accent)':'var(--ink)';
  return <div style={{ padding:10, background:'var(--surface-2)', borderRadius:3 }}>
    <div className="mono eyebrow">{label}</div>
    <div className="mono tabular" style={{ fontSize:22, fontWeight:500, color:col, marginTop:4, letterSpacing:'-0.02em' }}>{value}</div>
  </div>;
}

function AnkiPractice({ card, showBack, setShowBack, onAnswer, onExit, idx, total }) {
  return <div>
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
      <Btn variant="subtle" icon={<Icon name="x" size={13}/>} onClick={onExit}>Exit</Btn>
      <div style={{ flex:1 }}><Bar pct={(idx/total)*100} height={3}/></div>
      <span className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)' }}>{idx} / {total}</span>
    </div>
    <Card pad={40} style={{ minHeight:360 }}>
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <SectionBadge section={card.section} size="xs"/>
        <span className="mono" style={{ fontSize:10, color:'var(--ink-faint)' }}>{card.topic}</span>
        <span style={{ flex:1 }}/>
        <span className="mono" style={{ fontSize:10, color:'var(--ink-faint)' }}>ease {card.ease} · interval {card.interval}d</span>
      </div>
      <div style={{ fontSize:22, color:'var(--ink)', lineHeight:1.4, letterSpacing:'-0.01em', fontWeight:400, marginTop:20 }}>{card.front}</div>
      {showBack ? <div style={{ marginTop:28, paddingTop:20, borderTop:'1px solid var(--border)' }}>
        <div className="mono eyebrow">ANSWER</div>
        <div style={{ fontSize:15, color:'var(--ink)', lineHeight:1.6, marginTop:8, whiteSpace:'pre-wrap' }}>{card.back}</div>
        <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:12 }}>source · {card.source}</div>
      </div> : null}
    </Card>
    <div style={{ marginTop:14 }}>
      {!showBack ? <Btn variant="primary" size="lg" onClick={()=>setShowBack(true)} style={{ width:'100%' }}>Show answer</Btn> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
          <Btn variant="danger" onClick={()=>onAnswer('again')} style={{ flexDirection:'column', height:56 }}>Again<span className="mono" style={{ fontSize:10, opacity:0.7 }}>&lt;1m</span></Btn>
          <Btn variant="ghost" onClick={()=>onAnswer('hard')} style={{ flexDirection:'column', height:56 }}>Hard<span className="mono" style={{ fontSize:10, opacity:0.7 }}>6m</span></Btn>
          <Btn variant="ghost" onClick={()=>onAnswer('good')} style={{ flexDirection:'column', height:56 }}>Good<span className="mono" style={{ fontSize:10, opacity:0.7 }}>1d</span></Btn>
          <Btn variant="ghost" onClick={()=>onAnswer('easy')} style={{ flexDirection:'column', height:56 }}>Easy<span className="mono" style={{ fontSize:10, opacity:0.7 }}>4d</span></Btn>
        </div>
      )}
    </div>
  </div>;
}

// ========== TEXTBOOKS ==========
function ScreenTextbooks({ nav }) {
  return <div>
    <EyebrowHeading
      eyebrow="TEXTBOOKS"
      title="Indexed reference library"
      sub={`${window.TEXTBOOKS.length} books · ${window.TEXTBOOKS.reduce((a,b)=>a+b.topics,0)} topics extracted · ${window.TEXTBOOKS.reduce((a,b)=>a+b.cards,0)} Anki cards generated`}
      right={<Btn variant="primary" icon={<Icon name="upload" size={13}/>}>Upload PDF</Btn>}
    />
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 }}>
      {window.TEXTBOOKS.map(tb => <Card key={tb.id} onClick={()=>nav('textbook-view')} pad={0}>
        <div style={{ padding:16 }}>
          <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
            {tb.tags.map(t => <TagChip key={t} tag={t}/>)}
          </div>
          <div style={{ fontSize:15, color:'var(--ink)', fontWeight:500, letterSpacing:'-0.01em' }}>{tb.title}</div>
          <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:4 }}>{tb.pages.toLocaleString()} pages · {tb.sizeMb} MB · uploaded {fmtDate(tb.uploadedAt)}</div>
        </div>
        <Divider/>
        <div style={{ padding:'12px 16px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          <MiniKV k="Chunks" v={tb.chunks.toLocaleString()}/>
          <MiniKV k="Topics" v={tb.topics}/>
          <MiniKV k="Cards" v={tb.cards}/>
        </div>
        {tb.status === 'indexing' ? <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', background:'var(--accent-faint)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
            <span className="mono" style={{ color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Indexing</span>
            <span className="mono tabular" style={{ color:'var(--accent)' }}>{tb.statusPct}%</span>
          </div>
          <Bar pct={tb.statusPct} height={3}/>
        </div> : <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
          <Btn size="sm" variant="ghost" icon={<Icon name="book-open" size={12}/>} onClick={(e)=>{e.stopPropagation(); nav('textbook-view');}}>Open</Btn>
          <Btn size="sm" variant="subtle" icon={<Icon name="tag" size={12}/>} onClick={(e)=>e.stopPropagation()}>Edit tags</Btn>
        </div>}
      </Card>)}
    </div>
  </div>;
}

function TagChip({ tag }) {
  const isSection = ['FAR','REG','AUD','TCP'].includes(tag);
  const h = isSection ? window.SECTIONS[tag].hue : null;
  return <span className="mono" style={{
    display:'inline-flex', alignItems:'center', height:18, padding:'0 7px', borderRadius:2,
    fontSize:10, letterSpacing:'0.06em', fontWeight:600, textTransform:'uppercase',
    color: isSection ? `oklch(0.40 0.10 ${h})` : 'var(--ink-dim)',
    background: isSection ? `oklch(0.70 0.06 ${h} / 0.22)` : 'var(--surface-2)',
    border: `1px solid ${isSection ? `oklch(0.55 0.08 ${h} / 0.35)` : 'var(--border)'}`,
  }}>{tag}</span>;
}

function MiniKV({ k, v }) {
  return <div><div className="mono eyebrow">{k}</div><div className="mono tabular" style={{ fontSize:16, color:'var(--ink)', marginTop:2 }}>{v}</div></div>;
}

// ========== TEXTBOOK VIEWER ==========
function ScreenTextbookView({ nav }) {
  const tv = window.TEXTBOOK_VIEW;
  return <div>
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
      <Btn variant="subtle" icon={<Icon name="arrow-left" size={13}/>} onClick={()=>nav('textbooks')}>All textbooks</Btn>
      <span style={{ flex:1 }}/>
      <div style={{ position:'relative' }}>
        <Icon name="search" size={14} color="var(--ink-faint)"/>
        <span style={{ position:'absolute' }}/>
      </div>
      <Btn variant="ghost" size="sm" icon={<Icon name="search" size={12}/>}>Search book</Btn>
    </div>

    <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16 }}>
      <Card pad={0}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
          <div className="mono eyebrow">{tv.title}</div>
          <div style={{ fontSize:12, color:'var(--ink)', marginTop:4, fontWeight:500 }}>Table of contents</div>
        </div>
        <div style={{ maxHeight:640, overflowY:'auto', padding:'8px 0' }}>
          {tv.toc.map((t,i) => <div key={i} className="hov" style={{
            padding:`6px ${t.level===1?16:26}px 6px ${t.level===1?16:26}px`,
            display:'flex', alignItems:'center', gap:8, cursor:'pointer',
            background: t.current ? 'var(--accent-faint)' : 'transparent',
            borderLeft: t.current ? '2px solid var(--accent)' : '2px solid transparent',
          }}>
            <div style={{ fontSize: t.level===1?13:12, fontWeight: t.level===1?500:400, color: t.current?'var(--accent)':'var(--ink)' }}>{t.label}</div>
            <span style={{ flex:1 }}/>
            <span className="mono tabular" style={{ fontSize:10, color:'var(--ink-faint)' }}>{t.page}</span>
          </div>)}
        </div>
      </Card>

      <Card pad={0}>
        <div style={{ padding:'14px 28px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center' }}>
          <div>
            <div className="mono eyebrow">§{tv.section}</div>
            <div style={{ fontSize:12, color:'var(--ink-faint)', marginTop:2 }}>Page {tv.page}</div>
          </div>
          <span style={{ flex:1 }}/>
          <Btn variant="ghost" size="sm" icon={<Icon name="cards" size={12}/>} onClick={()=>nav('anki')}>View generated cards</Btn>
        </div>
        <div style={{ padding:'28px 40px', maxWidth:760, lineHeight:1.65, fontFamily:'var(--font-serif)' }}>
          {tv.blocks.map((b,i) => {
            if (b.type==='h') return <h2 key={i} style={{ fontSize:24, fontWeight:400, color:'var(--ink)', margin:'0 0 16px', letterSpacing:'-0.01em' }}>{b.text}</h2>;
            if (b.type==='p') return <p key={i} style={{ fontSize:15, color:'var(--ink)', margin:'0 0 14px' }}>{b.text}</p>;
            if (b.type==='list') return <ul key={i} style={{ margin:'0 0 14px', paddingLeft:22 }}>{b.items.map((it,j)=><li key={j} style={{ fontSize:15, color:'var(--ink)', marginBottom:6 }}>{it}</li>)}</ul>;
            if (b.type==='callout') return <div key={i} style={{ margin:'14px 0', padding:'14px 18px', background:'var(--accent-faint)', borderLeft:'3px solid var(--accent)', borderRadius:2 }}>
              <div className="mono eyebrow" style={{ color:'var(--accent)' }}>{b.title}</div>
              <div style={{ fontSize:14, color:'var(--ink)', marginTop:6, fontFamily:'var(--font-mono)' }}>{b.text}</div>
            </div>;
            if (b.type==='chart') return <figure key={i} style={{ margin:'20px 0', padding:16, background:'var(--surface-2)', borderRadius:3, border:'1px solid var(--border)' }}>
              <div className="mono eyebrow">{b.title}</div>
              <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:12, fontFamily:'var(--font-sans)' }}>
                {b.bars.map((bar,j) => <div key={j}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                    <span style={{ color:'var(--ink)' }}>{bar.label}</span>
                    <span className="mono tabular" style={{ color:'var(--ink-dim)' }}>SSP ${bar.ssp}k · alloc ${bar.alloc}k</span>
                  </div>
                  <div style={{ position:'relative', height:18, background:'var(--surface)', borderRadius:2 }}>
                    <div style={{ position:'absolute', inset:0, right:'auto', width:`${bar.ssp/5}%`, background:'var(--ink-faint)', borderRadius:2, opacity:0.4 }}/>
                    <div style={{ position:'absolute', inset:0, right:'auto', width:`${bar.alloc/5}%`, background:'var(--accent)', borderRadius:2 }}/>
                  </div>
                </div>)}
              </div>
              <figcaption style={{ fontSize:11, color:'var(--ink-faint)', marginTop:12, fontStyle:'italic' }}>{b.caption}</figcaption>
            </figure>;
            if (b.type==='example') return <div key={i} style={{ margin:'18px 0', padding:'16px 20px', background:'var(--surface-2)', borderRadius:3, border:'1px solid var(--border)' }}>
              <div className="mono eyebrow">EXAMPLE {b.n}</div>
              <div style={{ fontSize:14, color:'var(--ink)', marginTop:8, whiteSpace:'pre-wrap', lineHeight:1.6 }}>{b.body}</div>
            </div>;
            return null;
          })}
        </div>
      </Card>
    </div>
  </div>;
}

// ========== SETTINGS ==========
function ScreenSettings({ nav }) {
  const [dates, setDates] = React.useState({ FAR:'2026-08-31', REG:'2026-08-31', AUD:'2026-10-15', TCP:'TBD' });
  const [apiKey, setApiKey] = React.useState('sk-or-v1-••••••••••••••••7c3e');
  const [defaultModel, setDefaultModel] = React.useState('anthropic/claude-sonnet-4.6');
  const [hours, setHours] = React.useState(142.4);
  const [indexOpts, setIndexOpts] = React.useState(window.INDEX_OPTIONS.map(o=>({...o})));
  const [showPrompt, setShowPrompt] = React.useState(false);

  const updateOpt = (id, val) => setIndexOpts(prev => prev.map(o => o.id===id ? {...o, value: val} : o));

  return <div>
    <EyebrowHeading eyebrow="SETTINGS" title="Configuration" sub="Exam dates, API credentials, study routine, indexing depth, and data management."/>

    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:20 }}>
      <nav style={{ position:'sticky', top:16, alignSelf:'start', display:'flex', flexDirection:'column', gap:2 }}>
        {['Exams','API & models','Study routine','Textbook indexing','Study hours','Danger zone'].map((s,i) =>
          <a key={s} href={`#s${i}`} style={{ padding:'8px 12px', borderRadius:3, fontSize:13, color:'var(--ink-dim)', textDecoration:'none' }} className="hov">{s}</a>)}
      </nav>

      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
        <Card id="s0">
          <div className="mono eyebrow">EXAMS & DUE DATES</div>
          <div style={{ fontSize:12, color:'var(--ink-dim)', marginTop:4 }}>Default is 8/31/26 when no date is set.</div>
          <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:10 }}>
            {['FAR','REG','AUD','TCP'].map(s => <div key={s} style={{ display:'grid', gridTemplateColumns:'80px 1fr 160px 100px', gap:10, alignItems:'center' }}>
              <SectionBadge section={s} size="sm"/>
              <div style={{ fontSize:13, color:'var(--ink)' }}>{window.SECTIONS[s].name}</div>
              <input type={dates[s]==='TBD'?'text':'date'} value={dates[s]} onChange={e=>setDates({...dates, [s]:e.target.value})} style={{ height:32, padding:'0 10px', border:'1px solid var(--border)', borderRadius:3, background:'var(--surface)', color:'var(--ink)', fontFamily:'var(--font-mono)', fontSize:12 }}/>
              <Btn size="sm" variant="subtle" onClick={()=>setDates({...dates, [s]:'TBD'})}>Set TBD</Btn>
            </div>)}
          </div>
        </Card>

        <Card id="s1">
          <div className="mono eyebrow">OPENROUTER · API & DEFAULT MODEL</div>
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:'var(--ink-dim)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.08em' }}>API key</label>
              <input value={apiKey} onChange={e=>setApiKey(e.target.value)} style={{ width:'100%', height:34, padding:'0 10px', marginTop:4, border:'1px solid var(--border)', borderRadius:3, background:'var(--surface-2)', color:'var(--ink)', fontFamily:'var(--font-mono)', fontSize:12 }}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:'var(--ink-dim)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Default grading model</label>
              <select value={defaultModel} onChange={e=>setDefaultModel(e.target.value)} style={{ width:'100%', height:34, padding:'0 10px', marginTop:4, border:'1px solid var(--border)', borderRadius:3, background:'var(--surface)', color:'var(--ink)', fontSize:13, fontFamily:'inherit' }}>
                {window.OPENROUTER_MODELS.map(m => <option key={m.id} value={m.id}>{m.label} · {m.meta}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Card id="s2">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1 }}>
              <div className="mono eyebrow">STUDY ROUTINE</div>
              <div style={{ fontSize:13, color:'var(--ink)', marginTop:4 }}>{window.ROUTINE.filename} · uploaded {fmtDate(window.ROUTINE.uploadedAt)}</div>
              <div style={{ fontSize:12, color:'var(--ink-dim)', marginTop:2 }}>{window.ROUTINE.todaysTasks.length} tasks defined · Becker links included</div>
            </div>
            <Btn variant="ghost" icon={<Icon name="upload" size={13}/>}>Upload new XML</Btn>
          </div>
          <div style={{ marginTop:12 }}>
            <Btn size="sm" variant="subtle" onClick={()=>setShowPrompt(!showPrompt)}>{showPrompt?'Hide':'Copy'} Claude prompt to generate routine</Btn>
            {showPrompt ? <div style={{ marginTop:10, padding:14, background:'var(--surface-2)', borderRadius:3, border:'1px solid var(--border)', fontSize:12, fontFamily:'var(--font-mono)', whiteSpace:'pre-wrap', color:'var(--ink-dim)', lineHeight:1.5 }}>{`Generate an XML study routine for CPA exams (FAR, REG, AUD, TCP). Use this schema:

<routine version="1">
  <day date="2026-04-17" target-hours="7">
    <task time="07:00" duration="30" type="anki" section="FAR" unit="U3"/>
    <task time="08:00" duration="60" type="becker" section="FAR" unit="U3"
          url="https://cpa.becker.com/far/unit-3/revenue" label="Revenue allocation lecture"/>
    <task time="10:30" duration="45" type="practice" section="FAR"
          url="https://cpa.becker.com/far/practice/revenue-allocation" label="MCQ set"/>
    <task time="13:00" duration="30" type="anki" section="REG" unit="U2"/>
    <task time="14:00" duration="90" type="textbook" section="FAR" unit="U3" label="Ch 7.3 examples"/>
    <task time="19:00" duration="30" type="review" label="Missed questions"/>
  </day>
  ... (repeat for N days)
</routine>

Task types: anki, becker, practice, textbook, review.
My exam dates: FAR 8/31/26, REG 8/31/26, AUD 10/15/26, TCP TBD.
I want 4-6h/day weekdays, 6-8h/day weekends. Build 12 weeks ending at FAR date.`}</div> : null}
          </div>
        </Card>

        <Card id="s3">
          <div className="mono eyebrow">TEXTBOOK INDEXING · 15 OPTIONS</div>
          <div style={{ fontSize:12, color:'var(--ink-dim)', marginTop:4 }}>Applied to new textbook uploads. Existing books can be re-indexed.</div>
          <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {indexOpts.map(o => <OptRow key={o.id} opt={o} onChange={(v)=>updateOpt(o.id, v)}/>)}
          </div>
          <div style={{ marginTop:14, display:'flex', gap:8 }}>
            <Btn variant="ghost" size="sm">Apply defaults</Btn>
            <Btn variant="ghost" size="sm">Re-index all books</Btn>
          </div>
        </Card>

        <Card id="s4">
          <div className="mono eyebrow">STUDY HOURS</div>
          <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <div style={{ fontSize:11, color:'var(--ink-dim)' }}>Total tracked</div>
              <div className="mono tabular" style={{ fontSize:28, color:'var(--ink)', marginTop:2, letterSpacing:'-0.02em' }}>{hours.toFixed(1)}<span style={{ fontSize:14, color:'var(--ink-faint)', marginLeft:4 }}>hours</span></div>
            </div>
            <div style={{ alignSelf:'end' }}>
              <Btn variant="danger" size="sm" onClick={()=>{ if (confirm('Reset to 0 hours?')) setHours(0); }}>Reset hours counter</Btn>
            </div>
          </div>
        </Card>

        <Card id="s5" style={{ borderColor:'var(--bad-border)' }}>
          <div className="mono eyebrow" style={{ color:'var(--bad)' }}>DANGER ZONE</div>
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
            <Btn variant="danger" size="sm">Clear all recordings</Btn>
            <Btn variant="danger" size="sm">Clear Anki history</Btn>
            <Btn variant="danger" size="sm">Reset all progress</Btn>
          </div>
        </Card>
      </div>
    </div>
  </div>;
}

function OptRow({ opt, onChange }) {
  return <div style={{ padding:10, background:'var(--surface-2)', borderRadius:3, border:'1px solid var(--border)' }}>
    <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, color:'var(--ink)', fontWeight:500 }}>{opt.label}</div>
        <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:2 }}>{opt.hint}</div>
      </div>
      {opt.type === 'toggle' ? <button onClick={()=>onChange(!opt.value)} style={{
        width:32, height:18, borderRadius:9, background: opt.value?'var(--accent)':'var(--border-hi)',
        border:'none', cursor:'pointer', position:'relative', flexShrink:0,
      }}>
        <div style={{ position:'absolute', top:2, left: opt.value?16:2, width:14, height:14, borderRadius:7, background:'#fff', transition:'left .15s' }}/>
      </button> : null}
    </div>
    {opt.type === 'range' ? <div style={{ marginTop:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--ink-faint)', fontFamily:'var(--font-mono)' }}>
        <span>{opt.min}</span>
        <span className="tabular">{opt.value}{opt.unit}</span>
        <span>{opt.max}</span>
      </div>
      <input type="range" min={opt.min} max={opt.max} step={opt.step} value={opt.value} onChange={e=>onChange(+e.target.value)} style={{ width:'100%', marginTop:4 }}/>
    </div> : null}
    {opt.type === 'select' ? <div style={{ marginTop:8, display:'flex', gap:4 }}>
      {opt.options.map(o => <button key={o} onClick={()=>onChange(o)} style={{
        flex:1, height:26, fontSize:11, cursor:'pointer',
        background: opt.value===o?'var(--accent)':'var(--surface)',
        color: opt.value===o?'#fff':'var(--ink-dim)',
        border:`1px solid ${opt.value===o?'var(--accent-dark)':'var(--border)'}`,
        borderRadius:3, textTransform:'capitalize',
      }}>{o}</button>)}
    </div> : null}
  </div>;
}

Object.assign(window, { ScreenTopics, ScreenAnki, ScreenTextbooks, ScreenTextbookView, ScreenSettings });

