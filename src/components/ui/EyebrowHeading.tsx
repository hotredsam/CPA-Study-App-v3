interface Props {
  eyebrow?: string
  title: React.ReactNode
  sub?: string
  right?: React.ReactNode
}

export function EyebrowHeading({ eyebrow, title, sub, right }: Props) {
  return (
    <header className="flex items-end justify-between gap-5 mb-5">
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-[28px] font-medium tracking-[-0.02em] text-[color:var(--ink)] leading-[1.1]">{title}</h1>
        {sub && <p className="mt-2 text-[13px] leading-6 text-[color:var(--ink-dim)] max-w-[820px]">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </header>
  )
}
