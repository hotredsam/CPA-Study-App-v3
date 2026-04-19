import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

/**
 * GET /api/settings
 * Returns the singleton UserSettings row, or null if not yet created.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { id: 'singleton' },
    })
    return NextResponse.json(settings)
  } catch (err) {
    return respond(err)
  }
}

const PatchBodySchema = z.object({
  theme: z.string().optional(),
  accentHue: z.number().int().min(0).max(360).optional(),
  density: z.string().optional(),
  serifFamily: z.string().optional(),
})

/**
 * PATCH /api/settings
 * Upserts the singleton UserSettings row with partial updates.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await request.json().catch(() => ({}))
    const parsed = PatchBodySchema.safeParse(raw)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Invalid body' } },
        { status: 400 },
      )
    }

    const data = parsed.data
    const updateFields: Record<string, unknown> = {}
    if (data.theme !== undefined) updateFields['theme'] = data.theme
    if (data.accentHue !== undefined) updateFields['accentHue'] = data.accentHue
    if (data.density !== undefined) updateFields['density'] = data.density
    if (data.serifFamily !== undefined) updateFields['serifFamily'] = data.serifFamily

    const settings = await prisma.userSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        theme: data.theme ?? 'paper',
        accentHue: data.accentHue ?? 18,
        density: data.density ?? 'comfortable',
        serifFamily: data.serifFamily ?? 'Instrument Serif',
      },
      update: updateFields,
    })

    return NextResponse.json(settings)
  } catch (err) {
    return respond(err)
  }
}
