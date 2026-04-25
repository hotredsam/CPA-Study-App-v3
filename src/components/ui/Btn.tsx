import { type ButtonHTMLAttributes } from 'react'

type BtnVariant = 'primary' | 'ghost' | 'subtle' | 'danger' | 'good'
type BtnSize = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  icon?: React.ReactNode
  active?: boolean
}

const VARIANT_STYLES: Record<BtnVariant, string> = {
  primary: 'bg-[color:var(--accent)] text-white hover:brightness-110 border border-[color:var(--accent-dark)]',
  ghost:
    'border border-[color:var(--border)] text-[color:var(--ink-dim)] hover:border-[color:var(--border-hi)] hover:text-[color:var(--ink)] bg-[color:var(--surface)]',
  subtle:
    'bg-transparent text-[color:var(--ink-dim)] hover:bg-[color:var(--surface-2)] border border-transparent',
  danger: 'bg-[color:var(--bad-soft)] text-[color:var(--bad)] hover:brightness-105 border border-[color:var(--bad-border)]',
  good: 'bg-[color:var(--good-soft)] text-[color:var(--good)] hover:brightness-105 border border-[color:var(--good-border)]',
}

const SIZE_STYLES: Record<BtnSize, string> = {
  sm: 'h-[26px] text-xs px-2.5 gap-1.5',
  md: 'h-8 text-[13px] px-3 gap-2',
  lg: 'h-10 text-sm px-[18px] gap-2.5',
}

export function Btn({
  variant = 'ghost',
  size = 'md',
  icon,
  active,
  className = '',
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      className={[
        'inline-flex items-center justify-center font-medium rounded-[3px] hov',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
        'focus-visible:outline-[color:var(--accent)]',
        'disabled:opacity-40 disabled:pointer-events-none',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        active ? 'ring-1 ring-[color:var(--accent)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
