export type ProtectionType = 'WNP' | 'BI'
export type Amperage = 10 | 16 | 20 | 25
export type NoGroundingType = 'NO_PIN' | 'NO_CONN' | 'HIGH_Z' | null
export type Room = 'Łazienka' | 'Kuchnia' | (string & {})
export type SocketType = 'Gniazdo 230V' | 'Gniazdo IP44'
export type UnitType = 'mieszkanie' | 'lokal' | 'klatka'

export type PrzylaczType = 'kabelowe' | 'napowietrzne'
export type PwpStatus = 'jest' | 'brak'
export type JestBrak = 'jest' | 'brak'
export type TakNie = 'tak' | 'nie'
export type DobryZly = 'dobry' | 'zły'

export interface KlatkaData {
  // 1. Przyłącze
  przylacze: PrzylaczType
  typKabla?: string
  przekrojPrzylacza?: string

  // 2. PWP
  pwpStatus: PwpStatus
  pwpLokalizacja?: string

  // 3. Zabezpieczenie główne
  zabezpieczenieTyp?: string
  zabezpieczenieWartosc?: string

  // 4. GLZ / WLZ
  glzTyp?: string
  glzPrzekroj?: string
  wlzTyp?: string
  wlzPrzekroj?: string
  stanIzolacji?: DobryZly
  przewodPE?: JestBrak
  przewodPETyp?: string
  przewodPEPrzekroj?: string

  // 5. Rozdzielnie
  rodzajObudowy?: 'metalowa' | 'drewniana'
  uziemioneDrzwiczki?: TakNie

  // 6. Tablice licznikowe
  tabliceLokalizacja?: 'klatka' | 'mieszkania'
  iloscLokali?: string

  // 7. Ochronnik przepięć
  ochronnikTyp?: JestBrak

  // 8. Urządzenie p/kradzieży prądu
  urzadzeniePKradziezy?: JestBrak

  // 9. Tablica administracyjna
  tablicaAdmLokalizacja?: string
  wylaczniki?: 'topikowe' | 'nadmiarowo-pradowy'

  // 10. Oświetlenie
  klatkaVoltage?: '230V' | '24V'
  klatkaPrzewod?: string
  klatkaAutomat?: 'automat-schodowy' | 'czujnik-ruchu'
  strychMontaz?: 'natynkowo' | 'podtynkowo'
  piwnicaMontaz?: 'natynkowo' | 'podtynkowo'

  // 11. Badania i pomiary
  rezystancjaWLZ?: 'w-normie' | 'niezgodne'
  napiecieL1?: string
  napiecieL2?: string
  napiecieL3?: string

  // 12. Instalacja piorunochronna
  piorunochron?: JestBrak
  piorunochronStan?: DobryZly
  piorunochronUwagi?: string
  piorunochronWynik?: 'pozytywny' | 'negatywny'

  // 13. Ocena
  ocenaInstalacji?: 'nadaje' | 'nie-nadaje'

  // 14. Termin usunięcia usterek
  terminUsterek?: string
}

export interface Measurement {
  id: string
  pointNumber: number
  room: Room
  protectionType: ProtectionType
  amperage: Amperage
  zsValue: number | null // Zmierzony Zs
  zsDop: number // Dopuszczalny Zs
  result: 'TAK' | 'NIE' // Ocena
  noGrounding?: NoGroundingType // Rodzaj braku uziemienia
  socketType: SocketType // Typ punktu pomiarowego
}

export interface Project {
  id: string
  name: string
  createdAt: Date
  status: 'active' | 'archived'
}

export interface Building {
  id: string
  projectId: string
  name?: string // Stare dane - pełny adres (deprecated, dla kompatybilności wstecznej)
  street: string // np. "ul. Słoneczna 15"
  zipCode: string // np. "40-000"
  city: string // np. "Katowice"
  createdAt: Date
  updatedAt: Date
  userId: string
}

export type InspectionStatus = 'COMPLETED' | 'INACCESSIBLE'

export interface Inspection {
  id?: string
  projectId: string // WYMAGANE - każdy pomiar musi należeć do projektu
  buildingId: string // WYMAGANE - każdy pomiar musi należeć do budynku
  address: string
  apartmentNumber: string
  ownerName?: string // Imię i nazwisko właściciela/najemcy
  date: Date
  technicianName: string
  technicianLicenseNumber?: string // Nr uprawnień technika (snapshot z ustawień)
  technicianSignature?: string // Base64 podpisu technika (snapshot z ustawień)
  reviewerName?: string // Imię i nazwisko sprawdzającego
  reviewerLicenseNumber?: string // Nr uprawnień sprawdzającego
  reviewerSignature?: string // Base64 podpisu sprawdzającego
  notes?: string
  measurements: Measurement[]
  ownerSignature?: string // Base64 podpisu właściciela/użytkownika
  protocolNumber: string // Unikalny numer protokołu
  synced?: boolean
  status?: InspectionStatus // 'COMPLETED' domyślnie, 'INACCESSIBLE' = niedostępne
  unitType?: UnitType // 'mieszkanie' domyślnie
  klatkaData?: KlatkaData // data for 'klatka' unit type inspections
}

export interface UserSettings {
  displayName: string
  licenseNumber: string
  signatureBase64: string
  reviewerName: string
  reviewerLicenseNumber: string
  reviewerSignatureBase64: string
}

// Tabela dopuszczalnych impedancji (uproszczona)
export const ZS_DOP_TABLE: Record<ProtectionType, Record<Amperage, number>> = {
  WNP: {
    10: 4.6,
    16: 2.88,
    20: 2.3,
    25: 1.71,
  },
  BI: {
    10: 4.26,
    16: 2.66,
    20: 2.13,
    25: 1.7,
  },
}

// Domyślne współczynniki k
export const DEFAULT_K_FACTORS: Record<ProtectionType, number> = {
  WNP: 5,
  BI: 5.4,
}
