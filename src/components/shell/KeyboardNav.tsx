'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const NAV_MAP: Record<string, string> = {
  h: '/',
  r: '/record',
  s: '/pipeline',
  v: '/review',
  y: '/topics',
  u: '/study',
  a: '/anki',
  l: '/library',
  t: '/settings',
}

export function KeyboardNav() {
  const router = useRouter()
  const [awaitingSecond, setAwaitingSecond] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (awaitingSecond) {
        const route = NAV_MAP[e.key]
        if (route) router.push(route)
        setAwaitingSecond(false)
        clearTimeout(timer)
        return
      }

      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        setAwaitingSecond(true)
        timer = setTimeout(() => setAwaitingSecond(false), 1000)
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      clearTimeout(timer)
    }
  }, [awaitingSecond, router])

  // TODO(fidelity): add ? key handler to show shortcut help overlay (g+letter map + in-screen shortcuts)
  return null
}
