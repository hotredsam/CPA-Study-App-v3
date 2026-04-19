// Topics — table + expandable rows w/ notes, history, update

function ScreenTopics({ nav }) {
  const [filter, setFilter] = React.useState('all');
  const [sort, setSort] = React.useState('error');
  const [expanded, setExpanded] = React.useState(null);
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
      title="Topics extracted by Claude from your textbooks"
      sub={`${window.TOPICS.length} topics tracked across ${window.TEXTBOOKS.length} indexed books. Click a row to open notes, history, and re-index actions.`}
      right={<div style={{ display:'flex', gap:6 }}>
        {['all','FAR','REG','AUD','TCP'].map(f => <Btn key={f} size="sm" variant="ghost" active={filter===f} onClick={()=>setFilter(f)}>{f}</Btn>)}
      </div>}
    />
    <div style={{ display:'flex', gap:6, marginBottom:12 }}>
      {[['error','Highest error rate'],['mastery','Lowest mastery'],['cards','Most cards due'],['seen','Most practiced']].map(([k,l]) =>
        <Btn key={k} size="sm" variant="ghost" active={sort===k} onClick={()=>setSort(k)}>{l}</Btn>)}
    </div>
    <Card pad={0}>
      <div style={{ display:'grid', gridTemplateColumns:'60px 1fr 110px 150px 120px 80px 80px 24px', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface-2)' }}>
        {['SECT','TOPIC','UNIT','MASTERY','ERROR RATE','CARDS','SEEN',''].map((h,i) => <div key={i} className="mono eyebrow">{h}</div>)}
      </div>
      {items.map((t,i) => <TopicRow key={t.id} t={t} last={i===items.length-1} open={expanded===t.id} onToggle={()=>setExpanded(expanded===t.id?null:t.id)} nav={nav}/>)}
    </Card>
  </div>;
}

function TopicRow({ t, last, open, onToggle, nav }) {
  return <div style={{ borderBottom: last && !open?'none':'1px solid var(--border)' }}>
    <div onClick={onToggle} className="hov" style={{ display:'grid', gridTemplateColumns:'60px 1fr 110px 150px 120px 80px 80px 24px', gap:10, padding:'12px 16px', alignItems:'center', cursor:'pointer' }}>
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
      <div className="mono tabular" style={{ fontSize:12, color: t.cardsDue>0?'var(--accent)':'var(--ink-faint)' }}>{t.cardsDue}</div>
      <div className="mono tabular" style={{ fontSize:12, color:'var(--ink-dim)' }}>{t.seen}</div>
      <Icon name={open?'chevron-up':'chevron-down'} size={14} color="var(--ink-faint)"/>
    </div>
    {open ? <TopicDetail t={t} nav={nav}/> : null}
  </div>;
}

function TopicDetail({ t, nav }) {
  const [notes, setNotes] = React.useState(t.notes || '');
  return <div style={{ padding:'16px 20px 18px', background:'var(--surface-2)', borderTop:'1px solid var(--border)' }}>
    <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 260px', gap:16 }}>
      <div>
        <div className="mono eyebrow">NOTES</div>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Your notes on this topic…" style={{
          width:'100%', minHeight:100, marginTop:6, padding:'10px 12px',
          background:'var(--surface)', border:'1px solid var(--border)', borderRadius:3,
          fontSize:13, color:'var(--ink)', resize:'vertical', lineHeight:1.5,
        }}/>
      </div>
      <div>
        <div className="mono eyebrow">RECENT HISTORY</div>
        <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:4 }}>
          {t.history.length ? t.history.map((h,i) => <div key={i} style={{ display:'grid', gridTemplateColumns:'70px 40px 1fr', gap:8, alignItems:'center', padding:'6px 8px', background:'var(--surface)', borderRadius:3, border:'1px solid var(--border)' }}>
            <span className="mono tabular" style={{ fontSize:10, color:'var(--ink-faint)' }}>{h.date.slice(5)}</span>
            <span className="mono tabular" style={{ fontSize:11, color: h.score>=7?'var(--good)':h.score>=5?'var(--warn)':'var(--bad)' }}>{h.score.toFixed(1)}</span>
            <span style={{ fontSize:11, color:'var(--ink-dim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.event}</span>
          </div>) : <div style={{ fontSize:12, color:'var(--ink-faint)' }}>No history yet.</div>}
        </div>
      </div>
      <div>
        <div className="mono eyebrow">ACTIONS</div>
        <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
          <Btn variant="ghost" size="sm" icon={<Icon name="refresh" size={12}/>}>Update from textbooks</Btn>
          <Btn variant="ghost" size="sm" icon={<Icon name="cards" size={12}/>} onClick={()=>nav('anki')}>Practice {t.cardsDue} cards</Btn>
          <Btn variant="ghost" size="sm" icon={<Icon name="book-open" size={12}/>} onClick={()=>nav('textbook-view')}>Open in book</Btn>
          <Btn variant="ghost" size="sm" icon={<Icon name="record" size={12}/>} onClick={()=>nav('record')}>Drill this topic</Btn>
          <Btn variant="subtle" size="sm" icon={<Icon name="note" size={12}/>}>Save notes</Btn>
        </div>
        <div style={{ marginTop:10, padding:10, background:'var(--accent-faint)', border:'1px solid var(--accent-border)', borderRadius:3 }}>
          <div className="mono eyebrow" style={{ color:'var(--accent)' }}>WHERE COVERED</div>
          <div style={{ fontSize:11, color:'var(--ink-dim)', marginTop:4, lineHeight:1.5 }}>Becker FAR §7.3 · FASB ASC 606-10-32 · Ninja FAR Notes p.68</div>
        </div>
      </div>
    </div>
  </div>;
}

Object.assign(window, { ScreenTopics });
