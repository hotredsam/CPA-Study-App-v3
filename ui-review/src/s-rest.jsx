// Textbooks + viewer + Settings

function ScreenTextbooks({ nav }) {
  const [dragOver, setDragOver] = React.useState(false);
  return <div>
    <EyebrowHeading
      eyebrow="TEXTBOOKS"
      title="Study material library"
      sub="Drop PDFs or EPUBs. Claude auto-names them, tags sections, and indexes for per-question retrieval. Cloud standards libraries (FASB ASC, AICPA) can be synced via web APIs."
      right={<Btn variant="primary" icon={<Icon name="upload" size={13}/>}>Upload book</Btn>}
    />
    <Card pad={0} style={{ marginBottom:14,
      border: dragOver?'2px dashed var(--accent)':'2px dashed var(--border-hi)',
      background: dragOver?'var(--accent-faint)':'var(--surface-2)',
    }}
      onDragOver={(e)=>{e.preventDefault(); setDragOver(true);}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={(e)=>{e.preventDefault(); setDragOver(false);}}
    >
      <div style={{ padding:'28px 20px', textAlign:'center' }}>
        <Icon name="upload" size={24}/>
        <div style={{ fontSize:14, color:'var(--ink)', marginTop:10 }}>Drop PDF or EPUB here</div>
        <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:4 }}>Claude will auto-name & auto-tag after read · up to 500 MB</div>
      </div>
    </Card>
    <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14 }}>
      <Card pad={0}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div className="mono eyebrow">MY LIBRARY · {window.TEXTBOOKS.length} BOOKS</div>
          <div style={{ display:'flex', gap:6 }}>
            <Btn size="sm" variant="ghost">Grid</Btn>
            <Btn size="sm" variant="ghost" active>List</Btn>
          </div>
        </div>
        {window.TEXTBOOKS.map((b,i) => <TextbookRow key={b.id} b={b} last={i===window.TEXTBOOKS.length-1} nav={nav}/>)}
      </Card>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card>
          <div className="mono eyebrow">WEB-API SOURCES</div>
          <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4 }}>
            {[
              { name:'FASB ASC', status:'connected', sub:'Live · ASC 606, 842, 740'},
              { name:'AICPA Auditing Standards', status:'connected', sub:'AU-C sections'},
              { name:'IRC · Cornell LII', status:'connected', sub:'Title 26 — retrieved on demand'},
              { name:'GASB Statements', status:'add', sub:'Governmental'},
            ].map(s => <div key={s.name} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize:12, color:'var(--ink)' }}>{s.name}</div>
                <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:2 }}>{s.sub}</div>
              </div>
              {s.status==='connected' ? <span className="mono" style={{ fontSize:10, color:'var(--good)', padding:'2px 6px', background:'var(--good-soft)', border:'1px solid var(--good-border)', borderRadius:2 }}>● LIVE</span>
                : <Btn size="sm" variant="subtle">Add</Btn>}
            </div>)}
          </div>
        </Card>
        <Card>
          <div className="mono eyebrow">STORAGE</div>
          <div className="mono tabular" style={{ fontSize:22, color:'var(--ink)', marginTop:6 }}>12.4 / 50 GB</div>
          <div style={{ marginTop:8 }}><Bar pct={24.8} height={3}/></div>
          <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:8 }}>Cloudflare R2 · embeddings in Workers AI</div>
        </Card>
      </div>
    </div>
  </div>;
}

function TextbookRow({ b, last, nav }) {
  const status = b.indexed === 1 ? 'done' : b.indexed === 0 ? 'queued' : 'indexing';
  return <div style={{ display:'grid', gridTemplateColumns:'40px 1fr 140px 140px 140px 100px', gap:10, padding:'12px 16px', borderBottom: last?'none':'1px solid var(--border)', alignItems:'center' }}>
    <div style={{ width:30, height:40, background:`oklch(0.72 0.08 ${window.SECTIONS[b.tags[0]].hue})`, borderRadius:2, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'inset 0 -1px 0 rgba(0,0,0,0.1)' }}>
      <Icon name="book" size={16} color="#fff"/>
    </div>
    <div>
      <div style={{ fontSize:13, color:'var(--ink)' }}>{b.title}</div>
      <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:2 }}>{b.publisher} · {b.pages}p · {b.size}</div>
    </div>
    <div style={{ display:'flex', gap:3 }}>{b.tags.map(t => <SectionBadge key={t} section={t} size="xs"/>)}</div>
    <div>
      {status==='done' ? <span className="mono" style={{ fontSize:10, color:'var(--good)' }}>● INDEXED · {b.chunks} chunks</span>
        : status==='queued' ? <span className="mono" style={{ fontSize:10, color:'var(--ink-faint)' }}>Queued</span>
        : <><span className="mono" style={{ fontSize:10, color:'var(--accent)' }}>Indexing · {Math.round(b.indexed*100)}%</span><div style={{ marginTop:4 }}><Bar pct={b.indexed*100} height={3}/></div></>}
    </div>
    <div className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)' }}>{b.cited} citations</div>
    <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
      <Btn size="sm" variant="ghost" onClick={()=>nav('textbook-view')}>Open</Btn>
      <Btn size="sm" variant="subtle" title="Re-index" icon={<Icon name="refresh" size={12}/>}></Btn>
    </div>
  </div>;
}

