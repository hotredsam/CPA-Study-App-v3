// Mock data for CPA Study Servant

const SECTIONS = {
  FAR: { name:'Financial Accounting & Reporting', hue: 230 },
  REG: { name:'Regulation · Tax & Law',            hue: 28 },
  AUD: { name:'Auditing & Attestation',            hue: 160 },
  TCP: { name:'Tax Compliance & Planning',         hue: 300 },
  BAR: { name:'Business Analysis & Reporting',     hue: 85 },
  ISC: { name:'Information Systems & Controls',    hue: 200 },
};

const STUDY_STATS = {
  totalHours: 583,
  hoursTarget: 1200,
  thisWeekHours: 31,
  targetWeeklyHours: 35,
  streakDays: 47,
};

const SECTION_STATS = {
  FAR: { hours: 217, progress: 0.48, unitsDone: 12, unitsTotal: 25 },
  REG: { hours: 158, progress: 0.34, unitsDone: 7,  unitsTotal: 21 },
  AUD: { hours: 142, progress: 0.30, unitsDone: 6,  unitsTotal: 20 },
  TCP: { hours: 66,  progress: 0.14, unitsDone: 3,  unitsTotal: 22 },
};

const UNITS = {
  FAR: [
    { id:1, name:'Framework', progress:1 },
    { id:2, name:'Cash & receivables', progress:1 },
    { id:3, name:'Revenue recognition', progress:0.62, current:true },
    { id:4, name:'Inventory', progress:0 },
  ],
};

const ROUTINE = {
  blocks: [
    { period:'Morning', range:'6:00 – 9:00 AM', tasks: [
      { id:1, time:'06:00', type:'anki',     label:'Anki · mixed deck',                      duration:25, done:true },
      { id:2, time:'06:30', type:'textbook', label:'Becker FAR · Ch 7.3 Revenue recognition', duration:90, current:true, url:'https://becker.com' },
      { id:3, time:'08:00', type:'record',   label:'Becker MCQ drill · FAR',                 duration:45, done:false },
    ]},
    { period:'Midday', range:'12:00 – 1:30 PM', tasks: [
      { id:4, time:'12:00', type:'review',   label:'Review morning recording',    duration:30 },
      { id:5, time:'12:30', type:'anki',     label:'REG taxation deck',           duration:20 },
      { id:6, time:'13:00', type:'textbook', label:'Ninja notes · individual tax', duration:30, url:'https://ninjacpa.com' },
    ]},
    { period:'Evening', range:'6:00 – 8:30 PM', tasks: [
      { id:7, time:'18:00', type:'textbook', label:'Becker REG · Property transactions', duration:60, url:'https://becker.com' },
      { id:8, time:'19:00', type:'record',   label:'Practice drill · REG',              duration:30 },
      { id:9, time:'19:30', type:'anki',     label:'End-of-day review',                  duration:15 },
    ]},
  ],
};

const OPENROUTER_MODELS = [
  { id:'anthropic/claude-sonnet-4.6',  label:'Claude Sonnet 4.6', meta:'Best overall · $3/1M',   recommended:true },
  { id:'anthropic/claude-haiku-4.5',   label:'Claude Haiku 4.5',  meta:'Fast · $0.25/1M' },
  { id:'google/gemini-2.5-pro',        label:'Gemini 2.5 Pro',    meta:'Long context · $1.25/1M' },
  { id:'openai/gpt-5',                 label:'GPT-5',             meta:'$5/1M' },
  { id:'openai/whisper-large-v3',      label:'Whisper large v3',  meta:'STT · $0.006/min' },
  { id:'deepseek/deepseek-v3.2',       label:'DeepSeek v3.2',     meta:'Cheap · $0.27/1M' },
  { id:'meta-llama/llama-4-405b',      label:'Llama 4 405B',      meta:'Open weights' },
  { id:'xai/grok-4',                   label:'Grok 4',            meta:'$2/1M' },
];

