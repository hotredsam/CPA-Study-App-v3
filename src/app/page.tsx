import { headers } from 'next/headers'
import { DashboardClient, type DashboardData } from './DashboardClient'

export const metadata = { title: 'Dashboard - CPA Study Servant' }

async function getDashboardData(): Promise<DashboardData> {
  try {
    const requestHeaders = await headers()
    const host = requestHeaders.get('host') ?? 'localhost:3000'
    const protocol = process.env.VERCEL_URL ? 'https' : 'http'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `${protocol}://${host}`
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json() as Promise<DashboardData>
  } catch {
    // Return a safe empty state if the API is not reachable (e.g., first boot)
    return {
      studyStats: { totalHours: 0, weekHours: 0, streak: 0, recordingsCount: 0 },
      sections: [],
      weakestTopics: [],
      recentRecordings: [],
      cardsDue: 0,
      routine: null,
    }
  }
}

export default async function HomePage() {
  const data = await getDashboardData()
  return <DashboardClient data={data} />
}
