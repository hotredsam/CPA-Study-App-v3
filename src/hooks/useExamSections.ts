import { useQuery } from '@tanstack/react-query'
import {
  ACTIVE_CPA_SECTIONS,
  CPA_SECTION_META,
  DISCIPLINE_CPA_SECTIONS,
  MANDATORY_CPA_SECTIONS,
  type CpaSectionCode,
  type DisciplineCpaSection,
} from '@/lib/cpa-sections'

export interface ExamSectionsSettings {
  sections: CpaSectionCode[]
  mandatory: CpaSectionCode[]
  discipline: DisciplineCpaSection
  disciplineOptions: Array<{ section: DisciplineCpaSection; name: string }>
}

export const DEFAULT_EXAM_SECTIONS_SETTINGS: ExamSectionsSettings = {
  sections: [...ACTIVE_CPA_SECTIONS],
  mandatory: [...MANDATORY_CPA_SECTIONS],
  discipline: 'TCP',
  disciplineOptions: DISCIPLINE_CPA_SECTIONS.map((section) => ({
    section,
    name: CPA_SECTION_META[section].name,
  })),
}

export function useExamSections() {
  return useQuery<ExamSectionsSettings>({
    queryKey: ['exam-sections'],
    queryFn: async () => {
      const res = await fetch('/api/settings/exam-sections')
      if (!res.ok) return DEFAULT_EXAM_SECTIONS_SETTINGS
      return res.json() as Promise<ExamSectionsSettings>
    },
    staleTime: 60_000,
  })
}
