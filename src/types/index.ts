export type ProtectionType = 'WNP' | 'BI'
export type Amperage = 10 | 16 | 20 | 25
export type NoGroundingType = 'NO_PIN' | 'NO_CONN' | 'HIGH_Z' | null
export type Room = 'Łazienka' | 'Kuchnia' | (string & {})
export type SocketType = 'Gniazdo 230V' | 'Gniazdo IP44'
export type UnitType = 'mieszkanie' | 'lokal' | 'klatka'

// ── Company types ──

export type CompanyRole = 'owner' | 'admin' | 'technician'

export interface Company {
  id: string // stable companyId (slug + suffix), used as doc path
  name: string // human-editable display name
  slug: string // URL-safe slug from initial name
  createdAt: Date
  ownerId: string // UID of the original creator
}

export interface CompanyMember {
  userId: string
  role: CompanyRole
  active: boolean
  joinedAt: Date
}

// ── Measurement types ──

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
  createdBy?: string // UID twórcy
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
  createdBy?: string // UID twórcy
}

export type InspectionStatus = 'COMPLETED' | 'INACCESSIBLE'

export interface Inspection {
  id?: string
  projectId: string // WYMAGANE - każdy pomiar musi należeć do projektu
  buildingId: string // WYMAGANE - każdy pomiar musi należeć do budynku
  companyId?: string // ID firmy (redundant z path, ale przydatne do exportu/offline)
  createdBy?: string // UID twórcy
  assignedTo?: string // UID przypisanego technika (opcjonalne, na przyszłość)
  address: string
  apartmentNumber: string
  ownerName?: string // Imię i nazwisko właściciela/najemcy
  date: Date
  technicianName: string
  technicianLicenseNumber?: string // Nr uprawnień technika (snapshot z ustawień)
  technicianSignature?: string // Base64 podpisu technika (snapshot z ustawień)
  notes?: string
  measurements: Measurement[]
  ownerSignature?: string // Base64 podpisu właściciela/użytkownika
  protocolNumber: string // Unikalny numer protokołu
  synced?: boolean
  status?: InspectionStatus // 'COMPLETED' domyślnie, 'INACCESSIBLE' = niedostępne
  unitType?: UnitType // 'mieszkanie' domyślnie
}

export interface UserSettings {
  displayName: string
  licenseNumber: string
  signatureBase64: string
  companyId?: string // ID firmy do której należy użytkownik
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
