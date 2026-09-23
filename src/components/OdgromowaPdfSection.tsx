import React from 'react'
import { Text, View, StyleSheet } from '@react-pdf/renderer'
import type { OdgromowaData, ProtocolVerdict } from '../types'
import { R_UZIEMIENIA_DOP } from '../types'
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
  CIAGLOSC_OPTIONS,
  STAN_SPD_OPTIONS,
  ZALECENIA_OPTIONS,
  labelOf,
} from '../constants/odgromowa'
import { MEASURING_INSTRUMENT } from '../constants/instrument'
import { evaluateZlacze, verdictLabel } from '../utils'

/**
 * Sekcje 2–9 protokołu przeglądu instalacji odgromowej.
 * Nagłówek, uwagi, wniosek końcowy i podpisy są wspólne — w PdfGenerator.
 */

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#e5e5e5',
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 8,
    border: '1pt solid #999',
  },
  row: {
    flexDirection: 'row',
    borderBottom: '1pt solid #999',
    borderLeft: '1pt solid #999',
    borderRight: '1pt solid #999',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  rowNum: { width: '8%', fontWeight: 'bold', fontSize: 8 },
  rowLabel: { width: '47%', fontSize: 8 },
  rowValue: {
    width: '45%',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    color: '#fff',
    padding: 4,
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #ddd',
    padding: 4,
    fontSize: 8,
  },
  pass: { backgroundColor: '#d4edda' },
  fail: { backgroundColor: '#f8d7da' },
  col: { width: '20%', textAlign: 'center' },
  sketch: {
    height: 140,
    border: '1pt solid #999',
    borderTop: 'none',
    justifyContent: 'flex-end',
    padding: 4,
  },
  sketchHint: { fontSize: 7, color: '#999' },
})

const Row: React.FC<{ num: string; label: string; value: string }> = ({
  num,
  label,
  value,
}) => (
  <View style={styles.row} wrap={false}>
    <Text style={styles.rowNum}>{num}</Text>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
)

const SectionTitle: React.FC<{ children: string }> = ({ children }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
)

const formatOhm = (value: number | null) =>
  value === null ? '-' : value.toFixed(2)

export const OdgromowaPdfSection: React.FC<{
  data: OdgromowaData
  verdict: ProtocolVerdict
  nextInspectionDate: Date | null
}> = ({ data: d, verdict, nextInspectionDate }) => {
  const przewodyUziomowe =
    d.przewodyUziomowe === 'inne' && d.przewodyUziomoweInne
      ? d.przewodyUziomoweInne
      : labelOf(PRZEWODY_UZIOMOWE_OPTIONS, d.przewodyUziomowe)
  const zalecenia = d.zalecenia.map((z) => labelOf(ZALECENIA_OPTIONS, z))

  return (
    <View style={{ marginTop: 6 }}>
      <SectionTitle>2. Opis instalacji</SectionTitle>
      <Row
        num="2.1"
        label="Rodzaj uziomu"
        value={labelOf(RODZAJ_UZIOMU_OPTIONS, d.rodzajUziomu)}
      />
      <Row num="2.2" label="Zwody" value={labelOf(ZWODY_OPTIONS, d.zwody)} />
      <Row
        num="2.3"
        label="Materiał zwodów i przewodów odprowadzających"
        value={labelOf(MATERIAL_ZWODOW_OPTIONS, d.materialZwodow)}
      />
      <Row num="2.4" label="Przewody uziomowe" value={przewodyUziomowe} />

      <SectionTitle>3. Warunki pomiaru</SectionTitle>
      <Row
        num="3.1"
        label="Rodzaj gruntu"
        value={labelOf(RODZAJ_GRUNTU_OPTIONS, d.rodzajGruntu)}
      />
      <Row
        num="3.2"
        label="Stan pogody"
        value={labelOf(STAN_POGODY_OPTIONS, d.stanPogody)}
      />
      <Row
        num="3.3"
        label="Stan gruntu"
        value={labelOf(STAN_GRUNTU_OPTIONS, d.stanGruntu)}
      />

      <SectionTitle>4. Przyrząd pomiarowy</SectionTitle>
      <Row
        num="4.1"
        label="Miernik"
        value={`${MEASURING_INSTRUMENT.producent} ${MEASURING_INSTRUMENT.typ}, nr ${MEASURING_INSTRUMENT.nrSeryjny}`}
      />

      <SectionTitle>5. Oględziny</SectionTitle>
      <Row
        num="5.1"
        label="Zwody i mocowania"
        value={labelOf(STAN_PRZEWODOW_OPTIONS, d.zwodyStan)}
      />
      <Row
        num="5.2"
        label="Przewody odprowadzające"
        value={labelOf(STAN_PRZEWODOW_OPTIONS, d.przewodyOdprowadzajaceStan)}
      />
      <Row
        num="5.3"
        label="Złącza kontrolne"
        value={labelOf(STAN_ZLACZY_OPTIONS, d.zlaczaStan)}
      />

      <SectionTitle>6. Pomiary</SectionTitle>
      <View style={styles.tableHeader} wrap={false}>
        <Text style={styles.col}>Nr złącza</Text>
        <Text style={styles.col}>Ciągłość</Text>
        <Text style={styles.col}>R uziemienia [Ω]</Text>
        <Text style={styles.col}>R dopuszczalne [Ω]</Text>
        <Text style={styles.col}>Ocena</Text>
      </View>
      {d.zlacza.map((z) => {
        const ocena = evaluateZlacze(z)
        return (
          <View
            key={z.nr}
            style={[
              styles.tableRow,
              ocena === 'TAK' ? styles.pass : styles.fail,
            ]}
            wrap={false}
          >
            <Text style={styles.col}>{z.nr}</Text>
            <Text style={styles.col}>
              {labelOf(CIAGLOSC_OPTIONS, z.ciaglosc)}
            </Text>
            <Text style={styles.col}>{formatOhm(z.rUziemienia)}</Text>
            <Text style={styles.col}>{formatOhm(R_UZIEMIENIA_DOP)}</Text>
            <Text style={styles.col}>{ocena}</Text>
          </View>
        )
      })}

      <SectionTitle>7. Ograniczniki przepięć (SPD)</SectionTitle>
      <Row num="7.1" label="Stan" value={labelOf(STAN_SPD_OPTIONS, d.spd)} />

      <View wrap={false}>
        <SectionTitle>8. Szkic</SectionTitle>
        <View style={styles.sketch}>
          <Text style={styles.sketchHint}>
            Szkic budynku z rozmieszczeniem złącz kontrolnych
          </Text>
        </View>
      </View>

      <View wrap={false}>
        <SectionTitle>9. Wnioski</SectionTitle>
        <Row num="9.1" label="Wynik" value={verdictLabel(verdict)} />
        <Row
          num="9.2"
          label="Zalecenia"
          value={zalecenia.length > 0 ? zalecenia.join(', ') : '—'}
        />
        <Row
          num="9.3"
          label="Następne badanie"
          value={
            nextInspectionDate
              ? nextInspectionDate.toLocaleDateString('pl-PL')
              : '-'
          }
        />
      </View>
    </View>
  )
}
