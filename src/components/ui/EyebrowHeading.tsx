interface Props {
  eyebrow?: string
  title: string
  sub?: string
  right?: React.ReactNode
}

export function EyebrowHeading({ eyebrow, title, sub, right }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold text-[color:var(--ink)] leading-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-[color:var(--ink-faint)]">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  )
}
