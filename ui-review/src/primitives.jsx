// Primitives shared across screens

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

function Btn({ children, onClick, variant='ghost', size='md', icon, active, style, title, disabled, type }) {
  const v = {
    primary: { background:'var(--accent)', color:'#fff', border:'1px solid var(--accent-dark)' },
    ghost:   { background:active?'var(--surface-2)':'var(--surface)', color:active?'var(--ink)':'var(--ink-dim)', border:`1px solid ${active?'var(--border-hi)':'var(--border)'}` },
    subtle:  { background:'transparent', color:'var(--ink-dim)', border:'1px solid transparent' },
    danger:  { background:'var(--bad-soft)', color:'var(--bad)', border:'1px solid var(--bad-border)' },
    good:    { background:'var(--good-soft)', color:'var(--good)', border:'1px solid var(--good-border)' },
  };
  const sz = { sm:{h:26,fz:12,px:10,g:6}, md:{h:32,fz:13,px:12,g:8}, lg:{h:40,fz:14,px:18,g:10} }[size];
  return <button onClick={disabled?undefined:onClick} title={title} disabled={disabled} type={type||'button'} className="hov" style={{
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
    case 'copy':   return <svg {...p}><rect x="8" y="8" width="12" height="12" rx="1"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/></svg>;
    case 'trash':  return <svg {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"/></svg>;
    case 'send':   return <svg {...p}><path d="m4 12 16-8-7 18-2-8-7-2Z"/></svg>;
    case 'lock':   return <svg {...p}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case 'mic-on': return <svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    case 'refresh': return <svg {...p}><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M3 21v-5h5"/></svg>;
    case 'link': return <svg {...p}><path d="M10 14a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-2 2M14 10a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7l2-2"/></svg>;
    case 'note': return <svg {...p}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8ZM14 3v5h5M9 13h6M9 17h4"/></svg>;
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
  return <div style={{ width:size, height:size, borderRadius:4, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 0 rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)', flexShrink:0 }}>
    <svg width={size*0.62} height={size*0.62} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="1"/>
      <path d="M3 9h18M3 14h18M8 4v16"/>
    </svg>
  </div>;
}

function Card({ children, pad=18, style, onClick, title, accent, id }) {
  return <div id={id} onClick={onClick} title={title} className={onClick?'hov':''} style={{
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
      {sub ? <div style={{ marginTop:8, color:'var(--ink-dim)', fontSize:13, maxWidth:820, lineHeight:1.5 }}>{sub}</div> : null}
    </div>
    {right ? <div style={{ flexShrink:0 }}>{right}</div> : null}
  </header>;
}

function Divider({ vertical, style }) {
  if (vertical) return <div style={{ width:1, alignSelf:'stretch', background:'var(--border)', ...(style||{}) }}/>;
  return <div style={{ height:1, background:'var(--border)', ...(style||{}) }}/>;
}

function Tabs({ value, onChange, items }) {
  return <div style={{ display:'flex', gap:2, borderBottom:'1px solid var(--border)', marginBottom:18 }}>
    {items.map(it => {
      const on = value === it.id;
      return <button key={it.id} onClick={()=>onChange(it.id)} className="hov" style={{
        padding:'10px 16px', cursor:'pointer',
        borderBottom: `2px solid ${on?'var(--accent)':'transparent'}`,
        color: on?'var(--ink)':'var(--ink-dim)',
        fontSize:13, fontWeight: on?500:400,
        marginBottom:-1, display:'flex', alignItems:'center', gap:6,
      }}>
        {it.label}
        {it.badge != null ? <span className="mono tabular" style={{
          fontSize:10, padding:'1px 6px', borderRadius:8,
          background: on?'var(--accent)':'var(--surface-2)',
          color: on?'#fff':'var(--ink-faint)',
        }}>{it.badge}</span> : null}
      </button>;
    })}
  </div>;
}

function Toggle({ on, onChange }) {
  return <button onClick={()=>onChange(!on)} style={{
    width:32, height:18, borderRadius:9, background: on?'var(--accent)':'var(--border-hi)',
    border:'none', cursor:'pointer', position:'relative', flexShrink:0,
  }}>
    <div style={{ position:'absolute', top:2, left: on?16:2, width:14, height:14, borderRadius:7, background:'#fff', transition:'left .15s' }}/>
  </button>;
}

function fmtDur(sec) { if (sec==null) return '—'; const m=Math.floor(sec/60),s=Math.floor(sec%60); return `${m}:${String(s).padStart(2,'0')}`; }
function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-US',{month:'short', day:'numeric'}); }
function relTime(iso) { const d=(Date.now()-new Date(iso).getTime())/1000; if (d<60) return 'now'; if (d<3600) return `${Math.floor(d/60)}m ago`; if (d<86400) return `${Math.floor(d/3600)}h ago`; return `${Math.floor(d/86400)}d ago`; }
function daysUntil(iso) {
  if (iso === 'TBD' || !iso) return null;
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000*60*60*24));
  return d;
}

Object.assign(window, { SectionBadge, Score, Bar, Btn, Icon, Kbd, Logo, Card, EyebrowHeading, Divider, Tabs, Toggle, fmtDur, fmtDate, relTime, daysUntil });
