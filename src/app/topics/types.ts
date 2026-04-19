export interface AiNotes {
  coreRule: string
  pitfall: string
  citation: string
  performance: string
}

export interface Topic {
  id: string
  section: string
  name: string
  unit: string | null
  mastery: number
  errorRate: number | null
  cardsDue: number
  lastSeen: string | null
  notes: string | null
  aiNotes: AiNotes | null
  createdAt: string
  updatedAt: string
}

export type SortField = 'mastery' | 'error' | 'cards' | 'seen'
export type SectionFilter = 'all' | 'FAR' | 'REG' | 'AUD' | 'TCP' | 'BAR' | 'ISC'