const LIVE_PIPELINES = [
  { id:'rec_a42', title:'Tue morning MCQ · Becker FAR revenue', sections:['FAR'], stage:'transcribing', stagePct:64,
    questionsDone:17, questionsTotal:28, etaSec:192, startedMs: Date.now()-1000*60*9 },
  { id:'rec_a41', title:'Mon evening practice · REG individual tax', sections:['REG'], stage:'grading', stagePct:42,
    questionsDone:9, questionsTotal:22, etaSec:340, startedMs: Date.now()-1000*60*16 },
  { id:'rec_a40', title:'Mon afternoon · AUD evidence drill', sections:['AUD'], stage:'segmenting', stagePct:78,
    questionsDone:0, questionsTotal:0, etaSec:480, startedMs: Date.now()-1000*60*4 },
];

const PAST_RECORDINGS = [
  { id:'rec_a39', title:'Sun FAR leases drill',     sections:['FAR'],       createdAt:new Date(Date.now()-86400000).toISOString(),     qCount:24, durationSec:2280, avgCombined:7.2, model:'anthropic/claude-sonnet-4.6' },
  { id:'rec_a38', title:'Sat mixed · FAR+REG',      sections:['FAR','REG'], createdAt:new Date(Date.now()-86400000*2).toISOString(),   qCount:31, durationSec:3180, avgCombined:6.4, model:'anthropic/claude-sonnet-4.6' },
  { id:'rec_a37', title:'Fri AUD sampling block',   sections:['AUD'],       createdAt:new Date(Date.now()-86400000*3).toISOString(),   qCount:18, durationSec:1680, avgCombined:8.1, model:'google/gemini-2.5-pro' },
  { id:'rec_a36', title:'Thu REG corp tax sim',     sections:['REG'],       createdAt:new Date(Date.now()-86400000*4).toISOString(),   qCount:14, durationSec:1980, avgCombined:5.9, model:'anthropic/claude-sonnet-4.6' },
  { id:'rec_a35', title:'Wed FAR consolidation',    sections:['FAR'],       createdAt:new Date(Date.now()-86400000*5).toISOString(),   qCount:22, durationSec:2400, avgCombined:7.0, model:'anthropic/claude-sonnet-4.6' },
  { id:'rec_a34', title:'Tue mixed morning',        sections:['FAR','AUD'], createdAt:new Date(Date.now()-86400000*6).toISOString(),   qCount:27, durationSec:2760, avgCombined:6.8, model:'anthropic/claude-haiku-4.5' },
];

const REVIEW_SESSION = Array.from({length:28}).map((_, i) => ({
  idx: i+1,
  topic: ['Revenue recognition','Leases','Consolidation','Deferred tax','Inventory costing'][i%5],
  correct: [true, true, false, true, true, true, false, true, true, true, true, false, true, true, true, false, false, true, true, false, true, true, true, false, true, true, true, false][i],
  score: [7.5, 8.2, 3.4, 7.8, 8.0, 7.1, 4.2, 8.5, 7.3, 7.6, 7.0, 4.8, 8.1, 7.9, 7.4, 2.8, 3.9, 8.8, 7.2, 4.5, 7.6, 8.0, 7.5, 3.6, 7.9, 8.3, 7.1, 4.1][i],
}));

