export const ACTIVE_CPA_SECTIONS = ['FAR', 'REG', 'AUD', 'TCP'] as const

export type ActiveCpaSection = (typeof ACTIVE_CPA_SECTIONS)[number]

export const ACTIVE_CPA_SECTION_SET = new Set<string>(ACTIVE_CPA_SECTIONS)

export const CPA_SECTION_META: Record<ActiveCpaSection, { name: string; hue: number }> = {
  FAR: { name: 'Financial Accounting & Reporting', hue: 230 },
  REG: { name: 'Regulation · Tax & Law', hue: 28 },
  AUD: { name: 'Auditing & Attestation', hue: 160 },
  TCP: { name: 'Tax Compliance & Planning', hue: 300 },
}

export function isActiveCpaSection(section: unknown): section is ActiveCpaSection {
  return typeof section === 'string' && ACTIVE_CPA_SECTION_SET.has(section)
}

export function activeSectionsOnly<T extends { section?: string | null }>(items: T[]): T[] {
  return items.filter((item) => !item.section || isActiveCpaSection(item.section))
}
