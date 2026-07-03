import { Document, Page, Text, View, StyleSheet, Svg, Polygon } from '@react-pdf/renderer'
import type { CompanyInfo } from './DocumentPdf'

const INK = '#1A1A1A'
const MUTED = '#7A7A7A'
const RULE_LIGHT = '#BFBFBF'
const HEAD_BG = '#E2E2E2'
const TOTAL_BG = '#C9C9C9'

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 9, fontFamily: 'Helvetica', color: INK },

  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  logo: { width: 22, height: 22, marginRight: 10 },
  brandName: { fontSize: 14, fontWeight: 700, color: INK },
  brandRule: { borderBottomWidth: 0.5, borderBottomColor: RULE_LIGHT, marginBottom: 22 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  titleText: { fontSize: 13, fontWeight: 700, color: INK },
  subtitle: { fontSize: 9, color: MUTED, marginBottom: 18 },

  sectionTitle: { fontSize: 9.5, fontWeight: 700, color: INK, marginBottom: 6, marginTop: 16 },

  table: { marginTop: 4, marginBottom: 4, borderWidth: 0.5, borderColor: RULE_LIGHT },
  tRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: RULE_LIGHT },
  tRowBold: { flexDirection: 'row', backgroundColor: HEAD_BG, borderBottomWidth: 0.5, borderBottomColor: RULE_LIGHT },
  tRowTotal: { flexDirection: 'row', backgroundColor: TOTAL_BG },
  cLabel: { flex: 1, fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 8 },
  cLabelBold: { flex: 1, fontSize: 8.5, fontWeight: 700, paddingVertical: 6, paddingHorizontal: 8 },
  cVal: { width: 90, fontSize: 8.5, textAlign: 'right', paddingVertical: 6, paddingHorizontal: 8 },
  cValBold: { width: 90, fontSize: 8.5, fontWeight: 700, textAlign: 'right', paddingVertical: 6, paddingHorizontal: 8 },

  note: { fontSize: 8, lineHeight: 1.5, color: MUTED, marginTop: 8 },
  noteStrong: { fontSize: 8.5, lineHeight: 1.5, color: INK, marginTop: 4, fontWeight: 700 },

  /* Breakdown table */
  bkTable: { marginTop: 4, marginBottom: 4, borderWidth: 0.5, borderColor: RULE_LIGHT },
  bkHead: { flexDirection: 'row', backgroundColor: HEAD_BG, borderBottomWidth: 0.5, borderBottomColor: RULE_LIGHT },
  bkRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: RULE_LIGHT },
  bkRowLast: { flexDirection: 'row' },
  bkTotalRow: { flexDirection: 'row', backgroundColor: TOTAL_BG, borderTopWidth: 0.5, borderTopColor: RULE_LIGHT },
  bkCNr: { width: 72, fontSize: 7.5, paddingVertical: 5, paddingHorizontal: 6 },
  bkCClient: { flex: 1, fontSize: 7.5, paddingVertical: 5, paddingHorizontal: 6 },
  bkCDate: { width: 54, fontSize: 7.5, paddingVertical: 5, paddingHorizontal: 6 },
  bkCAmt: { width: 70, fontSize: 7.5, textAlign: 'right', paddingVertical: 5, paddingHorizontal: 6 },
  bkBold: { fontWeight: 700 },

  footerNotes: { marginTop: 'auto', paddingTop: 10 },
  footerPara: { fontSize: 7.5, lineHeight: 1.5, color: MUTED, marginBottom: 6 },
  bottomRule: { borderTopWidth: 0.5, borderTopColor: RULE_LIGHT, marginTop: 6, marginBottom: 10 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bottomCol: { flexDirection: 'column', width: '48%' },
  bottomLine: { fontSize: 8, color: INK, marginBottom: 2, fontWeight: 700 },
  bottomLineMuted: { fontSize: 8, color: INK, marginBottom: 2, fontWeight: 700 },
})

