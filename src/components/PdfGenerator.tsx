import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer'
import type { Inspection } from '../types'
import { logger } from '../utils/logger'

interface PdfGeneratorProps {
  inspection: Inspection
}

// Rejestracja fontów Roboto dla offline PDF
// Fonty są precache'owane przez Service Worker dla trybu offline
try {
  Font.register({
    family: 'Roboto',
    fonts: [
      {
        src: '/fonts/Roboto-Regular.ttf', // Precache'owane przez SW
        fontWeight: 'normal',
      },
      {
        src: '/fonts/Roboto-Bold.ttf', // Precache'owane przez SW
        fontWeight: 'bold',
      },
    ],
  })
} catch (error) {
  logger.warn('Failed to register Roboto fonts, using default font:', error)
  // Fallback: @react-pdf/renderer użyje domyślnego fontu systemowego
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Roboto',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2pt solid #000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 3,
  },
  infoSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    fontWeight: 'bold',
    width: 120,
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    color: '#fff',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #ddd',
    padding: 5,
    fontSize: 9,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1pt solid #ddd',
    padding: 5,
    backgroundColor: '#f9f9f9',
    fontSize: 9,
  },
  tableRowPass: {
    flexDirection: 'row',
    borderBottom: '1pt solid #ddd',
    padding: 5,
    backgroundColor: '#d4edda',
    fontSize: 9,
  },
  tableRowFail: {
    flexDirection: 'row',
    borderBottom: '1pt solid #ddd',
    padding: 5,
    backgroundColor: '#f8d7da',
    fontSize: 9,
  },
  tableRowNoGround: {
    flexDirection: 'row',
    borderBottom: '1pt solid #ddd',
    padding: 5,
    backgroundColor: '#fff3cd',
    fontSize: 9,
  },
  col1: { width: '6%', textAlign: 'center' },
  colSocket: { width: '13%', textAlign: 'center' },
  col2: { width: '13%', textAlign: 'center' },
  col3: { width: '12%', textAlign: 'center' },
  col4: { width: '18%', textAlign: 'center' },
  col5: { width: '14%', textAlign: 'center' },
  col6: { width: '14%', textAlign: 'center' },
  col7: { width: '10%', textAlign: 'center' },
  footer: {
    marginTop: 30,
    paddingTop: 10,
  },
  signature: {
    marginTop: 20,
    width: 200,
    height: 80,
  },
  summaryBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 5,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 10,
    marginBottom: 2,
  },
  recommendationsBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fff7e6',
    borderRadius: 5,
  },
  recommendationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  recommendationsText: {
    fontSize: 10,
    marginBottom: 3,
  },
  manualNotesBlock: {
    marginTop: 8,
    fontSize: 10,
  },
  inspectionContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 10,
    color: '#444',
  },
  paragraph: {
    fontSize: 10,
    textAlign: 'justify',
    marginBottom: 10,
    lineHeight: 1.4,
    fontFamily: 'Roboto', // Upewnij się, że masz czcionkę obsługującą polskie znaki
  },

  // Szerokości kolumn
  colLp: { width: '10%', textAlign: 'center' },
  colSubject: { width: '70%' },
  colRating: { width: '20%', textAlign: 'center', fontWeight: 'bold' },
  conclusionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  conclusionSuitable: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  conclusionNotSuitable: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  ownerSignature: {
    marginTop: 20,
    textAlign: 'right',
    alignItems: 'flex-end',
  },
  companyDetails: {
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 10,
    color: '#555',
  },
  directionImage: {
    width: 30,
  },
})

