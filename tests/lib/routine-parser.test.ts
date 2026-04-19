import { describe, it, expect } from 'vitest'
import { parseRoutineXml } from '@/lib/routine/xml-parser'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_XML_SINGLE_BLOCK = `
<study-routine>
  <morning>
    <block time="06:00" duration="90" type="reading">
      <task section="FAR" unit="Revenue Recognition" chapter="Ch 7.3" />
    </block>
  </morning>
  <midday>
    <block time="12:00" duration="30" type="anki" />
  </midday>
  <evening>
    <block time="18:00" duration="120" type="questions">
      <task section="FAR" />
    </block>
  </evening>
</study-routine>
`

const VALID_XML_MULTI_BLOCK = `
<study-routine>
  <morning>
    <block time="06:00" duration="60" type="reading">
      <task section="FAR" unit="Leases" chapter="Ch 9.1" />
    </block>
    <block time="07:00" duration="30" type="anki" />
  </morning>
  <midday>
    <block time="12:00" duration="45" type="review" />
  </midday>
  <evening>
    <block time="18:00" duration="90" type="questions">
      <task section="REG" unit="Tax Basis" />
    </block>
    <block time="19:30" duration="30" type="anki" />
  </evening>
</study-routine>
`

const MISSING_PERIOD_XML = `
<study-routine>
  <morning>
    <block time="06:00" duration="90" type="reading" />
  </morning>
</study-routine>
`

const INVALID_XML = `
<study-routine>
  <morning>
    <block time="06:00"
`

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseRoutineXml', () => {
  describe('happy path — single block per period', () => {
    it('returns success=true', () => {
      const result = parseRoutineXml(VALID_XML_SINGLE_BLOCK)
      expect(result.success).toBe(true)
    })

    it('correctly counts 3 blocks total', () => {
      const result = parseRoutineXml(VALID_XML_SINGLE_BLOCK)
      expect(result.stats?.blockCount).toBe(3)
    })

    it('correctly counts 2 tasks (blocks with a task child)', () => {
      const result = parseRoutineXml(VALID_XML_SINGLE_BLOCK)
      // morning block has a task, midday does not, evening block has a task
      expect(result.stats?.taskCount).toBe(2)
    })

    it('sums totalMinutes correctly (90 + 30 + 120 = 240)', () => {
      const result = parseRoutineXml(VALID_XML_SINGLE_BLOCK)
      expect(result.stats?.totalMinutes).toBe(240)
    })

    it('parses morning block attributes', () => {
      const result = parseRoutineXml(VALID_XML_SINGLE_BLOCK)
      const morningBlock = result.data?.morning[0]
      expect(morningBlock?.time).toBe('06:00')
      expect(morningBlock?.duration).toBe(90)
      expect(morningBlock?.type).toBe('reading')
    })
  })

  describe('multiple blocks per period', () => {
    it('returns success=true', () => {
      const result = parseRoutineXml(VALID_XML_MULTI_BLOCK)
      expect(result.success).toBe(true)
    })

    it('parses 2 morning blocks', () => {
      const result = parseRoutineXml(VALID_XML_MULTI_BLOCK)
      expect(result.data?.morning).toHaveLength(2)
    })

    it('parses 1 midday block', () => {
      const result = parseRoutineXml(VALID_XML_MULTI_BLOCK)
      expect(result.data?.midday).toHaveLength(1)
    })

    it('parses 2 evening blocks', () => {
      const result = parseRoutineXml(VALID_XML_MULTI_BLOCK)
      expect(result.data?.evening).toHaveLength(2)
    })

    it('counts 5 blocks and 2 tasks', () => {
      const result = parseRoutineXml(VALID_XML_MULTI_BLOCK)
      expect(result.stats?.blockCount).toBe(5)
      // morning block 0 has task, morning block 1 does not
      // midday block has no task
      // evening block 0 has task, evening block 1 does not
      expect(result.stats?.taskCount).toBe(2)
    })

    it('sums all durations (60+30+45+90+30 = 255)', () => {
      const result = parseRoutineXml(VALID_XML_MULTI_BLOCK)
      expect(result.stats?.totalMinutes).toBe(255)
    })
  })

  describe('missing period defaults to empty array', () => {
    it('midday defaults to []', () => {
      const result = parseRoutineXml(MISSING_PERIOD_XML)
      expect(result.success).toBe(true)
      expect(result.data?.midday).toEqual([])
    })

    it('evening defaults to []', () => {
      const result = parseRoutineXml(MISSING_PERIOD_XML)
      expect(result.data?.evening).toEqual([])
    })

    it('morning still has 1 block', () => {
      const result = parseRoutineXml(MISSING_PERIOD_XML)
      expect(result.data?.morning).toHaveLength(1)
    })
  })

  describe('invalid XML', () => {
    it('returns success=false', () => {
      const result = parseRoutineXml(INVALID_XML)
      expect(result.success).toBe(false)
    })

    it('errors array has at least one entry', () => {
      const result = parseRoutineXml(INVALID_XML)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThanOrEqual(1)
    })

    it('does not include data or stats', () => {
      const result = parseRoutineXml(INVALID_XML)
      expect(result.data).toBeUndefined()
      expect(result.stats).toBeUndefined()
    })
  })

  describe('missing study-routine root', () => {
    it('returns success=false with descriptive error', () => {
      const result = parseRoutineXml('<other-root />')
      expect(result.success).toBe(false)
      expect(result.errors?.[0]).toMatch(/study-routine/i)
    })
  })

  describe('empty string', () => {
    it('returns success=false', () => {
      const result = parseRoutineXml('')
      expect(result.success).toBe(false)
    })
  })
})
