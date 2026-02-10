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

interface PdfGeneratorProps {
  inspection: Inspection
}
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: '/fonts/Roboto-Regular.ttf', // Ścieżka względem folderu public
      fontWeight: 'normal',
    },
    {
      src: '/fonts/Roboto-Bold.ttf', // Warto dodać pogrubienie dla nagłówków
      fontWeight: 'bold',
    },
  ],
})

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
  col1: { width: '8%', textAlign: 'center' },
  col2: { width: '18%', textAlign: 'center' },
  col3: { width: '16%', textAlign: 'center' },
  col4: { width: '26%', textAlign: 'center' },
  col5: { width: '20%', textAlign: 'center' },
  col6: { width: '12%', textAlign: 'center' },
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
})

export const PdfGenerator: React.FC<PdfGeneratorProps> = ({ inspection }) => {
  const technicianName = inspection.technicianName || 'Brak danych technika'
  const technicianSignature = inspection.technicianSignature || ''
  const ownerSignature = inspection.ownerSignature || ''

  const postInspectionRecommendations = inspection.measurements.flatMap((m) => {
    const measurementLabel = `Gniazdo nr ${m.pointNumber} (${m.room})`

    if (m.noGrounding === 'NO_PIN') {
      return `${measurementLabel}: Brak bolca w gnieździe. Należy wymienić na gniazdo z uziemieniem.`
    }

    if (m.noGrounding === 'NO_CONN') {
      return `${measurementLabel}: Brak połączenia z przewodem ochronnym. Należy poprawić połączenia.`
    }

    if (
      m.noGrounding === 'HIGH_Z' ||
      (m.zsValue !== null && m.zsValue > m.zsDop)
    ) {
      return `${measurementLabel}: Zbyt wysoka impedancja. Należy poprawić połączenie przewodu ochronnego.`
    }

    return []
  })

  const manualNotes = (inspection.notes ?? '').trim()
  const hasAuto = postInspectionRecommendations.length > 0
  const hasManual = manualNotes.length > 0
  const hasAnyRemarks = hasAuto || hasManual

  const hasProblems = inspection.measurements.some(
    (m) => m.result === 'NIE' || m.result === 'B.UZ'
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
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
            <Text style={styles.label}>Mieszkanie:</Text>
            <Text style={styles.value}>{inspection.apartmentNumber}</Text>
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
              {(() => {
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
        {/* Measurements Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Pkt</Text>
            <Text style={styles.col2}>Pomieszczenie</Text>
            <Text style={styles.col3}>Typ zabezpieczenia</Text>
            <Text style={styles.col4}>
              Wartość prądu In urządzenia wyłączającego [A]
            </Text>
            <Text style={styles.col5}>Zmierzona impedancja Zs[Ω]</Text>
            <Text style={styles.col6}>Ocena</Text>
          </View>

          {/* Table Rows */}
          {inspection.measurements.map((m, idx) => {
            let rowStyle = idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt

            if (m.result === 'TAK') rowStyle = styles.tableRowPass
            else if (m.result === 'NIE') rowStyle = styles.tableRowFail
            else if (m.result === 'B.UZ') rowStyle = styles.tableRowNoGround

            return (
              <View style={rowStyle} key={m.id}>
                <Text style={styles.col1}>{m.pointNumber}</Text>
                <Text style={styles.col2}>{m.room}</Text>
                <Text style={styles.col3}>{m.protectionType}</Text>
                <Text style={styles.col4}>{m.amperage}A</Text>
                <Text style={styles.col5}>{m.zsValue?.toFixed(2)}</Text>
                <Text style={styles.col6}>{m.result}</Text>
              </View>
            )
          })}
        </View>

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
              <Text style={[styles.colRating]}>Właściwy</Text>
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
              <Text style={[styles.colRating]}>JEST</Text>
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
          {technicianSignature && (
            <View>
              <Text style={{ marginBottom: 5 }}>Podpis technika:</Text>
              <Image src={technicianSignature} style={styles.signature} />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.conclusionsTitle}>
            Najemca (właściciel) poinformowany został o konieczności zerowania
            gniazdek w kuchni i łazience, oraz o zagrożeniach wynikających ze
            złej eksploatacji urządzeń elektrycznych. W przypadku
            nieprawidłowości otrzymał załącznik z uwagami do usunięcia usterek w
            instalacji odbiorcy.
          </Text>
        </View>
        <View style={styles.ownerSignature}>
          <Text>Podpis najemcy (właściciela):</Text>
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
