import { describe, it, expect } from 'vitest'
import {
  canGeneratePdf,
  createIzolacjaData,
  createObwod,
  formatMegaohm,
  getIzolacjaRemarks,
  hasFailedIzolacja,
  hasIzolacjaErrors,
  isIzolacjaValid,
  obwodLabel,
  shouldStartIzolacja,
  toIzolacjaPayload,
  validateIzolacja,
} from '../izolacja'
import type { IzolacjaData } from '../../types'

const validData = (): IzolacjaData => ({
  ukladSieci: 'TN-S',
  materialPrzewodow: 'Cu',
  napiecieProbiercze: '500',
  obwody: [
    { id: 'a', rodzaj: 'oswietlenie', ocena: 'w-normie' },
    { id: 'b', rodzaj: 'inny', nazwaInny: 'Klimatyzacja', ocena: 'w-normie' },
  ],
})

describe('createIzolacjaData', () => {
  it('starts prefilled: TN-C, Cu, 500 V, oświetlenie + gniazda „w normie”', () => {
    const d = createIzolacjaData()
    expect(d.ukladSieci).toBe('TN-C')
    expect(d.materialPrzewodow).toBe('Cu')
    expect(d.napiecieProbiercze).toBe('500')
    expect(d.obwody.map((o) => o.rodzaj)).toEqual(['oswietlenie', 'gniazda'])
    expect(d.obwody.every((o) => o.ocena === 'w-normie')).toBe(true)
  })

  it('gives every row a unique id', () => {
    const ids = [createObwod(), createObwod(), createObwod()].map((o) => o.id)
    expect(new Set(ids).size).toBe(3)
    expect(createObwod().rodzaj).toBeNull()
    expect(createObwod().ocena).toBe('w-normie')
  })
})

describe('shouldStartIzolacja', () => {
  it('new mieszkanie (no id) → true', () => {
    expect(shouldStartIzolacja({ unitType: 'mieszkanie' })).toBe(true)
    expect(shouldStartIzolacja({})).toBe(true)
  })

  it('resumed inaccessible mieszkanie → true', () => {
    expect(
      shouldStartIzolacja({
        id: 'x',
        unitType: 'mieszkanie',
        status: 'INACCESSIBLE',
      })
    ).toBe(true)
  })

  it('old completed protocol, other unit types, or data already present → false', () => {
    expect(
      shouldStartIzolacja({
        id: 'x',
        unitType: 'mieszkanie',
        status: 'COMPLETED',
      })
    ).toBe(false)
    expect(shouldStartIzolacja({ unitType: 'lokal' })).toBe(false)
    expect(shouldStartIzolacja({ unitType: 'klatka' })).toBe(false)
    expect(
      shouldStartIzolacja({
        unitType: 'mieszkanie',
        izolacjaData: createIzolacjaData(),
      })
    ).toBe(false)
  })
})

describe('validateIzolacja', () => {
  it('valid data → no errors', () => {
    const errors = validateIzolacja(validData())
    expect(hasIzolacjaErrors(errors)).toBe(false)
    expect(isIzolacjaValid(validData())).toBe(true)
  })

  it('fresh prefilled data is valid as-is', () => {
    expect(isIzolacjaValid(createIzolacjaData())).toBe(true)
  })

  it('an added row needs a circuit type chosen', () => {
    const d = createIzolacjaData()
    const added = createObwod()
    d.obwody.push(added)
    expect(validateIzolacja(d).obwody).toEqual({
      [added.id]: { rodzaj: 'Wybierz obwód' },
    })
  })

  it('flags missing section 1 fields (corrupted doc) and a missing rating', () => {
    const d: IzolacjaData = {
      ...validData(),
      // Typ tego nie dopuszcza, ale walidacja broni się przed uszkodzonym dokumentem
      ukladSieci: null as unknown as IzolacjaData['ukladSieci'],
      materialPrzewodow: null as unknown as IzolacjaData['materialPrzewodow'],
      obwody: [{ id: 'a', rodzaj: 'gniazda', ocena: null }],
    }
    const errors = validateIzolacja(d)
    expect(errors.ukladSieci).toBeTruthy()
    expect(errors.materialPrzewodow).toBeTruthy()
    expect(errors.napiecieProbiercze).toBeUndefined()
    expect(errors.obwody.a).toEqual({ ocena: 'Wybierz ocenę' })
    expect(isIzolacjaValid(d)).toBe(false)
  })

  it('flags missing test voltage and an empty circuit list', () => {
    const d = {
      ...validData(),
      napiecieProbiercze: '' as unknown as IzolacjaData['napiecieProbiercze'],
      obwody: [],
    }
    const errors = validateIzolacja(d)
    expect(errors.napiecieProbiercze).toBeTruthy()
    expect(errors.obwodyLista).toBeTruthy()
    expect(hasIzolacjaErrors(errors)).toBe(true)
  })

  it('row without a circuit type → rodzaj error', () => {
    const d = {
      ...validData(),
      obwody: [{ ...createObwod(), ocena: 'w-normie' as const }],
    }
    expect(validateIzolacja(d).obwody[d.obwody[0].id]).toEqual({
      rodzaj: 'Wybierz obwód',
    })
  })

  it('„inny” requires a non-blank name of at most 40 chars', () => {
    const blank = validData()
    blank.obwody[1].nazwaInny = '   '
    expect(validateIzolacja(blank).obwody.b.nazwaInny).toBe(
      'Wpisz nazwę obwodu'
    )

    const missing = validData()
    delete missing.obwody[1].nazwaInny
    expect(validateIzolacja(missing).obwody.b.nazwaInny).toBeTruthy()

    const tooLong = validData()
    tooLong.obwody[1].nazwaInny = 'x'.repeat(41)
    expect(validateIzolacja(tooLong).obwody.b.nazwaInny).toBe('Maks. 40 znaków')

    const exact = validData()
    exact.obwody[1].nazwaInny = 'x'.repeat(40)
    expect(isIzolacjaValid(exact)).toBe(true)
  })

  it('allows duplicate circuit types', () => {
    const d = validData()
    d.obwody = [
      { id: 'a', rodzaj: 'gniazda', ocena: 'w-normie' },
      { id: 'b', rodzaj: 'gniazda', ocena: 'w-normie' },
    ]
    expect(isIzolacjaValid(d)).toBe(true)
  })
})

