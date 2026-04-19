import { EyebrowHeading } from '@/components/ui/EyebrowHeading'

export const metadata = { title: 'Study — CPA Study Servant' }

export default function StudyPage() {
  return (
    <div>
      <EyebrowHeading eyebrow="Textbook Reader" title="Study" sub="Read and review CPA exam material." />
      <p className="text-sm text-[color:var(--ink-faint)]">
        Full study view coming in Phase G.
      </p>
    </div>
  )
}
