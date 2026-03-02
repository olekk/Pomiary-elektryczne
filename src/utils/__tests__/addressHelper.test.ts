import { describe, it, expect } from 'vitest'
import { getFullAddress, normalizeAddressForProtocol } from '../addressHelper'
import type { Building } from '../../types'

// ─── getFullAddress ────────────────────────────────────────────────────────────

describe('getFullAddress', () => {
  const makeBuilding = (overrides: Partial<Building> = {}): Building => ({
    id: 'b-1',
    projectId: 'p-1',
    street: '',
    zipCode: '',
    city: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'u-1',
    ...overrides,
  })

  it('returns new format when street, zipCode, city are all present', () => {
    const building = makeBuilding({
      street: 'Słoneczna 15',
      zipCode: '40-000',
      city: 'Katowice',
    })
    const result = getFullAddress(building)

    expect(result).toContain('40-000')
    expect(result).toContain('Katowice')
    expect(result).toContain('Słoneczna 15')
  })

  it('falls back to legacy name field', () => {
    const building = makeBuilding({
      name: 'ul. Stara 5, Gliwice',
    })
    expect(getFullAddress(building)).toBe('ul. Stara 5, Gliwice')
  })

  it('returns "Nieznany adres" when nothing is available', () => {
    const building = makeBuilding()
    expect(getFullAddress(building)).toBe('Nieznany adres')
  })

  it('prefers new format over legacy name', () => {
    const building = makeBuilding({
      street: 'Nowa 1',
      zipCode: '44-100',
      city: 'Gliwice',
      name: 'Legacy address',
    })
    const result = getFullAddress(building)

    expect(result).toContain('Nowa 1')
    expect(result).not.toBe('Legacy address')
  })

  // --- Mutant killers: partial field combinations ---

  it('falls back to name when only street is present', () => {
    const building = makeBuilding({ street: 'Nowa 1', name: 'Fallback' })
    expect(getFullAddress(building)).toBe('Fallback')
  })

  it('falls back to name when only city is present', () => {
    const building = makeBuilding({ city: 'Katowice', name: 'Fallback' })
    expect(getFullAddress(building)).toBe('Fallback')
  })

  it('falls back to name when street and city are set but zipCode is missing', () => {
    const building = makeBuilding({ street: 'Nowa 1', city: 'Katowice', name: 'Fallback' })
    expect(getFullAddress(building)).toBe('Fallback')
  })

  it('falls back to name when only zipCode is set', () => {
    const building = makeBuilding({ zipCode: '44-100', name: 'Fallback' })
    expect(getFullAddress(building)).toBe('Fallback')
  })
})

// ─── normalizeAddressForProtocol ───────────────────────────────────────────────

describe('normalizeAddressForProtocol', () => {
  it('converts to uppercase', () => {
    expect(normalizeAddressForProtocol('testowa 1')).toBe('TESTOWA_1')
  })

  it('removes "ul." prefix', () => {
    expect(normalizeAddressForProtocol('ul. Testowa 1')).toBe('TESTOWA_1')
  })

  it('removes "ul." prefix without trailing space', () => {
    expect(normalizeAddressForProtocol('ul.Testowa 1')).toBe('TESTOWA_1')
  })

  it('does NOT remove "ul." when it appears mid-string', () => {
    const result = normalizeAddressForProtocol('Testowa ul. 5')
    // "ul." mid-string should NOT be stripped (^ anchor)
    expect(result).toContain('UL')
  })

  it('removes "al." prefix', () => {
    expect(normalizeAddressForProtocol('al. Korfantego 5')).toBe('KORFANTEGO_5')
  })

  it('removes "os." prefix', () => {
    expect(normalizeAddressForProtocol('os. Tysiąclecia 3')).toBe('TYSIACLECIA_3')
  })

  it('replaces spaces with underscores', () => {
    expect(normalizeAddressForProtocol('Jana Pawła 12')).toBe('JANA_PAWLA_12')
  })

  // All 9 Polish diacritical characters
  describe('Polish diacritics removal', () => {
    it('Ą → A', () => expect(normalizeAddressForProtocol('Ąka')).toBe('AKA'))
    it('Ć → C', () => expect(normalizeAddressForProtocol('Ćma')).toBe('CMA'))
    it('Ę → E', () => expect(normalizeAddressForProtocol('Ęka')).toBe('EKA'))
    it('Ł → L', () => expect(normalizeAddressForProtocol('Łąka')).toBe('LAKA'))
    it('Ń → N', () => expect(normalizeAddressForProtocol('Ńa')).toBe('NA'))
    it('Ó → O', () => expect(normalizeAddressForProtocol('Ósma')).toBe('OSMA'))
    it('Ś → S', () => expect(normalizeAddressForProtocol('Ślad')).toBe('SLAD'))
    it('Ź → Z', () => expect(normalizeAddressForProtocol('Źródło')).toBe('ZRODLO'))
    it('Ż → Z', () => expect(normalizeAddressForProtocol('Żaba')).toBe('ZABA'))
  })

  it('removes commas, dots, dashes, slashes', () => {
    expect(normalizeAddressForProtocol('ul. Test-owa/1,2.')).toBe('TESTOWA12')
  })

  it('trims leading and trailing whitespace', () => {
    expect(normalizeAddressForProtocol('  Testowa 1  ')).toBe('TESTOWA_1')
  })

  it('collapses multiple spaces into single underscore', () => {
    expect(normalizeAddressForProtocol('Jana   Pawła  12')).toBe('JANA_PAWLA_12')
  })
})
