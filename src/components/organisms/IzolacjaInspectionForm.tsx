import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, Input, Select } from '../atoms'
import type {
  IzolacjaData,
  ObwodIzolacji,
  OcenaIzolacji,
  RodzajObwodu,
} from '../../types'
import { R_IZOLACJI_WYMAGANA } from '../../types'
import {
  MATERIAL_PRZEWODOW_OPTIONS,
  MAX_NAZWA_OBWODU,
  NAPIECIE_PROBIERCZE_OPTIONS,
  OCENA_IZOLACJI_OPTIONS,
  RODZAJ_OBWODU_OPTIONS,
  UKLAD_SIECI_OPTIONS,
} from '../../constants/izolacja'
import {
  createObwod,
  formatMegaohm,
  cn,
  type IzolacjaErrors,
} from '../../utils'

interface IzolacjaInspectionFormProps {
  value: IzolacjaData
  onChange: (data: IzolacjaData) => void
  /** null = nie pokazuj błędów (przed pierwszą próbą zapisu) */
  errors: IzolacjaErrors | null
}

const PLACEHOLDER = '— wybierz —'

const ObwodRow: React.FC<{
  lp: number
  obwod: ObwodIzolacji
  errors?: IzolacjaErrors['obwody'][string]
  canRemove: boolean
  onChange: (obwod: ObwodIzolacji) => void
  onRemove: () => void
}> = ({ lp, obwod, errors, canRemove, onChange, onRemove }) => (
  <div className="py-3 space-y-2">
    <div className="flex items-start gap-2">
      <span className="w-6 pt-3 font-bold text-slate-400 text-sm">{lp}.</span>
      <div className="flex-1">
        <Select
          aria-label={`Obwód ${lp}`}
          value={obwod.rodzaj ?? ''}
          placeholder={PLACEHOLDER}
          onChange={(e) => {
            const rodzaj = e.target.value as RodzajObwodu
            // Klucz usuwany, nie ustawiany na undefined — Firestore go odrzuca
            const next = { ...obwod, rodzaj }
            if (rodzaj !== 'inny') delete next.nazwaInny
            onChange(next)
          }}
          options={RODZAJ_OBWODU_OPTIONS}
          error={errors?.rodzaj}
        />
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="w-12 mt-1"
        disabled={!canRemove}
        onClick={onRemove}
        aria-label={`Usuń obwód ${lp}`}
      >
        <Trash2 size={18} className={canRemove ? 'text-red-400' : ''} />
      </Button>
    </div>
    {obwod.rodzaj === 'inny' && (
      <div className="pl-8">
        <Input
          aria-label={`Nazwa obwodu ${lp}`}
          value={obwod.nazwaInny || ''}
          maxLength={MAX_NAZWA_OBWODU}
          onChange={(e) => onChange({ ...obwod, nazwaInny: e.target.value })}
          placeholder="Nazwa obwodu, np. klimatyzacja"
          error={errors?.nazwaInny}
        />
      </div>
    )}
    <div className="pl-8 flex items-start gap-2">
      <div className="w-28 shrink-0">
        <p className="text-xs text-slate-400">R wymagana</p>
        <p className="text-lg font-bold text-slate-300">
          {formatMegaohm(R_IZOLACJI_WYMAGANA)} MΩ
        </p>
      </div>
      <div className="flex-1">
        <Select
          aria-label={`Ocena obwodu ${lp}`}
          value={obwod.ocena ?? ''}
          placeholder={PLACEHOLDER}
          onChange={(e) =>
            onChange({ ...obwod, ocena: e.target.value as OcenaIzolacji })
          }
          options={OCENA_IZOLACJI_OPTIONS}
          error={errors?.ocena}
          className={cn(
            obwod.ocena === 'w-normie' && 'text-green-400',
            obwod.ocena === 'ponizej-normy' && 'text-red-400'
          )}
        />
      </div>
    </div>
  </div>
)

export const IzolacjaInspectionForm: React.FC<IzolacjaInspectionFormProps> = ({
  value: v,
  onChange,
  errors,
}) => {
  const u = (patch: Partial<IzolacjaData>) => onChange({ ...v, ...patch })

  const updateObwod = (id: string, obwod: ObwodIzolacji) =>
    u({ obwody: v.obwody.map((o) => (o.id === id ? obwod : o)) })

  return (
    <Card className="shadow-md">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">
        Rezystancja izolacji
      </h2>

      <div className="space-y-2">
        <div className="border border-slate-700 rounded-lg p-3 space-y-2">
          <h3 className="text-sm font-bold text-blue-400">Dane instalacji</h3>
          <Select
            label="Układ sieci"
            value={v.ukladSieci}
            placeholder={PLACEHOLDER}
            onChange={(e) =>
              u({ ukladSieci: e.target.value as IzolacjaData['ukladSieci'] })
            }
            options={UKLAD_SIECI_OPTIONS}
            error={errors?.ukladSieci}
          />
          <Select
            label="Materiał przewodów"
            value={v.materialPrzewodow}
            placeholder={PLACEHOLDER}
            onChange={(e) =>
              u({
                materialPrzewodow: e.target
                  .value as IzolacjaData['materialPrzewodow'],
              })
            }
            options={MATERIAL_PRZEWODOW_OPTIONS}
            error={errors?.materialPrzewodow}
          />
          <Select
            label="Napięcie probiercze"
            value={v.napiecieProbiercze}
            onChange={(e) =>
              u({
                napiecieProbiercze: e.target
                  .value as IzolacjaData['napiecieProbiercze'],
              })
            }
            options={NAPIECIE_PROBIERCZE_OPTIONS}
            error={errors?.napiecieProbiercze}
          />
        </div>

        <div className="border border-slate-700 rounded-lg p-3">
          <h3 className="text-sm font-bold text-blue-400">Obwody</h3>
          <div className="divide-y divide-slate-700/60">
            {v.obwody.map((o, i) => (
              <ObwodRow
                key={o.id}
                lp={i + 1}
                obwod={o}
                errors={errors?.obwody[o.id]}
                canRemove={v.obwody.length > 1}
                onChange={(obwod) => updateObwod(o.id, obwod)}
                onRemove={() =>
                  u({ obwody: v.obwody.filter((x) => x.id !== o.id) })
                }
              />
            ))}
          </div>
          {errors?.obwodyLista && (
            <p className="text-red-400 text-xs mt-1">{errors.obwodyLista}</p>
          )}
          <Button
            variant="secondary"
            fullWidth
            className="mt-2"
            icon={<Plus size={18} />}
            onClick={() => u({ obwody: [...v.obwody, createObwod()] })}
          >
            Dodaj obwód
          </Button>
        </div>
      </div>
    </Card>
  )
}
