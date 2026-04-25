export type AnkiMode = 'daily' | 'practice' | 'path' | 'browse'

export interface SrsState {
  ease: number
  interval: number
  nextDue: string | null
  lapses: number
  repetitions: number
}

export interface AnkiCard {
  id: string
  front: string
  back: string
  explanation: string | null
  sourceCitation: string | null
  section: string | null
  topicId: string | null
  type: string
  difficulty: number | null
  srsState: SrsState
  mnemonic: string | null
  createdAt: string
  updatedAt: string
  _count: { reviews: number }
  notes?: Array<{
    id: string
    content: string
    isVoice: boolean
    createdAt: string
  }>
}

export interface DueSectionBreakdown {
  section: string
  count: number
}

export type AnkiRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'
