import { DashboardClient, type DashboardData } from './DashboardClient'

export const metadata = { title: 'Dashboard - CPA Study Servant' }

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001'

async function getDashboardData(): Promise<DashboardData> {
  try {
    const res = await fetch(`${BASE}/api/dashboard`, {
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
