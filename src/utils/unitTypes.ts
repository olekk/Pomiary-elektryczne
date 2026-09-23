import type { Inspection, UnitType } from '../types'

/**
 * Mieszkanie / lokal — protokół z pomiarami Zs, podpisywany przez
 * właściciela/najemcę. Klatka i instalacja odgromowa to protokoły budynkowe:
 * bez pomiarów Zs, bez właściciela i bez jego podpisu.
 */
export const isDwellingUnit = (unitType: UnitType | undefined): boolean =>
  unitType !== 'klatka' && unitType !== 'odgromowa'

/**
 * Automatyczny numer protokołu budynkowego („klatka”, „klatka 2”, …) —
 * `existingCount` to liczba istniejących protokołów tego typu w budynku.
 */
export const autoUnitNumber = (
  unitType: 'klatka' | 'odgromowa',
  existingCount: number
): string =>
  existingCount === 0 ? unitType : `${unitType} ${existingCount + 1}`

/**
 * Tytuł protokołu na listach i w nagłówkach, np. „Mieszkanie nr 12”,
 * „Części wspólne budynku — klatka nr 2”, „Instalacja odgromowa”.
 *
 * Protokoły budynkowe mają numer automatyczny („klatka”, „klatka 2”) — z niego
 * bierzemy tylko numer porządkowy; pierwszy protokół danego typu jest bez numeru.
 */
export const getProtocolTitle = (
  inspection: Pick<Inspection, 'unitType' | 'apartmentNumber'>
): string => {
  const number = (inspection.apartmentNumber || '').trim()
  switch (inspection.unitType) {
    case 'klatka': {
      const ordinal = autoUnitOrdinal(number)
      return ordinal
        ? `Części wspólne budynku — klatka nr ${ordinal}`
        : 'Części wspólne budynku'
    }
    case 'odgromowa': {
      const ordinal = autoUnitOrdinal(number)
      return ordinal
        ? `Instalacja odgromowa nr ${ordinal}`
        : 'Instalacja odgromowa'
    }
    case 'lokal':
      return number ? `Lokal użytkowy nr ${number}` : 'Lokal użytkowy'
    default:
      return number ? `Mieszkanie nr ${number}` : 'Mieszkanie'
  }
}

/** „klatka 2” → „2”; „klatka” / brak numeru → null */
const autoUnitOrdinal = (autoNumber: string): string | null =>
  autoNumber.match(/(\d+)\s*$/)?.[1] ?? null
