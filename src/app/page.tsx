import { EyebrowHeading } from '@/components/ui/EyebrowHeading'

export const metadata = { title: 'Dashboard — CPA Study Servant' }

export default function HomePage() {
  return (
    <div>
      <EyebrowHeading
        eyebrow="CPA Study Servant"
        title="Dashboard"
        sub="AI-powered CPA exam coach."
      />
      <p className="text-sm text-[color:var(--ink-faint)]">
        Full dashboard coming in Phase G.
      </p>
    </div>
  )
}
