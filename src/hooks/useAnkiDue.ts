import { useQuery } from '@tanstack/react-query'
import { errorFromResponse } from '@/lib/api-error-message'

interface AnkiDueResponse {
  count: number
}

export function useAnkiDue() {
  return useQuery<AnkiDueResponse>({
    queryKey: ['anki-due'],
    queryFn: async () => {
      const res = await fetch('/api/anki/due')
      if (!res.ok) throw await errorFromResponse(res)
      return res.json() as Promise<AnkiDueResponse>
    },
    refetchInterval: 60_000,
    retry: false,
  })
}
