import { XMLParser } from 'fast-xml-parser'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const TaskSchema = z.object({
  section: z.string().optional(),
  unit: z.string().optional(),
  chapter: z.string().optional(),
})

const BlockSchema = z.object({
  time: z.string().optional(),
  duration: z.coerce.number().optional(),
  type: z.string().optional(),
  task: z
    .union([TaskSchema, z.array(TaskSchema)])
    .optional(),
})

const ParsedRoutineSchema = z.object({
  morning: z.array(BlockSchema).default([]),
  midday: z.array(BlockSchema).default([]),
  evening: z.array(BlockSchema).default([]),
})

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type ParsedBlock = z.infer<typeof BlockSchema>
export type ParsedRoutine = z.infer<typeof ParsedRoutineSchema>

export interface ParseResult {
  success: boolean
  data?: ParsedRoutine
  errors?: string[]
  stats?: { blockCount: number; taskCount: number; totalMinutes: number }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ensure a value that may be a single item or array is always an array. */
function toArray(value: unknown): unknown[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

/** Count tasks across a block array. */
function countTasks(blocks: ParsedBlock[]): number {
  return blocks.reduce((sum, b) => {
    if (b.task == null) return sum
    return sum + (Array.isArray(b.task) ? b.task.length : 1)
  }, 0)
}

/** Sum durations across a block array (undefined durations treated as 0). */
function sumMinutes(blocks: ParsedBlock[]): number {
  return blocks.reduce((sum, b) => sum + (b.duration ?? 0), 0)
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse a `<study-routine>` XML string into a typed ParsedRoutine.
 *
 * Returns { success: true, data, stats } on success, or
 * { success: false, errors } on malformed XML or validation failure.
 */
export function parseRoutineXml(xml: string): ParseResult {
  // 1. XML parse
  let xmlDoc: unknown
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
    })
    xmlDoc = parser.parse(xml)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, errors: [`Invalid XML: ${msg}`] }
  }

  // 2. Navigate to study-routine root
  const root = (xmlDoc as Record<string, unknown>)['study-routine']
  if (root == null || typeof root !== 'object') {
    return { success: false, errors: ['Missing <study-routine> root element'] }
  }

  const rootObj = root as Record<string, unknown>

  // 3. Normalize each period: fast-xml-parser returns a single object when
  //    there is only one child, or an array when there are multiple children.
  //    Each period wrapper may itself be single or array (e.g., multiple <morning> tags).
  function extractBlocks(periodRaw: unknown): unknown[] {
    const periods = toArray(periodRaw)
    return periods.flatMap((period) => {
      if (period == null || typeof period !== 'object') return []
      const block = (period as Record<string, unknown>)['block']
      if (block == null) return []
      return Array.isArray(block) ? block : [block]
    })
  }

  const rawData = {
    morning: extractBlocks(rootObj['morning']),
    midday: extractBlocks(rootObj['midday']),
    evening: extractBlocks(rootObj['evening']),
  }

  // 4. Validate with Zod
  const parsed = ParsedRoutineSchema.safeParse(rawData)
  if (!parsed.success) {
    const errors = parsed.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`,
    )
    return { success: false, errors }
  }

  const data = parsed.data

  // 5. Compute stats
  const allBlocks = [...data.morning, ...data.midday, ...data.evening]
  const blockCount = allBlocks.length
  const taskCount = countTasks(allBlocks)
  const totalMinutes = sumMinutes(allBlocks)

  return {
    success: true,
    data,
    stats: { blockCount, taskCount, totalMinutes },
  }
}