const REVIEW_Q = {
  idx: 17,
  topic: 'Revenue recognition · allocation',
  durationSec: 127,
  wasCorrect: false,
  userAnswer: 'B',
  correctAnswer: 'C',
  question: 'Orion Co. signed a contract to deliver equipment, installation services, and 24 months of support for a total transaction price of $480,000. Standalone selling prices: equipment $420,000, installation $30,000, support $50,000. Per ASC 606, what amount of revenue should Orion allocate to the equipment performance obligation?',
  choices: [
    { key:'A', text:'$420,000 — the standalone selling price of the equipment, since that is a directly observable price.' },
    { key:'B', text:'$384,000 — the transaction price ($480,000) minus the stated prices of installation and support ($96,000).' },
    { key:'C', text:'$403,200 — the equipment\'s share (420/500 = 84%) of the total $480,000 transaction price.' },
    { key:'D', text:'$480,000 — recognized when control transfers on delivery, less deferred portions booked separately.' },
  ],
  transcript: 'Okay so Orion has three performance obligations... equipment, install, support. Transaction price is 480. I need to allocate proportionally... standalones are 420, 30, 50. Um, 420 plus 80 is 500, not 480. So there\'s a 20k discount buried in here. I think the rule is you allocate the discount proportionally across all three. But... wait, I\'ll just subtract installation and support at stated prices? 480 minus 30 minus 50 is 400. Hmm no, 480 minus 80 is 400. Let me pick B, 384. That feels close.',
  scores: { accounting: 2.5, consulting: 2.0, combined: 4.5 },
  feedback: {
    gap: 'Recognized the 5-step model and identified all three performance obligations, but skipped the proportional allocation calculation. Computed by subtraction instead of by ratio.',
    misstep: 'At 0:47 you said "I\'ll just subtract installation and support at stated prices." That\'s the rule for when SSPs happen to sum to transaction price. Here SSPs total $500k ≠ $480k, so ASC 606-10-32-31 requires proportional allocation.',
    technique: 'You noticed the $20k discount existed but didn\'t apply the corresponding rule. Slow down 3–5 seconds when you notice a discrepancy — discrepancies always signal which rule to invoke.',
    study: 'Becker FAR § 7.3c, "Allocation when SSPs ≠ transaction price." Also see your Aug 12 session, Q8 — same mistake pattern.',
  },
  flowchart: [
    { id:1, label:'STEP 1\nIdentify contract',            ok:true,  detail:'Orion + customer agreement with commercial substance.',         cited:'ASC 606-10-25-1' },
    { id:2, label:'STEP 2\nIdentify performance obligations', ok:true, detail:'Three distinct obligations: equipment, installation, support.', cited:'ASC 606-10-25-14' },
    { id:3, label:'STEP 3\nDetermine transaction price', ok:true,  detail:'$480,000 stated in contract. No variable consideration.',       cited:'ASC 606-10-32-2' },
    { id:4, label:'STEP 4\nAllocate transaction price',  ok:false, detail:'SSPs total $500k ≠ $480k. Must allocate proportionally: equipment gets 420/500 × 480 = $403,200.', cited:'ASC 606-10-32-31' },
    { id:5, label:'STEP 5\nRecognize revenue',           ok:false, detail:'Recognize equipment revenue on delivery (control transfer). Install and support recognized over time.', cited:'ASC 606-10-25-23' },
  ],
  sources: [
    { id:1, textbook:'Becker FAR', ref:'§ 7.3c · Allocation with discount', page:144, relevance:0.94, excerpt:'"When the sum of standalone selling prices exceeds the transaction price, the discount shall be allocated to the performance obligations on a relative SSP basis, unless specific criteria in 606-10-32-37 are met."' },
    { id:2, textbook:'FASB ASC', ref:'606-10-32-31', page:null, relevance:0.91, excerpt:'"An entity shall allocate the transaction price to each performance obligation identified in the contract on a relative standalone selling price basis."' },
    { id:3, textbook:'Ninja FAR', ref:'Notes · p.68', page:68, relevance:0.86, excerpt:'"Mnemonic: ICDAR — Identify contract, Identify obligations, Determine price, Allocate proportionally, Recognize as satisfied."' },
    { id:4, textbook:'Becker FAR', ref:'§ 7.4 · Worked example 7-12', page:151, relevance:0.79, excerpt:'"Example 7-12: $500k SSP total, $480k contract. Allocation of $20k discount proportionally across all three obligations."' },
    { id:5, textbook:'Your Aug 12 recording', ref:'rec_a28 · Q8', page:null, relevance:0.88, excerpt:'"Same mistake — subtracted stated prices instead of computing ratio. Scored 3.1/10."' },
  ],
};

