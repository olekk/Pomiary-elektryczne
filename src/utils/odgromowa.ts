import type { Inspection, OdgromowaData, ZlaczeKontrolne } from '../types'
import { R_UZIEMIENIA_DOP } from '../types'
import { DEFAULT_ODGROMOWA_DATA } from '../constants/odgromowa'

export const MAX_LICZBA_ZLACZY = 30

/** Ocena złącza: TAK = ciągłość zachowana i R uziemienia ≤ 10 Ω */
export const evaluateZlacze = (zlacze: ZlaczeKontrolne): 'TAK' | 'NIE' =>
  zlacze.ciaglosc === 'zachowana' &&
  zlacze.rUziemienia !== null &&
  zlacze.rUziemienia <= R_UZIEMIENIA_DOP
    ? 'TAK'
    : 'NIE'

/**
 * Lista złączy K1…Kn o zadanej długości. Istniejące wiersze (z pomiarami)
 * zostają, brakujące są dopisywane, nadmiarowe ucinane od końca.
 */
export const resizeZlacza = (
  zlacza: ZlaczeKontrolne[],
  count: number
): ZlaczeKontrolne[] => {
  const n = Math.max(1, Math.min(MAX_LICZBA_ZLACZY, Math.floor(count)))
  return Array.from(
    { length: n },
    (_, i) =>
      zlacza[i] ?? { nr: `K${i + 1}`, ciaglosc: 'zachowana', rUziemienia: null }
  )
}

/**
 * Dane startowe nowego przeglądu odgromowego.
 *
 * Opis instalacji (sekcja 2) i liczba złączy są „raz na budynek” — kopiowane
 * z poprzedniego protokołu. Wszystko, co technik mierzy lub ocenia w terenie
 * (warunki, oględziny, pomiary, SPD, wynik), startuje od wartości domyślnych.
 */
export const createOdgromowaData = (
  previous?: OdgromowaData
): OdgromowaData => {
  if (!previous) return { ...DEFAULT_ODGROMOWA_DATA }
  return {
    ...DEFAULT_ODGROMOWA_DATA,
    rodzajUziomu: previous.rodzajUziomu,
    zwody: previous.zwody,
    materialZwodow: previous.materialZwodow,
    przewodyUziomowe: previous.przewodyUziomowe,
    ...(previous.przewodyUziomoweInne
      ? { przewodyUziomoweInne: previous.przewodyUziomoweInne }
      : {}),
    zlacza: previous.zlacza.map((z) => ({
      nr: z.nr,
      ciaglosc: 'zachowana',
      rUziemienia: null,
    })),
  }
}

/** Najnowszy (wg daty) wykonany przegląd odgromowy z listy, z pominięciem `excludeId` */
export const findPreviousOdgromowa = (
  inspections: Inspection[],
  excludeId?: string
): Inspection | undefined =>
  inspections
    .filter(
      (i) =>
        i.unitType === 'odgromowa' &&
        i.status !== 'INACCESSIBLE' &&
        i.odgromowaData &&
        i.id !== excludeId
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

/** Numery złączy bez wpisanej wartości R — do walidacji przed zapisem */
export const findUnmeasuredZlacza = (zlacza: ZlaczeKontrolne[]): string[] =>
  zlacza.filter((z) => z.rUziemienia === null).map((z) => z.nr)

/**
 * Wartość R wpisana w terenie → liczba. Akceptuje przecinek dziesiętny („4,2”).
 * Puste lub niepoprawne pole → null (złącze traktowane jako niezmierzone).
 */
export const parseResistanceInput = (text: string): number | null => {
  const normalized = text.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  return parseFloat(normalized)
}
