// Review — selector-first, 5+5=10 rubric, layout swap, mermaid-style flowchart, AI chat

function ScreenReview({ nav }) {
  const [selected, setSelected] = React.useState(17);
  const [layout, setLayout] = React.useState('split'); // split | stacked
  const [showFlow, setShowFlow] = React.useState(true);
  const q = window.REVIEW_Q;
  const session = window.REVIEW_SESSION;

  return <div style={{ paddingBottom:120 }}>
    <EyebrowHeading
      eyebrow={`REVIEW · ${q.topic}`}
      title={<span style={{ display:'flex', alignItems:'center', gap:14 }}>
        Question {selected} of {session.length}
        <span style={{ fontSize:14, fontWeight:400, color: q.wasCorrect?'var(--good)':'var(--bad)', fontFamily:'var(--font-mono)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
          {q.wasCorrect ? '● Correct' : '● Incorrect'}
        </span>
      </span>}
      sub="Jump between questions with the selector. Every column is resizable; try the layout toggle."
      right={<div style={{ display:'flex', gap:8 }}>
        <Btn variant="ghost" size="sm" active={layout==='split'} onClick={()=>setLayout('split')}>Split</Btn>
        <Btn variant="ghost" size="sm" active={layout==='stacked'} onClick={()=>setLayout('stacked')}>Stacked</Btn>
      </div>}
    />

    {/* Question selector bar - top */}
    <QuestionSelector session={session} current={selected} onSelect={setSelected}/>

    {layout === 'split' ? (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:14, marginTop:14 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <QuestionCard q={q}/>
          <TranscriptCard q={q}/>
          {showFlow ? <FlowchartCard q={q}/> : null}
          <AIChat q={q}/>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <ScoreCard q={q}/>
          <FeedbackCard q={q}/>
          <SourcesCard q={q} nav={nav}/>
        </div>
      </div>
    ) : (
      <div style={{ display:'flex', flexDirection:'column', gap:14, marginTop:14 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
          <ScoreCard q={q}/>
          <FeedbackCard q={q} compact/>
          <SourcesCard q={q} nav={nav} compact/>
        </div>
        <QuestionCard q={q}/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <TranscriptCard q={q}/>
          <FlowchartCard q={q}/>
        </div>
        <AIChat q={q}/>
      </div>
    )}
  </div>;
}

function QuestionSelector({ session, current, onSelect }) {
  const scrollerRef = React.useRef(null);
  React.useEffect(() => {
    if (!scrollerRef.current) return;
    const el = scrollerRef.current.querySelector(`[data-q="${current}"]`);
    if (el && el.parentElement) {
      el.parentElement.scrollLeft = el.offsetLeft - el.parentElement.clientWidth/2 + el.offsetWidth/2;
    }
  }, [current]);
  return <Card pad={0}>
    <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
      <Btn variant="ghost" size="sm" icon={<Icon name="arrow-left" size={12}/>} onClick={()=>onSelect(Math.max(1, current-1))}>Prev</Btn>
      <div ref={scrollerRef} style={{ flex:1, overflowX:'auto', display:'flex', gap:2, padding:'2px 0' }}>
        {session.map(q => {
          const active = q.idx === current;
          const bg = q.correct ? 'var(--good-soft)' : 'var(--bad-soft)';
          const bc = q.correct ? 'var(--good-border)' : 'var(--bad-border)';
          const col = q.correct ? 'var(--good)' : 'var(--bad)';
          return <button key={q.idx} data-q={q.idx} onClick={()=>onSelect(q.idx)} title={`Q${q.idx} · ${q.topic} · ${q.score}/10`} className="hov" style={{
            flexShrink:0, width:32, height:40, borderRadius:3, cursor:'pointer',
            background: active ? col : bg,
            border: `1px solid ${active ? col : bc}`,
            color: active ? '#fff' : col,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600,
          }}>
            <span>{q.idx}</span>
            <span style={{ fontSize:9, fontWeight:400, opacity:0.85 }}>{q.score}</span>
          </button>;
        })}
      </div>
      <span className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)' }}>{current}/{session.length}</span>
      <Btn variant="ghost" size="sm" onClick={()=>onSelect(Math.min(session.length, current+1))}>Next <Icon name="arrow-right" size={12}/></Btn>
    </div>
  </Card>;
}

function QuestionCard({ q }) {
  return <Card pad={22}>
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
  </Card>;
}

function TranscriptCard({ q }) {
  return <Card>
    <div className="mono eyebrow">YOUR SPOKEN REASONING · TRANSCRIPT</div>
    <p style={{ fontSize:14, lineHeight:1.75, color:'var(--ink-dim)', margin:'8px 0 0', fontFamily:'var(--font-serif)', fontStyle:'italic' }}>"{q.transcript}"</p>
    <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
      {[
        { k:'Hedges', v:3, tone:'warn' }, { k:'Fillers', v:7, tone:'ink-dim' },
        { k:'Self-corrects', v:2, tone:'good' }, { k:'Words / sec', v:'2.8', tone:'ink-dim' },
      ].map(s => <div key={s.k} style={{ padding:'8px 10px', background:'var(--surface-2)', borderRadius:3 }}>
        <div className="mono eyebrow">{s.k}</div>
        <div className="mono tabular" style={{ fontSize:16, color:`var(--${s.tone})`, marginTop:2 }}>{s.v}</div>
      </div>)}
    </div>
  </Card>;
}

function FlowchartCard({ q }) {
  return <Card>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
      <div className="mono eyebrow">CORRECT REASONING PATH · ASC 606 5-step with citations</div>
      <span className="mono" style={{ fontSize:10, color:'var(--ink-faint)' }}>mermaid.js style</span>
    </div>
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {q.flowchart.map((step, i) => {
        const ok = step.ok;
        const last = i === q.flowchart.length-1;
        return <div key={step.id}>
          <div style={{ display:'grid', gridTemplateColumns:'200px 1fr 160px', gap:12, alignItems:'center' }}>
            <div style={{
              padding:'12px 14px', borderRadius:3,
              background: ok ? 'var(--good-soft)' : 'var(--bad-soft)',
              border: `1px solid ${ok ? 'var(--good-border)' : 'var(--bad-border)'}`,
              color: ok ? 'var(--good)' : 'var(--bad)',
              fontSize:12, lineHeight:1.4, fontWeight:500, whiteSpace:'pre-wrap',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <div style={{ width:14, height:14, borderRadius:7, background: ok?'var(--good)':'var(--bad)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name={ok?'check':'x'} size={9} color="#fff"/>
                </div>
                <span className="mono" style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase' }}>{step.label.split('\n')[0]}</span>
              </div>
              <div style={{ fontSize:13, color:'var(--ink)', fontWeight:500 }}>{step.label.split('\n')[1] || ''}</div>
            </div>
            <div style={{ fontSize:12, color:'var(--ink-dim)', lineHeight:1.5 }}>{step.detail}</div>
            <div style={{ textAlign:'right' }}>
              <div className="mono" style={{ fontSize:10, color:'var(--accent)', padding:'3px 7px', background:'var(--accent-faint)', border:'1px solid var(--accent-border)', borderRadius:2, display:'inline-block' }}>{step.cited}</div>
            </div>
          </div>
          {!last ? <div style={{ marginLeft:100, height:18, width:2, background:'var(--border-hi)' }}/> : null}
        </div>;
      })}
    </div>
  </Card>;
}

function ScoreCard({ q }) {
  return <Card>
    <div className="mono eyebrow">COMBINED SCORE</div>
    <div style={{ marginTop:10, display:'flex', alignItems:'baseline', gap:6 }}>
      <span className="mono tabular" style={{ fontSize:56, fontWeight:300, color: q.scores.combined>=7.5?'var(--good)':q.scores.combined>=5?'var(--warn)':'var(--bad)', letterSpacing:'-0.03em', lineHeight:1 }}>{q.scores.combined.toFixed(1)}</span>
      <span className="mono" style={{ fontSize:20, color:'var(--ink-faint)' }}>/10</span>
    </div>
    <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:4 }}>accounting + consulting · each out of 5</div>
    <Divider style={{ margin:'16px 0' }}/>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
      <div>
        <div className="mono eyebrow">ACCOUNTING · /5</div>
        <div style={{ marginTop:4, display:'flex', alignItems:'baseline', gap:3 }}>
          <span className="mono tabular" style={{ fontSize:28, fontWeight:400, color:'var(--bad)', letterSpacing:'-0.02em' }}>{q.scores.accounting.toFixed(1)}</span>
          <span className="mono" style={{ fontSize:12, color:'var(--ink-faint)' }}>/5</span>
        </div>
        <Bar pct={(q.scores.accounting/5)*100} height={3} accent="var(--bad)"/>
      </div>
      <div>
        <div className="mono eyebrow">CONSULTING · /5</div>
        <div style={{ marginTop:4, display:'flex', alignItems:'baseline', gap:3 }}>
          <span className="mono tabular" style={{ fontSize:28, fontWeight:400, color:'var(--warn)', letterSpacing:'-0.02em' }}>{q.scores.consulting.toFixed(1)}</span>
          <span className="mono" style={{ fontSize:12, color:'var(--ink-faint)' }}>/5</span>
        </div>
        <Bar pct={(q.scores.consulting/5)*100} height={3} accent="var(--warn)"/>
      </div>
    </div>
    <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:14, letterSpacing:'0.02em' }}>
      {q.scores.accounting.toFixed(1)} + {q.scores.consulting.toFixed(1)} = {q.scores.combined.toFixed(1)} / 10
    </div>
  </Card>;
}

function FeedbackCard({ q, compact }) {
  return <Card>
    <div className="mono eyebrow">ANALYSIS</div>
    <KVBlock label="ROOT-CAUSE GAP" value={q.feedback.gap}/>
    <KVBlock label="FIRST MISSTEP" value={q.feedback.misstep}/>
    <KVBlock label="CONSULTING TECHNIQUE" value={q.feedback.technique}/>
    <KVBlock label="STUDY NEXT" value={q.feedback.study} last/>
  </Card>;
}

function KVBlock({ label, value, last }) {
  return <div style={{ paddingBottom: last?0:12, marginBottom: last?0:12, borderBottom: last?'none':'1px solid var(--border)', marginTop:12 }}>
    <div className="mono eyebrow">{label}</div>
    <div style={{ fontSize:13, color:'var(--ink)', marginTop:4, lineHeight:1.5 }}>{value}</div>
  </div>;
}

function SourcesCard({ q, nav, compact }) {
  const [openIds, setOpenIds] = React.useState([]);
  const toggle = (id) => setOpenIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  return <Card pad={0}>
    <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
      <div className="mono eyebrow">SOURCES · {q.sources.length} CITED</div>
      <div style={{ fontSize:11, color:'var(--ink-dim)', marginTop:3 }}>Ranked by relevance</div>
    </div>
    <div style={{ maxHeight: compact?280:460, overflowY:'auto' }}>
      {q.sources.sort((a,b)=>b.relevance-a.relevance).map(s => {
        const open = openIds.includes(s.id);
        return <div key={s.id} style={{ borderBottom:'1px solid var(--border)' }}>
          <button onClick={()=>toggle(s.id)} className="hov" style={{ width:'100%', padding:'10px 16px', display:'grid', gridTemplateColumns:'1fr auto auto', gap:8, alignItems:'center', background:'transparent', border:'none', textAlign:'left', cursor:'pointer' }}>
            <div>
              <div style={{ fontSize:12, color:'var(--ink)', fontWeight:500 }}>{s.textbook}</div>
              <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:2 }}>{s.ref}{s.page?` · p.${s.page}`:''}</div>
            </div>
            <div className="mono tabular" style={{ fontSize:10, color:'var(--ink-dim)' }}>{Math.round(s.relevance*100)}%</div>
            <Icon name={open?'chevron-up':'chevron-down'} size={12} color="var(--ink-faint)"/>
          </button>
          {open ? <div style={{ padding:'0 16px 12px' }}>
            <p style={{ fontSize:12, lineHeight:1.6, color:'var(--ink-dim)', margin:'0 0 8px', fontStyle:'italic', borderLeft:'2px solid var(--accent)', paddingLeft:10 }}>{s.excerpt}</p>
            <Btn size="sm" variant="ghost" icon={<Icon name="book-open" size={11}/>} onClick={()=>nav('textbook-view')}>Open in textbook</Btn>
          </div> : null}
        </div>;
      })}
    </div>
  </Card>;
}

function AIChat({ q }) {
  const [msgs, setMsgs] = React.useState([
    { who:'ai', text:'I\'ve graded this question. Ask me anything about the allocation logic, the citations, or how to approach similar problems.' },
  ]);
  const [input, setInput] = React.useState('');
  const send = () => {
    if (!input.trim()) return;
    const userMsg = { who:'user', text:input };
    setMsgs(m => [...m, userMsg, { who:'ai', text:'thinking', thinking:true }]);
    setInput('');
    setTimeout(() => {
      setMsgs(m => m.filter(x=>!x.thinking).concat({
        who:'ai',
        text: 'The proportional rule from ASC 606-10-32-31 applies anytime the sum of observable standalone selling prices doesn\'t equal the transaction price — which happens often with bundled discounts. For your Orion example: equipment SSP 420 / total SSPs 500 = 84% share, applied to $480k = $403,200. Your reasoning hit the principle but you stopped at the division step ("420 plus 80 is 500, not 480"). The way to avoid this in future: always write the ratio explicitly before picking an answer.',
      }));
    }, 900);
  };
  return <Card pad={0}>
    <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div className="mono eyebrow">ASK THE TUTOR · chat about this question</div>
      <span className="mono" style={{ fontSize:10, color:'var(--ink-faint)' }}>Claude Sonnet 4.6 · see sources</span>
    </div>
    <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:10, maxHeight:320, overflowY:'auto' }}>
      {msgs.map((m, i) => <div key={i} style={{
        alignSelf: m.who==='user'?'flex-end':'flex-start',
        maxWidth:'82%', padding:'10px 12px', borderRadius:3,
        background: m.who==='user' ? 'var(--accent-faint)' : 'var(--surface-2)',
        border: `1px solid ${m.who==='user'?'var(--accent-border)':'var(--border)'}`,
        fontSize:13, color:'var(--ink)', lineHeight:1.55,
      }}>
        {m.thinking ? <span className="mono" style={{ color:'var(--ink-faint)' }}><span className="pulse-dot">●</span> thinking</span> : m.text}
      </div>)}
    </div>
    <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send();}} placeholder="e.g. Why doesn't the stated price work here?" style={{
        flex:1, height:34, padding:'0 12px', border:'1px solid var(--border)', borderRadius:3, background:'var(--surface-2)', fontSize:13, color:'var(--ink)',
      }}/>
      <Btn variant="primary" size="sm" icon={<Icon name="send" size={12}/>} onClick={send}>Ask</Btn>
    </div>
  </Card>;
}

Object.assign(window, { ScreenReview });
