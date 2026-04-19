// Anki — daily deck + practice + ask AI + voice notes + linear path

function ScreenAnki({ nav }) {
  const [mode, setMode] = React.useState('daily');
  return <div>
    <EyebrowHeading
      eyebrow="ANKI"
      title="Spaced-repetition deck"
      sub="Daily reviews up top. Practice mode flips through one card at a time, with AI tutor and voice notes per card."
      right={<div style={{ display:'flex', gap:6 }}>
        {[
          { k:'daily', l:'Daily · 24 due', icon:'cards' },
          { k:'practice', l:'Practice', icon:'layers' },
          { k:'path', l:'Path', icon:'list' },
          { k:'browse', l:'Browse', icon:'search' },
        ].map(m => <Btn key={m.k} size="sm" variant="ghost" active={mode===m.k} icon={<Icon name={m.icon} size={12}/>} onClick={()=>setMode(m.k)}>{m.l}</Btn>)}
      </div>}
    />
    {mode === 'daily' ? <AnkiDaily nav={nav} setMode={setMode}/>
      : mode === 'practice' ? <AnkiPractice/>
      : mode === 'path' ? <AnkiPath/>
      : <AnkiBrowse/>}
  </div>;
}

function AnkiDaily({ nav, setMode }) {
  const today = window.ANKI_TODAY;
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14 }}>
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card pad={28} style={{ textAlign:'center', background:`linear-gradient(180deg, var(--accent-faint), var(--surface))` }}>
        <div className="mono eyebrow">DUE TODAY</div>
        <div className="mono tabular" style={{ fontSize:84, fontWeight:300, color:'var(--ink)', marginTop:6, letterSpacing:'-0.03em', lineHeight:1 }}>{today.total}</div>
        <div style={{ fontSize:13, color:'var(--ink-dim)', marginTop:6 }}>across {today.bySection.length} sections · est. {today.estMin} min</div>
        <div style={{ marginTop:20 }}>
          <Btn variant="primary" size="lg" icon={<Icon name="play" size={13}/>} onClick={()=>setMode('practice')}>Start daily review</Btn>
        </div>
      </Card>
      <Card>
        <div className="mono eyebrow">BREAKDOWN</div>
        <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4 }}>
          {today.bySection.map(s => <div key={s.section} style={{ display:'grid', gridTemplateColumns:'50px 1fr 60px', gap:10, alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
            <SectionBadge section={s.section} size="xs"/>
            <div>
              <div style={{ fontSize:12, color:'var(--ink)' }}>{s.topic}</div>
              <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)' }}>{s.newCt} new · {s.reviewCt} review · {s.lapseCt} lapse</div>
            </div>
            <div className="mono tabular" style={{ fontSize:13, color:'var(--ink)', textAlign:'right' }}>{s.count}</div>
          </div>)}
        </div>
      </Card>
    </div>
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card>
        <div className="mono eyebrow">STREAK</div>
        <div className="mono tabular" style={{ fontSize:32, fontWeight:400, color:'var(--ink)', marginTop:4 }}>47 days</div>
        <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>Last miss · Nov 28</div>
      </Card>
      <Card>
        <div className="mono eyebrow">RETENTION · 30 DAYS</div>
        <div className="mono tabular" style={{ fontSize:26, color:'var(--good)', marginTop:4 }}>87.4%</div>
        <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>Target 85% · +2.1 vs last mo</div>
      </Card>
      <Card>
        <div className="mono eyebrow">BACKLOG</div>
        <div className="mono tabular" style={{ fontSize:26, color:'var(--warn)', marginTop:4 }}>12 cards</div>
        <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>Mostly REG taxation</div>
      </Card>
    </div>
  </div>;
}

