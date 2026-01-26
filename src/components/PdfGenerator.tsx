import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import type { Inspection } from "../types";

interface PdfGeneratorProps {
  inspection: Inspection;
}
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "/fonts/Roboto-Regular.ttf", // Ścieżka względem folderu public
      fontWeight: "normal",
    },
    {
      src: "/fonts/Roboto-Bold.ttf", // Warto dodać pogrubienie dla nagłówków
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Roboto",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2pt solid #000",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 3,
  },
  infoSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    fontWeight: "bold",
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
    flexDirection: "row",
    backgroundColor: "#333",
    color: "#fff",
    padding: 5,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #ddd",
    padding: 5,
    fontSize: 9,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottom: "1pt solid #ddd",
    padding: 5,
    backgroundColor: "#f9f9f9",
    fontSize: 9,
  },
  tableRowPass: {
    flexDirection: "row",
    borderBottom: "1pt solid #ddd",
    padding: 5,
    backgroundColor: "#d4edda",
    fontSize: 9,
  },
  tableRowFail: {
    flexDirection: "row",
    borderBottom: "1pt solid #ddd",
    padding: 5,
    backgroundColor: "#f8d7da",
    fontSize: 9,
  },
  tableRowNoGround: {
    flexDirection: "row",
    borderBottom: "1pt solid #ddd",
    padding: 5,
    backgroundColor: "#fff3cd",
    fontSize: 9,
  },
  col1: { width: "8%", textAlign: "center" },
  col2: { width: "12%", textAlign: "center" },
  col3: { width: "12%", textAlign: "center" },
  col4: { width: "10%", textAlign: "center" },
  col5: { width: "18%", textAlign: "center" },
  col6: { width: "18%", textAlign: "center" },
  col7: { width: "12%", textAlign: "center" },
  col8: { width: "10%", textAlign: "center" },
  footer: {
    marginTop: 30,
    paddingTop: 10,
    borderTop: "1pt solid #000",
  },
  signature: {
    marginTop: 20,
    width: 200,
    height: 80,
  },
  summaryBox: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#e3f2fd",
    borderRadius: 5,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 10,
    marginBottom: 2,
  },
});

export const PdfGenerator: React.FC<PdfGeneratorProps> = ({ inspection }) => {
  const passedCount = inspection.measurements.filter(
    (m) => m.result === "TAK",
  ).length;
  const failedCount = inspection.measurements.filter(
    (m) => m.result === "NIE",
  ).length;
  const noGroundingCount = inspection.measurements.filter(
    (m) => m.result === "B.UZ",
  ).length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PROTOKÓŁ POMIARÓW ELEKTRYCZNYCH</Text>
          <Text style={styles.subtitle}>
            Pomiar impedancji pętli zwarciowej
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
              {new Date(inspection.date).toLocaleDateString("pl-PL")}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Technik:</Text>
            <Text style={styles.value}>{inspection.technician}</Text>
          </View>
        </View>

        {/* Measurements Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Pkt</Text>
            <Text style={styles.col2}>Typ</Text>
            <Text style={styles.col3}>In [A]</Text>
            <Text style={styles.col4}>k</Text>
            <Text style={styles.col5}>Zs [Ω]</Text>
            <Text style={styles.col6}>Zs dop [Ω]</Text>
            <Text style={styles.col7}>Uwagi</Text>
            <Text style={styles.col8}>Ocena</Text>
          </View>

          {/* Table Rows */}
          {inspection.measurements.map((m, idx) => {
            let rowStyle = idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt;

            if (m.result === "TAK") rowStyle = styles.tableRowPass;
            else if (m.result === "NIE") rowStyle = styles.tableRowFail;
            else if (m.result === "B.UZ") rowStyle = styles.tableRowNoGround;

            return (
              <View style={rowStyle} key={m.id}>
                <Text style={styles.col1}>{m.pointNumber}</Text>
                <Text style={styles.col2}>{m.protectionType}</Text>
                <Text style={styles.col3}>{m.amperage}</Text>
                <Text style={styles.col4}>{m.kFactor}</Text>
                <Text style={styles.col5}>
                  {m.noGrounding ? "-" : m.zsValue?.toFixed(2)}
                </Text>
                <Text style={styles.col6}>{m.zsDop.toFixed(2)}</Text>
                <Text style={styles.col7}>{m.noGrounding ? "B.UZ" : "-"}</Text>
                <Text style={styles.col8}>{m.result}</Text>
              </View>
            );
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
  );
};
