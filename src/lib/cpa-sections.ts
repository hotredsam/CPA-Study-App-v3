export const MANDATORY_CPA_SECTIONS = ['FAR', 'REG', 'AUD'] as const
export const DISCIPLINE_CPA_SECTIONS = ['TCP', 'BAR', 'ISC'] as const
export const ACTIVE_CPA_SECTIONS = ['FAR', 'REG', 'AUD', 'TCP'] as const
export const CPA_SECTION_OPTIONS = ['FAR', 'REG', 'AUD', 'TCP', 'BAR', 'ISC'] as const

export type MandatoryCpaSection = (typeof MANDATORY_CPA_SECTIONS)[number]
export type DisciplineCpaSection = (typeof DISCIPLINE_CPA_SECTIONS)[number]
export type ActiveCpaSection = (typeof ACTIVE_CPA_SECTIONS)[number]
export type CpaSectionCode = (typeof CPA_SECTION_OPTIONS)[number]

export const ACTIVE_CPA_SECTION_SET = new Set<string>(ACTIVE_CPA_SECTIONS)
export const CPA_SECTION_OPTION_SET = new Set<string>(CPA_SECTION_OPTIONS)
export const DISCIPLINE_CPA_SECTION_SET = new Set<string>(DISCIPLINE_CPA_SECTIONS)

export const CPA_SECTION_META: Record<CpaSectionCode, { name: string; hue: number }> = {
  FAR: { name: 'Financial Accounting & Reporting', hue: 230 },
  REG: { name: 'Regulation - Tax & Law', hue: 28 },
  AUD: { name: 'Auditing & Attestation', hue: 160 },
  TCP: { name: 'Tax Compliance & Planning', hue: 300 },
  BAR: { name: 'Business Analysis & Reporting', hue: 78 },
  ISC: { name: 'Information Systems & Controls', hue: 195 },
}

export function isSupportedCpaSection(section: unknown): section is CpaSectionCode {
  return typeof section === 'string' && CPA_SECTION_OPTION_SET.has(section)
}

export function isActiveCpaSection(section: unknown): section is CpaSectionCode {
  return isSupportedCpaSection(section)
}

export function isDisciplineCpaSection(section: unknown): section is DisciplineCpaSection {
  return typeof section === 'string' && DISCIPLINE_CPA_SECTION_SET.has(section)
}

export function getSelectedDiscipline(sections: readonly string[]): DisciplineCpaSection {
  return sections.find(isDisciplineCpaSection) ?? 'TCP'
}

export function normalizeExamSections(value: unknown): CpaSectionCode[] {
  const raw = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && 'sections' in value
      ? (value as { sections?: unknown }).sections
      : []

  const rawSections = Array.isArray(raw) ? raw : []
  const discipline = getSelectedDiscipline(rawSections.filter(isSupportedCpaSection))
  return [...MANDATORY_CPA_SECTIONS, discipline]
}

export function activeSectionsOnly<T extends { section?: string | null }>(items: T[]): T[] {
  return items.filter((item) => !item.section || isActiveCpaSection(item.section))
}
