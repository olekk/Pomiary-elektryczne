import React from 'react'
import { Text, View, StyleSheet } from '@react-pdf/renderer'
import type { IzolacjaData } from '../types'
import { R_IZOLACJI_WYMAGANA } from '../types'
import { labelOf } from '../constants/odgromowa'
import {
  MATERIAL_PRZEWODOW_OPTIONS,
  NAPIECIE_PROBIERCZE_OPTIONS,
  OCENA_IZOLACJI_OPTIONS,
  UKLAD_SIECI_OPTIONS,
} from '../constants/izolacja'
import { formatMegaohm, obwodLabel } from '../utils'

/**
 * Sekcja „Rezystancja izolacji” protokołu mieszkaniowego — drukowana po
 * tabeli impedancji pętli zwarcia. Kolory wierszy jak w tabeli Zs
 * (PdfGenerator: tableRowPass / tableRowFail).
 */

const row = {
  flexDirection: 'row' as const,
  borderBottom: '1pt solid #ddd',
  padding: 5,
  fontSize: 9,
}

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  info: { fontSize: 9, marginBottom: 6 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    color: '#fff',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: row,
  tableRowPass: { ...row, backgroundColor: '#d4edda' },
  tableRowFail: { ...row, backgroundColor: '#f8d7da' },
  colLp: { width: '8%', textAlign: 'center' },
  colObwod: { width: '47%' },
  colR: { width: '20%', textAlign: 'center' },
  colOcena: { width: '25%', textAlign: 'center' },
})

export const IzolacjaPdfSection: React.FC<{ data: IzolacjaData }> = ({
  data,
}) => (
  <View style={styles.container} wrap={false}>
    <Text style={styles.title}>Rezystancja izolacji</Text>
    <Text style={styles.info}>
      Układ sieci: {labelOf(UKLAD_SIECI_OPTIONS, data.ukladSieci ?? undefined)}{' '}
      · Przewody:{' '}
      {labelOf(MATERIAL_PRZEWODOW_OPTIONS, data.materialPrzewodow ?? undefined)}{' '}
      · Napięcie probiercze:{' '}
      {labelOf(NAPIECIE_PROBIERCZE_OPTIONS, data.napiecieProbiercze)}
    </Text>
    <View style={styles.tableHeader}>
      <Text style={styles.colLp}>Lp.</Text>
      <Text style={styles.colObwod}>Obwód</Text>
      <Text style={styles.colR}>R wymagana [MΩ]</Text>
      <Text style={styles.colOcena}>Ocena</Text>
    </View>
    {data.obwody.map((o, idx) => (
      <View
        key={o.id}
        style={
          o.ocena === 'ponizej-normy'
            ? styles.tableRowFail
            : o.ocena === 'w-normie'
              ? styles.tableRowPass
              : styles.tableRow
        }
      >
        <Text style={styles.colLp}>{idx + 1}</Text>
        <Text style={styles.colObwod}>{obwodLabel(o)}</Text>
        <Text style={styles.colR}>{formatMegaohm(R_IZOLACJI_WYMAGANA)}</Text>
        <Text style={styles.colOcena}>
          {labelOf(OCENA_IZOLACJI_OPTIONS, o.ocena ?? undefined)}
        </Text>
      </View>
    ))}
  </View>
)
