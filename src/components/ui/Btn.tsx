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
  primary: 'bg-[color:var(--accent)] text-white hover:brightness-110 border border-transparent',
  ghost:
    'border border-[color:var(--border)] text-[color:var(--ink-dim)] hover:border-[color:var(--border-hi)] hover:text-[color:var(--ink)] bg-transparent',
  subtle:
    'bg-[color:var(--surface-2)] text-[color:var(--ink-dim)] hover:bg-[color:var(--canvas-2)] border border-transparent',
  danger: 'bg-[color:var(--bad)] text-white hover:brightness-110 border border-transparent',
  good: 'bg-[color:var(--good)] text-white hover:brightness-110 border border-transparent',
}

const SIZE_STYLES: Record<BtnSize, string> = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-3.5 py-2 gap-2',
  lg: 'text-base px-5 py-2.5 gap-2.5',
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
