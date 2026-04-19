'use client'
import { useEffect, useState } from 'react'

interface Toast {
  id: string
  message: string
  variant: 'success' | 'error' | 'info' | 'warn'
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; variant?: string }>).detail
      const message = detail.message
      const variant = (detail.variant ?? 'info') as Toast['variant']
      const id = Math.random().toString(36).slice(2)
      setToasts((t) => [...t.slice(-2), { id, message, variant }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
    }
    window.addEventListener('servant:toast', handler)
    return () => window.removeEventListener('servant:toast', handler)
  }, [])

  const variantStyles: Record<Toast['variant'], string> = {
    success: 'bg-[color:var(--good)] text-white',
    error: 'bg-[color:var(--bad)] text-white',
    warn: 'bg-[color:var(--warn)] text-white',
    info: 'bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--ink)]',
  }

  return (
    <>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded shadow-lg text-sm font-medium pointer-events-auto ${variantStyles[t.variant]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  )
}
