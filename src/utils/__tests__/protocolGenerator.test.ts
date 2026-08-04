import { describe, it, expect } from 'vitest'
import { generateProtocolNumber } from '../protocolGenerator'

/**
 * Protocol number format (address-first, since 2026-06-15):
 * NORMALIZED_STREET/NORMALIZED_APT/YYYY/MM/DD/PROT
 */
describe('generateProtocolNumber', () => {
  it('generates correct format for a standard case', () => {
    const date = new Date(2026, 1, 12) // Feb 12, 2026
    const result = generateProtocolNumber(date, '42', 'ul. Leśna 5')

    expect(result).toBe('LESNA_5/42/2026/02/12/PROT')
  })

  it('pads month and day with leading zeros', () => {
    const date = new Date(2026, 0, 5) // Jan 5, 2026
    const result = generateProtocolNumber(date, '1', 'Testowa 1')

    expect(result).toMatch(/\/2026\/01\/05\/PROT$/)
  })

  it('normalizes apartment number to uppercase', () => {
    const date = new Date(2026, 5, 15)
    const result = generateProtocolNumber(date, '12a', 'Testowa 1')

    expect(result).toMatch(/^TESTOWA_1\/12A\//)
  })

  it('replaces spaces in apartment number with underscores', () => {
    const date = new Date(2026, 5, 15)
    const result = generateProtocolNumber(date, 'lokal 3', 'Testowa 1')

    expect(result).toMatch(/^TESTOWA_1\/LOKAL_3\//)
  })

  it('removes commas and dots from apartment number', () => {
    const date = new Date(2026, 5, 15)
    const result = generateProtocolNumber(date, '4.2,B', 'Testowa 1')

    expect(result).toMatch(/^TESTOWA_1\/42B\//)
  })

  it('trims whitespace from apartment number', () => {
    const date = new Date(2026, 5, 15)
    const result = generateProtocolNumber(date, '  42  ', 'Testowa 1')

    expect(result).toMatch(/^TESTOWA_1\/42\//)
  })

  it('collapses multiple spaces in apartment to single underscore', () => {
    const date = new Date(2026, 5, 15)
    const result = generateProtocolNumber(date, 'lokal   3', 'Testowa 1')

    // \s+ must collapse to single _, not leave multiple
    expect(result).toMatch(/^TESTOWA_1\/LOKAL_3\//)
    expect(result).not.toContain('__')
  })

  it('handles Polish diacritics in street name', () => {
    const date = new Date(2026, 5, 15)
    const result = generateProtocolNumber(date, '1', 'ul. Łąkowa 10')

    expect(result).toContain('LAKOWA_10')
  })

  it('matches the address-first format pattern', () => {
    const date = new Date(2026, 2, 2)
    const result = generateProtocolNumber(date, '42', 'ul. Słoneczna 15')

    expect(result).toMatch(
      /^[A-Z0-9_]+\/[A-Z0-9_]+\/\d{4}\/\d{2}\/\d{2}\/PROT$/
    )
  })

  it('produces deterministic output (same input → same output)', () => {
    const date = new Date(2026, 5, 15)
    const a = generateProtocolNumber(date, '42', 'ul. Testowa 1')
    const b = generateProtocolNumber(date, '42', 'ul. Testowa 1')

    expect(a).toBe(b)
  })

  it('produces different output for different apartments', () => {
    const date = new Date(2026, 5, 15)
    const a = generateProtocolNumber(date, '42', 'ul. Testowa 1')
    const b = generateProtocolNumber(date, '43', 'ul. Testowa 1')

    expect(a).not.toBe(b)
  })
})