function ScreenTextbookView({ nav }) {
  const [chIdx, setChIdx] = React.useState(2);
  const ch = window.TEXTBOOK_VIEW.chapters[chIdx];
  return <div>
    <EyebrowHeading
      eyebrow={`${window.TEXTBOOK_VIEW.title.toUpperCase()}`}
      title={ch.title}
      sub="Rendered prose from the book. Left rail is the full table of contents; right rail shows citations and cross-refs to your practice history."
    />
    <div style={{ display:'grid', gridTemplateColumns:'240px 1fr 280px', gap:14 }}>
      <Card pad={0}>
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
          <div className="mono eyebrow">TABLE OF CONTENTS</div>
        </div>
        <div style={{ padding:'8px 6px', maxHeight:620, overflowY:'auto' }}>
          {window.TEXTBOOK_VIEW.chapters.map((c, i) => <button key={c.id} onClick={()=>setChIdx(i)} className="hov" style={{
            width:'100%', display:'grid', gridTemplateColumns:'24px 1fr', gap:8, alignItems:'center',
            padding:'8px 10px', borderRadius:3, textAlign:'left', cursor:'pointer',
            background: i===chIdx?'var(--accent-faint)':'transparent',
            border: i===chIdx?'1px solid var(--accent-border)':'1px solid transparent',
          }}>
            <span className="mono tabular" style={{ fontSize:10, color:'var(--ink-faint)' }}>{c.num}</span>
            <span style={{ fontSize:12, color: i===chIdx?'var(--ink)':'var(--ink-dim)' }}>{c.title}</span>
          </button>)}
        </div>
      </Card>
      <Card pad={40}>
        <div className="mono eyebrow">CHAPTER {ch.num}</div>
        <h2 style={{ fontFamily:'var(--font-serif)', fontSize:32, color:'var(--ink)', margin:'8px 0 20px', fontWeight:500, letterSpacing:'-0.015em' }}>{ch.title}</h2>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:16, lineHeight:1.75, color:'var(--ink)' }}>
          {ch.body.map((b, i) => {
            if (b.type === 'p') return <p key={i} style={{ margin:'0 0 14px' }}>{b.text}</p>;
            if (b.type === 'h3') return <h3 key={i} style={{ fontSize:20, fontWeight:500, color:'var(--ink)', margin:'20px 0 10px', letterSpacing:'-0.01em' }}>{b.text}</h3>;
            if (b.type === 'callout') return <div key={i} style={{ margin:'16px 0', padding:'14px 18px', background:'var(--accent-faint)', borderLeft:'3px solid var(--accent)', borderRadius:3 }}>
              <div className="mono eyebrow" style={{ color:'var(--accent)' }}>{b.label}</div>
              <div style={{ fontSize:14, marginTop:6 }}>{b.text}</div>
            </div>;
            return null;
          })}
        </div>
      </Card>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card>
          <div className="mono eyebrow">YOUR HISTORY · THIS CHAPTER</div>
          <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
            {ch.history.map((h,i) => <div key={i} style={{ padding:'8px 10px', background:'var(--surface-2)', borderRadius:3 }}>
              <div style={{ fontSize:11, color:'var(--ink)' }}>{h.event}</div>
              <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:2 }}>{h.date} · {h.score}</div>
            </div>)}
          </div>
        </Card>
        <Card>
          <div className="mono eyebrow">CITATIONS FROM SESSIONS</div>
          <div style={{ fontSize:12, color:'var(--ink-dim)', marginTop:6 }}>This chapter has been cited <span className="mono tabular" style={{ color:'var(--ink)' }}>23×</span> across {23} questions.</div>
          <div style={{ marginTop:8 }}><Btn size="sm" variant="ghost" onClick={()=>nav('review')}>See related questions</Btn></div>
        </Card>
      </div>
    </div>
  </div>;
}

