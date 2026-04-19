# App Shell — Sidebar, Keyboard Nav, TweaksPanel, Toast

Extracted from `ui-review/index.html` App component.

---

## Sidebar nav (220px fixed left rail)

```
┌────────────────────────┐
│  [Logo] Study Servant  │
│                        │
│  Dashboard      g+h    │
│  Record         g+r    │
│  Pipeline  [3]  g+s    │
│  Review         g+v    │
│  Topics         g+y    │
│  Study          g+u    │
│  Anki           g+a    │
│  Library        g+l    │
│  Settings       g+t    │
│                        │
│  ──────────────────    │
│  TweaksPanel (⊞)       │
│  Theme / Accent / Density│
└────────────────────────┘
```

**9 nav items** with icons from `primitives.jsx` Icon component:

| Label | Key | Icon | Route | Badge |
|-------|-----|------|-------|-------|
| Dashboard | `h` | dashboard | `/` | — |
| Record | `r` | record | `/record` | — |
| Pipeline | `s` | activity | `/pipeline` | live-count (processing recordings) |
| Review | `v` | list | `/review` | — |
| Topics | `y` | topics | `/topics` | — |
| Study | `u` | book-open | `/study` | — |
| Anki | `a` | cards | `/anki` | cards-due count |
| Library | `l` | book | `/library` | — |
| Settings | `t` | settings | `/settings` | — |

**Active state:** `background: var(--accent-faint)`, `color: var(--ink)`, left accent stripe `var(--accent)`.

**Badge:** small pill with `var(--accent)` background, white text. Pipeline badge = live-processing count. Anki badge = cards due today.

---

## Keyboard shortcut system

Navigation uses the **`g` + letter** two-key chord (vim-style). After pressing `g`, a 1-second window opens for the second key. If no key is pressed within 1s, `g` resets.

```
g + h → Dashboard
g + r → Record
g + s → Pipeline (s = "stream")
g + v → Review (v = "view")
g + y → Topics (y = "taxonomy")
g + u → Study (u = "unit")
g + a → Anki
g + l → Library
g + t → Settings (t = "tweaks")
? → Open shortcut help overlay
```

**Additional in-screen shortcuts:**
- Cockpit (during recording): `⌃ + Space` = pause, `⌃ + S` = stop, `⌃ + M` = mark moment
- Anki: `Space` = flip card; `1/2/3/4` = Again/Hard/Good/Easy ratings
- `?` = help overlay (list all shortcuts)

---

## TweaksPanel

Bottom of sidebar (or collapsible panel below nav). Persists tweaks via `/api/settings` on change.

**Controls:**
1. **Theme picker** — 5 buttons: paper / night / sepia / sakura / scientific. Sets `data-theme="..."` on `<html>`.
2. **Accent hue slider** — `type="range"` 0–360. Sets `--accent-hue` CSS variable on `<html>`. Default: 18 (ledger red).
3. **Density toggle** — Comfortable / Compact. Sets `data-density="..."` on `<html>`.
4. **Serif family** — Instrument Serif / Tiempos / Source Serif. Sets `data-serif="..."` on `<html>`.

**Persistence flow:** change → `PATCH /api/settings` `{theme, accentHue, density, serifFamily}` → UserSettings row → on next load, read UserSettings, apply to `<html>`.

---

## Toast system

**Event-driven:** Components dispatch `new CustomEvent('servant:toast', { detail: { message, variant } })` on `window`. The app shell listens and renders a fixed-bottom toast banner.

**Usage patterns seen in prototype:**
- "Copy Claude prompt" → toast on clipboard success
- "Refresh AI notes for all" → toast with estimated cost: "Queuing refresh for N topics · est. $0.XX"
- "Validate XML" → toast with block/task counts on success, error message on failure
- Budget warnings → auto-triggered toast

**Variants:** `success` (green), `error` (red), `info` (neutral), `warn` (amber)

**Implementation:** Radix `<Toast>` or equivalent. Fixed bottom-center. Auto-dismiss 4s. Stack up to 3.

---

## Theme CSS variables (from `index.html`)