export const PdfGenerator: React.FC<PdfGeneratorProps> = ({ inspection }) => {
  const technicianName = inspection.technicianName || 'Brak danych technika'
  const technicianLicenseNumber = inspection.technicianLicenseNumber || ''
  const technicianSignature = inspection.technicianSignature || ''
  const ownerSignature = inspection.ownerSignature || ''

  const postInspectionRecommendations = inspection.measurements.flatMap((m) => {
    const measurementLabel = `Gniazdo nr ${m.pointNumber} (${m.room})`

    let recommendation = null

    if (m.noGrounding === 'NO_PIN') {
      recommendation = `${measurementLabel}: Brak bolca w gnieździe. Należy wymienić na gniazdo z uziemieniem.`
    }

    if (m.noGrounding === 'NO_CONN') {
      recommendation = `${measurementLabel}: Brak połączenia z przewodem ochronnym. Należy poprawić połączenia.`
    }

    if (
      m.noGrounding === 'HIGH_Z' ||
      (m.zsValue !== null && m.zsValue > m.zsDop)
    ) {
      recommendation = `${measurementLabel}: Zbyt wysoka impedancja. Należy poprawić połączenie przewodu ochronnego.`
    }

    if (m.room === 'Łazienka' && m.socketType === 'Gniazdo 230V') {
      recommendation = recommendation
        ? `${recommendation} \n ${measurementLabel}: W łazience powinno być stosowane gniazdo z klapką IP44.`
        : `${measurementLabel}: W łazience powinno być stosowane gniazdo z klapką IP44.`
    }

    return recommendation || []
  })

  const manualNotes = (inspection.notes ?? '').trim()
  const hasAuto = postInspectionRecommendations.length > 0
  const hasManual = manualNotes.length > 0
  const hasAnyRemarks = hasAuto || hasManual

  const hasProblems = inspection.measurements.some(
    (m) => m.result === 'NIE'
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={`${window.location.origin}/logo.png`} style={{ width: '50%', marginBottom: 10 }} />
          <Text style={styles.title}>PROTOKÓŁ POMIARÓW OCHRONNYCH</Text>
          <Text style={styles.subtitle}>
            Nr protokołu: {inspection.protocolNumber}
          </Text>
          <Text style={{ fontSize: 11, marginTop: 5, color: '#555' }}>
            Wykonawca: HC INSTAL Henryk Cieśla
          </Text>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Adres:</Text>
            <Text style={styles.value}>{inspection.address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>
              {inspection.unitType === 'lokal'
                ? 'Lokal:'
                : inspection.unitType === 'klatka'
                  ? 'Klatka:'
                  : 'Mieszkanie:'}
            </Text>
            <Text style={styles.value}>{inspection.apartmentNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Najemca / Właściciel:</Text>
            <Text style={styles.value}>{inspection.ownerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Data pomiaru:</Text>
            <Text style={styles.value}>
              {new Date(inspection.date).toLocaleDateString('pl-PL')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Data kolejnego badania:</Text>
            <Text style={styles.value}>
              {hasProblems
                ? '-'
                : (() => {
                  const nextDate = new Date(inspection.date)
                  nextDate.setFullYear(nextDate.getFullYear() + 5)
                  return nextDate.toLocaleDateString('pl-PL')
                })()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Przyczyna pomiaru:</Text>
            <Text style={styles.value}>badanie okresowe</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Tabela wyników pomiarów</Text>
            <Text style={styles.value}>
              impedancji pętli zwarcia obwodu elektrycznego
            </Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Badanie ochrony przed porażeniem przez samoczynne wyłącznie
        </Text>

        {inspection.unitType === 'klatka' && inspection.klatkaData ? (() => {
          const d = inspection.klatkaData
          const pdfDate = new Date(inspection.date)
          const month = String(pdfDate.getMonth() + 1).padStart(2, '0')
          const year = pdfDate.getFullYear()
          const day = String(pdfDate.getDate()).padStart(2, '0')

          const kRow = (num: string, label: string, value: string, indent: number = 0) => (
            <View style={{ flexDirection: 'row', borderBottom: '1pt solid #999', borderLeft: '1pt solid #999', borderRight: '1pt solid #999', paddingVertical: 4, paddingHorizontal: 6, paddingLeft: 6 + indent * 18 }} key={num}>
              <Text style={{ width: '8%', fontWeight: 'bold', fontSize: 8 }}>{num}</Text>
              <Text style={{ width: '62%', fontSize: 8 }}>{label}</Text>
              <Text style={{ width: '30%', fontSize: 8, fontWeight: 'bold', textAlign: 'right' }}>{value}</Text>
            </View>
          )

          return (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 11, textAlign: 'center', marginBottom: 6, fontWeight: 'bold' }}>
                Protokół (5-letni) zbiorczy z dnia {day}/{month} {year}
              </Text>
              <Text style={{ fontSize: 9, textAlign: 'center', marginBottom: 4 }}>
                Oględziny instalacji elektrycznej i urządzeń w części wspólnej budynku,
              </Text>
              <Text style={{ fontSize: 9, textAlign: 'center', marginBottom: 10 }}>
                ocena stanu technicznego instalacji elektrycznej.
              </Text>
              <Text style={{ fontSize: 9, textAlign: 'center', marginBottom: 14 }}>
                przy ulicy {inspection.address}
              </Text>

              {/* Header */}
              <View style={{ flexDirection: 'row', backgroundColor: '#333', color: '#fff', padding: 5, fontWeight: 'bold', fontSize: 8, borderTop: '1pt solid #999', borderLeft: '1pt solid #999', borderRight: '1pt solid #999' }}>
                <Text style={{ width: '8%', color: '#fff', fontWeight: 'bold', fontSize: 8 }}>Lp.</Text>
                <Text style={{ width: '62%', color: '#fff', fontWeight: 'bold', fontSize: 8 }}>Przedmiot oględzin</Text>
                <Text style={{ width: '30%', color: '#fff', fontWeight: 'bold', fontSize: 8, textAlign: 'right' }}>Wynik / Dane</Text>
              </View>

              {kRow('1.', 'Przyłącze', d.przylacze === 'napowietrzne' ? 'NAPOWIETRZNE' : 'KABELOWE')}
              {d.przylacze === 'kabelowe' && kRow('1.1', 'Typ kabla / przekrój', `${d.typKabla || '—'} / ${d.przekrojPrzylacza || '—'} mm²`, 1)}
              {kRow('2.', 'Wyłącznik pożarowy prądu (PWP)', d.pwpStatus === 'jest' ? 'JEST' : 'BRAK')}
              {d.pwpStatus === 'jest' && kRow('2.1', 'Lokalizacja', d.pwpLokalizacja || '—', 1)}
              {kRow('3.', `Zabezpieczenie główne budynku, TYP ${d.zabezpieczenieTyp || 'Bi-WTs'}`, `${d.zabezpieczenieWartosc || '—'} A`)}
              {kRow('4.', 'GLZ główne zasilanie budynku', `${d.glzTyp || '—'} / ${d.glzPrzekroj || '—'} mm²`)}
              {kRow('4.1', 'WLZ (Piony)', `${d.wlzTyp || '—'} / ${d.wlzPrzekroj || '—'} mm²`, 1)}
              {kRow('4.2', 'Stan izolacji', (d.stanIzolacji || 'dobry') === 'dobry' ? 'DOBRY' : 'ZŁY', 1)}
              {kRow('4.3', 'Przewód ochronny PE', (d.przewodPE || 'jest') === 'jest' ? 'JEST' : 'BRAK', 1)}
              {(d.przewodPE ?? 'jest') === 'jest' && kRow('4.3.1', 'Typ / przekrój', `${d.przewodPETyp || '—'} / ${d.przewodPEPrzekroj || '—'} mm²`, 2)}
              {kRow('5.', 'Rozdzielnie / Tablice', '')}
              {kRow('5.1', 'Rodzaj obudowy', (d.rodzajObudowy || 'metalowa') === 'metalowa' ? 'METALOWA' : 'DREWNIANA', 1)}
              {kRow('5.2', 'Uziemione drzwiczki', (d.uziemioneDrzwiczki || 'tak') === 'tak' ? 'TAK' : 'NIE', 1)}
              {kRow('6.', 'Tablice licznikowe', (d.tabliceLokalizacja || 'klatka') === 'klatka' ? 'klatka schodowa' : 'w mieszkaniach')}
              {kRow('6.1', 'Ilość lokali mieszkalnych', d.iloscLokali || '—', 1)}
              {kRow('7.', 'Ochronnik przepięć', (d.ochronnikTyp || 'brak') === 'jest' ? 'JEST' : 'BRAK')}
              {kRow('8.', 'Urządzenie p/kradzieży prądu', (d.urzadzeniePKradziezy || 'brak') === 'jest' ? 'JEST' : 'BRAK')}
              {kRow('9.', 'Tablica administracyjna, lokalizacja', d.tablicaAdmLokalizacja || '—')}
              {kRow('9.1', 'Wyłączniki instalacyjne w rozdzielni ADM', (d.wylaczniki || 'nadmiarowo-pradowy') === 'topikowe' ? 'topikowe' : 'wyłącznik nadmiarowo-prądowy', 1)}
              {kRow('10.', 'Oświetlenie', '')}
              {kRow('10.1', `Klatki schodowej, napięcie ${d.klatkaVoltage || '230V'}, przewód`, d.klatkaPrzewod || '—', 1)}
              {kRow('10.1.1', 'Sterowanie', (d.klatkaAutomat || 'automat-schodowy') === 'automat-schodowy' ? 'automat schodowy' : 'lampy na czujnik ruchu', 2)}
              {kRow('10.2', 'Strychu', (d.strychMontaz || 'natynkowo') === 'natynkowo' ? 'natynkowo' : 'podtynkowo', 1)}
              {kRow('10.3', 'Piwnicy', (d.piwnicaMontaz || 'natynkowo') === 'natynkowo' ? 'natynkowo' : 'podtynkowo', 1)}
              {kRow('11.', 'Badania i pomiary instalacji', '')}
              {kRow('11.1', 'Pomiar rezystancji izolacji WLZ', (d.rezystancjaWLZ || 'w-normie') === 'w-normie' ? 'W NORMIE' : 'NIEZGODNE Z NORMĄ', 1)}
              {kRow('11.2', 'Pomiar napięć w przyłączu', `L1: ${d.napiecieL1 || '—'}V  L2: ${d.napiecieL2 || '—'}V  L3: ${d.napiecieL3 || '—'}V`, 1)}
              {kRow('12.', 'Instalacja piorunochronna', (d.piorunochron || 'brak') === 'jest' ? 'JEST' : 'BRAK')}
              {d.piorunochron === 'jest' && (
                <>
                  {kRow('12.1', 'Połączenia, osprzęt, zabezpieczenia od korozji oraz uziemienia zwodu', 'są sprawne', 1)}
                  {kRow('12.1.1', 'Stan', (d.piorunochronStan || 'dobry') === 'dobry' ? 'DOBRY' : 'ZŁY', 2)}
                  {kRow('12.2', 'Uwagi', d.piorunochronUwagi || '—', 1)}
                  {kRow('12.3', 'Wynik pomiarów', (d.piorunochronWynik || 'pozytywny') === 'pozytywny' ? 'POZYTYWNY' : 'NEGATYWNY', 1)}
                </>
              )}
              {kRow('13.', 'Ocena: instalacja elektryczna', (d.ocenaInstalacji || 'nadaje') === 'nadaje' ? 'NADAJE SIĘ do dalszej eksploatacji' : 'NIE NADAJE SIĘ do dalszej eksploatacji')}
              {kRow('14.', 'Termin usunięcia usterek', d.terminUsterek || '—')}
            </View>
          )
        })() : (
          <>
            {/* Measurements Table */}
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.col1}>Lp.</Text>
                <Text style={styles.col2}>Pomieszczenie</Text>
                <Text style={styles.colSocket}>{"Punkt\npomiarowy"}</Text>
                <Text style={styles.col3}>Typ zabezpieczenia</Text>
                <Text style={styles.col4}>
                  Wartość prądu In urządzenia wyłączającego [A]
                </Text>
                <Text style={styles.col5}>{"Dopuszczalna\nimpedancja\nZs dop[Ω]"}</Text>
                <Text style={styles.col6}>{"Zmierzona\nimpedancja\nZs[Ω]"}</Text>
                <Text style={styles.col7}>Ocena</Text>
              </View>

              {/* Table Rows */}
              {inspection.measurements.map((m, idx) => {
                let rowStyle = idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt

                if (m.result === 'TAK') rowStyle = styles.tableRowPass
                else if (m.result === 'NIE') rowStyle = styles.tableRowFail

                return (
                  <View style={rowStyle} key={m.id}>
                    <Text style={styles.col1}>{m.pointNumber}</Text>
                    <Text style={styles.col2}>{m.room}</Text>
                    <Text style={styles.colSocket}>{m.socketType || 'Gniazdo 230V'}</Text>
                    <Text style={styles.col3}>{m.protectionType}</Text>
                    <Text style={styles.col4}>{m.amperage}A</Text>
                    <Text style={styles.col5}>{m.zsDop.toFixed(2)}</Text>
                    <Text style={styles.col6}>
                      {m.zsValue !== null ? m.zsValue.toFixed(2) : '-'}
                    </Text>
                    <Text style={styles.col7}>{m.result}</Text>
                  </View>
                )
              })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text>Pomiary gniazd przeprowadzone w kolejności od lewej do prawej. &nbsp; &nbsp;</Text>
              <Image src={`${window.location.origin}/od-lewej-do-prawej.png`} style={styles.directionImage} />
            </View>
          </>
        )}
        {/* --- SEKCJA OGLĘDZINY --- */}
        <View style={styles.inspectionContainer}>
          <Text style={styles.sectionTitle}>
            OGLĘDZINY INSTALACJI ELEKTRYCZNEJ
          </Text>
          <Text style={styles.sectionSubtitle}>wg normy PN-IEC 60364-6-61</Text>

          <Text style={styles.paragraph}>
            Oględziny badanej instalacji elektrycznej przeprowadzono przed
            przystąpieniem do wykonywania prób i pomiarów oraz podczas
            wykonywania prób i pomiarów.
          </Text>

          {/* Tabela Oględzin */}
          <View>
            {/* Nagłówek Tabeli */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.colLp]}>Lp.</Text>
              <Text style={[styles.colSubject]}>Przedmiot oględzin</Text>
              <Text style={[styles.colRating]}>Ocena</Text>
            </View>

            {/* Wiersz 1 */}
            <View style={styles.tableRow}>
              <Text style={[styles.colLp]}>1</Text>
              <Text style={[styles.colSubject]}>
                Sposób ochrony przed porażeniem prądem elektrycznym
              </Text>
              <Text style={[styles.colRating]}>
                {hasProblems ? 'NIE WŁAŚCIWY' : 'WŁAŚCIWY'}
              </Text>
            </View>

            {/* Wiersz 2 */}
            <View style={styles.tableRow}>
              <Text style={[styles.colLp]}>2</Text>
              <Text style={[styles.colSubject]}>
                Oznaczenia przewodów neutralnych i ochronnych
              </Text>
              <Text style={[styles.colRating]}>JEST</Text>
            </View>

            {/* Wiersz 3 */}
            <View style={styles.tableRow}>
              <Text style={[styles.colLp]}>3</Text>
              <Text style={[styles.colSubject]}>
                Poprawność połączeń przewodów
              </Text>
              <Text style={[styles.colRating]}>
                {hasProblems ? 'NIE POPRAWNE' : 'JEST'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.recommendationsBox}>
          <Text style={styles.recommendationsTitle}>
            UWAGI I ZALECENIA POKONTROLNE
          </Text>
          {hasAnyRemarks ? (
            <>
              {hasAuto &&
                postInspectionRecommendations.map((recommendation, idx) => (
                  <Text key={`auto-${idx}`} style={styles.recommendationsText}>
                    - {recommendation}
                  </Text>
                ))}
              {hasManual && (
                <Text
                  style={
                    hasAuto
                      ? [styles.manualNotesBlock, { marginTop: 8 }]
                      : styles.manualNotesBlock
                  }
                >
                  {manualNotes}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.recommendationsText}>Brak uwag.</Text>
          )}
        </View>
        <View style={styles.inspectionContainer}>
          <Text style={styles.sectionTitle}>PODSUMOWANIE</Text>

          <Text style={styles.paragraph}>
            Miernik: Typ: MPI 540 | Producent: Sonel | Nr seryjny: KO4539
          </Text>
        </View>

        {/* Wnioski z pomiarów */}
        <View>
          <Text style={styles.conclusionsTitle}>Wnioski z pomiarów:</Text>
          <Text
            style={
              hasProblems
                ? styles.conclusionNotSuitable
                : styles.conclusionSuitable
            }
          >
            {hasProblems
              ? 'INSTALACJA NIE NADAJE SIĘ DO EKSPLOATACJI'
              : 'INSTALACJA NADAJE SIĘ DO EKSPLOATACJI'}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>Pomiary wykonał: {technicianName}</Text>
          <Text>Nr uprawnień: {technicianLicenseNumber || '-'}</Text>
          {technicianSignature && (
            <View>
              <Text style={{ marginBottom: 5 }}>Podpis pomiarowca:</Text>
              <Image src={technicianSignature} style={styles.signature} />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.conclusionsTitle}>
            Użytkownik lokalu (najemca/właściciel) zobowiązuje się do usunięcia wszelkich usterek wykazanych w niniejszym protokole w terminie 14 dni od daty jego podpisania. Prace naprawcze muszą zostać zlecone osobie posiadającej ważne uprawnienia elektryczne, a ich wykonanie należy potwierdzić stosownym protokołem powykonawczym i zgłosić administratorowi obiektu. Ponadto, podpisujący potwierdza, że został poinformowany o konieczności zerowania/uziemienia gniazd wtykowych w pomieszczeniach mokrych (łazienka, kuchnia) oraz o zagrożeniach wynikających z niewłaściwej eksploatacji instalacji elektrycznej.
          </Text>
          <Text>
            Składając poniższy podpis (w tym w formie elektronicznej na urządzeniu mobilnym), potwierdzam odbiór protokołu, zapoznanie się z jego treścią oraz uwagami. Administratorem danych osobowych jest HC INSTAL Henryk Cieśla. Dane przetwarzane są w celu wykonania usługi, w celach księgowych oraz archiwizacyjnych.
          </Text>
        </View>
        <View style={styles.ownerSignature}>
          <Text>Podpis najemcy (właściciela):</Text>
          <Text>{inspection.ownerName}</Text>
          {ownerSignature ? (
            <Image src={ownerSignature} style={styles.signature} />
          ) : (
            <Text style={{ marginTop: 8, color: '#777' }}>Brak podpisu</Text>
          )}
        </View>
        <View style={styles.companyDetails}>
          <Text>
            HC INSTAL Henryk Cieśla | 44-153 Trachy | ul. Zamojska 2 | NIP
            631-166-30-65 | REGON 278080785
          </Text>
          <Text>tel: 601 542 869</Text>
          <Text>e-mail: kontakt@hcinstal.pl</Text>
        </View>
      </Page>
    </Document>
  )
}
