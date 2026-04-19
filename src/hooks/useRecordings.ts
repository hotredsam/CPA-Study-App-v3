import { useQuery } from '@tanstack/react-query'

interface RecordingListItem {
  id: string
  status: string
  durationSec: number | null
  createdAt: string
  _count: { questions: number }
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
