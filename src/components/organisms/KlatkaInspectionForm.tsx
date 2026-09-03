import React from 'react'
import { Select, Input, Card } from '../atoms'
import type { KlatkaData, PrzylaczType, PwpStatus } from '../../types'

interface KlatkaInspectionFormProps {
  value: KlatkaData
  onChange: (data: KlatkaData) => void
}

/**
 * Wartości domyślne pól wyboru formularza klatki.
 * Pola, których użytkownik nie dotknie, i tak muszą trafić do Firestore i PDF —
 * inaczej `undefined` bywa interpretowane jako wynik negatywny (np. ocena instalacji).
 */
export const DEFAULT_KLATKA_DATA: KlatkaData = {
  przylacze: 'kablowe',
  typKabla: 'YAKY',
  przekrojPrzylacza: '4×35',
  pwpStatus: 'jest',
  pwpLokalizacja: 'przy wejściu',
  stanIzolacji: 'dobry',
  przewodPE: 'jest',
  rodzajObudowy: 'metalowa',
  uziemioneDrzwiczki: 'tak',
  tabliceLokalizacja: 'klatka',
  ochronnikTyp: 'brak',
  urzadzeniePKradziezy: 'brak',
  tablicaAdmLokalizacja: 'przy wejściu',
  wylaczniki: 'nadmiarowo-pradowy',
  klatkaVoltage: '230V',
  klatkaAutomat: 'czujnik-ruchu',
  strychMontaz: 'natynkowo',
  piwnicaMontaz: 'natynkowo',
  rezystancjaWLZ: 'w-normie',
  piorunochron: 'brak',
  piorunochronStan: 'dobry',
  piorunochronWynik: 'pozytywny',
  ocenaInstalacji: 'nadaje',
}

/* ─── tiny helpers ─── */
const set = (prev: KlatkaData, patch: Partial<KlatkaData>): KlatkaData => ({
  ...prev,
  ...patch,
})

const SectionRow: React.FC<{
  num: string
  children: React.ReactNode
  level?: 0 | 1 | 2
}> = ({ num, children, level = 0 }) => {
  const ml = level === 1 ? 'ml-6' : level === 2 ? 'ml-12' : ''
  const textSize =
    level === 0
      ? 'text-lg font-bold text-blue-400'
      : level === 1
        ? 'text-sm font-semibold text-blue-300'
        : 'text-xs font-semibold text-blue-200'
  return (
    <div className={`border border-slate-700 rounded-lg p-3 ${ml}`}>
      <div className="flex items-start gap-3">
        <span className={`${textSize} shrink-0 min-w-[2.5rem]`}>{num}</span>
        <div className="flex-1 space-y-2">{children}</div>
      </div>
    </div>
  )
}

