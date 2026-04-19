import { Suspense } from 'react'
import { SettingsClient } from './SettingsClient'

export const metadata = { title: 'Settings — CPA Study Servant' }

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: 'var(--surface-2)' }} />
        <div className="h-10 w-full rounded animate-pulse" style={{ background: 'var(--surface-2)' }} />
      </div>
    }>
      <SettingsClient />
    </Suspense>
  )
}
