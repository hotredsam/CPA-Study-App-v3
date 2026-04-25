import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'
import {
  CPA_SECTION_META,
  CPA_SECTION_OPTIONS,
  DISCIPLINE_CPA_SECTIONS,
  MANDATORY_CPA_SECTIONS,
  getSelectedDiscipline,
  normalizeExamSections,
} from '@/lib/cpa-sections'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  discipline: z.enum(DISCIPLINE_CPA_SECTIONS).optional(),
  sections: z.array(z.enum(CPA_SECTION_OPTIONS)).optional(),
})

function payloadFor(sections: string[]) {
  const normalized = normalizeExamSections(sections)
  return {
    sections: normalized,
    mandatory: [...MANDATORY_CPA_SECTIONS],
    discipline: getSelectedDiscipline(normalized),
    disciplineOptions: DISCIPLINE_CPA_SECTIONS.map((section) => ({
      section,
      name: CPA_SECTION_META[section].name,
    })),
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { id: 'singleton' },
      select: { examSections: true },
    })

    return NextResponse.json(payloadFor(normalizeExamSections(settings?.examSections)))
  } catch (err) {
    return respond(err)
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await request.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) return respond(parsed.error)

    const nextSections = parsed.data.discipline
      ? normalizeExamSections([...MANDATORY_CPA_SECTIONS, parsed.data.discipline])
      : normalizeExamSections(parsed.data.sections)

    await prisma.userSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        examSections: nextSections,
      },
      update: {
        examSections: nextSections,
      },
    })

    return NextResponse.json(payloadFor(nextSections))
  } catch (err) {
    return respond(err)
  }
}