function AnkiPractice() {
  const [flipped, setFlipped] = React.useState(false);
  const [idx, setIdx] = React.useState(0);
  const [askMode, setAskMode] = React.useState(false);
  const [askInput, setAskInput] = React.useState('');
  const [voice, setVoice] = React.useState(false);
  const cards = window.ANKI_CARDS;
  const card = cards[idx];
  const rate = (grade) => { setFlipped(false); setAskMode(false); setIdx((idx+1)%cards.length); };
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:14 }}>
    <div>
      <Card pad={0} style={{ minHeight:440, display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
          <SectionBadge section={card.section} size="sm"/>
          <span className="mono" style={{ fontSize:11, color:'var(--ink-faint)' }}>{card.topic} · {card.type}</span>
          <span style={{ flex:1 }}/>
          <span className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)' }}>{idx+1}/{cards.length} · reviewed {card.reviews}×</span>
        </div>
        <div style={{ flex:1, padding:'40px 48px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div className="mono eyebrow">{flipped?'BACK':'FRONT'}</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:24, color:'var(--ink)', marginTop:14, lineHeight:1.5, letterSpacing:'-0.005em' }}>
            {flipped ? card.back : card.front}
          </div>
          {flipped && card.mnemonic ? <div style={{ marginTop:20, padding:'12px 14px', background:'var(--accent-faint)', borderLeft:'3px solid var(--accent)', borderRadius:3 }}>
            <div className="mono eyebrow" style={{ color:'var(--accent)' }}>MNEMONIC</div>
            <div style={{ fontSize:13, color:'var(--ink)', marginTop:4 }}>{card.mnemonic}</div>
          </div> : null}
        </div>
        <div style={{ padding:'14px 18px', borderTop:'1px solid var(--border)' }}>
          {!flipped ? <Btn variant="primary" size="lg" style={{ width:'100%' }} onClick={()=>setFlipped(true)}>Show answer · <Kbd>Space</Kbd></Btn>
            : <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6 }}>
              <Btn variant="danger" onClick={()=>rate('again')}>Again <span className="mono" style={{ fontSize:10, opacity:0.7, marginLeft:6 }}>{'<'}1m</span></Btn>
              <Btn variant="ghost" onClick={()=>rate('hard')}>Hard <span className="mono" style={{ fontSize:10, opacity:0.7, marginLeft:6 }}>6m</span></Btn>
              <Btn variant="good" onClick={()=>rate('good')}>Good <span className="mono" style={{ fontSize:10, opacity:0.7, marginLeft:6 }}>1d</span></Btn>
              <Btn variant="primary" onClick={()=>rate('easy')}>Easy <span className="mono" style={{ fontSize:10, opacity:0.7, marginLeft:6 }}>4d</span></Btn>
            </div>}
        </div>
      </Card>

      {askMode ? <Card style={{ marginTop:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div className="mono eyebrow">ASK THE TUTOR · THIS CARD</div>
          <span style={{ flex:1 }}/>
          <Btn variant="subtle" size="sm" icon={<Icon name="x" size={11}/>} onClick={()=>setAskMode(false)}>Close</Btn>
        </div>
        <p style={{ fontSize:13, color:'var(--ink-dim)', lineHeight:1.55, marginTop:8 }}>
          <span className="mono" style={{ color:'var(--accent)', marginRight:6 }}>Claude:</span>
          Think of the 5 steps as a funnel. The contract exists first because that's what triggers revenue accounting. Performance obligations are identified next — distinct promises. Then you price the whole contract, allocate that price across the promises, and recognize as each is satisfied. If you flip any order it breaks: you can't allocate before you've priced.
        </p>
        <div style={{ marginTop:10, display:'flex', gap:6 }}>
          <input value={askInput} onChange={e=>setAskInput(e.target.value)} placeholder="Follow-up question…" style={{ flex:1, height:34, padding:'0 12px', border:'1px solid var(--border)', borderRadius:3, background:'var(--surface-2)', fontSize:13, color:'var(--ink)' }}/>
          <Btn variant="primary" size="sm" icon={<Icon name="send" size={12}/>}>Ask</Btn>
        </div>
      </Card> : null}
    </div>
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card>
        <div className="mono eyebrow">ACTIONS · THIS CARD</div>
        <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
          <Btn variant="ghost" size="sm" icon={<Icon name="send" size={12}/>} onClick={()=>setAskMode(!askMode)}>Ask AI about this card</Btn>
          <Btn variant={voice?'danger':'ghost'} size="sm" icon={<Icon name={voice?'stop':'mic'} size={12}/>} onClick={()=>setVoice(!voice)}>
            {voice ? 'Stop voice note' : 'Record voice note'}
          </Btn>
          <Btn variant="ghost" size="sm" icon={<Icon name="note" size={12}/>}>Add written note</Btn>
          <Btn variant="ghost" size="sm" icon={<Icon name="book-open" size={12}/>}>Open in textbook</Btn>
          <Btn variant="ghost" size="sm" icon={<Icon name="refresh" size={12}/>}>Rewrite card</Btn>
        </div>
      </Card>
      {voice ? <Card>
        <div className="mono eyebrow" style={{ color:'var(--accent)' }}>● RECORDING VOICE NOTE</div>
        <div style={{ display:'flex', alignItems:'center', gap:3, height:36, marginTop:10 }}>
          {Array.from({length:32}).map((_,i)=>(<div key={i} style={{ width:3, height:`${10+Math.abs(Math.sin(i*0.4+Date.now()*0.001))*80}%`, background:'var(--accent)', opacity:0.8 }}/>))}
        </div>
        <div className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)', marginTop:6 }}>0:07 · talking will be transcribed + saved to card</div>
      </Card> : null}
      <Card>
        <div className="mono eyebrow">CARD NOTES</div>
        <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
          {card.notes.map((n,i) => <div key={i} style={{ padding:'8px 10px', background:'var(--surface-2)', borderRadius:3, border:'1px solid var(--border)' }}>
            <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginBottom:3, display:'flex', alignItems:'center', gap:4 }}>
              {n.voice ? <Icon name="mic" size={10}/> : <Icon name="note" size={10}/>} <span>{n.date}</span>
            </div>
            <div style={{ fontSize:12, color:'var(--ink-dim)', lineHeight:1.5 }}>{n.text}</div>
          </div>)}
        </div>
      </Card>
      <Card>
        <div className="mono eyebrow">CARD STATS</div>
        <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6, fontSize:12 }}>
          <KV k="Interval" v={card.interval}/>
          <KV k="Ease" v={card.ease}/>
          <KV k="Lapses" v={card.lapses}/>
          <KV k="Created" v={card.created}/>
        </div>
      </Card>
    </div>
  </div>;
}

