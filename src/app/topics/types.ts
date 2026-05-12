import type { CpaSectionCode } from '@/lib/cpa-sections'

export interface AiNotes {
  coreRule: string
  pitfall: string
  citation: string
  performance: string
}

export interface MasteryEvidence {
  cardsTotal: number
  cardsReviewed: number
  questionsGraded: number
  confidence: 'none' | 'low' | 'medium' | 'high'
}

export interface Topic {
  id: string
  section: string
  name: string
  unit: string | null
  bookHref: string | null
  coverageLabel: string | null
  mastery: number
  errorRate: number | null
  cardsDue: number
  lastSeen: string | null
  notes: string | null
  aiNotes: AiNotes | null
  createdAt: string
  updatedAt: string
  masteryEvidence?: MasteryEvidence
}

export type SortField = 'mastery' | 'error' | 'cards' | 'seen'
export type SectionFilter = 'all' | CpaSectionCode