function ScreenSettings({ nav, onTweakChange, tweaks }) {
  const [tab, setTab] = React.useState('study');
  return <div>
    <EyebrowHeading
      eyebrow="SETTINGS"
      title="System configuration"
      sub="Study schedule, models, appearance — all in one place."
    />
    <Tabs value={tab} onChange={setTab} items={[
      { id:'study', label:'Study schedule' },
      { id:'models', label:'Models & API' },
      { id:'appearance', label:'Appearance' },
      { id:'indexing', label:'Indexing' },
      { id:'danger', label:'Danger zone' },
    ]}/>
    {tab==='study' ? <SettingsStudy/>
      : tab==='models' ? <SettingsModels/>
      : tab==='appearance' ? <SettingsAppearance tweaks={tweaks} onTweakChange={onTweakChange}/>
      : tab==='indexing' ? <SettingsIndexing/>
      : <SettingsDanger/>}
  </div>;
}

function SettingsStudy() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<study-routine weekly-target-hours="35">
  <day name="weekday">
    <block period="morning" start="06:00">
      <task time="06:00" type="anki" minutes="25" section="all"/>
      <task time="06:30" type="textbook" minutes="90" section="FAR" source="becker" unit="7.3"
            url="https://online.becker.com/cpa-review/far/chapter-7/lecture-7-3"/>
      <task time="08:00" type="record" minutes="45" section="FAR" question-source="becker-mcq"/>
    </block>
    <block period="midday" start="12:00">
      <task time="12:00" type="review" minutes="30"/>
      <task time="12:30" type="anki" minutes="20" section="REG"/>
    </block>
    <block period="evening" start="18:00">
      <task time="18:00" type="textbook" minutes="60" section="REG" source="ninja" unit="individual-tax"/>
      <task time="19:00" type="practice" minutes="30" section="REG"/>
    </block>
  </day>