const TOPICS = [
  { id:1, name:'Revenue recognition · allocation', section:'FAR', unit:'Ch 7.3', mastery:0.38, errorRate:0.62, cardsDue:6, seen:14,
    notes:'Keep mixing up proportional vs. residual allocation. When SSPs ≠ price → proportional.',
    history:[
      { date:'2026-04-15', score:4.5, event:'Missed Q17 · rec_a42' },
      { date:'2026-04-12', score:5.8, event:'Hard on Anki card' },
      { date:'2026-04-08', score:3.1, event:'Missed Q8 · rec_a28' },
    ]},
  { id:2, name:'Deferred tax assets', section:'REG', unit:'Ch 4.2', mastery:0.42, errorRate:0.58, cardsDue:4, seen:11,
    notes:'Valuation allowance logic still fuzzy — "more likely than not" threshold.', history:[] },
  { id:3, name:'Lease classification', section:'FAR', unit:'Ch 9.1', mastery:0.51, errorRate:0.49, cardsDue:3, seen:9, history:[], notes:'' },
  { id:4, name:'Audit sampling methods', section:'AUD', unit:'Ch 6.4', mastery:0.62, errorRate:0.38, cardsDue:2, seen:15, history:[], notes:'' },
  { id:5, name:'Consolidated financial statements', section:'FAR', unit:'Ch 12', mastery:0.29, errorRate:0.71, cardsDue:9, seen:8, history:[], notes:'' },
  { id:6, name:'Individual itemized deductions', section:'REG', unit:'Ch 2.1', mastery:0.84, errorRate:0.16, cardsDue:1, seen:22, history:[], notes:'' },
  { id:7, name:'Internal controls · COSO', section:'AUD', unit:'Ch 3.2', mastery:0.71, errorRate:0.29, cardsDue:2, seen:12, history:[], notes:'' },
  { id:8, name:'Partnership basis', section:'TCP', unit:'Ch 5.3', mastery:0.22, errorRate:0.78, cardsDue:7, seen:6, history:[], notes:'' },
  { id:9, name:'Inventory costing methods', section:'FAR', unit:'Ch 5.2', mastery:0.68, errorRate:0.32, cardsDue:3, seen:18, history:[], notes:'' },
  { id:10, name:'Corporate AMT', section:'REG', unit:'Ch 6.1', mastery:0.33, errorRate:0.67, cardsDue:5, seen:8, history:[], notes:'' },
  { id:11, name:'Statement of cash flows', section:'FAR', unit:'Ch 10', mastery:0.75, errorRate:0.25, cardsDue:2, seen:20, history:[], notes:'' },
  { id:12, name:'Going concern evaluation', section:'AUD', unit:'Ch 8.1', mastery:0.58, errorRate:0.42, cardsDue:3, seen:10, history:[], notes:'' },
];

const TEXTBOOKS = [
  { id:1, title:'Becker CPA Review · FAR',          publisher:'Becker',           pages:1840, size:'142 MB', tags:['FAR'],       indexed:1,    chunks:4120, cited:287 },
  { id:2, title:'Becker CPA Review · REG',          publisher:'Becker',           pages:1420, size:'108 MB', tags:['REG'],       indexed:1,    chunks:3250, cited:198 },
  { id:3, title:'Becker CPA Review · AUD',          publisher:'Becker',           pages:1180, size:'89 MB',  tags:['AUD'],       indexed:1,    chunks:2890, cited:143 },
  { id:4, title:'Becker CPA Review · TCP',          publisher:'Becker',           pages:960,  size:'72 MB',  tags:['TCP'],       indexed:1,    chunks:2190, cited:52 },
  { id:5, title:'Ninja CPA Notes · FAR',            publisher:'NINJA',            pages:420,  size:'24 MB',  tags:['FAR'],       indexed:1,    chunks:980,  cited:94 },
  { id:6, title:'Ninja CPA Notes · REG',            publisher:'NINJA',            pages:380,  size:'22 MB',  tags:['REG'],       indexed:1,    chunks:890,  cited:67 },
  { id:7, title:'Intermediate Accounting (Kieso)',  publisher:'Wiley',            pages:1620, size:'128 MB', tags:['FAR'],       indexed:1,    chunks:3780, cited:41 },
  { id:8, title:'FASB Codification · Volume I',     publisher:'FASB',             pages:2100, size:'186 MB', tags:['FAR'],       indexed:1,    chunks:5020, cited:112 },
  { id:9, title:'IRC Title 26 · Selected sections', publisher:'Cornell LII',      pages:780,  size:'42 MB',  tags:['REG','TCP'], indexed:1,    chunks:1890, cited:38 },
  { id:10, title:'AICPA Auditing Standards',        publisher:'AICPA',            pages:640,  size:'38 MB',  tags:['AUD'],       indexed:1,    chunks:1560, cited:56 },
  { id:11, title:'Roger CPA · REG Supplement',      publisher:'Roger/UWorld',     pages:480,  size:'28 MB',  tags:['REG'],       indexed:0.64, chunks:0,    cited:0 },
  { id:12, title:'FAR Problem Set · 2026',          publisher:'Self-compiled',    pages:180,  size:'12 MB',  tags:['FAR'],       indexed:0,    chunks:0,    cited:0 },
];

