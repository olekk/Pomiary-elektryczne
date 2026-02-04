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
