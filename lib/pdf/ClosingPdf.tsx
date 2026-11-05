import { Document, Page, Text, View, StyleSheet, Svg, Polygon } from '@react-pdf/renderer'
import type { CompanyInfo } from './DocumentPdf'

const INK = '#1A1A1A'
const MUTED = '#7A7A7A'
const RULE_LIGHT = '#BFBFBF'
const HEAD_BG = '#E2E2E2'
const TOTAL_BG = '#C9C9C9'

const styles = StyleSheet.create({
  page: { padding: 44, paddingBottom: 80, fontSize: 9, fontFamily: 'Helvetica', color: INK },

  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  logo: { width: 22, height: 22, marginRight: 10 },
  brandName: { fontSize: 14, fontWeight: 700, color: INK },
  brandRule: { borderBottomWidth: 0.5, borderBottomColor: RULE_LIGHT, marginBottom: 22 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  titleText: { fontSize: 13, fontWeight: 700, color: INK },
  subtitle: { fontSize: 9, color: MUTED, marginBottom: 18 },

  sectionTitle: { fontSize: 9.5, fontWeight: 700, color: INK, marginBottom: 6, marginTop: 16 },
  chapterTitle: { fontSize: 11.5, fontWeight: 700, color: INK, marginTop: 18, marginBottom: 2 },
  chapterTitleFirst: { fontSize: 11.5, fontWeight: 700, color: INK, marginTop: 0, marginBottom: 2 },
  chapterSub: { fontSize: 8, color: MUTED, marginBottom: 4 },
  subTitle: { fontSize: 8.5, fontWeight: 700, color: INK, marginBottom: 4, marginTop: 12 },

  heroRow: { flexDirection: 'row', backgroundColor: INK, paddingVertical: 10, paddingHorizontal: 10 },
  heroLabel: { flex: 1, fontSize: 10, fontWeight: 700, color: '#FFFFFF' },
  heroVal: { width: 120, fontSize: 10, fontWeight: 700, color: '#FFFFFF', textAlign: 'right' },
  cIndent: { flex: 1, fontSize: 8.5, paddingVertical: 6, paddingLeft: 18, paddingRight: 8, color: '#444444' },

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
  bkCNr: { width: 72, fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 6 },
  bkCClient: { flex: 1, fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 6 },
  bkCDate: { width: 54, fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 6 },
  bkCPeriod: { width: 100, fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 6 },
  bkCAmt: { width: 70, fontSize: 7.5, textAlign: 'right', paddingVertical: 4, paddingHorizontal: 6 },
  bkBold: { fontWeight: 700 },

  pageFooter: { position: 'absolute', bottom: 24, left: 44, right: 44 },
  footerPara: { fontSize: 7.5, lineHeight: 1.5, color: MUTED, marginTop: 8 },
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
        {value < 0 ? '- ' : ''}{fmtMoney(Math.abs(value))}
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

export type ExpenseKind = 'fixed' | 'social' | 'other'

export interface ClosingExpenseItem {
  label: string
  kind?: ExpenseKind
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
      kuStatusText = `Jahresumsatz brutto: ${fmtMoney(data.ytdRevenueGross)}: Die 10%-Toleranzgrenze (${fmtMoney(data.kuTolerance)}) gem. § 6 Abs. 1 Z 27 UStG ist überschritten. Die Kleinunternehmerbefreiung entfällt rückwirkend; Umsatzsteuerpflicht besteht ab Überschreitung der Grenze.`
    } else if (data.ytdRevenueGross > data.kuLimit) {
      kuStatusText = `Jahresumsatz brutto: ${fmtMoney(data.ytdRevenueGross)}: Kleinunternehmergrenze (${fmtMoney(data.kuLimit)}) überschritten, innerhalb der 10%-Toleranz (${fmtMoney(data.kuTolerance)}) gem. § 6 Abs. 1 Z 27 UStG. USt-Befreiung bleibt für das laufende Kalenderjahr aufrecht; ab dem Folgejahr gilt Regelbesteuerung.`
    } else {
      kuStatusText = `Jahresumsatz brutto: ${fmtMoney(data.ytdRevenueGross)}, innerhalb der Kleinunternehmergrenze gem. § 6 Abs. 1 Z 27 UStG (${fmtMoney(data.kuLimit)}). Befreiung von der Umsatzsteuerpflicht.`
    }
  } else {
    kuStatusText = 'Regelbesteuerung gem. § 19 UStG: Umsatzsteuer wird verrechnet und quartalsweise im Rahmen der UVA (§ 21 UStG) an das Finanzamt abgeführt.'
  }

  const salaryItems = data.salaryItems ?? []
  const hasGfSalary = salaryItems.some(s => s.entry_type === 'gf_salary')
  const salaryGross = data.salaryGrossTotal ?? 0
  const salaryTax = data.salaryTaxWithheld ?? 0
  const totalIncome = data.revenueGross + salaryGross
  const totalBeforeTax = data.profitBeforeTax + salaryGross - salaryTax

  const expenseItems = data.expenseItems ?? []
  const groupDefs: { kind: ExpenseKind; title: string }[] = [
    { kind: 'fixed', title: 'Fixe monatliche Kosten' },
    { kind: 'social', title: 'Sozialversicherung & Abgaben' },
    { kind: 'other', title: 'Sonstige Ausgaben' },
  ]
  const expenseGroups = groupDefs
    .map(g => {
      const items = expenseItems
        .filter(it => (it.kind ?? (it.months !== undefined ? 'fixed' : 'other')) === g.kind)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      return { ...g, items, total: items.reduce((sum, it) => sum + it.amount, 0) }
    })
    .filter(g => g.items.length > 0)

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

        {/* ── 1. Gesamtübersicht ───────────────────────────── */}
        <View wrap={false}>
          <Text style={styles.chapterTitleFirst}>Gesamtübersicht</Text>
          <Text style={styles.chapterSub}>Alle Einkünfte {data.label} auf einen Blick</Text>
          <View style={styles.table}>
            <View style={styles.heroRow}>
              <Text style={styles.heroLabel}>Gesamteinnahmen</Text>
              <Text style={styles.heroVal}>{fmtMoney(totalIncome)}</Text>
            </View>
            <View style={styles.tRow}>
              <Text style={styles.cIndent}>Umsatz Unternehmen (bezahlte Rechnungen)</Text>
              <Text style={styles.cVal}>{fmtMoney(data.revenueGross)}</Text>
            </View>
            {salaryGross > 0 && (
              <View style={styles.tRow}>
                <Text style={styles.cIndent}>{hasGfSalary ? 'Geschäftsführergehalt' : 'Gehalt'} (§ 25 EStG, brutto)</Text>
                <Text style={styles.cVal}>{fmtMoney(salaryGross)}</Text>
              </View>
            )}
            <Row label="Ausgaben Unternehmen" value={-data.expensesGross} />
            {salaryTax > 0 && <Row label="Einbehaltene Lohnsteuer" value={-salaryTax} />}
            <View style={styles.tRowTotal}>
              <Text style={styles.cLabelBold}>Gesamteinkünfte vor Einkommensteuer</Text>
              <Text style={styles.cValBold}>{fmtMoney(totalBeforeTax)}</Text>
            </View>
          </View>
        </View>

        {/* ── 2. Einnahmen Unternehmen ───────────────────────── */}
        <View wrap={false}>
          <Text style={styles.chapterTitle}>Einnahmen Unternehmen</Text>
          {data.smallBusinessActive ? (
            <Text style={styles.chapterSub}>Kleinunternehmer gem. § 6 Abs. 1 Z 27 UStG: keine Umsatzsteuer, netto = brutto</Text>
          ) : (
            <View style={styles.table}>
              <Row label="Umsatz netto" value={data.revenueNet} />
              <Row label="Umsatzsteuer (USt.)" value={data.vatCollected} />
              <Row label="Umsatz brutto" value={data.revenueGross} bold />
            </View>
          )}
        </View>

        {data.invoices && data.invoices.length > 0 && (
          <View wrap={false}>
            {!data.smallBusinessActive && <Text style={styles.subTitle}>Rechnungen</Text>}
            <View style={styles.bkTable}>
              <View style={styles.bkHead}>
                <Text style={[styles.bkCNr, styles.bkBold]}>Rechnungs-Nr.</Text>
                <Text style={[styles.bkCClient, styles.bkBold]}>Kunde</Text>
                <Text style={[styles.bkCDate, styles.bkBold]}>Datum</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>Brutto</Text>
              </View>
              {data.invoices.map((inv, i) => (
                <View key={i} style={i === data.invoices!.length - 1 ? styles.bkRowLast : styles.bkRow}>
                  <Text style={styles.bkCNr}>{inv.doc_number}</Text>
                  <Text style={styles.bkCClient}>{inv.client_name}</Text>
                  <Text style={styles.bkCDate}>{fmtDate(inv.issue_date)}</Text>
                  <Text style={styles.bkCAmt}>{fmtMoney(inv.amount_gross)}</Text>
                </View>
              ))}
              <View style={styles.bkTotalRow}>
                <Text style={[{ flex: 1, fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 6 }, styles.bkBold]}>Gesamt</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>{fmtMoney(data.revenueGross)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── 3. Geschäftsführergehalt / Lohnzettel ──────────── */}
        {salaryItems.length > 0 && (
          <View wrap={false}>
            <Text style={styles.chapterTitle}>{hasGfSalary ? 'Geschäftsführergehalt' : 'Gehalt'} · § 25 EStG (Lohnzettel)</Text>
            <View style={styles.bkTable}>
              <View style={styles.bkHead}>
                <Text style={[styles.bkCNr, styles.bkBold]}>Nr.</Text>
                <Text style={[styles.bkCClient, styles.bkBold]}>Arbeitgeber</Text>
                <Text style={[{ width: 56, fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 6 }, styles.bkBold]}>Art</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>Bruttobezug</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>LSt einbeh.</Text>
              </View>
              {salaryItems.map((s, i) => (
                <View key={i} style={i === salaryItems.length - 1 ? styles.bkRowLast : styles.bkRow}>
                  <Text style={styles.bkCNr}>{s.reference_number ?? ''}</Text>
                  <Text style={styles.bkCClient}>{s.employer_name}</Text>
                  <Text style={{ width: 56, fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 6 }}>{s.entry_type === 'gf_salary' ? 'GF-Gehalt' : 'Anstellung'}</Text>
                  <Text style={styles.bkCAmt}>{fmtMoney(s.gross_amount)}</Text>
                  <Text style={styles.bkCAmt}>{fmtMoney(s.tax_withheld)}</Text>
                </View>
              ))}
              <View style={styles.bkTotalRow}>
                <Text style={[{ flex: 1, fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 6 }, styles.bkBold]}>Gesamt</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>{fmtMoney(salaryGross)}</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>{fmtMoney(salaryTax)}</Text>
              </View>
            </View>
            <Text style={styles.note}>
              KZ 245 auf Formular E1. Einbehaltene Lohnsteuer wird gem. § 46 Abs. 1 Z 2 EStG angerechnet.{hasGfSalary ? ' Bei Beteiligung > 25 % gilt GSVG (SVS separat).' : ''}
            </Text>
          </View>
        )}

        {/* ── 4. Ausgaben (immer neue Seite) ─────────────────── */}
        <View break wrap={false}>
          <Text style={styles.chapterTitleFirst}>Ausgaben Unternehmen</Text>
          <Text style={styles.chapterSub}>{data.receiptCount} Beleg(e) und laufende Abos</Text>
        </View>

        {expenseGroups.map(group => (
          <View key={group.kind} wrap={false}>
            <Text style={styles.subTitle}>{group.title}</Text>
            <View style={styles.bkTable}>
              <View style={styles.bkHead}>
                <Text style={[styles.bkCClient, styles.bkBold]}>Beschreibung</Text>
                <Text style={[styles.bkCPeriod, styles.bkBold]}>{group.kind === 'fixed' ? 'Zeitraum' : 'Datum'}</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>Betrag</Text>
              </View>
              {group.items.map((item, i) => (
                <View key={i} style={i === group.items.length - 1 ? styles.bkRowLast : styles.bkRow}>
                  <Text style={styles.bkCClient}>{item.label}</Text>
                  <Text style={styles.bkCPeriod}>
                    {item.date ? fmtDate(item.date) : item.months !== undefined ? `${item.months} Mon. × ${fmtMoney(item.monthly ?? 0)}` : ''}
                  </Text>
                  <Text style={styles.bkCAmt}>{fmtMoney(item.amount)}</Text>
                </View>
              ))}
              <View style={styles.bkTotalRow}>
                <Text style={[{ flex: 1, fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 6 }, styles.bkBold]}>Summe {group.title}</Text>
                <Text style={[styles.bkCAmt, styles.bkBold]}>{fmtMoney(group.total)}</Text>
              </View>
            </View>
          </View>
        ))}

        <View wrap={false}>
          <View style={[styles.table, { marginTop: 14 }]}>
            {expenseGroups.map(group => (
              <Row key={group.kind} label={group.title} value={group.total} />
            ))}
            {data.vorsteuer > 0 && <Row label="davon Vorsteuer" value={data.vorsteuer} />}
            <View style={styles.tRowTotal}>
              <Text style={styles.cLabelBold}>Ausgaben gesamt</Text>
              <Text style={styles.cValBold}>{fmtMoney(data.expensesGross)}</Text>
            </View>
          </View>
        </View>

        {/* ── 5. Ergebnis ─────────────────────────────────────── */}
        <View wrap={false}>
          <Text style={styles.chapterTitle}>Ergebnis Unternehmen</Text>
          <View style={styles.table}>
            {!data.smallBusinessActive && <Row label="USt-Zahllast" value={-data.vatPayable} />}
            <Row label="Gewinn vor Steuern" value={data.profitBeforeTax} bold />
            <Row label="Geschätzte Einkommensteuer (hochgerechnet)" value={-data.estimatedIncomeTax} />
            <View style={styles.tRowTotal}>
              <Text style={styles.cLabelBold}>Gewinn nach geschätzter Steuer</Text>
              <Text style={styles.cValBold}>{fmtMoney(data.profitAfterTax)}</Text>
            </View>
          </View>
        </View>

        <View wrap={false}>
          <Text style={styles.noteStrong}>Kleinunternehmer-Status</Text>
          <Text style={styles.note}>{kuStatusText}</Text>
          <Text style={styles.footerPara}>
            Einnahmen-Ausgaben-Rechnung gem. § 4 Abs. 3 EStG. Einkommensteuervorauszahlungen werden vom Finanzamt gem. § 45 EStG auf Basis des Vorjahresbescheids festgesetzt.
            Umsatzsteuervoranmeldung gem. § 21 UStG. Alle Angaben auf Basis der erfassten Belege und Rechnungen.
          </Text>
        </View>

        <View style={styles.pageFooter} fixed>
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
