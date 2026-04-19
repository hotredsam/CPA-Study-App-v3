import { EyebrowHeading } from '@/components/ui/EyebrowHeading'

export const metadata = { title: 'Topics — CPA Study Servant' }

export default function TopicsPage() {
  return (
    <div>
      <EyebrowHeading eyebrow="Knowledge Map" title="Topics" sub="Track mastery across all CPA exam topics." />
      <p className="text-sm text-[color:var(--ink-faint)]">
        Full topics view coming in Phase G.
      </p>
    </div>
  )
}
