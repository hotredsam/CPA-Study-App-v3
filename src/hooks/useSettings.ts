import { useQuery } from '@tanstack/react-query'
import { errorFromResponse } from '@/lib/api-error-message'

interface UserSettings {
  id: string
  theme: string
  accentHue: number
  density: string
  serifFamily: string
  updatedAt: string
}

export function useSettings() {
  return useQuery<UserSettings | null>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings')
      if (!res.ok) throw await errorFromResponse(res)
      return res.json() as Promise<UserSettings | null>
    },
  })
}