</study-routine>`;
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:14 }}>
    <Card>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div className="mono eyebrow">STUDY ROUTINE XML</div>
        <span style={{ flex:1 }}/>
        <Btn size="sm" variant="ghost" icon={<Icon name="upload" size={12}/>}>Drop XML</Btn>
        <Btn size="sm" variant="subtle" icon={<Icon name="copy" size={12}/>}>Copy Claude prompt</Btn>
      </div>
      <textarea defaultValue={xml} spellCheck={false} style={{
        width:'100%', minHeight:380, padding:14, border:'1px solid var(--border)', borderRadius:3,
        background:'var(--surface-2)', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--ink)',
        resize:'vertical', lineHeight:1.55,
      }}/>
      <div style={{ marginTop:10, display:'flex', gap:6 }}>
        <Btn variant="primary">Save & regenerate today</Btn>
        <Btn variant="ghost">Validate</Btn>
      </div>
    </Card>
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card>
        <div className="mono eyebrow">EXAM DATES</div>
        <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
          {[{s:'FAR',d:'2026-08-31'},{s:'REG',d:'2026-08-31'},{s:'AUD',d:'2026-10-15'},{s:'TCP',d:''}].map(e => <div key={e.s} style={{ display:'grid', gridTemplateColumns:'60px 1fr', gap:10, alignItems:'center' }}>
            <SectionBadge section={e.s} size="sm"/>
            <input defaultValue={e.d} placeholder="TBD" style={{ height:30, padding:'0 10px', border:'1px solid var(--border)', borderRadius:3, background:'var(--surface-2)', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--ink)' }}/>
          </div>)}
        </div>
      </Card>
      <Card>
        <div className="mono eyebrow">HOURS TARGET</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--ink-faint)' }}>Weekly</div>
            <input defaultValue="35" style={{ width:'100%', marginTop:4, height:30, padding:'0 10px', border:'1px solid var(--border)', borderRadius:3, background:'var(--surface-2)', fontFamily:'var(--font-mono)', fontSize:13, color:'var(--ink)' }}/>
          </div>
          <div>
            <div style={{ fontSize:11, color:'var(--ink-faint)' }}>Total</div>
            <input defaultValue="1200" style={{ width:'100%', marginTop:4, height:30, padding:'0 10px', border:'1px solid var(--border)', borderRadius:3, background:'var(--surface-2)', fontFamily:'var(--font-mono)', fontSize:13, color:'var(--ink)' }}/>
          </div>
        </div>
        <Btn size="sm" variant="subtle" style={{ marginTop:10 }} icon={<Icon name="refresh" size={11}/>}>Reset hours counter</Btn>
      </Card>
    </div>
  </div>;
}

function SettingsModels() {
  const roles = [
    { k:'Grading', sub:'Per-question scoring', model:'anthropic/claude-sonnet-4.6' },
    { k:'Segmentation', sub:'Split screen into Q&A', model:'google/gemini-2.5-pro' },
    { k:'Transcription', sub:'Speech to text', model:'openai/whisper-large-v3' },
    { k:'Topic extraction', sub:'From textbooks', model:'anthropic/claude-haiku-4.5' },
    { k:'Checkpoint quiz gen', sub:'During reading', model:'anthropic/claude-sonnet-4.6' },
    { k:'Anki card gen', sub:'From textbook chunks', model:'anthropic/claude-haiku-4.5' },
    { k:'Chat tutor', sub:'In-review Q&A', model:'anthropic/claude-sonnet-4.6' },
    { k:'Voice-note transcription', sub:'During review/practice', model:'openai/whisper-large-v3' },
  ];
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14 }}>
    <Card pad={0}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)' }} className="mono eyebrow">PER-FUNCTION MODEL</div>
      {roles.map((r, i) => <div key={r.k} style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:10, padding:'12px 16px', borderBottom: i===roles.length-1?'none':'1px solid var(--border)', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:13, color:'var(--ink)' }}>{r.k}</div>
          <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>{r.sub}</div>
        </div>
        <select defaultValue={r.model} style={{ height:30, padding:'0 10px', border:'1px solid var(--border)', borderRadius:3, background:'var(--surface-2)', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--ink)' }}>
          {window.OPENROUTER_MODELS.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
        </select>
      </div>)}
    </Card>
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card>
        <div className="mono eyebrow">OPENROUTER API KEY</div>
        <div style={{ display:'flex', gap:6, marginTop:10 }}>
          <input type="password" defaultValue="sk-or-v1-aaaaaaaaaaaaaaaa7c3e" style={{ flex:1, height:30, padding:'0 10px', border:'1px solid var(--border)', borderRadius:3, background:'var(--surface-2)', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--ink)' }}/>
          <Btn size="sm" variant="subtle">Rotate</Btn>
        </div>
        <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:6 }}>412 requests today · $1.87 spent</div>
      </Card>
      <Card>
        <div className="mono eyebrow">BUDGET</div>
        <div className="mono tabular" style={{ fontSize:22, color:'var(--ink)', marginTop:4 }}>$23.40 <span style={{ fontSize:11, color:'var(--ink-faint)' }}>/ $50 mo</span></div>
        <div style={{ marginTop:8 }}><Bar pct={46.8} height={3}/></div>
      </Card>
    </div>
  </div>;
}

function SettingsAppearance({ tweaks, onTweakChange }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
    <Card>
      <div className="mono eyebrow">THEME</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginTop:10 }}>
        {['paper','night','sepia'].map(t => <button key={t} onClick={()=>onTweakChange('theme', t)} className="hov" style={{
          padding:'18px 8px', borderRadius:3, cursor:'pointer',
          background: tweaks.theme===t?'var(--accent-faint)':'var(--surface-2)',
          border:`1px solid ${tweaks.theme===t?'var(--accent-border)':'var(--border)'}`,
        }}>
          <div style={{ fontSize:13, color:'var(--ink)', textTransform:'capitalize' }}>{t}</div>
          <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:4 }}>{t==='paper'?'Warm cream · default':t==='night'?'Dark · high contrast':'Amber · low glare'}</div>
        </button>)}
      </div>
    </Card>
    <Card>
      <div className="mono eyebrow">ACCENT HUE</div>
      <input type="range" min="0" max="360" value={tweaks.accentHue} onChange={e=>onTweakChange('accentHue', parseInt(e.target.value))} style={{ width:'100%', marginTop:10 }}/>
      <div className="mono tabular" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:6 }}>Hue: {tweaks.accentHue}° · ledger red = 18°</div>
      <div style={{ marginTop:10, height:20, borderRadius:3, background: `oklch(0.52 0.18 ${tweaks.accentHue})` }}/>
    </Card>
    <Card>
      <div className="mono eyebrow">DENSITY</div>
      <div style={{ display:'flex', gap:6, marginTop:10 }}>
        {['comfortable','compact'].map(d => <Btn key={d} size="sm" variant="ghost" active={tweaks.density===d} onClick={()=>onTweakChange('density', d)}>{d}</Btn>)}
      </div>
    </Card>
    <Card>
      <div className="mono eyebrow">SERIF FAMILY</div>
      <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
        {['Instrument Serif','Tiempos','Source Serif'].map(f => <Btn key={f} size="sm" variant="ghost" active={tweaks.serif===f} onClick={()=>onTweakChange('serif', f)}>{f}</Btn>)}
      </div>
    </Card>
  </div>;
}

function SettingsIndexing() {
  const opts = [
    { k:'Index depth', sub:'How many chunks per page', ctrl:'slider', v:3 },
    { k:'OCR mode', sub:'Scanned / image-based PDFs', ctrl:'toggle', v:true },
    { k:'Formula extraction', sub:'LaTeX conversion for equations', ctrl:'toggle', v:true },
    { k:'Example detection', sub:'Isolate worked problems', ctrl:'toggle', v:true },
    { k:'Cross-reference linking', sub:'Connect citations across books', ctrl:'toggle', v:true },
    { k:'Glossary build', sub:'Auto-build term list', ctrl:'toggle', v:true },
    { k:'Figure captioning', sub:'Describe tables + diagrams', ctrl:'toggle', v:false },
    { k:'Section auto-tag', sub:'CPA section classifier', ctrl:'toggle', v:true },
    { k:'Unit grouping', sub:'Cluster into study units', ctrl:'toggle', v:true },
    { k:'Anki card generation', sub:'Auto-create cards from index', ctrl:'toggle', v:true },
    { k:'Embedding model', sub:'Vector retrieval', ctrl:'select', v:'text-embedding-3-large' },
    { k:'Chunk size', sub:'Tokens per chunk', ctrl:'slider', v:512 },
    { k:'Overlap window', sub:'Between chunks', ctrl:'slider', v:64 },
    { k:'Reindex on update', sub:'When source changes', ctrl:'toggle', v:false },
    { k:'PII scrubbing', sub:'Strip personal data', ctrl:'toggle', v:true },
  ];
  return <Card pad={0}>
    <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)' }} className="mono eyebrow">TEXTBOOK INDEXING · 15 OPTIONS</div>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
      {opts.map((o,i) => <div key={o.k} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, padding:'12px 16px', borderBottom:'1px solid var(--border)', borderRight: (i%2===0)?'1px solid var(--border)':'none', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:12, color:'var(--ink)' }}>{o.k}</div>
          <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:2 }}>{o.sub}</div>
        </div>
        {o.ctrl==='toggle' ? <Toggle on={o.v} onChange={()=>{}}/>
          : o.ctrl==='select' ? <span className="mono" style={{ fontSize:10, color:'var(--ink-dim)' }}>{o.v}</span>
          : <span className="mono tabular" style={{ fontSize:11, color:'var(--ink)' }}>{o.v}</span>}
      </div>)}
    </div>
  </Card>;
}

function SettingsDanger() {
  return <div style={{ maxWidth:680 }}>
    <Card style={{ borderColor:'var(--bad-border)' }}>
      <div className="mono eyebrow" style={{ color:'var(--bad)' }}>DANGER ZONE</div>
      <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:14 }}>
        {[
          { k:'Reset hours counter', sub:'Zero your cumulative study hours. Does not affect recordings or Anki.', btn:'Reset hours', variant:'danger' },
          { k:'Re-index all textbooks', sub:'Rebuild vector store from scratch. ~45 min for your 12 books.', btn:'Re-index all', variant:'danger' },
          { k:'Delete all recordings', sub:'Permanently deletes all past recordings and their transcripts.', btn:'Delete recordings', variant:'danger' },
          { k:'Reset Anki deck', sub:'All intervals return to 0. Keeps cards, resets FSRS state.', btn:'Reset deck', variant:'danger' },
          { k:'Wipe everything', sub:'Factory reset. Deletes hours, recordings, cards, textbooks, notes. Irreversible.', btn:'Wipe', variant:'danger' },
        ].map(r => <div key={r.k} style={{ display:'grid', gridTemplateColumns:'1fr 160px', gap:16, alignItems:'center', padding:'10px 0', borderTop:'1px solid var(--bad-border)' }}>
          <div>
            <div style={{ fontSize:13, color:'var(--ink)' }}>{r.k}</div>
            <div style={{ fontSize:11, color:'var(--ink-dim)', marginTop:3, lineHeight:1.5 }}>{r.sub}</div>
          </div>
          <Btn variant="danger" icon={<Icon name="trash" size={12}/>}>{r.btn}</Btn>
        </div>)}
      </div>
    </Card>
  </div>;
}

Object.assign(window, { ScreenTextbooks, ScreenTextbookView, ScreenSettings });
