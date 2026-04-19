import { EyebrowHeading } from '@/components/ui/EyebrowHeading'

export const metadata = { title: 'Settings — CPA Study Servant' }

export default function SettingsPage() {
  return (
    <div>
      <EyebrowHeading eyebrow="Configuration" title="Settings" sub="App, model, and indexing configuration." />
      <p className="text-sm text-[color:var(--ink-faint)]">
        Full settings view coming in Phase G.
      </p>
    </div>
  )
}
