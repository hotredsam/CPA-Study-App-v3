'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { EyebrowHeading, Tabs } from '@/components/ui'
import { AnkiDaily } from './AnkiDaily'
import { AnkiPractice } from './AnkiPractice'
import { AnkiPath } from './AnkiPath'
import { AnkiBrowse } from './AnkiBrowse'
import type { AnkiMode } from './types'

const MODE_TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'practice', label: 'Practice' },
  { id: 'path', label: 'Path' },
  { id: 'browse', label: 'Browse' },
]

export function AnkiClient() {
  const searchParams = useSearchParams()
  // If topicId param present, start directly in practice mode
  const topicId = searchParams.get('topicId') ?? undefined
  const [mode, setMode] = useState<AnkiMode>(topicId ? 'practice' : 'daily')

  return (
    <div>
      <EyebrowHeading
        eyebrow="Anki"
        title="Flashcards"
        right={
          <Tabs
            value={mode}
            onChange={(id) => setMode(id as AnkiMode)}
            items={MODE_TABS}
            aria-label="Anki mode"
          />
        }
      />

      <div
        role="tabpanel"
        id={`tabpanel-${mode}`}
        aria-labelledby={`tab-${mode}`}
      >
        {mode === 'daily' && <AnkiDaily setMode={setMode} />}
        {mode === 'practice' && <AnkiPractice topicId={topicId} />}
        {mode === 'path' && <AnkiPath />}
        {mode === 'browse' && <AnkiBrowse />}
      </div>
    </div>
  )
}
