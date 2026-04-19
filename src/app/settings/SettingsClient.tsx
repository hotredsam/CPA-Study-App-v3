'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs } from '@/components/ui/Tabs'
import { EyebrowHeading } from '@/components/ui/EyebrowHeading'
import { StudyTab } from './tabs/StudyTab'
import { ModelsTab } from './tabs/ModelsTab'
import { AppearanceTab } from './tabs/AppearanceTab'
import { IndexingTab } from './tabs/IndexingTab'
import { DangerTab } from './tabs/DangerTab'

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabId = 'study' | 'models' | 'appearance' | 'indexing' | 'danger'

const TABS: { id: TabId; label: string }[] = [
  { id: 'study', label: 'Study Schedule' },
  { id: 'models', label: 'Models & API' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'indexing', label: 'Indexing' },
  { id: 'danger', label: 'Danger Zone' },
]

function isValidTab(v: string | null): v is TabId {
  return TABS.some((t) => t.id === v)
}

// ---------------------------------------------------------------------------
// SettingsClient
// ---------------------------------------------------------------------------

export function SettingsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const raw = searchParams.get('tab')
  const activeTab: TabId = isValidTab(raw) ? raw : 'study'

  const handleTabChange = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.push(`/settings?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-0">
      <EyebrowHeading
        eyebrow="Configuration"
        title="Settings"
        sub="App, model, and indexing configuration."
      />

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        items={TABS}
        className="mb-6"
      />

      {activeTab === 'study' && <StudyTab />}
      {activeTab === 'models' && <ModelsTab />}
      {activeTab === 'appearance' && <AppearanceTab />}
      {activeTab === 'indexing' && <IndexingTab />}
      {activeTab === 'danger' && <DangerTab />}
    </div>
  )
}