function AnkiPath() {
  return <Card pad={0}>
    <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
      <div className="mono eyebrow">LINEAR PATH · FAR</div>
      <div style={{ fontSize:12, color:'var(--ink-dim)', marginTop:3 }}>Progress linearly forward. You can always review previous sections from here.</div>
    </div>
    <div style={{ padding:'18px' }}>
      {window.ANKI_PATH.map((p, i) => {
        const prev = i < window.ANKI_PATH.findIndex(x=>x.current);
        const cur = p.current;
        return <div key={p.id} style={{ display:'grid', gridTemplateColumns:'22px 1fr 140px 100px', gap:12, alignItems:'center', padding:'12px 0', borderBottom: i===window.ANKI_PATH.length-1?'none':'1px solid var(--border)' }}>
          <div style={{ width:18, height:18, borderRadius:9, background: cur?'var(--accent)':prev?'var(--good)':'var(--surface-2)', border: !cur&&!prev?'1px solid var(--border-hi)':'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {prev ? <Icon name="check" size={10} color="#fff"/> : cur ? <span style={{ width:6, height:6, borderRadius:3, background:'#fff' }}/> : null}
          </div>
          <div>
            <div style={{ fontSize:13, color:'var(--ink)' }}>{p.name}</div>
            <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>{p.cards} cards · retention {p.retention}</div>
          </div>
          <div style={{ flex:1 }}><Bar pct={p.progress*100} height={4} accent={cur?'var(--accent)':'var(--good)'}/></div>
          {prev ? <Btn size="sm" variant="ghost">Review</Btn> : cur ? <Btn size="sm" variant="primary">Continue</Btn> : <span className="mono" style={{ fontSize:11, color:'var(--ink-faint)', textAlign:'right' }}>Locked</span>}
        </div>;
      })}
    </div>
  </Card>;
}

function AnkiBrowse() {
  return <Card pad={30} style={{ textAlign:'center', color:'var(--ink-faint)' }}>
    <Icon name="search" size={32}/>
    <div style={{ fontSize:14, marginTop:10, color:'var(--ink-dim)' }}>Browse + search all 1,847 cards. Filter by section, deck, ease, or tag.</div>
  </Card>;
}

Object.assign(window, { ScreenAnki });
