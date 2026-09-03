import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import {
  Home,
  FileDown,
  CheckCircle,
  Plus,
  Pencil,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { SignaturePanel, NotesSection } from './organisms'
import { CompactMeasurementListItem } from './molecules'
import { Button, Card } from './atoms'
import {
  countMeasurementsByResult,
  ensureDate,
  generateInspectionPdf,
} from '../utils'
import type { Inspection } from '../types'
import { logger } from '../utils/logger'
import { useDocument } from '../hooks'
import { doc, type DocumentSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { saveInspectionToFirestore, markInspectionAsSynced } from '../services'
import { generateInspectionId } from '../utils'

const inspectionMapper = (snap: DocumentSnapshot): Inspection | null => {
  if (!snap.exists()) return null
  const d = snap.data()!
  return {
    id: snap.id,
    projectId: d.projectId,
    buildingId: d.buildingId,
    address: d.address,
    apartmentNumber: d.apartmentNumber,
    ownerName: d.ownerName || '',
    date: d.date?.toDate ? d.date.toDate() : new Date(),
    technicianName: d.technicianName || d.technician || '',
    technicianLicenseNumber: d.technicianLicenseNumber || '',
    technicianSignature: d.technicianSignature || '',
    reviewerName: d.reviewerName || '',
    reviewerLicenseNumber: d.reviewerLicenseNumber || '',
    reviewerSignature: d.reviewerSignature || '',
    measurements: d.measurements || [],
    notes: d.notes || '',
    ownerSignature: d.ownerSignature || d.signature || '',
    protocolNumber: d.protocolNumber,
    synced: d.synced ?? true,
    status: d.status || 'COMPLETED',
    unitType: d.unitType || 'mieszkanie',
    klatkaData: d.klatkaData || undefined,
  }
}

export const SummaryScreen: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { buildingId, inspectionId } = useParams<{
    buildingId: string
    inspectionId: string
  }>()

  const locationState = location.state as {
    inspection: Inspection
    buildingId: string
  } | null

  // buildingId comes from URL first, then from location state, then from inspection data
  const resolvedBuildingId = buildingId || locationState?.buildingId

  // Live Firestore subscription for reload case
  const inspectionDocRef = useMemo(
    () => (inspectionId ? doc(db, 'inspections', inspectionId) : null),
    [inspectionId]
  )
  const { data: firestoreInspection } = useDocument<Inspection>(
    inspectionDocRef,
    inspectionMapper,
    'Inspection'
  )

  // Use location.state first (freshly passed from MeasurementScreen),
  // fall back to Firestore data (reload case)
  const [localInspection, setLocalInspection] = useState<Inspection | null>(
    locationState?.inspection || null
  )

  // When Firestore data arrives (reload case), use it
  useEffect(() => {
    if (firestoreInspection && !localInspection) {
      setLocalInspection(firestoreInspection)
    }
  }, [firestoreInspection, localInspection])

  const inspection = localInspection || firestoreInspection
  const effectiveBuildingId = resolvedBuildingId || inspection?.buildingId

  const [notes, setNotes] = useState(inspection?.notes || '')

  const CLAUSE_FONT_MIN = 1
  const CLAUSE_FONT_MAX = 1.75
  const CLAUSE_FONT_STEP = 0.125
  const [clauseFontSize, setClauseFontSize] = useState(1.125)

  useEffect(() => {
    setNotes(inspection?.notes || '')
  }, [inspection?.id, inspection?.notes])

  const hasUserEditedNotes = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNotesChange = (value: string) => {
    hasUserEditedNotes.current = true
    setNotes(value)
    if (localInspection) {
      setLocalInspection({ ...localInspection, notes: value })
    }
  }

  // Debounced auto-save: persist notes 1s after the user stops typing
  useEffect(() => {
    if (!hasUserEditedNotes.current || !inspection) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      saveInspection(inspection.ownerSignature || '')
      logger.log('💾 Notes auto-saved')
    }, 1000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [notes])

  const saveInspection = (sig?: string) => {
    if (!inspection) return null
    const savedId = inspection.id || generateInspectionId()
    const toSave: Inspection = {
      ...inspection,
      id: savedId,
      notes,
      ownerSignature: sig !== undefined ? sig : inspection.ownerSignature || '',
      date: ensureDate(inspection.date),
      synced: false,
    }

    // Fire-and-forget: write to Firestore cache (works offline), sync when online
    saveInspectionToFirestore(toSave, savedId)
      .then(() => markInspectionAsSynced(savedId))
      .then(() => logger.log(`✅ Inspection ${savedId} synced`))
      .catch((err) => logger.error(`❌ Sync failed:`, err))

    return toSave
  }

  const handleSaveSignature = (ownerSignature: string) => {
    if (!inspection) return
    // Optimistic local update
    setLocalInspection({ ...inspection, notes, ownerSignature })
    // Save to Firestore (fire-and-forget)
    saveInspection(ownerSignature)
  }

  const handleReturnToBuilding = () => {
    navigate(effectiveBuildingId ? `/building/${effectiveBuildingId}` : '/')
  }

  const handleAddNext = () => {
    if (!effectiveBuildingId || !inspection) {
      alert('Błąd: Brak ID budynku lub danych pomiaru')
      return
    }
    navigate(`/building/${effectiveBuildingId}`, {
      state: { lastApartmentNumber: inspection.apartmentNumber },
    })
  }

  const handleBackToMeasurement = () => {
    if (!effectiveBuildingId || !inspection) return
    navigate(`/building/${effectiveBuildingId}/measurement`, {
      state: { inspection: { ...inspection, notes } },
    })
  }

  if (!inspection) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Brak danych do wyświetlenia</p>
          <Button
            variant="primary"
            onClick={() => navigate('/')}
            icon={<Home size={20} />}
          >
            Powrót do listy
          </Button>
        </div>
      </div>
    )
  }

  const { passed, failed } = countMeasurementsByResult(inspection.measurements)

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-green-900 border-b border-green-800 text-slate-100 p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <CheckCircle size={32} />
          <div>
            <h1 className="text-xl font-bold">Pomiar Zakończony</h1>
            <p className="text-sm text-green-300">
              {inspection.address} /{' '}
              {inspection.unitType === 'lokal'
                ? 'Lokal '
                : inspection.unitType === 'klatka'
                  ? ''
                  : ''}
              {inspection.apartmentNumber}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {inspection.unitType === 'klatka' && inspection.klatkaData ? (
          <Card className="mb-4">
            <h2 className="font-bold text-lg text-slate-100 mb-3">
              Dane klatki schodowej
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(() => {
                const d = inspection.klatkaData!
                const row = (label: string, val: string, color?: string) => (
                  <div
                    className="flex justify-between items-center border-b border-slate-700 pb-1"
                    key={label}
                  >
                    <span className="text-slate-400 text-sm">{label}</span>
                    <span
                      className={`font-medium text-sm ${color || 'text-slate-100'}`}
                    >
                      {val}
                    </span>
                  </div>
                )
                const green = 'text-green-400'
                const red = 'text-red-400'
                return (
                  <>
                    {row(
                      '1. Przyłącze',
                      d.przylacze === 'napowietrzne'
                        ? 'Napowietrzne'
                        : 'Kablowe'
                    )}
                    {d.przylacze === 'kablowe' &&
                      row(
                        '  1.1 Typ kabla / przekrój',
                        `${d.typKabla || '—'} / ${d.przekrojPrzylacza || '—'} mm²`
                      )}
                    {row(
                      '2. PWP',
                      d.pwpStatus === 'jest' ? 'Jest' : 'Brak',
                      d.pwpStatus === 'jest' ? green : red
                    )}
                    {d.pwpStatus === 'jest' &&
                      row('  2.1 Lokalizacja', d.pwpLokalizacja || '—')}
                    {row(
                      '3. Zabezpieczenie główne',
                      `${d.zabezpieczenieTyp || 'Bi-WTs'} / ${d.zabezpieczenieWartosc || '—'} A`
                    )}
                    {row(
                      '4. GLZ',
                      `${d.glzTyp || '—'} / ${d.glzPrzekroj || '—'} mm²`
                    )}
                    {row(
                      '  4.1 WLZ (Piony)',
                      `${d.wlzTyp || '—'} / ${d.wlzPrzekroj || '—'} mm²`
                    )}
                    {row(
                      '  4.2 Stan izolacji',
                      (d.stanIzolacji || 'dobry') === 'dobry' ? 'Dobry' : 'Zły',
                      (d.stanIzolacji || 'dobry') === 'dobry' ? green : red
                    )}
                    {row(
                      '  4.3 Przewód PE',
                      (d.przewodPE || 'jest') === 'jest' ? 'Jest' : 'Brak',
                      (d.przewodPE || 'jest') === 'jest' ? green : red
                    )}
                    {(d.przewodPE ?? 'jest') === 'jest' &&
                      row(
                        '    4.3.1 Typ / przekrój',
                        `${d.przewodPETyp || '—'} / ${d.przewodPEPrzekroj || '—'} mm²`
                      )}
                    {row('5. Rozdzielnie', '')}
                    {row(
                      '  5.1 Obudowa',
                      (d.rodzajObudowy || 'metalowa') === 'metalowa'
                        ? 'Metalowa'
                        : 'Drewniana'
                    )}
                    {row(
                      '  5.2 Uziemione drzwiczki',
                      (d.uziemioneDrzwiczki || 'tak') === 'tak' ? 'Tak' : 'Nie'
                    )}
                    {row(
                      '6. Tablice licznikowe',
                      (d.tabliceLokalizacja || 'klatka') === 'klatka'
                        ? 'Klatka schodowa'
                        : 'W mieszkaniach'
                    )}
                    {row('  6.1 Ilość lokali', d.iloscLokali || '—')}
                    {row(
                      '7. Ochronnik przepięć',
                      (d.ochronnikTyp || 'brak') === 'jest' ? 'Jest' : 'Brak'
                    )}
                    {row(
                      '8. Urz. p/kradzieży prądu',
                      (d.urzadzeniePKradziezy || 'brak') === 'jest'
                        ? 'Jest'
                        : 'Brak'
                    )}
                    {row('9. Tablica ADM', d.tablicaAdmLokalizacja || '—')}
                    {row(
                      '  9.1 Wyłączniki',
                      (d.wylaczniki || 'nadmiarowo-pradowy') === 'topikowe'
                        ? 'Topikowe'
                        : 'Nadmiarowo-prądowy'
                    )}
                    {row('10. Oświetlenie', '')}
                    {row(
                      '  10.1 Klatka',
                      `${d.klatkaVoltage || '230V'}, ${d.klatkaPrzewod || '—'}`
                    )}
                    {row(
                      '  10.2 Strych',
                      (d.strychMontaz || 'natynkowo') === 'natynkowo'
                        ? 'Natynkowo'
                        : 'Podtynkowo'
                    )}
                    {row(
                      '  10.3 Piwnica',
                      (d.piwnicaMontaz || 'natynkowo') === 'natynkowo'
                        ? 'Natynkowo'
                        : 'Podtynkowo'
                    )}
                    {row('11. Badania i pomiary', '')}
                    {row(
                      '  11.1 Rezystancja WLZ',
                      (d.rezystancjaWLZ || 'w-normie') === 'w-normie'
                        ? 'W normie'
                        : 'Niezgodne',
                      (d.rezystancjaWLZ || 'w-normie') === 'w-normie'
                        ? green
                        : red
                    )}
                    {row(
                      '  11.2 Napięcia',
                      `L1:${d.napiecieL1 || '—'}V L2:${d.napiecieL2 || '—'}V L3:${d.napiecieL3 || '—'}V`
                    )}
                    {row(
                      '12. Piorunochron',
                      (d.piorunochron || 'brak') === 'jest' ? 'Jest' : 'Brak'
                    )}
                    {d.piorunochron === 'jest' && (
                      <>
                        {row(
                          '  12.1.1 Stan',
                          (d.piorunochronStan || 'dobry') === 'dobry'
                            ? 'Dobry'
                            : 'Zły',
                          (d.piorunochronStan || 'dobry') === 'dobry'
                            ? green
                            : red
                        )}
                        {row('  12.2 Uwagi', d.piorunochronUwagi || '—')}
                        {row(
                          '  12.3 Wynik',
                          (d.piorunochronWynik || 'pozytywny') === 'pozytywny'
                            ? 'Pozytywny'
                            : 'Negatywny',
                          (d.piorunochronWynik || 'pozytywny') === 'pozytywny'
                            ? green
                            : red
                        )}
                      </>
                    )}
                    {row(
                      '13. Ocena',
                      (d.ocenaInstalacji || 'nadaje') === 'nadaje'
                        ? 'NADAJE SIĘ'
                        : 'NIE NADAJE SIĘ',
                      (d.ocenaInstalacji || 'nadaje') === 'nadaje' ? green : red
                    )}
                    {row(
                      '14. Termin usunięcia usterek',
                      d.terminUsterek || '—'
                    )}
                  </>
                )
              })()}
            </div>
          </Card>
        ) : (
          <>
            <Card className="mb-4">
              <h2 className="font-bold text-lg text-slate-100 mb-3">
                Podsumowanie
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {passed}
                  </div>
                  <div className="text-xs text-slate-400">Pozytywne</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400">
                    {failed}
                  </div>
                  <div className="text-xs text-slate-400">Negatywne</div>
                </div>
              </div>
            </Card>

            <Card className="mb-4">
              <h3 className="font-bold text-slate-100 mb-3">
                Wszystkie punkty pomiarowe
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {inspection.measurements.map((m) => (
                  <CompactMeasurementListItem key={m.id} measurement={m} />
                ))}
              </div>
            </Card>
          </>
        )}

        <NotesSection
          notes={notes}
          onNotesChange={handleNotesChange}
          collapsible={false}
          rows={6}
          className="mb-4"
        />

        {inspection.unitType !== 'klatka' && (
          <>
            <Card className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-100">
                  Oświadczenie użytkownika lokalu
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setClauseFontSize((s) =>
                        Math.max(CLAUSE_FONT_MIN, +(s - CLAUSE_FONT_STEP).toFixed(3))
                      )
                    }
                    disabled={clauseFontSize <= CLAUSE_FONT_MIN}
                    aria-label="Zmniejsz czcionkę klauzuli"
                  >
                    <ZoomOut size={14} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setClauseFontSize((s) =>
                        Math.min(CLAUSE_FONT_MAX, +(s + CLAUSE_FONT_STEP).toFixed(3))
                      )
                    }
                    disabled={clauseFontSize >= CLAUSE_FONT_MAX}
                    aria-label="Zwiększ czcionkę klauzuli"
                  >
                    <ZoomIn size={14} />
                  </Button>
                </div>
              </div>
              <p
                className="font-bold text-slate-100 mb-3"
                style={{ fontSize: `${clauseFontSize}rem`, lineHeight: 1.5 }}
              >
                Użytkownik lokalu (najemca/właściciel) zobowiązuje się do
                usunięcia wszelkich usterek wykazanych w niniejszym protokole
                w terminie 14 dni od daty jego podpisania. Prace naprawcze
                muszą zostać zlecone osobie posiadającej ważne uprawnienia
                elektryczne, a ich wykonanie należy potwierdzić stosownym
                protokołem powykonawczym i zgłosić administratorowi obiektu.
                Ponadto, podpisujący potwierdza, że został poinformowany o
                konieczności zerowania/uziemienia gniazd wtykowych w
                pomieszczeniach mokrych (łazienka, kuchnia) oraz o
                zagrożeniach wynikających z niewłaściwej eksploatacji
                instalacji elektrycznej.
              </p>
              <p
                className="text-slate-300"
                style={{ fontSize: `${clauseFontSize}rem`, lineHeight: 1.5 }}
              >
                Składając poniższy podpis (w tym w formie elektronicznej na
                urządzeniu mobilnym), potwierdzam odbiór protokołu,
                zapoznanie się z jego treścią oraz uwagami. Administratorem
                danych osobowych jest HC INSTAL Henryk Cieśla. Dane
                przetwarzane są w celu wykonania usługi, w celach księgowych
                oraz archiwizacyjnych.
              </p>
            </Card>
            <SignaturePanel
              onSave={handleSaveSignature}
              initialSignature={inspection.ownerSignature}
              customTitle="Podpis Właściciela/Najemcy"
            />
          </>
        )}

        <div className="space-y-3 mt-4">
          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={() => {
              if (inspection) generateInspectionPdf(inspection)
              else
                alert(
                  'Brak danych do wygenerowania PDF. Spróbuj ponownie później.'
                )
            }}
            icon={<FileDown size={24} />}
          >
            Generuj PDF
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleBackToMeasurement}
            icon={<Pencil size={24} />}
            disabled={Boolean(
              inspection.ownerSignature &&
              inspection.ownerSignature.trim().length > 0
            )}
            subLabel="Po złożeniu podpisu nie można edytować pomiaru"
          >
            Edytuj pomiary
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAddNext}
            icon={<Plus size={24} />}
          >
            Dodaj Kolejny Protokół
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleReturnToBuilding}
            icon={<Home size={24} />}
          >
            Powrót do Listy Protokołów
          </Button>
        </div>
      </div>
    </div>
  )
}