const STUDY_CHUNKS = [
  { id:1, chapter:'Unit 3 · Revenue Recognition', ref:'7.3a', title:'The 5-step model', estMin:8,
    body:[
      'ASC 606 governs revenue from contracts with customers. The standard replaces industry-specific guidance with a single unified framework built on one principle: recognize revenue to depict the transfer of goods or services in an amount that reflects the consideration the entity expects to receive.',
      'The framework operationalizes this principle through five sequential steps. The order matters — each step depends on the output of the previous one.',
    ],
    callout:{ type:'CORE PRINCIPLE', text:'Revenue is recognized when (or as) performance obligations are satisfied — that is, when control of the good or service transfers to the customer.' },
    quiz:{ q:'Why do the 5 steps need to be performed in order?', choices:[
      { key:'A', text:'They don\'t — the FASB only recommends the order.' },
      { key:'B', text:'Each step produces an input required by the next (e.g. you must identify obligations before allocating price to them).' },
      { key:'C', text:'Only steps 1 and 5 must be sequential; 2-4 can happen in parallel.' },
      { key:'D', text:'The order is for audit documentation purposes only.' },
    ], answer:'B', explanation:'ASC 606 is deliberately sequential. You cannot allocate a transaction price (Step 4) until you\'ve identified the performance obligations (Step 2) and determined the price (Step 3).' }},
  { id:2, chapter:'Unit 3', ref:'7.3b', title:'Identifying performance obligations', estMin:12,
    body:[
      'A performance obligation is a promise to transfer a distinct good or service. Two criteria: (1) the customer can benefit from it on its own or with readily available resources, and (2) it is separately identifiable from other promises in the contract.',
      'Bundled offerings are common and tricky. Installation bundled with custom software may not be distinct; installation bundled with off-the-shelf equipment usually is.',
    ],
    quiz:{ q:'Which combination typically fails the "distinct" test?', choices:[
      { key:'A', text:'Equipment and standard installation by any qualified technician.' },
      { key:'B', text:'Software with custom integration that only the vendor can perform.' },
      { key:'C', text:'A laptop and a separate extended warranty.' },
      { key:'D', text:'A printer and ink cartridges sold as a bundle.' },
    ], answer:'B', explanation:'Custom integration that only the vendor can perform is not separately identifiable — the customer can\'t benefit from the software without it.' }},
  { id:3, chapter:'Unit 3', ref:'7.3c', title:'Allocation when SSPs ≠ transaction price', estMin:10,
    body:[
      'In bundled contracts, standalone selling prices (SSPs) often do not sum to the transaction price. When this happens, ASC 606-10-32-31 requires allocating the transaction price to each performance obligation on a relative SSP basis.',
      'This is the step you will most likely miss in practice. The temptation is to allocate stated prices directly and absorb the discount into a single obligation — wrong unless the criteria in ASC 606-10-32-37 are met.',
    ],
    example:'Example: Contract = $480k. SSPs: Equipment $420k + Install $30k + Support $50k = $500k. Allocation: Equipment gets 420/500 × 480 = $403,200. Install gets 30/500 × 480 = $28,800. Support gets 50/500 × 480 = $48,000. Total = $480,000. ✓',
    quiz:{ q:'A $600 contract bundles an item with SSP $500 and a service with SSP $200. What gets allocated to the item?', choices:[
      { key:'A', text:'$500 — its stated standalone selling price.' },
      { key:'B', text:'$400 — the contract price minus the service SSP.' },
      { key:'C', text:'$428.57 — 500/700 × 600 (proportional allocation).' },
      { key:'D', text:'$600 — entire contract, since the item has higher SSP.' },
    ], answer:'C', explanation:'SSPs sum to $700, contract is $600 — must allocate proportionally. 500/700 × 600 = $428.57.' }},
  { id:4, chapter:'Unit 3', ref:'7.3d', title:'Variable consideration', estMin:10,
    body:[
      'Variable consideration includes discounts, rebates, refunds, credits, price concessions, performance bonuses, penalties, and similar items. ASC 606 requires estimation — either expected value or most likely amount — and a constraint: only include the portion probable of not being reversed.',
    ],
    quiz:{ q:'Which method is best for a refund estimated across many similar transactions?', choices:[
      { key:'A', text:'Most likely amount.' },
      { key:'B', text:'Expected value (probability-weighted).' },
      { key:'C', text:'Zero — do not estimate refunds.' },
      { key:'D', text:'Average of highest and lowest possible outcome.' },
    ], answer:'B', explanation:'Expected value is appropriate when there is a large number of similar contracts, which allows portfolio-level estimation.' }},
];

