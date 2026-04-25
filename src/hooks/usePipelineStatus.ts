import { useQuery } from '@tanstack/react-query'

interface PipelineRecording {
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

interface PipelineStatusResponse {
  items: PipelineRecording[]
  hasMore: boolean
}

export function usePipelineStatus() {
  return useQuery<PipelineStatusResponse>({
    queryKey: ['pipeline-status'],
    queryFn: async () => {
      const res = await fetch('/api/recordings?status=uploaded,segmenting,processing_questions&liveOnly=true&limit=50')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<PipelineStatusResponse>
    },
    staleTime: 5_000,
    refetchInterval: (query) =>
      (query.state.data?.items.length ?? 0) > 0 ? 10_000 : 30_000,
    refetchIntervalInBackground: false,
  })
}
