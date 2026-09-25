import type { Inspection, ProtocolVerdict } from '../types'
import { hasFailedIzolacja } from './izolacja'

/**
 * Wynik końcowy protokołu — jedyne miejsce, które decyduje, czy instalacja
 * nadaje się do eksploatacji. PDF, podsumowanie i formularze czytają go stąd.
 *
 * - mieszkanie / lokal: najgorszy wynik wygrywa — choć jeden pomiar Zs = NIE
 *   albo choć jeden obwód izolacji „poniżej normy” → nie nadaje się
 * - klatka / odgromowa: wybierany przez technika w formularzu
 *
 * Brak zapisanej oceny (starsze dokumenty, pole nietknięte) → 'nadaje',
 * tak samo jak domyślna wartość w formularzach.
 */
export const getProtocolVerdict = (
  inspection: Pick<
    Inspection,
    | 'unitType'
    | 'measurements'
    | 'klatkaData'
    | 'odgromowaData'
    | 'izolacjaData'
  >
): ProtocolVerdict => {
  switch (inspection.unitType) {
    case 'klatka':
      return inspection.klatkaData?.ocenaInstalacji || 'nadaje'
    case 'odgromowa':
      return inspection.odgromowaData?.wynik || 'nadaje'
    default:
      return inspection.measurements.some((m) => m.result === 'NIE') ||
        hasFailedIzolacja(inspection.izolacjaData)
        ? 'nie-nadaje'
        : 'nadaje'
  }
}

/** Wniosek w PDF-ie (wersaliki) */
export const VERDICT_CONCLUSIONS: Record<ProtocolVerdict, string> = {
  nadaje: 'INSTALACJA NADAJE SIĘ DO EKSPLOATACJI',
  'nadaje-po-usunieciu':
    'INSTALACJA NADAJE SIĘ DO EKSPLOATACJI PO USUNIĘCIU USTEREK',
  'nie-nadaje': 'INSTALACJA NIE NADAJE SIĘ DO EKSPLOATACJI',
}

/** Opcje pola „Ocena / Wynik” w formularzach (klatka, odgromowa) */
export const VERDICT_OPTIONS: { value: ProtocolVerdict; label: string }[] = [
  { value: 'nadaje', label: 'NADAJE SIĘ do dalszej eksploatacji' },
  {
    value: 'nadaje-po-usunieciu',
    label: 'NADAJE SIĘ do eksploatacji po usunięciu usterek',
  },
  { value: 'nie-nadaje', label: 'NIE NADAJE SIĘ do dalszej eksploatacji' },
]

export const verdictLabel = (verdict: ProtocolVerdict): string =>
  VERDICT_OPTIONS.find((o) => o.value === verdict)!.label

export const INSPECTION_INTERVAL_YEARS = 5

/**
 * Data następnego badania: +5 lat, o ile instalacja nadaje się do eksploatacji
 * (także po usunięciu usterek). Przy „nie nadaje się” → null (w PDF „-”).
 */
export const getNextInspectionDate = (
  date: Date,
  verdict: ProtocolVerdict
): Date | null => {
  if (verdict === 'nie-nadaje') return null
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + INSPECTION_INTERVAL_YEARS)
  return next
}
