import { useQuery } from '@tanstack/react-query'

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<UserSettings | null>
    },
  })
}
