import type {
  Ciaglosc,
  MaterialZwodow,
  OdgromowaData,
  PrzewodyUziomowe,
  RodzajGruntu,
  RodzajUziomu,
  RodzajZwodow,
  StanGruntu,
  StanPogody,
  StanPrzewodow,
  StanSpd,
  StanZlaczy,
  ZalecenieOdgromowe,
} from '../types'

/**
 * Opcje pól protokołu przeglądu instalacji odgromowej.
 *
 * Jedno źródło etykiet dla formularza, ekranu podsumowania i PDF-a —
 * `labelOf()` zamienia zapisaną w Firestore wartość na tekst.
 */
export interface Option<T extends string> {
  value: T
  label: string
}

export const RODZAJ_UZIOMU_OPTIONS: Option<RodzajUziomu>[] = [
  { value: 'otokowy', label: 'Otokowy' },
  { value: 'fundamentowy', label: 'Fundamentowy' },
  { value: 'pionowy', label: 'Pionowy' },
  { value: 'mieszany', label: 'Mieszany' },
  { value: 'nieustalony', label: 'Nieustalony' },
]

export const ZWODY_OPTIONS: Option<RodzajZwodow>[] = [
  { value: 'niskie', label: 'Niskie na uchwytach dystansowych' },
  { value: 'podniesione', label: 'Podniesione' },
  { value: 'pionowe', label: 'Pionowe (iglice)' },
  { value: 'naturalne', label: 'Naturalne (pokrycie metalowe)' },
]

export const MATERIAL_ZWODOW_OPTIONS: Option<MaterialZwodow>[] = [
  { value: 'fezn-6', label: 'Fe-Zn Ø6' },
  { value: 'fezn-8', label: 'Fe-Zn Ø8' },
  { value: 'al-8', label: 'Al Ø8' },
  { value: 'bednarka-fezn', label: 'Bednarka Fe-Zn' },
]

export const PRZEWODY_UZIOMOWE_OPTIONS: Option<PrzewodyUziomowe>[] = [
  {
    value: 'bednarka-zlacze',
    label: 'Bednarka spawana do otoku, zakończenie złączem kontrolnym',
  },
  { value: 'inne', label: 'Inne' },
]

export const RODZAJ_GRUNTU_OPTIONS: Option<RodzajGruntu>[] = [
  { value: 'piasek', label: 'Piasek' },
  { value: 'glina', label: 'Glina' },
  { value: 'il', label: 'Ił' },
  { value: 'zwir', label: 'Żwir' },
  { value: 'nasypowy', label: 'Nasypowy' },
  { value: 'nieustalony', label: 'Nieustalony' },
]

export const STAN_POGODY_OPTIONS: Option<StanPogody>[] = [
  { value: 'sucho', label: 'Sucho, bez opadów' },
  { value: 'po-opadach', label: 'Po opadach' },
  { value: 'mroz', label: 'Mróz' },
]

export const STAN_GRUNTU_OPTIONS: Option<StanGruntu>[] = [
  { value: 'suchy', label: 'Suchy' },
  { value: 'wilgotny', label: 'Wilgotny' },
  { value: 'zamarzniety', label: 'Zamarznięty' },
]

export const STAN_PRZEWODOW_OPTIONS: Option<StanPrzewodow>[] = [
  { value: 'bez-uwag', label: 'Bez uwag' },
  { value: 'korozja', label: 'Korozja' },
  { value: 'uchwyty', label: 'Luźne lub brakujące uchwyty' },
  { value: 'przerwa', label: 'Przerwa' },
  { value: 'uszkodzenie', label: 'Uszkodzenie' },
]

export const STAN_ZLACZY_OPTIONS: Option<StanZlaczy>[] = [
  { value: 'bez-uwag', label: 'Bez uwag' },
  { value: 'skorodowane', label: 'Skorodowane' },
  { value: 'nierozlaczalne', label: 'Nierozłączalne' },
  { value: 'brak-dostepu', label: 'Brak dostępu' },
]

export const CIAGLOSC_OPTIONS: Option<Ciaglosc>[] = [
  { value: 'zachowana', label: 'Zachowana' },
  { value: 'brak', label: 'Brak' },
]

export const STAN_SPD_OPTIONS: Option<StanSpd>[] = [
  { value: 'sprawne', label: 'Sprawne' },
  { value: 'do-wymiany', label: 'Zadziałały, do wymiany' },
  { value: 'brak', label: 'Brak SPD' },
]

export const ZALECENIA_OPTIONS: Option<ZalecenieOdgromowe>[] = [
  { value: 'wymiana-uchwytow', label: 'Wymiana uchwytów' },
  { value: 'naprawa-ciaglosci', label: 'Naprawa ciągłości' },
  { value: 'wymiana-zlacza', label: 'Wymiana złącza' },
  { value: 'antykorozja', label: 'Zabezpieczenie antykorozyjne' },
  { value: 'spd', label: 'Wymiana lub montaż SPD' },
  { value: 'rozbudowa-uziomu', label: 'Rozbudowa uziomu' },
]

/** Etykieta zapisanej wartości; nieznana wartość (np. ze starszej wersji) → '—' */
export const labelOf = <T extends string>(
  options: Option<T>[],
  value: T | undefined
): string => options.find((o) => o.value === value)?.label ?? '—'

export const DEFAULT_LICZBA_ZLACZY = 4

/**
 * Wartości domyślne formularza odgromowego. Jak przy klatce — muszą być w stanie
 * od początku, żeby pole nietknięte przez technika nie zapisało się jako `undefined`.
 */
export const DEFAULT_ODGROMOWA_DATA: OdgromowaData = {
  rodzajUziomu: 'otokowy',
  zwody: 'niskie',
  materialZwodow: 'fezn-8',
  przewodyUziomowe: 'bednarka-zlacze',
  rodzajGruntu: 'nieustalony',
  stanPogody: 'sucho',
  stanGruntu: 'suchy',
  zwodyStan: 'bez-uwag',
  przewodyOdprowadzajaceStan: 'bez-uwag',
  zlaczaStan: 'bez-uwag',
  zlacza: Array.from({ length: DEFAULT_LICZBA_ZLACZY }, (_, i) => ({
    nr: `K${i + 1}`,
    ciaglosc: 'zachowana' as const,
    rUziemienia: null,
  })),
  spd: 'brak',
  wynik: 'nadaje',
  zalecenia: [],
}