export const KlatkaInspectionForm: React.FC<KlatkaInspectionFormProps> = ({
  value: v,
  onChange,
}) => {
  const u = (patch: Partial<KlatkaData>) => onChange(set(v, patch))

  return (
    <Card className="shadow-md">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">
        Protokół zbiorczy — oględziny klatki schodowej
      </h2>

      <div className="space-y-2">
        {/* 1. Przyłącze */}
        <SectionRow num="1.">
          <Select
            label="Przyłącze"
            value={v.przylacze}
            onChange={(e) =>
              u({
                przylacze: e.target.value as PrzylaczType,
                ...(e.target.value === 'napowietrzne'
                  ? { typKabla: undefined, przekrojPrzylacza: undefined }
                  : {}),
              })
            }
            options={[
              { value: 'kablowe', label: 'Kablowe' },
              { value: 'napowietrzne', label: 'Napowietrzne' },
            ]}
          />
        </SectionRow>

        {v.przylacze === 'kablowe' && (
          <SectionRow num="1.1" level={1}>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Typ kabla"
                value={v.typKabla || ''}
                onChange={(e) => u({ typKabla: e.target.value })}
                placeholder="np. YKY"
              />
              <Input
                label="Przekrój (mm²)"
                value={v.przekrojPrzylacza || ''}
                onChange={(e) => u({ przekrojPrzylacza: e.target.value })}
                placeholder="np. 4×10"
              />
            </div>
          </SectionRow>
        )}

        {/* 2. PWP */}
        <SectionRow num="2.">
          <Select
            label="Wyłącznik pożarowy prądu (PWP)"
            value={v.pwpStatus}
            onChange={(e) => u({ pwpStatus: e.target.value as PwpStatus })}
            options={[
              { value: 'jest', label: 'Jest' },
              { value: 'brak', label: 'Brak' },
            ]}
          />
        </SectionRow>

        {v.pwpStatus === 'jest' && (
          <SectionRow num="2.1" level={1}>
            <Input
              label="Lokalizacja"
              value={v.pwpLokalizacja || ''}
              onChange={(e) => u({ pwpLokalizacja: e.target.value })}
              placeholder="np. przy wejściu"
            />
          </SectionRow>
        )}

        {/* 3. Zabezpieczenie główne */}
        <SectionRow num="3.">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Zabezpieczenie główne — TYP"
              value={v.zabezpieczenieTyp || ''}
              onChange={(e) => u({ zabezpieczenieTyp: e.target.value })}
              placeholder="np. Bi-WTs"
            />
            <Input
              label="Wartość (A)"
              value={v.zabezpieczenieWartosc || ''}
              onChange={(e) => u({ zabezpieczenieWartosc: e.target.value })}
              placeholder="np. 63"
            />
          </div>
        </SectionRow>

        {/* 4. GLZ */}
        <SectionRow num="4.">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="GLZ — typ"
              value={v.glzTyp || ''}
              onChange={(e) => u({ glzTyp: e.target.value })}
              placeholder="np. YKY"
            />
            <Input
              label="GLZ — przekrój (mm²)"
              value={v.glzPrzekroj || ''}
              onChange={(e) => u({ glzPrzekroj: e.target.value })}
              placeholder="np. 4×10"
            />
          </div>
        </SectionRow>

        <SectionRow num="4.1" level={1}>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="WLZ (piony) — typ"
              value={v.wlzTyp || ''}
              onChange={(e) => u({ wlzTyp: e.target.value })}
              placeholder="np. YDY"
            />
            <Input
              label="WLZ — przekrój (mm²)"
              value={v.wlzPrzekroj || ''}
              onChange={(e) => u({ wlzPrzekroj: e.target.value })}
              placeholder="np. 5×6"
            />
          </div>
        </SectionRow>

        <SectionRow num="4.2" level={1}>
          <Select
            label="Stan izolacji"
            value={v.stanIzolacji || 'dobry'}
            onChange={(e) =>
              u({ stanIzolacji: e.target.value as 'dobry' | 'zły' })
            }
            options={[
              { value: 'dobry', label: 'Dobry' },
              { value: 'zły', label: 'Zły' },
            ]}
          />
        </SectionRow>

        <SectionRow num="4.3" level={1}>
          <Select
            label="Przewód ochronny PE"
            value={v.przewodPE || 'jest'}
            onChange={(e) =>
              u({ przewodPE: e.target.value as 'jest' | 'brak' })
            }
            options={[
              { value: 'jest', label: 'Jest' },
              { value: 'brak', label: 'Brak' },
            ]}
          />
        </SectionRow>

        {(v.przewodPE ?? 'jest') === 'jest' && (
          <SectionRow num="4.3.1" level={2}>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Typ"
                value={v.przewodPETyp || ''}
                onChange={(e) => u({ przewodPETyp: e.target.value })}
                placeholder="np. DY"
              />
              <Input
                label="Przekrój (mm²)"
                value={v.przewodPEPrzekroj || ''}
                onChange={(e) => u({ przewodPEPrzekroj: e.target.value })}
                placeholder="np. 6"
              />
            </div>
          </SectionRow>
        )}

        {/* 5. Rozdzielnie */}
        <SectionRow num="5.">
          <span className="text-sm text-slate-300 font-medium">
            Rozdzielnie / Tablice
          </span>
        </SectionRow>
        <SectionRow num="5.1" level={1}>
          <Select
            label="Rodzaj obudowy"
            value={v.rodzajObudowy || 'metalowa'}
            onChange={(e) =>
              u({ rodzajObudowy: e.target.value as 'metalowa' | 'drewniana' })
            }
            options={[
              { value: 'metalowa', label: 'Metalowa' },
              { value: 'drewniana', label: 'Drewniana' },
            ]}
          />
        </SectionRow>
        <SectionRow num="5.2" level={1}>
          <Select
            label="Uziemione drzwiczki"
            value={v.uziemioneDrzwiczki || 'tak'}
            onChange={(e) =>
              u({ uziemioneDrzwiczki: e.target.value as 'tak' | 'nie' })
            }
            options={[
              { value: 'tak', label: 'Tak' },
              { value: 'nie', label: 'Nie' },
            ]}
          />
        </SectionRow>

        {/* 6. Tablice licznikowe */}
        <SectionRow num="6.">
          <Select
            label="Tablice licznikowe"
            value={v.tabliceLokalizacja || 'klatka'}
            onChange={(e) =>
              u({
                tabliceLokalizacja: e.target.value as 'klatka' | 'mieszkania',
              })
            }
            options={[
              { value: 'klatka', label: 'Klatka schodowa' },
              { value: 'mieszkania', label: 'W mieszkaniach' },
            ]}
          />
        </SectionRow>
        <SectionRow num="6.1" level={1}>
          <Input
            label="Ilość lokali mieszkalnych"
            value={v.iloscLokali || ''}
            onChange={(e) => u({ iloscLokali: e.target.value })}
            placeholder="np. 12"
          />
        </SectionRow>

        {/* 7. Ochronnik przepięć */}
        <SectionRow num="7.">
          <Select
            label="Ochronnik przepięć"
            value={v.ochronnikTyp || 'brak'}
            onChange={(e) =>
              u({ ochronnikTyp: e.target.value as 'jest' | 'brak' })
            }
            options={[
              { value: 'jest', label: 'Jest' },
              { value: 'brak', label: 'Brak' },
            ]}
          />
        </SectionRow>

        {/* 8. Urządzenie p/kradzieży prądu */}
        <SectionRow num="8.">
          <Select
            label="Urządzenie p/kradzieży prądu"
            value={v.urzadzeniePKradziezy || 'brak'}
            onChange={(e) =>
              u({ urzadzeniePKradziezy: e.target.value as 'jest' | 'brak' })
            }
            options={[
              { value: 'jest', label: 'Jest' },
              { value: 'brak', label: 'Brak' },
            ]}
          />
        </SectionRow>

        {/* 9. Tablica administracyjna */}
        <SectionRow num="9.">
          <Input
            label="Tablica administracyjna — lokalizacja"
            value={v.tablicaAdmLokalizacja || ''}
            onChange={(e) => u({ tablicaAdmLokalizacja: e.target.value })}
            placeholder="np. piwnica"
          />
        </SectionRow>
        <SectionRow num="9.1" level={1}>
          <Select
            label="Wyłączniki w rozdzielni ADM"
            value={v.wylaczniki || 'nadmiarowo-pradowy'}
            onChange={(e) =>
              u({
                wylaczniki: e.target.value as 'topikowe' | 'nadmiarowo-pradowy',
              })
            }
            options={[
              { value: 'topikowe', label: 'Topikowe' },
              {
                value: 'nadmiarowo-pradowy',
                label: 'Wyłącznik nadmiarowo-prądowy',
              },
            ]}
          />
        </SectionRow>

        {/* 10. Oświetlenie */}
        <SectionRow num="10.">
          <span className="text-sm text-slate-300 font-medium">
            Oświetlenie
          </span>
        </SectionRow>
        <SectionRow num="10.1" level={1}>
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Klatka — napięcie"
              value={v.klatkaVoltage || '230V'}
              onChange={(e) =>
                u({ klatkaVoltage: e.target.value as '230V' | '24V' })
              }
              options={[
                { value: '230V', label: '230V' },
                { value: '24V', label: '24V' },
              ]}
            />
            <Input
              label="Przewód"
              value={v.klatkaPrzewod || ''}
              onChange={(e) => u({ klatkaPrzewod: e.target.value })}
              placeholder="np. YDY 3×1,5"
            />
          </div>
        </SectionRow>
        <SectionRow num="10.1.1" level={2}>
          <Select
            label="Sterowanie"
            value={v.klatkaAutomat || 'automat-schodowy'}
            onChange={(e) =>
              u({
                klatkaAutomat: e.target.value as
                  | 'automat-schodowy'
                  | 'czujnik-ruchu',
              })
            }
            options={[
              { value: 'automat-schodowy', label: 'Automat schodowy' },
              { value: 'czujnik-ruchu', label: 'Lampy na czujnik ruchu' },
            ]}
          />
        </SectionRow>
        <SectionRow num="10.2" level={1}>
          <Select
            label="Strych — montaż"
            value={v.strychMontaz || 'natynkowo'}
            onChange={(e) =>
              u({ strychMontaz: e.target.value as 'natynkowo' | 'podtynkowo' })
            }
            options={[
              { value: 'natynkowo', label: 'Natynkowo' },
              { value: 'podtynkowo', label: 'Podtynkowo' },
            ]}
          />
        </SectionRow>
        <SectionRow num="10.3" level={1}>
          <Select
            label="Piwnica — montaż"
            value={v.piwnicaMontaz || 'natynkowo'}
            onChange={(e) =>
              u({ piwnicaMontaz: e.target.value as 'natynkowo' | 'podtynkowo' })
            }
            options={[
              { value: 'natynkowo', label: 'Natynkowo' },
              { value: 'podtynkowo', label: 'Podtynkowo' },
            ]}
          />
        </SectionRow>

        {/* 11. Badania i pomiary */}
        <SectionRow num="11.">
          <span className="text-sm text-slate-300 font-medium">
            Badania i pomiary instalacji
          </span>
        </SectionRow>
        <SectionRow num="11.1" level={1}>
          <Select
            label="Pomiar rezystancji izolacji WLZ"
            value={v.rezystancjaWLZ || 'w-normie'}
            onChange={(e) =>
              u({ rezystancjaWLZ: e.target.value as 'w-normie' | 'niezgodne' })
            }
            options={[
              { value: 'w-normie', label: 'W normie' },
              { value: 'niezgodne', label: 'Niezgodne z normą' },
            ]}
          />
        </SectionRow>
        <SectionRow num="11.2" level={1}>
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="L1 (V)"
              value={v.napiecieL1 || ''}
              onChange={(e) => u({ napiecieL1: e.target.value })}
              placeholder="np. 230"
            />
            <Input
              label="L2 (V)"
              value={v.napiecieL2 || ''}
              onChange={(e) => u({ napiecieL2: e.target.value })}
              placeholder="np. 232"
            />
            <Input
              label="L3 (V)"
              value={v.napiecieL3 || ''}
              onChange={(e) => u({ napiecieL3: e.target.value })}
              placeholder="np. 228"
            />
          </div>
        </SectionRow>

        {/* 12. Instalacja piorunochronna */}
        <SectionRow num="12.">
          <Select
            label="Instalacja piorunochronna"
            value={v.piorunochron || 'brak'}
            onChange={(e) =>
              u({ piorunochron: e.target.value as 'jest' | 'brak' })
            }
            options={[
              { value: 'jest', label: 'Jest' },
              { value: 'brak', label: 'Brak' },
            ]}
          />
        </SectionRow>

        {v.piorunochron === 'jest' && (
          <>
            <SectionRow num="12.1" level={1}>
              <span className="text-xs text-slate-400">
                Połączenia, osprzęt, zabezpieczenia od korozji oraz uziemienia
                zwodu, przeznaczonego do bezpośredniego przyjmowania wyładowań
                atmosferycznych
              </span>
            </SectionRow>
            <SectionRow num="12.1.1" level={2}>
              <Select
                label="Stan"
                value={v.piorunochronStan || 'dobry'}
                onChange={(e) =>
                  u({ piorunochronStan: e.target.value as 'dobry' | 'zły' })
                }
                options={[
                  { value: 'dobry', label: 'Dobry' },
                  { value: 'zły', label: 'Zły' },
                ]}
              />
            </SectionRow>
            <SectionRow num="12.2" level={1}>
              <Input
                label="Uwagi"
                value={v.piorunochronUwagi || ''}
                onChange={(e) => u({ piorunochronUwagi: e.target.value })}
                placeholder="Uwagi dotyczące instalacji piorunochronnej"
              />
            </SectionRow>
            <SectionRow num="12.3" level={1}>
              <Select
                label="Wynik pomiarów"
                value={v.piorunochronWynik || 'pozytywny'}
                onChange={(e) =>
                  u({
                    piorunochronWynik: e.target.value as
                      | 'pozytywny'
                      | 'negatywny',
                  })
                }
                options={[
                  { value: 'pozytywny', label: 'Pozytywny' },
                  { value: 'negatywny', label: 'Negatywny' },
                ]}
              />
            </SectionRow>
          </>
        )}

        {/* 13. Ocena */}
        <SectionRow num="13.">
          <Select
            label="Ocena instalacji elektrycznej"
            value={v.ocenaInstalacji || 'nadaje'}
            onChange={(e) =>
              u({ ocenaInstalacji: e.target.value as 'nadaje' | 'nie-nadaje' })
            }
            options={[
              { value: 'nadaje', label: 'NADAJE się do dalszej eksploatacji' },
              {
                value: 'nie-nadaje',
                label: 'NIE NADAJE się do dalszej eksploatacji',
              },
            ]}
          />
        </SectionRow>

        {/* 14. Termin usunięcia usterek */}
        <SectionRow num="14.">
          <Input
            label="Termin usunięcia usterek"
            value={v.terminUsterek || ''}
            onChange={(e) => u({ terminUsterek: e.target.value })}
            placeholder="np. 30 dni"
          />
        </SectionRow>
      </div>
    </Card>
  )
}
