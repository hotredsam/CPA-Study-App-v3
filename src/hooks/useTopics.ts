import { useQuery } from '@tanstack/react-query'

interface Topic {
  id: string
  section: string
  name: string
  unit: string | null
  mastery: number
  errorRate: number | null
  cardsDue: number
  lastSeen: string | null
  notes: string | null
  aiNotes: unknown | null
  createdAt: string
  updatedAt: string
}

export function useTopics(section?: string) {
  const params = section ? `?section=${encodeURIComponent(section)}` : ''

  return useQuery<Topic[]>({
    queryKey: ['topics', section],
    queryFn: async () => {
      const res = await fetch(`/api/topics${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<Topic[]>
    },
  })
}
