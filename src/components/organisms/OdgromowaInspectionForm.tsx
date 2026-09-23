import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Minus, Plus } from 'lucide-react'
import { Button, Select, Input, Card } from '../atoms'
import type {
  OdgromowaData,
  ProtocolVerdict,
  ZalecenieOdgromowe,
  ZlaczeKontrolne,
} from '../../types'
import { R_UZIEMIENIA_DOP } from '../../types'
import {
  RODZAJ_UZIOMU_OPTIONS,
  ZWODY_OPTIONS,
  MATERIAL_ZWODOW_OPTIONS,
  PRZEWODY_UZIOMOWE_OPTIONS,
  RODZAJ_GRUNTU_OPTIONS,
  STAN_POGODY_OPTIONS,
  STAN_GRUNTU_OPTIONS,
  STAN_PRZEWODOW_OPTIONS,
  STAN_ZLACZY_OPTIONS,
  STAN_SPD_OPTIONS,
  CIAGLOSC_OPTIONS,
  ZALECENIA_OPTIONS,
  labelOf,
} from '../../constants/odgromowa'
import {
  VERDICT_OPTIONS,
  MAX_LICZBA_ZLACZY,
  evaluateZlacze,
  parseResistanceInput,
  resizeZlacza,
  cn,
} from '../../utils'

interface OdgromowaInspectionFormProps {
  value: OdgromowaData
  onChange: (data: OdgromowaData) => void
  /** Opis instalacji skopiowany z poprzedniego protokołu → sekcja startuje zwinięta */
  descriptionCopied?: boolean
}

const Section: React.FC<{
  num: string
  title: string
  children: React.ReactNode
}> = ({ num, title, children }) => (
  <div className="border border-slate-700 rounded-lg p-3 space-y-2">
    <h3 className="text-sm font-bold text-blue-400">
      {num} {title}
    </h3>
    {children}
  </div>
)

/**
 * Pole R trzyma własny tekst — inaczej wpisywanie „4,” (przecinek przed
 * kolejną cyfrą) od razu zamieniałoby się w liczbę i gubiło przecinek.
 */
const ResistanceInput: React.FC<{
  value: number | null
  onChange: (value: number | null) => void
}> = ({ value, onChange }) => {
  const [text, setText] = useState(value === null ? '' : String(value))
  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parseResistanceInput(e.target.value))
      }}
      placeholder="Ω"
      aria-label="R uziemienia [Ω]"
      className="w-20 p-2 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
    />
  )
}

