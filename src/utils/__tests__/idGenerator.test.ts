import { describe, it, expect } from 'vitest'
import { generateInspectionId, generateMeasurementId } from '../idGenerator'

describe('generateInspectionId', () => {
  it('starts with "insp_" prefix', () => {
    const id = generateInspectionId()
    expect(id).toMatch(/^insp_/)
  })

  it('contains a timestamp component', () => {
    const before = Date.now()
    const id = generateInspectionId()
    const after = Date.now()

    // Extract timestamp from id format: insp_{timestamp}_{random}
    const timestamp = parseInt(id.split('_')[1], 10)
    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })

  it('generates unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateInspectionId()))
    expect(ids.size).toBe(20)
  })

  it('returns a non-empty string', () => {
    expect(generateInspectionId().length).toBeGreaterThan(0)
  })
})

describe('generateMeasurementId', () => {
  it('starts with "m-" prefix', () => {
    const id = generateMeasurementId()
    expect(id).toMatch(/^m-/)
  })

  it('returns a non-empty string', () => {
    expect(generateMeasurementId().length).toBeGreaterThan(0)
  })

  it('generates unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateMeasurementId()))
    expect(ids.size).toBe(20)
  })
})