All 5 themes defined as CSS variable overrides on `html[data-theme="..."]`.

### Paper (default — no selector)
```css
--canvas: oklch(0.975 0.006 75)       /* warm cream */
--canvas-2: oklch(0.955 0.008 70)
--surface: oklch(0.995 0.003 75)
--surface-2: oklch(0.965 0.006 70)
--ink: oklch(0.22 0.01 50)
--ink-dim: oklch(0.42 0.012 50)
--ink-faint: oklch(0.60 0.010 50)
--border: oklch(0.88 0.008 60)
--border-hi: oklch(0.78 0.010 60)
--track: oklch(0.92 0.008 60)
--accent: oklch(0.52 0.18 var(--accent-hue))   /* ledger red at hue 18 */
--good: oklch(0.48 0.12 145)
--warn: oklch(0.58 0.14 60)
--bad: oklch(0.52 0.20 28)
```

### Night (`data-theme="night"`)
```css
--canvas: oklch(0.14 0.008 260)    /* dark slate */
--surface: oklch(0.19 0.010 260)
--ink: oklch(0.96 0.006 260)       /* near-white */
--border: oklch(0.28 0.012 260)
--accent-faint: oklch(0.28 0.08 var(--accent-hue))
--good-soft: oklch(0.26 0.05 145)
--bad-soft: oklch(0.28 0.07 28)
```

### Sepia (`data-theme="sepia"`)
```css
--canvas: oklch(0.94 0.028 75)    /* amber */
--ink: oklch(0.28 0.03 50)
--border: oklch(0.82 0.030 70)
```

### Sakura (`data-theme="sakura"`)
```css
--canvas: oklch(0.965 0.018 10)   /* soft pink */
--ink: oklch(0.28 0.05 350)
--border: oklch(0.86 0.035 10)
--accent-faint: oklch(0.94 0.050 10)
```

### Scientific (`data-theme="scientific"`)
```css
--canvas: oklch(0.11 0.010 240)   /* terminal dark */
--ink: oklch(0.92 0.03 145)       /* green text */
--accent-hue: 145 !important      /* green accent override */
--font-sans: 'JetBrains Mono', monospace  /* monospace everything */
```

---

## App-level state (from prototype App component)

```js
const [screen, setScreen] = useState('dashboard');
const [tweaks, setTweaks] = useState({ theme: 'paper', accentHue: 18, density: 'comfortable', serif: 'Instrument Serif' });

// On tweaks change:
document.documentElement.dataset.theme = tweaks.theme;
document.documentElement.style.setProperty('--accent-hue', tweaks.accentHue);
document.documentElement.dataset.density = tweaks.density;
document.documentElement.dataset.serif = tweaks.serif;
```

In Next.js: read from UserSettings on SSR, apply via root layout. Client changes via PATCH + optimistic update.

---

## Typography classes (from `index.html` CSS)

```css
.mono      { font-family: var(--font-mono); }
.tabular   { font-variant-numeric: tabular-nums; }
.dim       { color: var(--ink-faint); }
.eyebrow   { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.12em;
             color: var(--ink-faint); text-transform: uppercase; font-weight: 500; }
```

**App shell layout:**
```css
.app-shell { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
.side      { border-right: 1px solid var(--border); background: var(--surface);
             display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
.main      { padding: 28px 36px 80px; max-width: 1500px; width: 100%; }
```

**Hover state:**
```css
.hov { transition: background-color .15s, border-color .15s, color .15s, transform .1s; }
.hov:hover { filter: brightness(0.97); }
html[data-theme="night"] .hov:hover { filter: brightness(1.15); }
```

**Pulse animation** (for live status dots):
```css
.pulse-dot { animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
```

---

## Google Fonts loaded

- `Geist` (weights 300, 400, 500, 600) — UI sans-serif
- `Geist Mono` (weights 400, 500, 600) — monospace, numbers, eyebrows
- `Instrument Serif` (italic variants 0, 1) — reader prose, headlines
- `JetBrains Mono` (400, 500, 600) — Scientific theme override