describe('obwodLabel / formatMegaohm', () => {
  it('uses the option label, or the typed name for „inny”', () => {
    expect(
      obwodLabel({ id: '1', rodzaj: 'lazienka-pralka', ocena: null })
    ).toBe('łazienka–pralka')
    expect(
      obwodLabel({ id: '1', rodzaj: 'inny', nazwaInny: ' Garaż ', ocena: null })
    ).toBe('Garaż')
    expect(obwodLabel({ id: '1', rodzaj: 'inny', ocena: null })).toBe('inny')
    expect(obwodLabel({ id: '1', rodzaj: null, ocena: null })).toBe('—')
  })

  it('formats with a Polish decimal comma', () => {
    expect(formatMegaohm(1)).toBe('1,0')
  })
})

describe('hasFailedIzolacja / getIzolacjaRemarks', () => {
  it('no data (old protocol) → no failure, no remarks', () => {
    expect(hasFailedIzolacja(undefined)).toBe(false)
    expect(getIzolacjaRemarks(undefined)).toEqual([])
  })

  it('one remark per circuit „poniżej normy”', () => {
    const d = validData()
    d.obwody[1].ocena = 'ponizej-normy'
    expect(hasFailedIzolacja(d)).toBe(true)
    expect(getIzolacjaRemarks(d)).toEqual([
      'Rezystancja izolacji obwodu Klimatyzacja poniżej 1,0 MΩ – zalecenie: odłączyć obwód do czasu naprawy.',
    ])
    expect(hasFailedIzolacja(validData())).toBe(false)
  })
})

describe('toIzolacjaPayload', () => {
  it('keeps nazwaInny (trimmed) only for „inny” and never emits undefined', () => {
    const d = validData()
    d.obwody[0].nazwaInny = 'stale'
    d.obwody[1].nazwaInny = '  Klima  '
    const payload = toIzolacjaPayload(d)
    expect(payload.obwody[0]).toEqual({
      id: 'a',
      rodzaj: 'oswietlenie',
      ocena: 'w-normie',
    })
    expect(payload.obwody[1].nazwaInny).toBe('Klima')

    const draft = toIzolacjaPayload({
      ...createIzolacjaData(),
      napiecieProbiercze: '' as unknown as IzolacjaData['napiecieProbiercze'],
      obwody: [{ id: 'x' } as unknown as IzolacjaData['obwody'][number]],
    })
    expect(draft.napiecieProbiercze).toBe('500')
    expect(draft.obwody[0]).toEqual({ id: 'x', rodzaj: null, ocena: null })
    expect(JSON.stringify(draft)).not.toContain('undefined')
  })
})

describe('canGeneratePdf', () => {
  it('old protocol without the section → allowed', () => {
    expect(canGeneratePdf({})).toBe(true)
  })

  it('complete section → allowed; incomplete → blocked', () => {
    expect(canGeneratePdf({ izolacjaData: validData() })).toBe(true)
    expect(canGeneratePdf({ izolacjaData: createIzolacjaData() })).toBe(true)
    const incomplete = createIzolacjaData()
    incomplete.obwody.push(createObwod())
    expect(canGeneratePdf({ izolacjaData: incomplete })).toBe(false)
  })
})
