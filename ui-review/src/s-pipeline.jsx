// Pipeline — processing + previous tabs

function ScreenPipeline({ nav }) {
  const [tab, setTab] = React.useState('processing');
  return <div>
    <EyebrowHeading
      eyebrow="PIPELINE"
      title="Recordings"
      sub="Live processing on top, completed below. Each card tracks segmentation, transcription, and grading independently."
    />
    <Tabs value={tab} onChange={setTab} items={[
      { id:'processing', label:'Processing', badge: window.LIVE_PIPELINES.length },
      { id:'previous',   label:'Previous',   badge: window.PAST_RECORDINGS.length },
    ]}/>

    {tab === 'processing' ? (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {window.LIVE_PIPELINES.map(p => <PipelineCard key={p.id} p={p} onOpen={()=>nav('review')}/>)}
        {window.LIVE_PIPELINES.length === 0 ? <Card pad={40} style={{ textAlign:'center', color:'var(--ink-faint)' }}>Nothing processing right now.</Card> : null}
      </div>
    ) : (
      <Card pad={0}>
        <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 120px 90px 110px 140px 100px', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface-2)' }}>
          {['SECT','TITLE','WHEN','QUESTIONS','DURATION','AVG SCORE','MODEL'].map(h => <div key={h} className="mono eyebrow">{h}</div>)}
        </div>
        {window.PAST_RECORDINGS.map((r,i) => <div key={r.id} onClick={()=>nav('review')} className="hov" style={{ display:'grid', gridTemplateColumns:'80px 1fr 120px 90px 110px 140px 100px', gap:10, padding:'12px 16px', borderBottom: i===window.PAST_RECORDINGS.length-1?'none':'1px solid var(--border)', alignItems:'center', cursor:'pointer' }}>
          <div style={{ display:'flex', gap:3 }}>{r.sections.map(s=><SectionBadge key={s} section={s} size="xs"/>)}</div>
          <div>
            <div style={{ fontSize:13, color:'var(--ink)' }}>{r.title}</div>
            <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:2 }}>{r.id}</div>
          </div>
          <div className="mono" style={{ fontSize:11, color:'var(--ink-dim)' }}>{relTime(r.createdAt)}</div>
          <div className="mono tabular" style={{ fontSize:12, color:'var(--ink)' }}>{r.qCount}</div>
          <div className="mono tabular" style={{ fontSize:12, color:'var(--ink-dim)' }}>{fmtDur(r.durationSec)}</div>
          <div><Score value={r.avgCombined} size="sm"/></div>
          <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.model.split('/')[1]}</div>
        </div>)}
      </Card>
    )}
  </div>;
}

const STAGES = [
  { id:'uploading',    label:'Upload' },
  { id:'segmenting',   label:'Segment' },
  { id:'extracting',   label:'Extract' },
  { id:'transcribing', label:'Transcribe' },
  { id:'grading',      label:'Grade' },
];

function PipelineCard({ p, onOpen }) {
  const stageIdx = STAGES.findIndex(s => s.id === p.stage);
  return <Card pad={0}>
    <div style={{ padding:'14px 18px', display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:14, alignItems:'center', borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', gap:4 }}>{p.sections.map(s => <SectionBadge key={s} section={s} size="md"/>)}</div>
      <div>
        <div style={{ fontSize:14, color:'var(--ink)', fontWeight:500 }}>{p.title}</div>
        <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>{p.id} · started {Math.floor((Date.now()-p.startedMs)/1000)}s ago</div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div className="mono tabular" style={{ fontSize:12, color:'var(--ink)' }}>{p.questionsDone}/{p.questionsTotal || '?'} questions</div>
        <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>~{Math.floor(p.etaSec/60)}m {p.etaSec%60}s left</div>
      </div>
      <Btn size="sm" variant="ghost" icon={<Icon name="chevron-right" size={13}/>} onClick={onOpen}>Preview</Btn>
    </div>
    <div style={{ padding:'16px 18px' }}>
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

Object.assign(window, { ScreenPipeline });
