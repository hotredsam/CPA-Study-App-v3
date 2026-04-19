// Study textbook reader — chunked reading with checkpoint quizzes

function ScreenStudyTextbook({ nav }) {
  const [chunkIdx, setChunkIdx] = React.useState(0);
  const [quizAnswer, setQuizAnswer] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(false);
  const chunks = window.STUDY_CHUNKS;
  const chunk = chunks[chunkIdx];
  const pct = ((chunkIdx + (submitted?1:0.5)) / chunks.length) * 100;

  const next = () => {
    if (chunkIdx < chunks.length - 1) {
      setChunkIdx(chunkIdx+1); setQuizAnswer(null); setSubmitted(false);
    }
  };

  return <div>
    <EyebrowHeading
      eyebrow={`STUDY · ${chunk.chapter}`}
      title={chunk.title}
      sub="Claude reads a few pages at a time, then quizzes you before advancing. Progress is tracked per chunk."
      right={<div style={{ display:'flex', gap:8 }}>
        <Btn variant="ghost" size="sm" icon={<Icon name="book" size={13}/>} onClick={()=>nav('textbook-view')}>Open raw book</Btn>
        <Btn variant="ghost" size="sm" icon={<Icon name="note" size={13}/>}>Notes</Btn>
      </div>}
    />

    <Card pad={0} style={{ marginBottom:14 }}>
      <div style={{ padding:'12px 18px', display:'flex', alignItems:'center', gap:14 }}>
        <SectionBadge section="FAR" size="sm"/>
        <span className="mono" style={{ fontSize:11, color:'var(--ink-dim)' }}>Chunk {chunkIdx+1} of {chunks.length} · {chunk.estMin}m read</span>
        <span style={{ flex:1 }}/>
        <span className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)' }}>{Math.round(pct)}% through unit</span>
      </div>
      <Bar pct={pct} height={3}/>
    </Card>

    <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14 }}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card pad={32} style={{ background:'var(--surface)' }}>
          <div className="mono eyebrow">§ {chunk.ref}</div>
          <h2 style={{ fontFamily:'var(--font-serif)', fontSize:28, fontWeight:500, color:'var(--ink)', margin:'6px 0 18px', letterSpacing:'-0.01em' }}>{chunk.title}</h2>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:16, lineHeight:1.75, color:'var(--ink)' }}>
            {chunk.body.map((para, i) => <p key={i} style={{ margin:'0 0 14px' }}>{para}</p>)}
          </div>
          {chunk.callout ? <div style={{ margin:'18px 0', padding:'14px 18px', background:'var(--accent-faint)', borderLeft:'3px solid var(--accent)', borderRadius:3 }}>
            <div className="mono eyebrow" style={{ color:'var(--accent)' }}>{chunk.callout.type}</div>
            <div style={{ fontSize:14, color:'var(--ink)', marginTop:6, lineHeight:1.6 }}>{chunk.callout.text}</div>
          </div> : null}
          {chunk.example ? <div style={{ margin:'18px 0', padding:'16px 18px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:3 }}>
            <div className="mono eyebrow">WORKED EXAMPLE</div>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:14, color:'var(--ink-dim)', marginTop:8, lineHeight:1.65 }}>{chunk.example}</div>
          </div> : null}
        </Card>

        <Card>
          <div className="mono eyebrow">CHECKPOINT · {submitted?'ANSWER REVEALED':'ANSWER BEFORE CONTINUING'}</div>
          <h3 style={{ fontSize:16, color:'var(--ink)', margin:'10px 0 14px', fontWeight:500, lineHeight:1.45 }}>{chunk.quiz.q}</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {chunk.quiz.choices.map(c => {
              const picked = quizAnswer === c.key;
              const correct = c.key === chunk.quiz.answer;
              const showGood = submitted && correct;
              const showBad = submitted && picked && !correct;
              return <button key={c.key} disabled={submitted} onClick={()=>setQuizAnswer(c.key)} className="hov" style={{
                display:'flex', gap:12, alignItems:'flex-start', padding:'10px 12px', textAlign:'left', cursor:submitted?'default':'pointer',
                background: showGood?'var(--good-soft)':showBad?'var(--bad-soft)':picked?'var(--accent-faint)':'var(--surface-2)',
                border: `1px solid ${showGood?'var(--good-border)':showBad?'var(--bad-border)':picked?'var(--accent-border)':'var(--border)'}`,
                borderRadius:3,
              }}>
                <span className="mono" style={{ fontWeight:600, fontSize:12, width:14, color:showGood?'var(--good)':showBad?'var(--bad)':'var(--ink-faint)' }}>{c.key}</span>
                <span style={{ flex:1, fontSize:13, color:'var(--ink)' }}>{c.text}</span>
                {showGood ? <span className="mono" style={{ fontSize:10, color:'var(--good)', fontWeight:600 }}>CORRECT</span> : null}
              </button>;
            })}
          </div>
          {submitted ? <div style={{ marginTop:14, padding:12, background:'var(--surface-2)', borderLeft:'2px solid var(--accent)', borderRadius:3 }}>
            <div className="mono eyebrow">EXPLANATION</div>
            <div style={{ fontSize:13, color:'var(--ink-dim)', marginTop:6, lineHeight:1.6 }}>{chunk.quiz.explanation}</div>
          </div> : null}
          <div style={{ marginTop:14, display:'flex', gap:8 }}>
            {!submitted ? <Btn variant="primary" disabled={!quizAnswer} onClick={()=>setSubmitted(true)}>Submit answer</Btn>
              : <Btn variant="primary" icon={<Icon name="arrow-right" size={13}/>} onClick={next} disabled={chunkIdx===chunks.length-1}>Continue reading</Btn>}
            <Btn variant="ghost" size="md">Explain differently</Btn>
            <Btn variant="ghost" size="md">Ask a question</Btn>
          </div>
        </Card>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card>
          <div className="mono eyebrow">CHUNK PROGRESS</div>
          <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:5 }}>
            {chunks.map((c, i) => <button key={c.id} onClick={()=>{setChunkIdx(i); setSubmitted(false); setQuizAnswer(null);}} className="hov" style={{
              display:'grid', gridTemplateColumns:'18px 1fr 34px', gap:8, alignItems:'center',
              padding:'7px 9px', borderRadius:3, cursor:'pointer', textAlign:'left',
              background: i===chunkIdx?'var(--accent-faint)':'transparent',
              border: i===chunkIdx?'1px solid var(--accent-border)':'1px solid transparent',
            }}>
              <div style={{ width:14, height:14, borderRadius:7, background: i<chunkIdx?'var(--good)':i===chunkIdx?'var(--accent)':'var(--surface-2)', border: i>chunkIdx?'1px solid var(--border-hi)':'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {i<chunkIdx ? <Icon name="check" size={9} color="#fff"/> : null}
              </div>
              <span style={{ fontSize:12, color:i<=chunkIdx?'var(--ink)':'var(--ink-dim)' }}>{c.ref}</span>
              <span className="mono tabular" style={{ fontSize:10, color:'var(--ink-faint)' }}>{c.estMin}m</span>
            </button>)}
          </div>
        </Card>
        <Card>
          <div className="mono eyebrow">THIS SESSION</div>
          <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8, fontSize:12 }}>
            <KV k="Time in book" v="34 min"/>
            <KV k="Chunks read" v={`${chunkIdx}/${chunks.length}`}/>
            <KV k="Checkpoints" v="3/4 correct"/>
            <KV k="Hours logged to FAR" v="+0.57"/>
          </div>
        </Card>
        <Card>
          <div className="mono eyebrow">SOURCE</div>
          <div style={{ fontSize:13, color:'var(--ink)', marginTop:6, fontWeight:500 }}>Becker CPA Review · FAR</div>
          <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:3 }}>Chapter 7 · Revenue Recognition · p.134–167</div>
        </Card>
      </div>
    </div>
  </div>;
}

Object.assign(window, { ScreenStudyTextbook });