const ANKI_TODAY = {
  total: 24, estMin: 22,
  bySection: [
    { section:'FAR', topic:'Revenue recognition', count:8, newCt:2, reviewCt:5, lapseCt:1 },
    { section:'REG', topic:'Individual tax',       count:7, newCt:1, reviewCt:5, lapseCt:1 },
    { section:'AUD', topic:'Sampling',             count:5, newCt:0, reviewCt:4, lapseCt:1 },
    { section:'FAR', topic:'Leases',               count:4, newCt:1, reviewCt:3, lapseCt:0 },
  ],
};

const ANKI_CARDS = [
  { id:1, section:'FAR', topic:'Revenue recognition', type:'definition', reviews:8, interval:'12d', ease:'2.35', lapses:1, created:'2026-02-14',
    front:'What are the 5 steps of ASC 606 revenue recognition, in order?',
    back:'1) Identify the contract with a customer.\n2) Identify the performance obligations.\n3) Determine the transaction price.\n4) Allocate the transaction price.\n5) Recognize revenue when (or as) each obligation is satisfied.',
    mnemonic:'ICDAR — "I Could Definitely Allocate Revenue"',
    notes:[
      { date:'Apr 12', voice:false, text:'Keep mixing step 4 and 5 order. Allocate BEFORE recognize.' },
      { date:'Apr 08', voice:true,  text:'[voice 0:42] Reminder about step 2 — "distinct" has two criteria, benefit-on-own AND separately identifiable.' },
    ]},
  { id:2, section:'REG', topic:'Individual tax', type:'formula', reviews:5, interval:'6d', ease:'2.10', lapses:2, created:'2026-02-20',
    front:'What is the formula for Modified AGI (MAGI) for IRA deduction purposes?',
    back:'MAGI = AGI + Student loan interest deduction + Foreign earned income exclusion + Savings bond interest exclusion + Employer adoption exclusion',
    mnemonic:'SAFES adds back — Student loans, Adoption, Foreign, Earned, Savings',
    notes:[]},
];

