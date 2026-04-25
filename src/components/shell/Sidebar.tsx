'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

// ─── Inline SVG icon set ───────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconRecord() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="3" fill="currentColor" />
    </svg>
  )
}

function IconActivity() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <polyline points="1,8 4,4 7,10 10,6 13,8 15,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <line x1="5" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="2" cy="4" r="1" fill="currentColor" />
      <circle cx="2" cy="8" r="1" fill="currentColor" />
      <circle cx="2" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

function IconTopics() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="8" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="11" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconBookOpen() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 13.5C8 13.5 2.5 11 1.5 3.5V2.5H8V13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 13.5C8 13.5 13.5 11 14.5 3.5V2.5H8V13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function IconCards() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 4V3C4 2.44772 4.44772 2 5 2H13C13.5523 2 14 2.44772 14 3V10C14 10.5523 13.5523 11 13 11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 2H12C12.5523 2 13 2.44772 13 3V14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5H10M5 8H10M5 11H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.364 3.636L11.303 4.697M4.697 11.303L3.636 12.364M12.364 12.364L11.303 11.303M4.697 4.697L3.636 3.636" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Logo() {
  return (
    <div
      className="flex items-center justify-center w-[30px] h-[30px] rounded-[4px] shrink-0"
      style={{
        background: 'var(--accent)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)',
      }}
      aria-hidden="true"
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="1" />
        <path d="M3 9h18M3 14h18M8 4v16" />
      </svg>
    </div>
  )
}

// ─── Nav items config ──────────────────────────────────────────────────────────

interface NavItem {
  label: string
  key: string
  route: string
  icon: React.ReactNode
  badgeType?: 'pipeline' | 'anki'
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', key: 'h', route: '/', icon: <IconDashboard /> },
  { label: 'Record', key: 'r', route: '/record', icon: <IconRecord /> },
  { label: 'Pipeline', key: 's', route: '/pipeline', icon: <IconActivity />, badgeType: 'pipeline' },
  { label: 'Review', key: 'v', route: '/review', icon: <IconList /> },
  { label: 'Topics', key: 'y', route: '/topics', icon: <IconTopics /> },
  { label: 'Study Textbook', key: 'u', route: '/study', icon: <IconBookOpen /> },
  { label: 'Anki', key: 'a', route: '/anki', icon: <IconCards />, badgeType: 'anki' },
  { label: 'Library', key: 'l', route: '/library', icon: <IconBook /> },
  { label: 'Settings', key: 't', route: '/settings', icon: <IconSettings /> },
]

// ─── Badge data fetching ───────────────────────────────────────────────────────

function useTotalHours() {
  return useQuery({
    queryKey: ['sidebar-hours'],
    queryFn: async () => {
      const res = await fetch('/api/settings/study-hours')
      if (!res.ok) return null
      const data = (await res.json()) as { totalHours?: number }
      return data.totalHours ?? null
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

function usePipelineBadge() {
  return useQuery({
    queryKey: ['pipeline-badge'],
    queryFn: async () => {
      const res = await fetch('/api/recordings?status=uploaded,segmenting,processing_questions&liveOnly=true&limit=50')
      if (!res.ok) return 0
      const data = (await res.json()) as { items?: unknown[] }
      return data.items?.length ?? 0
    },
    refetchInterval: 15_000,
  })
}

function useAnkiBadge() {
  return useQuery({
    queryKey: ['anki-badge'],
    queryFn: async () => {
      const res = await fetch('/api/anki/due')
      if (!res.ok) return 0
      const data = (await res.json()) as { count?: number }
      return data.count ?? 0
    },
    refetchInterval: 60_000,
  })
}

// ─── Sidebar component ─────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const { data: pipelineCount = 0 } = usePipelineBadge()
  const { data: ankiCount = 0 } = useAnkiBadge()
  const { data: totalHours } = useTotalHours()

  function getBadgeCount(badgeType?: 'pipeline' | 'anki'): number {
    if (badgeType === 'pipeline') return pipelineCount
    if (badgeType === 'anki') return ankiCount
    return 0
  }

  function isActive(route: string): boolean {
    if (route === '/') return pathname === '/'
    return pathname.startsWith(route)
  }

  return (
    <nav className="side" aria-label="Main navigation">
      {/* Logo / brand */}
      <div className="flex items-center gap-2.5 px-4 py-[18px] border-b border-[color:var(--border)]">
        <Logo />
        <div>
          <div className="text-sm font-medium tracking-[-0.01em] text-[color:var(--ink)]">Study Servant</div>
          <div className="mono mt-0.5 text-[10px] tracking-[0.08em] text-[color:var(--ink-faint)]">
            {totalHours != null ? `CPA · ${totalHours.toFixed(1)} h` : 'CPA Study'}
          </div>
        </div>
      </div>

      {/* Nav items */}
      <ul className="flex flex-col gap-0.5 px-2 flex-1" role="list">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.route)
          const badgeCount = getBadgeCount(item.badgeType)

          return (
            <li key={item.route} role="listitem">
              <Link
                href={item.route}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded text-sm hov relative',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
                  'focus-visible:outline-[color:var(--accent)]',
                  active
                    ? 'text-[color:var(--ink)] font-medium'
                    : 'text-[color:var(--ink-dim)] hover:text-[color:var(--ink)]',
                ].join(' ')}
                style={
                  active
                    ? {
                        background: 'var(--accent-faint)',
                        boxShadow: 'inset 2px 0 0 var(--accent)',
                      }
                    : {}
                }
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>

                {/* Keyboard hint */}
                <span className="font-mono text-[9px] text-[color:var(--ink-faint)]" aria-hidden="true">
                  {item.key}
                </span>

                {/* Badge */}
                {item.badgeType && badgeCount > 0 && (
                  <span
                    className="ml-1 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono font-semibold text-white"
                    style={{ background: 'var(--accent)' }}
                    aria-label={`${badgeCount} ${item.badgeType === 'pipeline' ? 'processing' : 'due'}`}
                  >
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto border-t border-[color:var(--border)] px-3.5 py-3">
        <div className="eyebrow">LIVE</div>
        <div className="mt-1.5 text-[11px] text-[color:var(--ink-dim)]">
          <span
            className="pulse-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]"
            aria-hidden="true"
          />
          {pipelineCount} recording{pipelineCount === 1 ? '' : 's'} processing
        </div>
      </div>
    </nav>
  )
}
