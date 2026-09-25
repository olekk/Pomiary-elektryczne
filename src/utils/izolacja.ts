import type {
  Inspection,
  IzolacjaData,
  ObwodIzolacji,
  RodzajObwodu,
} from '../types'
import { R_IZOLACJI_WYMAGANA } from '../types'
import { labelOf } from '../constants/odgromowa'
import { MAX_NAZWA_OBWODU, RODZAJ_OBWODU_OPTIONS } from '../constants/izolacja'

/** Nowy wiersz tabeli obwodów — ocena domyślnie „w normie”, obwód do wybrania */
export const createObwod = (
  rodzaj: RodzajObwodu | null = null
): ObwodIzolacji => ({
  id: `ob-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  rodzaj,
  ocena: 'w-normie',
})

/** Dane startowe nowego protokołu: TN-C, Cu, 500 V, obwody oświetlenie + gniazda „w normie” */
export const createIzolacjaData = (): IzolacjaData => ({
  ukladSieci: 'TN-C',
  materialPrzewodow: 'Cu',
  napiecieProbiercze: '500',
  obwody: [createObwod('oswietlenie'), createObwod('gniazda')],
})

/**
 * Czy protokół powinien dostać nową sekcję. Tylko mieszkanie, i tylko taki,
 * który jeszcze nie był wykonany (nowy albo wcześniej „Niedostępne”) —
 * stare wykonane protokoły edytujemy bez niej.
 */
export const shouldStartIzolacja = (
  inspection: Pick<Inspection, 'id' | 'status' | 'unitType' | 'izolacjaData'>
): boolean =>
  (inspection.unitType ?? 'mieszkanie') === 'mieszkanie' &&
  !inspection.izolacjaData &&
  (!inspection.id || inspection.status === 'INACCESSIBLE')

/** 1 → „1,0” (polski przecinek dziesiętny) */
export const formatMegaohm = (value: number): string =>
  value.toFixed(1).replace('.', ',')

/** Nazwa obwodu do PDF/uwag: etykieta typu albo wpisana nazwa przy „inny” */
export const obwodLabel = (obwod: ObwodIzolacji): string => {
  if (obwod.rodzaj === 'inny') return (obwod.nazwaInny || '').trim() || 'inny'
  return obwod.rodzaj ? labelOf(RODZAJ_OBWODU_OPTIONS, obwod.rodzaj) : '—'
}

export interface ObwodErrors {
  rodzaj?: string
  nazwaInny?: string
  ocena?: string
}

export interface IzolacjaErrors {
  ukladSieci?: string
  materialPrzewodow?: string
  napiecieProbiercze?: string
  obwodyLista?: string
  obwody: Record<string, ObwodErrors> // klucz: ObwodIzolacji.id
}

/** Błędy walidacji per pole i per wiersz; brak kluczy = poprawne */
export const validateIzolacja = (data: IzolacjaData): IzolacjaErrors => {
  const errors: IzolacjaErrors = { obwody: {} }
  if (!data.ukladSieci) errors.ukladSieci = 'Wybierz układ sieci'
  if (!data.materialPrzewodow)
    errors.materialPrzewodow = 'Wybierz materiał przewodów'
  if (!data.napiecieProbiercze)
    errors.napiecieProbiercze = 'Wybierz napięcie probiercze'
  if (data.obwody.length === 0) errors.obwodyLista = 'Dodaj co najmniej 1 obwód'

  for (const obwod of data.obwody) {
    const e: ObwodErrors = {}
    if (!obwod.rodzaj) e.rodzaj = 'Wybierz obwód'
    else if (obwod.rodzaj === 'inny') {
      const nazwa = (obwod.nazwaInny || '').trim()
      if (!nazwa) e.nazwaInny = 'Wpisz nazwę obwodu'
      else if (nazwa.length > MAX_NAZWA_OBWODU)
        e.nazwaInny = `Maks. ${MAX_NAZWA_OBWODU} znaków`
    }
    if (!obwod.ocena) e.ocena = 'Wybierz ocenę'
    if (Object.keys(e).length > 0) errors.obwody[obwod.id] = e
  }
  return errors
}

export const hasIzolacjaErrors = (errors: IzolacjaErrors): boolean =>
  Object.keys(errors).some((k) => k !== 'obwody') ||
  Object.keys(errors.obwody).length > 0

export const isIzolacjaValid = (data: IzolacjaData): boolean =>
  !hasIzolacjaErrors(validateIzolacja(data))

/**
 * Niekompletna sekcja „Rezystancja izolacji” blokuje PDF. Brak sekcji
 * (protokoły sprzed jej wprowadzenia) nie blokuje — sekcja jest pomijana.
 */
export const canGeneratePdf = (
  inspection: Pick<Inspection, 'izolacjaData'>
): boolean =>
  !inspection.izolacjaData || isIzolacjaValid(inspection.izolacjaData)

export const hasFailedIzolacja = (data: IzolacjaData | undefined): boolean =>
  !!data && data.obwody.some((o) => o.ocena === 'ponizej-normy')

/** Automatyczne uwagi do PDF — jedna na obwód „poniżej normy” */
export const getIzolacjaRemarks = (data: IzolacjaData | undefined): string[] =>
  (data?.obwody ?? [])
    .filter((o) => o.ocena === 'ponizej-normy')
    .map(
      (o) =>
        `Rezystancja izolacji obwodu ${obwodLabel(o)} poniżej ${formatMegaohm(R_IZOLACJI_WYMAGANA)} MΩ – zalecenie: odłączyć obwód do czasu naprawy.`
    )

/**
 * Payload do Firestore budowany jawnie — `nazwaInny` tylko przy „inny”
 * (przycięta), żadnych zagnieżdżonych `undefined`, które Firestore odrzuca.
 */
export const toIzolacjaPayload = (data: IzolacjaData): IzolacjaData => ({
  ukladSieci: data.ukladSieci ?? null,
  materialPrzewodow: data.materialPrzewodow ?? null,
  napiecieProbiercze: data.napiecieProbiercze || '500',
  obwody: data.obwody.map((o) => ({
    id: o.id,
    rodzaj: o.rodzaj ?? null,
    ocena: o.ocena ?? null,
    ...(o.rodzaj === 'inny' ? { nazwaInny: (o.nazwaInny || '').trim() } : {}),
  })),
})
