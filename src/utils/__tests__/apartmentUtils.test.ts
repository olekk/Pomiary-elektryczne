import { describe, it, expect } from 'vitest'
import { incrementApartmentNumber } from '../apartmentUtils'

describe('incrementApartmentNumber', () => {
  // Standard numeric increments
  it('"1" → "2"', () => expect(incrementApartmentNumber('1')).toBe('2'))
  it('"42" → "43"', () => expect(incrementApartmentNumber('42')).toBe('43'))
  it('"99" → "100"', () => expect(incrementApartmentNumber('99')).toBe('100'))
  it('"0" → "1"', () => expect(incrementApartmentNumber('0')).toBe('1'))

  // Numeric + letter suffix (preserves letter)
  it('"1A" → "2A"', () => expect(incrementApartmentNumber('1A')).toBe('2A'))
  it('"10B" → "11B"', () => expect(incrementApartmentNumber('10B')).toBe('11B'))
  it('"1a" → "2a"', () => expect(incrementApartmentNumber('1a')).toBe('2a'))

  // Unrecognized patterns → empty string
  it('"A1" → "" (letter-first not supported)', () => {
    expect(incrementApartmentNumber('A1')).toBe('')
  })
  it('"ABC" → "" (all letters)', () => {
    expect(incrementApartmentNumber('ABC')).toBe('')
  })
  it('"1AB" → "" (multiple letters)', () => {
    expect(incrementApartmentNumber('1AB')).toBe('')
  })

  // Edge cases
  it('empty string → ""', () => expect(incrementApartmentNumber('')).toBe(''))
})
