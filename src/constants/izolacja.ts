import type {
  MaterialPrzewodow,
  NapiecieProbiercze,
  OcenaIzolacji,
  RodzajObwodu,
  UkladSieci,
} from '../types'
import type { Option } from './odgromowa'

/**
 * Opcje sekcji „Rezystancja izolacji” protokołu mieszkaniowego.
 * Jedno źródło etykiet dla formularza, podsumowania i PDF-a (`labelOf()`).
 */

export const UKLAD_SIECI_OPTIONS: Option<UkladSieci>[] = [
  { value: 'TN-C', label: 'TN-C (2 żyły)' },
  { value: 'TN-S', label: 'TN-S (3 żyły)' },
]

export const MATERIAL_PRZEWODOW_OPTIONS: Option<MaterialPrzewodow>[] = [
  { value: 'Cu', label: 'Cu' },
  { value: 'Al', label: 'Al' },
]

export const NAPIECIE_PROBIERCZE_OPTIONS: Option<NapiecieProbiercze>[] = [
  { value: '500', label: '500 V' },
  { value: '250', label: '250 V – nieodłączalny SPD lub elektronika' },
]

export const RODZAJ_OBWODU_OPTIONS: Option<RodzajObwodu>[] = [
  { value: 'oswietlenie', label: 'oświetlenie' },
  { value: 'gniazda', label: 'gniazda' },
  { value: 'gniazda-kuchnia', label: 'gniazda kuchnia' },
  { value: 'lazienka-pralka', label: 'łazienka–pralka' },
  { value: 'bojler', label: 'bojler' },
  { value: 'kuchenka', label: 'kuchenka elektryczna' },
  { value: 'inny', label: 'inny' },
]

export const OCENA_IZOLACJI_OPTIONS: Option<OcenaIzolacji>[] = [
  { value: 'w-normie', label: 'w normie' },
  { value: 'ponizej-normy', label: 'poniżej normy' },
]

export const MAX_NAZWA_OBWODU = 40
