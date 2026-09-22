/**
 * Inteligentna inkrementacja numeru mieszkania
 * Przykłady:
 * - "1" -> "2"
 * - "42" -> "43"
 * - "1A" -> "2A" (inkrementuje cyfrę, zachowuje literę)
 * - "10B" -> "11B"
 * - "A1" -> "" (nie potrafi zinkrementować - zwraca pusty string)
 */
export const incrementApartmentNumber = (apartmentNumber: string): string => {
  if (!apartmentNumber) return ''

  // Spróbuj dopasować wzorzec: cyfry + opcjonalnie litera na końcu
  const match = apartmentNumber.match(/^(\d+)([A-Za-z]?)$/)

  if (!match) {
    // Nie udało się dopasować wzorca - zwróć pusty string
    return ''
  }

  const [, digits, letter] = match
  const incrementedNumber = (parseInt(digits, 10) + 1).toString()

  return incrementedNumber + letter
}

/**
 * Porównuje numery lokali "po ludzku", do sortowania list protokołów.
 * Przykłady kolejności: "1", "1A", "2", "10", "10B", "Klatka"
 * (wartości bez części cyfrowej trafiają na koniec, alfabetycznie).
 */
export const compareApartmentNumbers = (a: string, b: string): number => {
  const parse = (value: string) => {
    const trimmed = (value || '').trim()
    const match = trimmed.match(/^(\d+)(.*)$/)
    return match
      ? { number: parseInt(match[1], 10), rest: match[2].trim().toLowerCase() }
      : { number: Number.POSITIVE_INFINITY, rest: trimmed.toLowerCase() }
  }

  const left = parse(a)
  const right = parse(b)

  if (left.number !== right.number) return left.number - right.number
  return left.rest.localeCompare(right.rest, 'pl')
}
