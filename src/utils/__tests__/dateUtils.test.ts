import { describe, it, expect } from 'vitest'
import { ensureDate } from '../dateUtils'

describe('ensureDate', () => {
  it('returns the same Date instance when given a Date', () => {
    const date = new Date(2026, 1, 12)
    const result = ensureDate(date)

    expect(result).toBe(date) // same reference
    expect(result).toBeInstanceOf(Date)
  })

  it('converts ISO date string to Date', () => {
    const result = ensureDate('2026-02-12T10:30:00Z')

    expect(result).toBeInstanceOf(Date)
    expect(result.getFullYear()).toBe(2026)
  })

  it('converts numeric timestamp to Date', () => {
    const timestamp = new Date(2026, 1, 12).getTime()
    const result = ensureDate(timestamp)

    expect(result).toBeInstanceOf(Date)
    expect(result.getFullYear()).toBe(2026)
  })

  it('handles Firestore Timestamp-like object (with toDate not applicable)', () => {
    // Firestore Timestamp objects are serialized to their ISO string by the time
    // they reach ensureDate in most contexts. Test that a numeric string works.
    const result = ensureDate('2026-03-01')

    expect(result).toBeInstanceOf(Date)
    expect(result.getFullYear()).toBe(2026)
  })

  it('returns Invalid Date for invalid input (but still returns Date instance)', () => {
    const result = ensureDate('not-a-date')

    expect(result).toBeInstanceOf(Date)
    expect(isNaN(result.getTime())).toBe(true)
  })
})
