import { describe, it, expect } from 'vitest'
import {
  evaluateZlacze,
  resizeZlacza,
  createOdgromowaData,
  findPreviousOdgromowa,
  findUnmeasuredZlacza,
  MAX_LICZBA_ZLACZY,
  parseResistanceInput,
} from '../odgromowa'
import { DEFAULT_ODGROMOWA_DATA } from '../../constants/odgromowa'
import type { Inspection, OdgromowaData } from '../../types'

describe('evaluateZlacze', () => {
  it('TAK when continuity is kept and R ≤ 10 Ω', () => {
    expect(
      evaluateZlacze({ nr: 'K1', ciaglosc: 'zachowana', rUziemienia: 10 })
    ).toBe('TAK')
    expect(
      evaluateZlacze({ nr: 'K1', ciaglosc: 'zachowana', rUziemienia: 0 })
    ).toBe('TAK')
  })

  it('NIE when R exceeds the limit', () => {
    expect(
      evaluateZlacze({ nr: 'K1', ciaglosc: 'zachowana', rUziemienia: 10.01 })
    ).toBe('NIE')
  })

  it('NIE when continuity is broken, regardless of R', () => {
    expect(evaluateZlacze({ nr: 'K1', ciaglosc: 'brak', rUziemienia: 2 })).toBe(
      'NIE'
    )
  })

  it('NIE when R is not measured', () => {
    expect(
      evaluateZlacze({ nr: 'K1', ciaglosc: 'zachowana', rUziemienia: null })
    ).toBe('NIE')
  })
})

describe('resizeZlacza', () => {
  const measured = [
    { nr: 'K1', ciaglosc: 'brak' as const, rUziemienia: 3 },
    { nr: 'K2', ciaglosc: 'zachowana' as const, rUziemienia: 4 },
  ]

  it('appends new empty rows numbered K(n)', () => {
    const result = resizeZlacza(measured, 4)
    expect(result).toHaveLength(4)
    expect(result[0]).toBe(measured[0])
    expect(result[3]).toEqual({
      nr: 'K4',
      ciaglosc: 'zachowana',
      rUziemienia: null,
    })
  })

  it('truncates from the end', () => {
    expect(resizeZlacza(measured, 1)).toEqual([measured[0]])
  })

  it('clamps to [1, MAX]', () => {
    expect(resizeZlacza([], 0)).toHaveLength(1)
    expect(resizeZlacza([], 999)).toHaveLength(MAX_LICZBA_ZLACZY)
    expect(resizeZlacza([], 2.7)).toHaveLength(2)
  })
})

describe('createOdgromowaData', () => {
  it('returns defaults without a previous protocol', () => {
    expect(createOdgromowaData()).toEqual(DEFAULT_ODGROMOWA_DATA)
  })

  it('copies installation description and connector numbers, resets field data', () => {
    const previous: OdgromowaData = {
      ...DEFAULT_ODGROMOWA_DATA,
      rodzajUziomu: 'fundamentowy',
      zwody: 'pionowe',
      materialZwodow: 'al-8',
      przewodyUziomowe: 'inne',
      przewodyUziomoweInne: 'linka Cu',
      stanPogody: 'mroz',
      zwodyStan: 'korozja',
      spd: 'do-wymiany',
      wynik: 'nie-nadaje',
      zalecenia: ['spd'],
      zlacza: [
        { nr: 'K1', ciaglosc: 'brak', rUziemienia: 25 },
        { nr: 'K2', ciaglosc: 'zachowana', rUziemienia: 3 },
      ],
    }
    const result = createOdgromowaData(previous)
    expect(result).toEqual({
      ...DEFAULT_ODGROMOWA_DATA,
      rodzajUziomu: 'fundamentowy',
      zwody: 'pionowe',
      materialZwodow: 'al-8',
      przewodyUziomowe: 'inne',
      przewodyUziomoweInne: 'linka Cu',
      zlacza: [
        { nr: 'K1', ciaglosc: 'zachowana', rUziemienia: null },
        { nr: 'K2', ciaglosc: 'zachowana', rUziemienia: null },
      ],
    })
  })

  it('omits przewodyUziomoweInne when empty (Firestore rejects undefined)', () => {
    const result = createOdgromowaData({ ...DEFAULT_ODGROMOWA_DATA })
    expect('przewodyUziomoweInne' in result).toBe(false)
  })
})

describe('findPreviousOdgromowa', () => {
  const base: Inspection = {
    projectId: 'p',
    buildingId: 'b',
    address: '',
    apartmentNumber: '',
    date: new Date(2020, 0, 1),
    technicianName: '',
    measurements: [],
    protocolNumber: '',
    unitType: 'odgromowa',
    status: 'COMPLETED',
    odgromowaData: DEFAULT_ODGROMOWA_DATA,
  }

  it('picks the newest completed lightning-protection protocol', () => {
    const older = { ...base, id: 'a', date: new Date(2020, 0, 1) }
    const newer = { ...base, id: 'b', date: new Date(2025, 0, 1) }
    const klatka = {
      ...base,
      id: 'c',
      unitType: 'klatka' as const,
      date: new Date(2026, 0, 1),
    }
    const inaccessible = {
      ...base,
      id: 'd',
      status: 'INACCESSIBLE' as const,
      date: new Date(2026, 0, 1),
    }
    const noData = {
      ...base,
      id: 'e',
      odgromowaData: undefined,
      date: new Date(2026, 0, 1),
    }
    expect(
      findPreviousOdgromowa([older, klatka, newer, inaccessible, noData])
    ).toBe(newer)
  })

  it('excludes the inspection being edited', () => {
    const a = { ...base, id: 'a' }
    expect(findPreviousOdgromowa([a], 'a')).toBeUndefined()
  })
})

describe('findUnmeasuredZlacza', () => {
  it('lists connectors without R', () => {
    expect(
      findUnmeasuredZlacza([
        { nr: 'K1', ciaglosc: 'zachowana', rUziemienia: 1 },
        { nr: 'K2', ciaglosc: 'brak', rUziemienia: null },
      ])
    ).toEqual(['K2'])
  })
})

describe('parseResistanceInput', () => {
  it('parses dot and comma decimals', () => {
    expect(parseResistanceInput('4.2')).toBe(4.2)
    expect(parseResistanceInput(' 4,2 ')).toBe(4.2)
    expect(parseResistanceInput('12')).toBe(12)
  })

  it('returns null for empty or invalid input', () => {
    expect(parseResistanceInput('')).toBeNull()
    expect(parseResistanceInput('4,')).toBeNull()
    expect(parseResistanceInput('-1')).toBeNull()
    expect(parseResistanceInput('abc')).toBeNull()
  })
})
