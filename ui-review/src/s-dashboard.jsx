// Dashboard — current focus top, section cards, routine in three blocks

function ScreenDashboard({ nav }) {
  const { totalHours, hoursTarget, thisWeekHours, targetWeeklyHours, streakDays } = window.STUDY_STATS;
  const hoursPct = Math.round((totalHours / hoursTarget) * 100);
  const exams = [
    { s: 'FAR', due: '2026-08-31' }, { s: 'REG', due: '2026-08-31' },
    { s: 'AUD', due: '2026-10-15' }, { s: 'TCP', due: 'TBD' },
  ];
  const currentUnit = window.UNITS.FAR.find(u => u.current);

  return <div>
    <EyebrowHeading
      eyebrow={`DASHBOARD · ${new Date().toLocaleDateString('en-US',{weekday:'long', month:'long', day:'numeric'})}`}
      title="583 hours in, 31 this week, on pace."
      sub="FAR Unit 3 today. Next Becker MCQ set in 22 minutes. Anki has 24 reviews due. Three recordings processing in the background."
      right={<div style={{ display:'flex', gap:8 }}>
        <Btn variant="ghost" icon={<Icon name="cards" size={14}/>} onClick={()=>nav('anki')}>Anki · 24 due</Btn>
        <Btn variant="primary" size="lg" icon={<Icon name="record" size={13}/>} onClick={()=>nav('record')}>Record session</Btn>
      </div>}
    />

    {/* CURRENT FOCUS — top of page, full width */}
    <Card pad={0} style={{ marginBottom:20, background:`linear-gradient(180deg, oklch(0.70 0.06 ${window.SECTIONS.FAR.hue} / 0.12) 0%, var(--surface) 70%)` }}>
      <div style={{ padding:'22px 28px', display:'grid', gridTemplateColumns:'1fr auto', gap:30, alignItems:'center' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span className="mono eyebrow">CURRENT FOCUS · RIGHT NOW</span>
            <span className="mono" style={{ fontSize:10, color:'var(--accent)', letterSpacing:'0.1em' }}>● IN PROGRESS</span>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:14, flexWrap:'wrap' }}>
            <SectionBadge section="FAR" size="lg"/>
            <div>
              <div style={{ fontSize:28, color:'var(--ink)', fontWeight:500, letterSpacing:'-0.02em', lineHeight:1.1 }}>Unit 3 · Revenue recognition</div>
              <div style={{ fontSize:14, color:'var(--ink-dim)', marginTop:4 }}>Currently reading <span style={{ color:'var(--ink)' }}>Becker FAR · Ch 7.3c · Allocation when SSPs ≠ transaction price</span></div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:30, marginTop:20, maxWidth:680 }}>
            <FocusStat label="UNIT PROGRESS" value="62%" bar={62}/>
            <FocusStat label="HOURS · UNIT" value="28.8" sub="hrs"/>
            <FocusStat label="TOPICS · SEEN" value="11/16"/>
            <FocusStat label="CARDS · DUE" value="6" sub="of 52"/>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <Btn variant="primary" size="lg" icon={<Icon name="book-open" size={13}/>} onClick={()=>nav('study-tb')}>Continue reading</Btn>
          <Btn variant="ghost" icon={<Icon name="cards" size={13}/>} onClick={()=>nav('anki')}>Practice Anki · 6</Btn>
          <Btn variant="ghost" icon={<Icon name="record" size={13}/>} onClick={()=>nav('record')}>Record drill</Btn>
        </div>
      </div>
    </Card>

    {/* GLOBAL STATS ROW */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:20 }}>
      <Stat label="TOTAL HOURS" value={totalHours.toFixed(0)} unit={`/ ${hoursTarget}`} bar={hoursPct}/>
      <Stat label="THIS WEEK" value={thisWeekHours.toFixed(1)} unit={`hrs of ${targetWeeklyHours}`} bar={(thisWeekHours/targetWeeklyHours)*100}/>
      <Stat label="STREAK" value={streakDays} unit="days" trendUp/>
      <Stat label="RECORDINGS" value={window.PAST_RECORDINGS.length + window.LIVE_PIPELINES.length} unit={`${window.LIVE_PIPELINES.length} processing`}/>
    </div>

    {/* PER-SECTION */}
    <div className="mono eyebrow" style={{ marginBottom:10 }}>SECTIONS · HOURS, PROGRESS & DUE DATES</div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:24 }}>
      {exams.map(e => <SectionCard key={e.s} section={e.s} due={e.due}/>)}
    </div>

    {/* ROUTINE — three period blocks */}
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
      <div>
        <div className="mono eyebrow">TODAY · FROM study-routine.xml</div>
        <div style={{ fontSize:14, color:'var(--ink)', marginTop:2 }}>7 tasks remaining · 5h 15m of study scheduled</div>
      </div>
      <Btn variant="subtle" size="sm" icon={<Icon name="file-xml" size={13}/>} onClick={()=>nav('settings')}>Edit routine</Btn>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
      {window.ROUTINE.blocks.map(b => <RoutineBlock key={b.period} block={b}/>)}
    </div>
  </div>;
}