function fmtMoney(n: number): string {
  return n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function BrandLogo() {
  return (
    <Svg viewBox="0 0 1080 1080" style={styles.logo}>
      <Polygon
        fill={INK}
        points="778.73 456.88 486.36 456.88 604.46 147.27 990.54 0 660.64 0 473.2 0 236.36 620.89 348.58 620.89 423.8 620.89 778.73 620.89 778.73 1080 1017.92 456.88 910.89 456.88 778.73 456.88"
      />
      <Polygon
        fill={INK}
        points="370.17 761.47 182.74 761.47 62.08 1077.77 171.52 1077.77 249.52 1077.77 595.15 1077.77 293.42 962.67 370.17 761.47"
      />
    </Svg>
  )
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={bold ? styles.tRowBold : styles.tRow}>
      <Text style={bold ? styles.cLabelBold : styles.cLabel}>{label}</Text>
      <Text style={bold ? styles.cValBold : styles.cVal}>
        {value < 0 ? '−' : ''}{fmtMoney(Math.abs(value))}
      </Text>
    </View>
  )
}

export interface ClosingInvoiceItem {
  doc_number: string
  client_name: string
  issue_date: string
  amount_gross: number
}

export interface ClosingExpenseItem {
  label: string
  date?: string
  amount: number
  months?: number
  monthly?: number
}

export interface SalaryPdfItem {
  reference_number?: string
  employer_name: string
  entry_type: 'employment' | 'gf_salary'
  gross_amount: number
  tax_withheld: number
}

export interface ClosingPdfData {
  label: string
  revenueNet: number
  vatCollected: number
  revenueGross: number
  expensesNet: number
  vorsteuer: number
  expensesGross: number
  vatPayable: number
  profitBeforeTax: number
  estimatedIncomeTax: number
  profitAfterTax: number
  smallBusinessActive: boolean
  ytdRevenueGross: number
  kuLimit: number
  kuTolerance: number
  invoiceCount: number
  receiptCount: number
  invoices?: ClosingInvoiceItem[]
  expenseItems?: ClosingExpenseItem[]
  salaryItems?: SalaryPdfItem[]
  salaryGrossTotal?: number
  salaryTaxWithheld?: number
}

