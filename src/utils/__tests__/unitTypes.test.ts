import { describe, it, expect } from 'vitest'
import { isDwellingUnit, autoUnitNumber, getProtocolTitle } from '../unitTypes'

describe('isDwellingUnit', () => {
  it('is true for mieszkanie, lokal and legacy documents without unitType', () => {
    expect(isDwellingUnit('mieszkanie')).toBe(true)
    expect(isDwellingUnit('lokal')).toBe(true)
    expect(isDwellingUnit(undefined)).toBe(true)
  })

  it('is false for building-level protocols', () => {
    expect(isDwellingUnit('klatka')).toBe(false)
    expect(isDwellingUnit('odgromowa')).toBe(false)
  })
})

describe('autoUnitNumber', () => {
  it('numbers the first one without a suffix, then 2, 3…', () => {
    expect(autoUnitNumber('klatka', 0)).toBe('klatka')
    expect(autoUnitNumber('klatka', 1)).toBe('klatka 2')
    expect(autoUnitNumber('odgromowa', 0)).toBe('odgromowa')
    expect(autoUnitNumber('odgromowa', 2)).toBe('odgromowa 3')
  })
})

describe('getProtocolTitle', () => {
  it('dwellings: type + number', () => {
    expect(
      getProtocolTitle({ unitType: 'mieszkanie', apartmentNumber: '12' })
    ).toBe('Mieszkanie nr 12')
    expect(getProtocolTitle({ unitType: 'lokal', apartmentNumber: '3A' })).toBe(
      'Lokal użytkowy nr 3A'
    )
    expect(getProtocolTitle({ apartmentNumber: '7' })).toBe('Mieszkanie nr 7')
  })

  it('dwellings without a number', () => {
    expect(
      getProtocolTitle({ unitType: 'mieszkanie', apartmentNumber: '' })
    ).toBe('Mieszkanie')
    expect(getProtocolTitle({ unitType: 'lokal', apartmentNumber: ' ' })).toBe(
      'Lokal użytkowy'
    )
  })

  it('klatka: first without number, next with ordinal', () => {
    expect(
      getProtocolTitle({ unitType: 'klatka', apartmentNumber: 'klatka' })
    ).toBe('Części wspólne budynku')
    expect(
      getProtocolTitle({ unitType: 'klatka', apartmentNumber: 'klatka 2' })
    ).toBe('Części wspólne budynku — klatka nr 2')
  })

  it('odgromowa: first without number, next with ordinal', () => {
    expect(
      getProtocolTitle({ unitType: 'odgromowa', apartmentNumber: 'odgromowa' })
    ).toBe('Instalacja odgromowa')
    expect(
      getProtocolTitle({
        unitType: 'odgromowa',
        apartmentNumber: 'odgromowa 3',
      })
    ).toBe('Instalacja odgromowa nr 3')
  })
})