function FocusStat({ label, value, sub, bar }) {
  return <div>
    <div className="mono eyebrow">{label}</div>
    <div style={{ display:'flex', alignItems:'baseline', gap:4, marginTop:4 }}>
      <span className="mono tabular" style={{ fontSize:22, fontWeight:500, color:'var(--ink)', letterSpacing:'-0.02em' }}>{value}</span>
      {sub ? <span className="mono" style={{ fontSize:11, color:'var(--ink-faint)' }}>{sub}</span> : null}
    </div>
    {bar != null ? <div style={{ marginTop:6 }}><Bar pct={bar} height={3}/></div> : null}
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

function SectionCard({ section, due }) {
  const st = window.SECTION_STATS[section];
  const days = daysUntil(due);
  const hue = window.SECTIONS[section].hue;
  return <Card accent={`oklch(0.55 0.10 ${hue})`}>
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
      <SectionBadge section={section} size="md"/>
      <div style={{ textAlign:'right' }}>
        <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Exam</div>
        <div className="mono tabular" style={{ fontSize:12, color: days==null?'var(--ink-faint)':days<60?'var(--bad)':'var(--ink-dim)' }}>
          {days==null ? 'TBD' : `${days}d · ${fmtDate(due)}`}
        </div>
      </div>
    </div>
    <div style={{ fontSize:13, color:'var(--ink)', marginTop:12, fontWeight:500 }}>{window.SECTIONS[section].name}</div>
    <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
      <div>
        <div className="mono eyebrow">HOURS</div>
        <div className="mono tabular" style={{ fontSize:20, fontWeight:500, color:'var(--ink)', marginTop:2, letterSpacing:'-0.02em' }}>{st.hours.toFixed(0)}</div>
      </div>
      <div>
        <div className="mono eyebrow">PROGRESS</div>
        <div className="mono tabular" style={{ fontSize:20, fontWeight:500, color:'var(--ink)', marginTop:2, letterSpacing:'-0.02em' }}>{Math.round(st.progress*100)}%</div>
      </div>
    </div>
    <div style={{ marginTop:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--ink-dim)', marginBottom:4 }}>
        <span className="mono">{st.unitsDone}/{st.unitsTotal} units</span>
      </div>
      <Bar pct={st.progress*100} height={4} accent={`oklch(0.50 0.12 ${hue})`}/>
    </div>
  </Card>;
}

function RoutineBlock({ block }) {
  const doneCt = block.tasks.filter(t=>t.done).length;
  return <Card pad={0}>
    <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
      <div>
        <div style={{ fontSize:14, color:'var(--ink)', fontWeight:500 }}>{block.period}</div>
        <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:1 }}>{block.range}</div>
      </div>
      <div className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)' }}>{doneCt}/{block.tasks.length} done</div>
    </div>
    <div>
      {block.tasks.map((t,i) => <TaskRow key={t.id} t={t} last={i===block.tasks.length-1}/>)}
    </div>
  </Card>;
}

function TaskRow({ t, last }) {
  const icons = { anki:'cards', becker:'external', practice:'record', textbook:'book-open', review:'list', record:'mic' };
  return <div style={{
    padding:'10px 14px', borderBottom: last?'none':'1px solid var(--border)',
    display:'grid', gridTemplateColumns:'44px 16px 1fr auto', gap:8, alignItems:'center',
    background: t.current ? 'var(--accent-faint)' : 'transparent',
  }}>
    <div className="mono tabular" style={{ fontSize:11, color: t.done?'var(--ink-faint)':'var(--ink-dim)', textDecoration:t.done?'line-through':'none' }}>{t.time}</div>
    <div style={{
      width:14, height:14, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center',
      background: t.done ? 'var(--good)' : t.current ? 'var(--accent)' : 'var(--surface-2)',
      border: t.done||t.current ? 'none' : '1px solid var(--border-hi)',
      color: t.done||t.current ? '#fff' : 'var(--ink-faint)',
    }}>
      {t.done ? <Icon name="check" size={9}/> : t.current ? <span style={{ width:4, height:4, borderRadius:2, background:'#fff' }}/> : null}
    </div>
    <div style={{ minWidth:0 }}>
      <div style={{ fontSize:12, color: t.done?'var(--ink-dim)':'var(--ink)', textDecoration:t.done?'line-through':'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {t.label}
      </div>
      <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:2, display:'flex', alignItems:'center', gap:5 }}>
        <Icon name={icons[t.type]} size={9}/>
        <span style={{ textTransform:'uppercase', letterSpacing:'0.06em' }}>{t.type}</span>
        <span>·</span>
        <span>{t.duration}m</span>
      </div>
    </div>
    {t.url ? <a href={t.url} target="_blank" rel="noreferrer" onClick={(e)=>e.preventDefault()} style={{ color:'var(--accent)', fontSize:10, display:'flex', alignItems:'center', gap:3 }}><Icon name="external" size={10}/>Open</a> : null}
  </div>;
}

Object.assign(window, { ScreenDashboard });
