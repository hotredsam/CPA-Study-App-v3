import { Suspense } from 'react'
import { AnkiClient } from './AnkiClient'

export const metadata = { title: 'Flashcards — CPA Study Servant' }

export default function AnkiPage() {
  return (
    <Suspense
      fallback={
        <div
          className="py-16 text-center text-sm text-[color:var(--ink-faint)]"
          role="status"
          aria-live="polite"
        >
          Loading…
        </div>
      }
    >
      <AnkiClient />
    </Suspense>
  )
}
