import { type ReactNode } from 'react'

interface Props {
  eyebrow?: string
  title: ReactNode
  sub?: string
  right?: ReactNode
}

export function EyebrowHeading({ eyebrow, title, sub, right }: Props) {
  return (
    <header className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-5">
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-[24px] font-medium leading-[1.1] tracking-normal text-[color:var(--ink)] sm:text-[28px] sm:tracking-[-0.02em]">{title}</h1>
        {sub && <p className="mt-2 text-[13px] leading-6 text-[color:var(--ink-dim)] max-w-[820px]">{sub}</p>}
      </div>
      {right && <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:shrink-0 sm:justify-end sm:overflow-visible sm:pb-0">{right}</div>}
    </header>
  )
}
