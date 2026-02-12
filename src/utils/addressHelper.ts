import type { Building } from '../types'

/**
 * Generuje pełny adres z obiektu Building
 * Obsługuje zarówno nowe (street, zipCode, city) jak i stare (name) formaty
 */
export const getFullAddress = (building: Building): string => {
  // Nowy format: street, zipCode, city
  if (building.street && building.zipCode && building.city) {
    return `${building.zipCode} ${building.city}, ul. ${building.street} `
  }

  // Fallback na stary format (name)
  if (building.name) {
    return building.name
  }

  // Jeśli nic nie jest dostępne
  return 'Nieznany adres'
}

/**
 * Normalizuje adres do użycia w numerze protokołu
 * Usuwa "ul.", "al.", spacje zamienia na "_", usuwa polskie znaki
 */
export const normalizeAddressForProtocol = (address: string): string => {
  return (
    address
      .trim()
      .toUpperCase()
      // Usuń prefiksy ulic
      .replace(/^(UL\.|AL\.|OS\.)\s*/i, '')
      // Usuń polskie znaki
      .replace(/Ą/g, 'A')
      .replace(/Ć/g, 'C')
      .replace(/Ę/g, 'E')
      .replace(/Ł/g, 'L')
      .replace(/Ń/g, 'N')
      .replace(/Ó/g, 'O')
      .replace(/Ś/g, 'S')
      .replace(/Ź/g, 'Z')
      .replace(/Ż/g, 'Z')
      // Zamień spacje na podkreślenia
      .replace(/\s+/g, '_')
      // Usuń przecinki, kropki i inne znaki specjalne
      .replace(/[,.\-/\\]/g, '')
  )
}
