import { useQuery } from '@tanstack/react-query'

interface RecordingListItem {
  id: string
  status: string
  title: string | null
  sections: string[]
  modelUsed: string | null
  durationSec: number | null
  segmentsCount: number | null
  createdAt: string
  _count: { questions: number }
  progress: Array<{
    stage: string
    pct: number
    etaSec: number | null
    message: string
    updatedAt: string
  }>
  questions: Array<{
    id: string
    status: string
    section: string | null
    feedback: { combinedScore: number } | null
  }>
}

interface RecordingListResponse {
  items: RecordingListItem[]
  nextCursor?: string
  hasMore: boolean
}

export function useRecordings(opts: { cursor?: string; limit?: number } = {}) {
  const params = new URLSearchParams()
  if (opts.cursor) params.set('cursor', opts.cursor)
  if (opts.limit) params.set('limit', String(opts.limit))

  return useQuery<RecordingListResponse>({
    queryKey: ['recordings', opts.cursor, opts.limit],
    queryFn: async () => {
      const res = await fetch(`/api/recordings?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<RecordingListResponse>
    },
  })
}
