import { describe, it, expect } from 'vitest'
import { ZS_DOP_TABLE, DEFAULT_K_FACTORS } from '../../types'

/**
 * INV-4: Hardcoded norm values from PN-HD 60364.
 * These values MUST NOT change unless the electrical standard is updated.
 * Any accidental modification will be caught immediately.
 */
describe('ZS_DOP_TABLE — PN-HD 60364 norm values', () => {
  describe('WNP (Wyłącznik Nadprądowy Przeznaczeniowy)', () => {
    it('WNP/10A = 4.60 Ω', () => expect(ZS_DOP_TABLE['WNP'][10]).toBe(4.6))
    it('WNP/16A = 2.88 Ω', () => expect(ZS_DOP_TABLE['WNP'][16]).toBe(2.88))
    it('WNP/20A = 2.30 Ω', () => expect(ZS_DOP_TABLE['WNP'][20]).toBe(2.3))
    it('WNP/25A = 1.71 Ω', () => expect(ZS_DOP_TABLE['WNP'][25]).toBe(1.71))
  })

  describe('BI (Bezpiecznik Instalacyjny)', () => {
    it('BI/10A = 4.26 Ω', () => expect(ZS_DOP_TABLE['BI'][10]).toBe(4.26))
    it('BI/16A = 2.66 Ω', () => expect(ZS_DOP_TABLE['BI'][16]).toBe(2.66))
    it('BI/20A = 2.13 Ω', () => expect(ZS_DOP_TABLE['BI'][20]).toBe(2.13))
    it('BI/25A = 1.70 Ω', () => expect(ZS_DOP_TABLE['BI'][25]).toBe(1.7))
  })

  it('table has exactly 2 protection types', () => {
    expect(Object.keys(ZS_DOP_TABLE)).toHaveLength(2)
    expect(Object.keys(ZS_DOP_TABLE).sort()).toEqual(['BI', 'WNP'])
  })

  it('each protection type has exactly 4 amperage entries', () => {
    for (const type of Object.keys(ZS_DOP_TABLE)) {
      expect(Object.keys(ZS_DOP_TABLE[type as keyof typeof ZS_DOP_TABLE])).toHaveLength(4)
    }
  })

  it('all values are positive numbers', () => {
    for (const type of Object.values(ZS_DOP_TABLE)) {
      for (const value of Object.values(type)) {
        expect(value).toBeGreaterThan(0)
        expect(typeof value).toBe('number')
      }
    }
  })

  it('higher amperage means lower allowable Zs (inverse relationship)', () => {
    for (const type of Object.values(ZS_DOP_TABLE)) {
      const amperages = [10, 16, 20, 25] as const
      for (let i = 0; i < amperages.length - 1; i++) {
        expect(type[amperages[i]]).toBeGreaterThan(type[amperages[i + 1]])
      }
    }
  })
})

describe('DEFAULT_K_FACTORS', () => {
  it('WNP k-factor = 5', () => expect(DEFAULT_K_FACTORS['WNP']).toBe(5))
  it('BI k-factor = 5.4', () => expect(DEFAULT_K_FACTORS['BI']).toBe(5.4))
})
