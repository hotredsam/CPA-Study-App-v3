import { DashboardClient, type DashboardData } from './DashboardClient'
import { EMPTY_DASHBOARD_DATA, readDashboardData } from '@/lib/dashboard-data'

export const metadata = { title: 'Dashboard - CPA Study Servant' }
export const dynamic = 'force-dynamic'

async function getDashboardData(): Promise<DashboardData> {
  try {
    return await readDashboardData()
  } catch {
    return EMPTY_DASHBOARD_DATA
  }
}

export default async function HomePage() {
  const data = await getDashboardData()
  return <DashboardClient data={data} />
}