const ANKI_PATH = [
  { id:1, name:'FAR · Unit 1 · Framework',            cards:86,  retention:'92%', progress:1,    current:false },
  { id:2, name:'FAR · Unit 2 · Cash & receivables',   cards:112, retention:'88%', progress:1,    current:false },
  { id:3, name:'FAR · Unit 3 · Revenue recognition',  cards:148, retention:'76%', progress:0.62, current:true },
  { id:4, name:'FAR · Unit 4 · Inventory',            cards:94,  retention:'—',   progress:0,    current:false },
  { id:5, name:'FAR · Unit 5 · PP&E',                 cards:110, retention:'—',   progress:0,    current:false },
  { id:6, name:'FAR · Unit 6 · Intangibles',          cards:72,  retention:'—',   progress:0,    current:false },
];

const TEXTBOOK_VIEW = {
  title: 'Becker CPA Review · FAR',
  chapters: [
    { id:1, num:'1', title:'Conceptual Framework', body:[], history:[] },
    { id:2, num:'2', title:'Cash & Cash Equivalents', body:[], history:[] },
    { id:3, num:'7', title:'Revenue Recognition', body:[
      { type:'h3', text:'7.1 Overview of ASC 606' },
      { type:'p', text:'Revenue recognition is governed by Accounting Standards Codification 606, which provides a single, principles-based framework for recognizing revenue from contracts with customers. Before ASC 606, revenue accounting was fragmented across dozens of industry-specific standards — leading to inconsistency and opportunities for earnings management.' },
      { type:'p', text:'The core principle of ASC 606 is straightforward: an entity should recognize revenue to depict the transfer of promised goods or services to customers in an amount that reflects the consideration to which the entity expects to be entitled in exchange for those goods or services.' },
      { type:'callout', label:'EXAM TIP', text:'Examiners love testing the proportional allocation rule. If you see SSPs that don\'t sum to the transaction price, your first instinct should be to compute the ratio — never to subtract.' },
      { type:'h3', text:'7.2 The Five-Step Model' },
      { type:'p', text:'The framework operationalizes the core principle through five sequential steps. Each step depends on outputs from the prior step, which is why the order cannot be rearranged.' },
      { type:'p', text:'Step 1 — Identify the contract. Step 2 — Identify the performance obligations. Step 3 — Determine the transaction price. Step 4 — Allocate the transaction price. Step 5 — Recognize revenue when (or as) each obligation is satisfied.' },
      { type:'h3', text:'7.3 Allocation When SSPs ≠ Transaction Price' },
      { type:'p', text:'In bundled arrangements, standalone selling prices often do not sum to the contract\'s total transaction price. ASC 606-10-32-31 requires the entity to allocate the transaction price to each performance obligation on a relative standalone selling price basis.' },
      { type:'callout', label:'WORKED EXAMPLE 7-12', text:'Contract = $480,000. SSPs: Equipment $420k + Installation $30k + Support $50k = $500,000. Equipment allocation = 420/500 × 480,000 = $403,200.' },
    ], history:[
      { event:'Missed Q17 · rec_a42', date:'Apr 15', score:'4.5/10' },
      { event:'Read chunk 7.3c',      date:'Apr 15', score:'Checkpoint ✓' },
      { event:'Missed Q8 · rec_a28',  date:'Apr 08', score:'3.1/10' },
    ]},
    { id:4, num:'8', title:'Inventory', body:[], history:[] },
    { id:5, num:'9', title:'Leases', body:[], history:[] },
    { id:6, num:'10', title:'Statement of Cash Flows', body:[], history:[] },
    { id:7, num:'12', title:'Business Combinations', body:[], history:[] },
  ],
};

Object.assign(window, {
  SECTIONS, STUDY_STATS, SECTION_STATS, UNITS, ROUTINE, OPENROUTER_MODELS,
  LIVE_PIPELINES, PAST_RECORDINGS, REVIEW_SESSION, REVIEW_Q, TOPICS,
  TEXTBOOKS, STUDY_CHUNKS, ANKI_TODAY, ANKI_CARDS, ANKI_PATH, TEXTBOOK_VIEW,
});
