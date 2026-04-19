import { useQuery } from '@tanstack/react-query'

interface PipelineRecording {
  id: string
  status: string
  durationSec: number | null
  createdAt: string
  _count: { questions: number }
}

interface PipelineStatusResponse {
  items: PipelineRecording[]
  hasMore: boolean
}

export function usePipelineStatus() {
  return useQuery<PipelineStatusResponse>({
    queryKey: ['pipeline-status'],
    queryFn: async () => {
      const res = await fetch('/api/recordings?status=segmenting,processing_questions&limit=50')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<PipelineStatusResponse>
    },
    refetchInterval: 10_000,
  })
}
