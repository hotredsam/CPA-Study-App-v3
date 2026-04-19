// Record screen — preflight, source pickers, section allocation, cockpit, upload

function ScreenRecord({ nav }) {
  const [phase, setPhase] = React.useState('setup');
  const [elapsed, setElapsed] = React.useState(0);
  const [mic, setMic] = React.useState('mic_shure');
  const [source, setSource] = React.useState('display1');
  const [sections, setSections] = React.useState(['FAR']);
  const [model, setModel] = React.useState('anthropic/claude-sonnet-4.6');
  const [paused, setPaused] = React.useState(false);
  const [uploadPct, setUploadPct] = React.useState(0);
  const [micLevel, setMicLevel] = React.useState(0.6);

  React.useEffect(() => {
    if (phase !== 'recording' || paused) return;
    const t = setInterval(()=>setElapsed(e=>e+1), 1000);
    return ()=>clearInterval(t);
  }, [phase, paused]);

  React.useEffect(() => {
    const t = setInterval(()=>setMicLevel(0.3 + Math.random()*0.55), 180);
    return ()=>clearInterval(t);
  }, []);

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

  if (phase === 'recording') return <Cockpit elapsed={elapsed} paused={paused} togglePause={()=>setPaused(p=>!p)} onStop={()=>{setPhase('uploading'); setUploadPct(0);}} sections={sections} micLevel={micLevel}/>;
  if (phase === 'uploading') return <UploadPanel pct={uploadPct} elapsed={elapsed} sections={sections} model={model}/>;

  const preflightOk = sections.length > 0 && source && mic;

  return <div>
    <EyebrowHeading
      eyebrow="NEW RECORDING"
      title="Preflight"
      sub="Capture screen + mic. Claude will segment the video into questions, transcribe your reasoning, and grade each one."
    />

    <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>
      <Card pad={0}>
        <Group label="1 · Screen capture" hint="Chooses what gets recorded">
          {[
            { id:'display1', label:'Display 1 — full screen', meta:'2560 × 1440 · 144 Hz · primary' },
            { id:'display2', label:'Display 2 — full screen', meta:'1920 × 1080 · 60 Hz' },
            { id:'window',   label:'Chrome — Becker Practice', meta:'Window 4182 · currently focused' },
            { id:'tab',      label:'Current browser tab',      meta:'Only captures in-browser activity' },
          ].map(s => <Picker key={s.id} active={source===s.id} onClick={()=>setSource(s.id)} icon="screen" label={s.label} meta={s.meta}/>)}
        </Group>
        <Divider/>
        <Group label="2 · Microphone" hint="Verbal reasoning is graded from this">
          {[
            { id:'mic_shure', label:'Shure MV7+ (USB)',       meta:'48 kHz · default', lvl:0.62 },
            { id:'mic_head',  label:'Logitech G Pro headset', meta:'USB · mono',       lvl:0.32 },
            { id:'mic_built', label:'Built-in mic array',     meta:'Not recommended',  lvl:0.08 },
          ].map(m => <Picker key={m.id} active={mic===m.id} onClick={()=>setMic(m.id)} icon="mic" label={m.label} meta={m.meta} level={mic===m.id?micLevel:m.lvl}/>)}
        </Group>
        <Divider/>
        <Group label="3 · Section allocation" hint="Tag which sections you'll drill — multiple allowed">
          <div style={{ padding:'0 18px 4px', display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
            {Object.entries(window.SECTIONS).map(([k,s]) => {
              const on = sections.includes(k);
              return <button key={k} onClick={()=>toggleSection(k)} className="hov" style={{
                padding:'16px 6px 14px', borderRadius:3, cursor:'pointer',
                background: on ? `oklch(0.70 0.06 ${s.hue} / 0.22)` : 'var(--surface)',
                border: `1px solid ${on ? `oklch(0.55 0.08 ${s.hue} / 0.45)` : 'var(--border)'}`,
                display:'flex', flexDirection:'column', alignItems:'center', gap:6, position:'relative',
              }}>
                {on ? <span style={{ position:'absolute', top:6, right:6, width:14, height:14, borderRadius:7, background:`oklch(0.50 0.10 ${s.hue})`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="check" size={10} color="#fff"/></span> : null}
                <div className="mono" style={{ fontSize:14, fontWeight:600, color:on?`oklch(0.38 0.10 ${s.hue})`:'var(--ink)' }}>{k}</div>
                <div style={{ fontSize:10, color:'var(--ink-faint)', textAlign:'center', lineHeight:1.3 }}>{s.name.split('&')[0].trim()}</div>
              </button>;
            })}
          </div>
          <div style={{ padding:'4px 18px 0', fontSize:11, color:'var(--ink-faint)' }}>
            Claude will auto-classify each question into the closest section if it's ambiguous.
          </div>
        </Group>
        <Divider/>
        <Group label="4 · Grading model" hint="Sent via OpenRouter after transcription">
          <div style={{ padding:'0 18px 4px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {window.OPENROUTER_MODELS.slice(0,4).map(m => <Picker key={m.id} active={model===m.id} onClick={()=>setModel(m.id)} label={m.label} meta={m.meta} tag={m.recommended?'Recommended':null}/>)}
          </div>
          <div style={{ padding:'8px 18px 4px' }}>
            <Btn variant="subtle" size="sm" onClick={()=>nav('settings')}>Configure all 8 models in Settings →</Btn>
          </div>
        </Group>
      </Card>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <Card>
          <div className="mono eyebrow">PREFLIGHT CHECKS</div>
          <Check ok={!!source} label="Display captured" sub={source==='display1'?'Display 1 · 2560×1440':null}/>
          <Check ok={!!mic} label="Microphone signal detected" sub={`Peak ${Math.round(micLevel*100)}% · within range`}/>
          <Check ok={true} label="OpenRouter API connected" sub="sk-or-v1-••••••••7c3e · 412 req today"/>
          <Check ok={sections.length>0} label="Sections assigned" sub={sections.length?`${sections.length} selected · ${sections.join(', ')}`:'Select at least one section'}/>
          <Check ok={true} label="Textbooks indexed" sub={`${sections.reduce((a,s)=>a+window.TEXTBOOKS.filter(tb=>tb.tags.includes(s)).length,0)} books for selected sections`}/>
        </Card>

        <Card>
          <div className="mono eyebrow">SESSION SUMMARY</div>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:5, fontSize:12 }}>
            <KV k="Sections" v={sections.join(' · ') || '—'}/>
            <KV k="Source" v={source==='display1'?'Display 1':source==='display2'?'Display 2':source==='window'?'Chrome window':'Browser tab'}/>
            <KV k="Mic" v={mic==='mic_shure'?'Shure MV7+':mic==='mic_head'?'Logitech G Pro':'Built-in'}/>
            <KV k="Model" v={window.OPENROUTER_MODELS.find(m=>m.id===model).label}/>
            <KV k="Est. cost" v="~$0.12 / hour"/>
          </div>
        </Card>

        <Btn variant="primary" size="lg" icon={<Icon name="record" size={13}/>} onClick={()=>{setPhase('recording'); setElapsed(0);}} style={{ width:'100%' }} disabled={!preflightOk}>
          Start recording
        </Btn>
        <div style={{ fontSize:11, color:'var(--ink-faint)', textAlign:'center' }}>
          Press <Kbd>⌃</Kbd> <Kbd>R</Kbd> to start · <Kbd>⌃</Kbd> <Kbd>Space</Kbd> to pause
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
  const bars = React.useMemo(() => Array.from({length:8}).map(()=>Math.random()), [level==null]);
  return <button onClick={onClick} className="hov" style={{
    width:'100%', padding:'10px 12px', display:'flex', alignItems:'center', gap:10,
    background: active ? 'var(--accent-faint)' : 'var(--surface)',
    border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
    borderRadius:3, cursor:'pointer', marginBottom:6, textAlign:'left',
  }}>
    {icon ? <div style={{ width:26, height:26, borderRadius:3, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', color: active?'var(--accent)':'var(--ink-dim)' }}><Icon name={icon} size={14}/></div> : null}
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:13, color:'var(--ink)' }}>{label}</span>
        {tag ? <span className="mono" style={{ fontSize:9, padding:'2px 5px', borderRadius:2, background:'var(--accent-faint)', color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{tag}</span> : null}
      </div>
      <div className="mono" style={{ fontSize:11, color:'var(--ink-faint)', marginTop:2 }}>{meta}</div>
    </div>
    {level != null ? <div style={{ width:36, height:14, display:'flex', alignItems:'center', gap:1 }}>{bars.map((b,i)=>(<div key={i} style={{ width:2, height:Math.max(3, 14 * Math.min(1, b*level*1.8)), background: i<level*8?'var(--accent)':'var(--border-hi)' }}/>))}</div> : null}
    <div style={{ width:14, height:14, borderRadius:7, border:`1px solid ${active?'var(--accent)':'var(--border-hi)'}`, background: active?'var(--accent)':'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {active ? <Icon name="check" size={9} color="#fff"/> : null}
    </div>
  </button>;
}

function Check({ ok, label, sub }) {
  return <div style={{ padding:'9px 0', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
    <div style={{ width:16, height:16, borderRadius:8, background: ok?'var(--good)':'var(--border-hi)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {ok ? <Icon name="check" size={10} color="#fff"/> : <Icon name="x" size={10} color="#fff"/>}
    </div>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:12, color: ok?'var(--ink)':'var(--ink-dim)' }}>{label}</div>
      {sub ? <div className="mono" style={{ fontSize:10, color:'var(--ink-faint)', marginTop:1 }}>{sub}</div> : null}
    </div>
  </div>;
}

function KV({ k, v }) {
  return <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
    <span style={{ color:'var(--ink-faint)' }}>{k}</span>
    <span style={{ color:'var(--ink)', fontFamily:'var(--font-mono)' }}>{v}</span>
  </div>;
}

function Cockpit({ elapsed, paused, togglePause, onStop, sections, micLevel }) {
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
      <span className="mono tabular" style={{ fontSize:11, color:'var(--ink-dim)' }}>Display 1 · Shure MV7+ · mic {Math.round(micLevel*100)}%</span>
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
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:520 }}>
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
      <div style={{ marginTop:16, fontSize:11, color:'var(--ink-faint)' }}>Pipeline will begin automatically once upload completes. You can navigate away.</div>
    </Card>
  </div>;
}

Object.assign(window, { ScreenRecord });
