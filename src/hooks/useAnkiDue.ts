import { useQuery } from '@tanstack/react-query'

interface AnkiDueResponse {
  count: number
}

export function useAnkiDue() {
  return useQuery<AnkiDueResponse>({
    queryKey: ['anki-due'],
    queryFn: async () => {
      const res = await fetch('/api/anki/due')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<AnkiDueResponse>
    },
    refetchInterval: 60_000,
  })
}
