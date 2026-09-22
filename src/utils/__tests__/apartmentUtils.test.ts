import { describe, it, expect } from 'vitest'
import {
  incrementApartmentNumber,
  compareApartmentNumbers,
} from '../apartmentUtils'

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

  // Mutant killers: ensure the guard clause is exercised
  it('handles undefined-like falsy input', () => {
    // @ts-expect-error testing runtime guard against falsy values
    expect(incrementApartmentNumber(undefined)).toBe('')
    // @ts-expect-error testing runtime guard against falsy values
    expect(incrementApartmentNumber(null)).toBe('')
  })
})

describe('compareApartmentNumbers', () => {
  const sorted = (values: string[]) => [...values].sort(compareApartmentNumbers)

  it('sortuje numerycznie, nie leksykalnie', () => {
    expect(sorted(['10', '2', '1'])).toEqual(['1', '2', '10'])
  })

  it('numer z literą idzie po samym numerze', () => {
    expect(sorted(['2', '1B', '1', '1A'])).toEqual(['1', '1A', '1B', '2'])
  })

  it('ignoruje wielkość liter w sufiksie', () => {
    expect(sorted(['1b', '1A'])).toEqual(['1A', '1b'])
  })

  it('wartości bez cyfr trafiają na koniec, alfabetycznie', () => {
    expect(sorted(['Klatka B', '3', 'Klatka A'])).toEqual([
      '3',
      'Klatka A',
      'Klatka B',
    ])
  })

  it('traktuje dwie wartości bez cyfr jako porównywalne (bez NaN)', () => {
    expect(compareApartmentNumbers('Klatka', 'Klatka')).toBe(0)
  })

  it('obsługuje puste i białe znaki', () => {
    expect(compareApartmentNumbers('', '')).toBe(0)
    expect(compareApartmentNumbers(' 2 ', '10')).toBeLessThan(0)
  })
})
