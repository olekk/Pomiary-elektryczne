import { describe, it, expect } from 'vitest'
import {
  buildInspectionStatusMap,
  countInspectionStatuses,
  areInspectionStatusMapsEqual,
} from '../inspectionStatuses'

describe('buildInspectionStatusMap', () => {
  it('maps inspection IDs to statuses', () => {
    expect(
      buildInspectionStatusMap([
        { id: 'a', status: 'COMPLETED' },
        { id: 'b', status: 'INACCESSIBLE' },
      ])
    ).toEqual({ a: 'COMPLETED', b: 'INACCESSIBLE' })
  })

  it('skips inspections without an ID', () => {
    expect(
      buildInspectionStatusMap([{ id: undefined, status: 'COMPLETED' }])
    ).toEqual({})
  })

  it('returns an empty map for an empty list', () => {
    expect(buildInspectionStatusMap([])).toEqual({})
  })
})

describe('countInspectionStatuses', () => {
  it('counts completed and inaccessible entries', () => {
    expect(
      countInspectionStatuses({
        a: 'COMPLETED',
        b: 'COMPLETED',
        c: 'INACCESSIBLE',
      })
    ).toEqual({ completed: 2, inaccessible: 1 })
  })

  it('returns zeros for an undefined map', () => {
    expect(countInspectionStatuses(undefined)).toEqual({
      completed: 0,
      inaccessible: 0,
    })
  })
})

describe('areInspectionStatusMapsEqual', () => {
  it('treats maps with the same entries as equal regardless of key order', () => {
    expect(
      areInspectionStatusMapsEqual(
        { a: 'COMPLETED', b: 'INACCESSIBLE' },
        { b: 'INACCESSIBLE', a: 'COMPLETED' }
      )
    ).toBe(true)
  })

  it('detects a changed status', () => {
    expect(
      areInspectionStatusMapsEqual({ a: 'COMPLETED' }, { a: 'INACCESSIBLE' })
    ).toBe(false)
  })

  it('detects a different number of entries', () => {
    expect(areInspectionStatusMapsEqual({ a: 'COMPLETED' }, {})).toBe(false)
  })

  it('treats undefined and empty maps as equal', () => {
    expect(areInspectionStatusMapsEqual(undefined, {})).toBe(true)
  })

  it('detects same size but different keys', () => {
    expect(
      areInspectionStatusMapsEqual({ a: 'COMPLETED' }, { b: 'COMPLETED' })
    ).toBe(false)
  })
})