export function ClosingPdf({ data, company }: { data: ClosingPdfData; company: CompanyInfo }) {
  const addressLines = (company.address || '').split('\n').filter(Boolean)

  let kuStatusText: string
  if (data.smallBusinessActive) {
    if (data.ytdRevenueGross > data.kuTolerance) {
      kuStatusText = `Achtung: Der Jahresumsatz (${fmtMoney(data.ytdRevenueGross)}) überschreitet die Toleranzgrenze von ${fmtMoney(data.kuTolerance)} um mehr als 10 %. Die Kleinunternehmer-Befreiung entfällt rückwirkend ab dem Umsatz, mit dem die Grenze überschritten wurde. Bitte umgehend mit dem Finanzamt bzw. Steuerberater abklären.`
    } else if (data.ytdRevenueGross > data.kuLimit) {
      kuStatusText = `Die Kleinunternehmergrenze von ${fmtMoney(data.kuLimit)} wurde überschritten, liegt aber innerhalb der 10 % Toleranzgrenze (${fmtMoney(data.kuTolerance)}). Die USt-Befreiung bleibt im laufenden Jahr erhalten, entfällt aber automatisch ab dem Folgejahr.`
    } else {
      kuStatusText = `Jahresumsatz brutto: ${fmtMoney(data.ytdRevenueGross)} von ${fmtMoney(data.kuLimit)} Kleinunternehmergrenze (§ 6 Abs. 1 Z 27 UStG). Keine Umsatzsteuerpflicht.`
    }
  } else {
    kuStatusText = 'Regelbesteuerung: Umsatzsteuer wird verrechnet und ist im Rahmen der UVA an das Finanzamt abzuführen.'
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Brand header — always at top, never breaks */}
        <View wrap={false}>
          <View style={styles.brandRow}>
            <BrandLogo />
            <Text style={styles.brandName}>{company.name || 'Lukas Aigner'}</Text>
          </View>
          <View style={styles.brandRule} />
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>Abschluss</Text>
            <Text style={styles.titleText}>{data.label}</Text>
          </View>
          <Text style={styles.subtitle}>
            Einnahmen-Überschuss-Rechnung (EÜR) - vorläufige Berechnung · {data.invoiceCount} bezahlte Rechnung(en) · {data.receiptCount} Ausgabenbeleg(e)
          </Text>
        </View>

        {/* Einnahmen summary — keep title + table together */}
        <View wrap={false}>
          <Text style={styles.sectionTitle}>Einnahmen & Umsatzsteuer</Text>
          <View style={styles.table}>
            <Row label="Umsatz netto" value={data.revenueNet} />
            <Row label="Umsatzsteuer (USt.)" value={data.vatCollected} />
            <Row label="Umsatz brutto" value={data.revenueGross} bold />
          </View>
        </View>

        {data.invoices && data.invoices.length > 0 && (
          <>
            {/* Breakdown header row kept with section title and at least first data row */}
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Leistungsaufschlüsselung – Einnahmen</Text>
              <View style={[styles.bkTable, { marginBottom: 0, borderBottomWidth: 0 }]}>
                <View style={styles.bkHead}>
                  <Text style={[styles.bkCNr, styles.bkBold]}>Rechnungs-Nr.</Text>
                  <Text style={[styles.bkCClient, styles.bkBold]}>Kunde</Text>
                  <Text style={[styles.bkCDate, styles.bkBold]}>Datum</Text>
                  <Text style={[styles.bkCAmt, styles.bkBold]}>Brutto</Text>
                </View>
              </View>
            </View>
            {/* Data rows — allowed to break across pages */}
            <View style={[styles.bkTable, { marginTop: 0, borderTopWidth: 0 }]}>
              {data.invoices.map((inv, i) => (
                <View key={i} style={i === (data.invoices!.length - 1) ? styles.bkRowLast : styles.bkRow}>
                  <Text style={styles.bkCNr}>{inv.doc_number}</Text>
                  <Text style={styles.bkCClient}>{inv.client_name}</Text>
                  <Text style={styles.bkCDate}>{fmtDate(inv.issue_date)}</Text>
                  <Text style={styles.bkCAmt}>{fmtMoney(inv.amount_gross)}</Text>
                </View>
              ))}
              {/* Total row always kept with last data row */}
              <View wrap={false} style={styles.bkTotalRow}>
                <Text style={[{ flex: 1, fontSize: 7.5, paddingVertical: 5, paddingHorizontal: 6 }, styles.bkBold]}>Gesamt</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>{fmtMoney(data.revenueGross)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Ausgaben summary — keep title + table together */}
        <View wrap={false}>
          <Text style={styles.sectionTitle}>
            {data.vorsteuer > 0 ? 'Ausgaben & Vorsteuer' : 'Ausgaben'}
          </Text>
          <View style={styles.table}>
            {data.vorsteuer > 0 ? (
              <>
                <Row label="Ausgaben netto" value={-data.expensesNet} />
                <Row label="Vorsteuer" value={-data.vorsteuer} />
                <Row label="Ausgaben brutto" value={-data.expensesGross} bold />
              </>
            ) : (
              <Row label="Ausgaben gesamt" value={-data.expensesGross} bold />
            )}
          </View>
        </View>

        {data.expenseItems && data.expenseItems.length > 0 && (
          <>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Ausgaben-Aufschlüsselung</Text>
              <View style={[styles.bkTable, { marginBottom: 0, borderBottomWidth: 0 }]}>
                <View style={styles.bkHead}>
                  <Text style={[styles.bkCClient, styles.bkBold]}>Beschreibung</Text>
                  <Text style={[styles.bkCDate, styles.bkBold]}>Datum / Zeitraum</Text>
                  <Text style={[styles.bkCAmt, styles.bkBold]}>Betrag</Text>
                </View>
              </View>
            </View>
            <View style={[styles.bkTable, { marginTop: 0, borderTopWidth: 0 }]}>
              {data.expenseItems.map((item, i) => {
                const isLast = i === data.expenseItems!.length - 1
                const dateOrPeriod = item.date
                  ? fmtDate(item.date)
                  : item.months !== undefined
                  ? `${item.months} Mon. × ${fmtMoney(item.monthly ?? 0)}`
                  : ''
                return (
                  <View key={i} style={isLast ? styles.bkRowLast : styles.bkRow}>
                    <Text style={styles.bkCClient}>{item.label}</Text>
                    <Text style={styles.bkCDate}>{dateOrPeriod}</Text>
                    <Text style={styles.bkCAmt}>{fmtMoney(item.amount)}</Text>
                  </View>
                )
              })}
              <View wrap={false} style={styles.bkTotalRow}>
                <Text style={[{ flex: 1, fontSize: 7.5, paddingVertical: 5, paddingHorizontal: 6 }, styles.bkBold]}>Gesamt</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>{fmtMoney(data.expensesGross)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Ergebnis — always keep together, force onto new page if tight */}
        <View wrap={false}>
          <Text style={styles.sectionTitle}>Ergebnis</Text>
          <View style={styles.table}>
            <Row label="USt-Zahllast" value={data.vatPayable} bold />
            <Row label="Gewinn vor Steuern" value={data.profitBeforeTax} bold />
            <Row label="Geschätzte Einkommensteuer (hochgerechnet)" value={-data.estimatedIncomeTax} />
            <View style={styles.tRowTotal}>
              <Text style={styles.cLabelBold}>Gewinn nach geschätzter Steuer</Text>
              <Text style={styles.cValBold}>{fmtMoney(data.profitAfterTax)}</Text>
            </View>
          </View>
        </View>

        {/* KU-Status note — keep together */}
        <View wrap={false}>
          <Text style={styles.noteStrong}>Kleinunternehmer-Status</Text>
          <Text style={styles.note}>{kuStatusText}</Text>
        </View>

        {/* Lohneinkünfte — only shown when salary entries exist */}
        {data.salaryItems && data.salaryItems.length > 0 && (
          <View wrap={false}>
            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Einkünfte aus nichtselbständiger Arbeit (Lohnzettel)</Text>
            <View style={styles.bkTable}>
              <View style={styles.bkHead}>
                <Text style={[styles.bkCNr, styles.bkBold]}>Nr.</Text>
                <Text style={[styles.bkCClient, styles.bkBold]}>Arbeitgeber</Text>
                <Text style={[{ width: 56, fontSize: 7.5, paddingVertical: 5, paddingHorizontal: 6 }, styles.bkBold]}>Art</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>Bruttobezug</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>LSt einbeh.</Text>
              </View>
              {data.salaryItems.map((s, i) => (
                <View key={i} style={i === data.salaryItems!.length - 1 ? styles.bkRowLast : styles.bkRow}>
                  <Text style={styles.bkCNr}>{s.reference_number ?? ''}</Text>
                  <Text style={styles.bkCClient}>{s.employer_name}</Text>
                  <Text style={{ width: 56, fontSize: 7.5, paddingVertical: 5, paddingHorizontal: 6 }}>{s.entry_type === 'gf_salary' ? 'GF-Gehalt' : 'Anstellung'}</Text>
                  <Text style={styles.bkCAmt}>{fmtMoney(s.gross_amount)}</Text>
                  <Text style={styles.bkCAmt}>{fmtMoney(s.tax_withheld)}</Text>
                </View>
              ))}
              <View style={styles.bkTotalRow}>
                <Text style={[{ flex: 1, fontSize: 7.5, paddingVertical: 5, paddingHorizontal: 6 }, styles.bkBold]}>Gesamt</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>{fmtMoney(data.salaryGrossTotal ?? 0)}</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>{fmtMoney(data.salaryTaxWithheld ?? 0)}</Text>
              </View>
            </View>
            <Text style={styles.note}>
              Diese Lohnzettel-Einkünfte sind in der Einkommensteuererklärung (E1) zusätzlich zu den selbständigen Einkünften anzugeben. Die einbehaltene Lohnsteuer wird auf die Einkommensteuer angerechnet. Bitte alle Lohnzettel (L16) vollständig an den Steuerberater weitergeben.
            </Text>
          </View>
        )}

        <View style={styles.footerNotes}>
          <Text style={styles.footerPara}>
            Hinweis: Diese Aufstellung ist eine automatisierte, unverbindliche Hochrechnung auf Basis der in der CRM-Software erfassten Rechnungen und Belege. Sie ersetzt keine
            steuerliche Beratung, keine Bilanzierung/Einnahmen-Ausgaben-Rechnung im Sinne der BAO und keine verbindliche Auskunft des Finanzamtes oder der SVS. Vorauszahlungen der
            Einkommensteuer werden vom Finanzamt per Bescheid auf Basis des Vorjahres festgesetzt und können von der hier dargestellten Hochrechnung abweichen.
          </Text>

          <View style={styles.bottomRule} />
          <View style={styles.bottomRow}>
            <View style={styles.bottomCol}>
              <Text style={styles.bottomLine}>{company.name || ''}</Text>
              {addressLines.map((l, i) => <Text key={i} style={styles.bottomLineMuted}>{l}</Text>)}
            </View>
            <View style={[styles.bottomCol, { alignItems: 'flex-end' }]}>
              {company.uid && <Text style={styles.bottomLineMuted}>UID: {company.uid}</Text>}
              {company.gisa && <Text style={styles.bottomLineMuted}>GISA-Zahl: {company.gisa}</Text>}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
