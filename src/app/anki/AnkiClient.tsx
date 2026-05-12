'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { EyebrowHeading, Tabs } from '@/components/ui'
import { AnkiDaily } from './AnkiDaily'
import { AnkiPractice } from './AnkiPractice'
import { AnkiAudio } from './AnkiAudio'
import { AnkiPath } from './AnkiPath'
import { AnkiBrowse } from './AnkiBrowse'
import type { AnkiMode } from './types'

const MODE_TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'practice', label: 'Practice' },
  { id: 'audio', label: 'Audio' },
  { id: 'path', label: 'Path' },
  { id: 'browse', label: 'Browse' },
]

function modeFromParams(mode: string | null, topicId?: string): AnkiMode {
  if (mode === 'daily' || mode === 'practice' || mode === 'audio' || mode === 'path' || mode === 'browse') {
    return mode
  }
  return topicId ? 'practice' : 'daily'
}

export function AnkiClient() {
  const searchParams = useSearchParams()
  // Deep links can open a topic directly in practice or audio mode.
  const topicId = searchParams.get('topicId') ?? undefined
  const initialDueOnly = searchParams.get('dueOnly') === 'true'
  const [mode, setMode] = useState<AnkiMode>(() => modeFromParams(searchParams.get('mode'), topicId))
  const [practiceDueOnly, setPracticeDueOnly] = useState(initialDueOnly)

  return (
    <div>
      <EyebrowHeading
        eyebrow="Anki"
        title="Flashcards"
        right={
          <Tabs
            value={mode}
            onChange={(id) => {
              setMode(id as AnkiMode)
              setPracticeDueOnly(false)
            }}
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
        {mode === 'daily' && (
          <AnkiDaily
            setMode={setMode}
            onStartReview={() => {
              setPracticeDueOnly(true)
              setMode('practice')
            }}
          />
        )}
        {mode === 'practice' && <AnkiPractice topicId={topicId} dueOnly={practiceDueOnly} />}
        {mode === 'audio' && <AnkiAudio topicId={topicId} />}
        {mode === 'path' && <AnkiPath />}
        {mode === 'browse' && <AnkiBrowse />}
      </div>
    </div>
  )
}
