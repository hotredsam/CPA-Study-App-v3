import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

/**
 * GET /api/settings/indexing
 * Returns the IndexingConfig singleton.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const config = await prisma.indexingConfig.findUnique({
      where: { id: 'singleton' },
    })
    return NextResponse.json(config)
  } catch (err) {
    return respond(err)
  }
}

const PatchBodySchema = z.object({
  ocrMode: z.boolean().optional(),
  formulaExtraction: z.boolean().optional(),
  exampleDetection: z.boolean().optional(),
  crossRefLinking: z.boolean().optional(),
  glossaryBuild: z.boolean().optional(),
  figureCaptioning: z.boolean().optional(),
  sectionAutoTag: z.boolean().optional(),
  unitGrouping: z.boolean().optional(),
  ankiCardGen: z.boolean().optional(),
  piiScrubbing: z.boolean().optional(),
  reindexOnUpdate: z.boolean().optional(),
  indexModel: z.string().min(1).optional(),
  batchMode: z.boolean().optional(),
  offPeakTier: z.boolean().optional(),
  concurrency: z.number().int().min(1).max(16).optional(),
  chunkSize: z.number().int().min(128).max(2048).optional(),
  overlapWindow: z.number().int().min(0).max(256).optional(),
})

/**
 * PATCH /api/settings/indexing
 * Partial update of IndexingConfig singleton.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await request.json().catch(() => ({}))
    const parsed = PatchBodySchema.safeParse(raw)
    if (!parsed.success) {
      return respond(parsed.error)
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) updateData[k] = v
    }

    const config = await prisma.indexingConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        ...updateData,
      },
      update: updateData,
    })

    return NextResponse.json(config)
  } catch (err) {
    return respond(err)
  }
}