const ZlaczeRow: React.FC<{
  zlacze: ZlaczeKontrolne
  onChange: (zlacze: ZlaczeKontrolne) => void
}> = ({ zlacze, onChange }) => {
  const ocena = evaluateZlacze(zlacze)
  const measured = zlacze.rUziemienia !== null
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-10 font-bold text-slate-200">{zlacze.nr}</span>
      {/* Kontrolka segmentowa — obie opcje widoczne, wybrana podświetlona */}
      <div
        role="radiogroup"
        aria-label={`Ciągłość ${zlacze.nr}`}
        className="flex-1 flex rounded-lg border border-slate-700 overflow-hidden"
      >
        {CIAGLOSC_OPTIONS.map((o) => {
          const selected = zlacze.ciaglosc === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ ...zlacze, ciaglosc: o.value })}
              className={cn(
                'flex-1 py-2 px-1 text-sm font-semibold transition-colors cursor-pointer',
                !selected &&
                  'bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-slate-300',
                selected &&
                  o.value === 'zachowana' &&
                  'bg-green-700 text-white',
                selected && o.value === 'brak' && 'bg-red-700 text-white'
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      <ResistanceInput
        value={zlacze.rUziemienia}
        onChange={(rUziemienia) => onChange({ ...zlacze, rUziemienia })}
      />
      <span
        className={cn(
          'w-10 text-center text-sm font-bold',
          !measured
            ? 'text-slate-500'
            : ocena === 'TAK'
              ? 'text-green-400'
              : 'text-red-400'
        )}
      >
        {measured ? ocena : '—'}
      </span>
    </div>
  )
}

export const OdgromowaInspectionForm: React.FC<
  OdgromowaInspectionFormProps
> = ({ value: v, onChange, descriptionCopied = false }) => {
  const [descriptionOpen, setDescriptionOpen] = useState(!descriptionCopied)
  const u = (patch: Partial<OdgromowaData>) => onChange({ ...v, ...patch })

  const updateZlacze = (index: number, zlacze: ZlaczeKontrolne) =>
    u({ zlacza: v.zlacza.map((z, i) => (i === index ? zlacze : z)) })

  const toggleZalecenie = (zalecenie: ZalecenieOdgromowe) =>
    u({
      zalecenia: v.zalecenia.includes(zalecenie)
        ? v.zalecenia.filter((z) => z !== zalecenie)
        : [...v.zalecenia, zalecenie],
    })

  const hasFailedZlacze = v.zlacza.some(
    (z) => z.rUziemienia !== null && evaluateZlacze(z) === 'NIE'
  )

  return (
    <Card className="shadow-md">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">
        Protokół przeglądu instalacji odgromowej
      </h2>

      <div className="space-y-2">
        {/* 2. Opis instalacji — raz na budynek */}
        <div className="border border-slate-700 rounded-lg p-3 space-y-2">
          <button
            type="button"
            onClick={() => setDescriptionOpen((o) => !o)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-bold text-blue-400">
              2. Opis instalacji
            </span>
            {descriptionOpen ? (
              <ChevronDown size={18} className="text-slate-400" />
            ) : (
              <ChevronRight size={18} className="text-slate-400" />
            )}
          </button>
          {!descriptionOpen && (
            <p className="text-xs text-slate-400">
              {descriptionCopied && 'Skopiowano z poprzedniego protokołu · '}
              Uziom{' '}
              {labelOf(
                RODZAJ_UZIOMU_OPTIONS,
                v.rodzajUziomu
              ).toLowerCase()}, {v.zlacza.length} złącz kontrolnych
            </p>
          )}
          {descriptionOpen && (
            <>
              <Select
                label="Rodzaj uziomu"
                value={v.rodzajUziomu}
                onChange={(e) =>
                  u({
                    rodzajUziomu: e.target
                      .value as OdgromowaData['rodzajUziomu'],
                  })
                }
                options={RODZAJ_UZIOMU_OPTIONS}
              />
              <Select
                label="Zwody"
                value={v.zwody}
                onChange={(e) =>
                  u({ zwody: e.target.value as OdgromowaData['zwody'] })
                }
                options={ZWODY_OPTIONS}
              />
              <Select
                label="Materiał zwodów i przewodów odprowadzających"
                value={v.materialZwodow}
                onChange={(e) =>
                  u({
                    materialZwodow: e.target
                      .value as OdgromowaData['materialZwodow'],
                  })
                }
                options={MATERIAL_ZWODOW_OPTIONS}
              />
              <Select
                label="Przewody uziomowe"
                value={v.przewodyUziomowe}
                onChange={(e) => {
                  const przewodyUziomowe = e.target
                    .value as OdgromowaData['przewodyUziomowe']
                  // Klucz usuwany, nie ustawiany na undefined — Firestore go odrzuca
                  const next = { ...v, przewodyUziomowe }
                  if (przewodyUziomowe !== 'inne')
                    delete next.przewodyUziomoweInne
                  onChange(next)
                }}
                options={PRZEWODY_UZIOMOWE_OPTIONS}
              />
              {v.przewodyUziomowe === 'inne' && (
                <Input
                  label="Opis przewodów uziomowych"
                  value={v.przewodyUziomoweInne || ''}
                  onChange={(e) => u({ przewodyUziomoweInne: e.target.value })}
                  placeholder="np. linka Cu 16 mm²"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-300 mb-1">
                  Liczba złącz kontrolnych
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-12"
                    disabled={v.zlacza.length <= 1}
                    onClick={() =>
                      u({ zlacza: resizeZlacza(v.zlacza, v.zlacza.length - 1) })
                    }
                  >
                    <Minus size={18} />
                  </Button>
                  <span className="w-8 text-center text-lg font-bold text-slate-100">
                    {v.zlacza.length}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-12"
                    disabled={v.zlacza.length >= MAX_LICZBA_ZLACZY}
                    onClick={() =>
                      u({ zlacza: resizeZlacza(v.zlacza, v.zlacza.length + 1) })
                    }
                  >
                    <Plus size={18} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 3. Warunki pomiaru */}
        <Section num="3." title="Warunki pomiaru">
          <Select
            label="Rodzaj gruntu"
            value={v.rodzajGruntu}
            onChange={(e) =>
              u({
                rodzajGruntu: e.target.value as OdgromowaData['rodzajGruntu'],
              })
            }
            options={RODZAJ_GRUNTU_OPTIONS}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Pogoda"
              value={v.stanPogody}
              onChange={(e) =>
                u({ stanPogody: e.target.value as OdgromowaData['stanPogody'] })
              }
              options={STAN_POGODY_OPTIONS}
            />
            <Select
              label="Stan gruntu"
              value={v.stanGruntu}
              onChange={(e) =>
                u({ stanGruntu: e.target.value as OdgromowaData['stanGruntu'] })
              }
              options={STAN_GRUNTU_OPTIONS}
            />
          </div>
        </Section>

        {/* 5. Oględziny */}
        <Section num="5." title="Oględziny">
          <Select
            label="Zwody i mocowania"
            value={v.zwodyStan}
            onChange={(e) =>
              u({ zwodyStan: e.target.value as OdgromowaData['zwodyStan'] })
            }
            options={STAN_PRZEWODOW_OPTIONS}
          />
          <Select
            label="Przewody odprowadzające"
            value={v.przewodyOdprowadzajaceStan}
            onChange={(e) =>
              u({
                przewodyOdprowadzajaceStan: e.target
                  .value as OdgromowaData['przewodyOdprowadzajaceStan'],
              })
            }
            options={STAN_PRZEWODOW_OPTIONS}
          />
          <Select
            label="Złącza kontrolne"
            value={v.zlaczaStan}
            onChange={(e) =>
              u({ zlaczaStan: e.target.value as OdgromowaData['zlaczaStan'] })
            }
            options={STAN_ZLACZY_OPTIONS}
          />
        </Section>

        {/* 6. Pomiary */}
        <Section num="6." title="Pomiary">
          <p className="text-xs text-slate-400">
            R dopuszczalne: {R_UZIEMIENIA_DOP} Ω
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="w-10">Nr</span>
            <span className="flex-1 text-center">Ciągłość</span>
            <span className="w-20 text-center">R [Ω]</span>
            <span className="w-10 text-center">Ocena</span>
          </div>
          <div className="divide-y divide-slate-700/60">
            {v.zlacza.map((z, i) => (
              <ZlaczeRow
                key={z.nr}
                zlacze={z}
                onChange={(zlacze) => updateZlacze(i, zlacze)}
              />
            ))}
          </div>
        </Section>

        {/* 7. SPD */}
        <Section num="7." title="Ograniczniki przepięć (SPD)">
          <Select
            label="Stan"
            value={v.spd}
            onChange={(e) => u({ spd: e.target.value as OdgromowaData['spd'] })}
            options={STAN_SPD_OPTIONS}
          />
        </Section>

        {/* 9. Wnioski */}
        <Section num="9." title="Wnioski">
          <Select
            label="Wynik"
            value={v.wynik}
            onChange={(e) => {
              const wynik = e.target.value as ProtocolVerdict
              // Zalecenia dotyczą tylko instalacji z usterkami
              u(wynik === 'nadaje' ? { wynik, zalecenia: [] } : { wynik })
            }}
            options={VERDICT_OPTIONS}
          />
          {hasFailedZlacze && v.wynik === 'nadaje' && (
            <p className="text-xs text-orange-400">
              Co najmniej jedno złącze ma ocenę NIE — sprawdź wynik.
            </p>
          )}
          {v.wynik !== 'nadaje' && (
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-1">
                Zalecenia
              </p>
              <div className="flex flex-wrap gap-2">
                {ZALECENIA_OPTIONS.map((o) => {
                  const selected = v.zalecenia.includes(o.value)
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleZalecenie(o.value)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm border',
                        selected
                          ? 'bg-blue-900/50 border-blue-500 text-blue-200'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      )}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </Section>
      </div>
    </Card>
  )
}
