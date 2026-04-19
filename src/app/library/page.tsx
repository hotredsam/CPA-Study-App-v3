import { EyebrowHeading } from '@/components/ui/EyebrowHeading'

export const metadata = { title: 'Library — CPA Study Servant' }

export default function LibraryPage() {
  return (
    <div>
      <EyebrowHeading eyebrow="Textbooks" title="Library" sub="Manage your uploaded textbooks." />
      <p className="text-sm text-[color:var(--ink-faint)]">
        Full library view coming in Phase G.
      </p>
    </div>
  )
}
