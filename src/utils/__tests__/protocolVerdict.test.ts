import { describe, it, expect } from 'vitest'
import {
  getProtocolVerdict,
  getNextInspectionDate,
  verdictLabel,
  VERDICT_CONCLUSIONS,
} from '../protocolVerdict'
import type { Measurement } from '../../types'
import { DEFAULT_ODGROMOWA_DATA } from '../../constants/odgromowa'

const measurement = (result: 'TAK' | 'NIE'): Measurement => ({
  id: 'm',
  pointNumber: 1,
  room: 'Kuchnia',
  protectionType: 'WNP',
  amperage: 16,
  zsValue: 1,
  zsDop: 2.88,
  result,
  socketType: 'Gniazdo 230V',
})

describe('getProtocolVerdict', () => {
  it('mieszkanie: all TAK → nadaje', () => {
    expect(
      getProtocolVerdict({
        unitType: 'mieszkanie',
        measurements: [measurement('TAK'), measurement('TAK')],
      })
    ).toBe('nadaje')
  })

  it('mieszkanie: any NIE → nie-nadaje', () => {
    expect(
      getProtocolVerdict({
        unitType: 'mieszkanie',
        measurements: [measurement('TAK'), measurement('NIE')],
      })
    ).toBe('nie-nadaje')
  })

  it('lokal and missing unitType follow the measurement rule', () => {
    expect(
      getProtocolVerdict({
        unitType: 'lokal',
        measurements: [measurement('NIE')],
      })
    ).toBe('nie-nadaje')
    expect(getProtocolVerdict({ measurements: [] })).toBe('nadaje')
  })

  it('klatka: uses ocenaInstalacji, ignoring measurements', () => {
    expect(
      getProtocolVerdict({
        unitType: 'klatka',
        measurements: [measurement('NIE')],
        klatkaData: {
          przylacze: 'kablowe',
          pwpStatus: 'jest',
          ocenaInstalacji: 'nadaje-po-usunieciu',
        },
      })
    ).toBe('nadaje-po-usunieciu')
  })

  it('klatka: missing ocena defaults to nadaje', () => {
    expect(
      getProtocolVerdict({
        unitType: 'klatka',
        measurements: [],
        klatkaData: { przylacze: 'kablowe', pwpStatus: 'jest' },
      })
    ).toBe('nadaje')
    expect(getProtocolVerdict({ unitType: 'klatka', measurements: [] })).toBe(
      'nadaje'
    )
  })

  it('odgromowa: uses wynik', () => {
    expect(
      getProtocolVerdict({
        unitType: 'odgromowa',
        measurements: [],
        odgromowaData: { ...DEFAULT_ODGROMOWA_DATA, wynik: 'nie-nadaje' },
      })
    ).toBe('nie-nadaje')
    expect(
      getProtocolVerdict({ unitType: 'odgromowa', measurements: [] })
    ).toBe('nadaje')
  })
})

describe('getNextInspectionDate', () => {
  const date = new Date(2026, 8, 23)

  it('adds 5 years when the installation is fit for use', () => {
    expect(getNextInspectionDate(date, 'nadaje')).toEqual(new Date(2031, 8, 23))
    expect(getNextInspectionDate(date, 'nadaje-po-usunieciu')).toEqual(
      new Date(2031, 8, 23)
    )
  })

  it('returns null when not fit for use', () => {
    expect(getNextInspectionDate(date, 'nie-nadaje')).toBeNull()
  })

  it('does not mutate the input date', () => {
    getNextInspectionDate(date, 'nadaje')
    expect(date).toEqual(new Date(2026, 8, 23))
  })
})

describe('labels', () => {
  it('has a label and a conclusion for every verdict', () => {
    for (const v of ['nadaje', 'nadaje-po-usunieciu', 'nie-nadaje'] as const) {
      expect(verdictLabel(v)).toBeTruthy()
      expect(VERDICT_CONCLUSIONS[v]).toMatch(/^INSTALACJA/)
    }
  })
})
