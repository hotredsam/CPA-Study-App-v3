export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  const pct = value >= 0 && value <= 1 ? value * 100 : value
  return clampPercent(pct)
}
