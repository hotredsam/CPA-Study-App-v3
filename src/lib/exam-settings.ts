import { prisma } from '@/lib/prisma'
import { normalizeExamSections, type CpaSectionCode } from '@/lib/cpa-sections'

export async function getActiveExamSections(): Promise<CpaSectionCode[]> {
  const settings = await prisma.userSettings.findUnique({
    where: { id: 'singleton' },
    select: { examSections: true },
  })

  return normalizeExamSections(settings?.examSections)
}
