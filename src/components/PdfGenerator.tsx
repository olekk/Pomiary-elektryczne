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
  col1: { width: '5%', textAlign: 'center' },
  col2: { width: '10%', textAlign: 'center' },
  col3: { width: '12%', textAlign: 'center' },
  col4: { width: '18%', textAlign: 'center' },
  col5: { width: '18%', textAlign: 'center' },
  col6: { width: '25%', textAlign: 'center' },
  col7: { width: '12%', textAlign: 'center' },
  footer: {
    marginTop: 30,
    paddingTop: 10,
    borderTop: '1pt solid #000',
  },
  signature: {
    marginTop: 20,
    width: 200,
    height: 80,
  },
  summaryBox: {
    marginTop: 20,
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
})

export const PdfGenerator: React.FC<PdfGeneratorProps> = ({ inspection }) => {
  const passedCount = inspection.measurements.filter(
    (m) => m.result === 'TAK'
  ).length
  const failedCount = inspection.measurements.filter(
    (m) => m.result === 'NIE'
  ).length
  const noGroundingCount = inspection.measurements.filter(
    (m) => m.result === 'B.UZ'
  ).length

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
            <Text style={styles.col6}>Uwagi</Text>
            <Text style={styles.col7}>Ocena</Text>
          </View>

          {/* Table Rows */}
          {inspection.measurements.map((m, idx) => {
            let rowStyle = idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt

            if (m.result === 'TAK') rowStyle = styles.tableRowPass
            else if (m.result === 'NIE') rowStyle = styles.tableRowFail
            else if (m.result === 'B.UZ') rowStyle = styles.tableRowNoGround

            const uwagi = m.noGrounding
              ? m.noGrounding === 'NO_PIN'
                ? 'Brak bolca'
                : m.noGrounding === 'NO_CONN'
                  ? 'Brak połączenia'
                  : m.noGrounding === 'HIGH_Z'
                    ? 'Zbyt wysoka impedancja'
                    : 'B.UZ'
              : '-'

            return (
              <View style={rowStyle} key={m.id}>
                <Text style={styles.col1}>{m.pointNumber}</Text>
                <Text style={styles.col2}>{m.room}</Text>
                <Text style={styles.col3}>{m.protectionType}</Text>
                <Text style={styles.col4}>{m.amperage}A</Text>
                <Text style={styles.col5}>{m.zsValue?.toFixed(2)}</Text>
                <Text style={styles.col6}>{uwagi}</Text>
                <Text style={styles.col7}>{m.result}</Text>
              </View>
            )
          })}
        </View>

        {/* Summary Box */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Podsumowanie:</Text>
          <Text style={styles.summaryText}>
            Punkty pozytywne (TAK): {passedCount}
          </Text>
          <Text style={styles.summaryText}>
            Punkty negatywne (NIE): {failedCount}
          </Text>
          <Text style={styles.summaryText}>
            Brak uziemienia (B.UZ): {noGroundingCount}
          </Text>
          <Text style={styles.summaryText}>
            Łącznie punktów: {inspection.measurements.length}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ marginBottom: 10 }}>
            Pomiar wykonany zgodnie z normą PN-HD 60364-6:2008
          </Text>
          {inspection.signature && (
            <View>
              <Text style={{ marginBottom: 5 }}>Podpis technika:</Text>
              <Image src={inspection.signature} style={styles.signature} />
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}
