import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { respond } from '@/lib/api-error'
import { parseRoutineXml } from '@/lib/routine/xml-parser'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  xml: z.string().min(1),
})

/**
 * POST /api/study-routine/validate
 * Validates XML without persisting anything.
 * Returns ParseResult shape: { success, errors?, stats? }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await request.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return respond(parsed.error)
    }

    const result = parseRoutineXml(parsed.data.xml)
    return NextResponse.json(result)
  } catch (err) {
    return respond(err)
  }
}
