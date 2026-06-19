import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { AccountingDocument } from '@/lib/types'

export interface CompanyInfo {
  name?: string
  address?: string
  email?: string
  phone?: string
  iban?: string
  uid?: string
}

const ACCENT = '#FF5252'
const INK = '#1A1A1A'
const MUTED = '#8A8A8A'

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 9.5, fontFamily: 'Helvetica', color: INK },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 36 },
  companyName: { fontSize: 14, fontWeight: 700, color: ACCENT, marginBottom: 4 },
  companyLine: { fontSize: 8.5, color: MUTED, lineHeight: 1.5 },

  docTitleBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 20, fontWeight: 700, color: INK, marginBottom: 2 },
  docNumber: { fontSize: 9.5, color: MUTED },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  block: { flexDirection: 'column' },
  blockLabel: { fontSize: 7.5, fontWeight: 700, color: MUTED, marginBottom: 4, letterSpacing: 0.5 },
  blockValue: { fontSize: 9.5, lineHeight: 1.5 },

  table: { marginTop: 10 },
  tableHeaderRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#DDDDDD',
    paddingBottom: 6, marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row', paddingVertical: 6,
    borderBottomWidth: 0.5, borderBottomColor: '#EEEEEE',
  },
  thDesc:  { flex: 5, fontSize: 7.5, fontWeight: 700, color: MUTED },
  thQty:   { flex: 1, fontSize: 7.5, fontWeight: 700, color: MUTED, textAlign: 'right' },
  thPrice: { flex: 1.5, fontSize: 7.5, fontWeight: 700, color: MUTED, textAlign: 'right' },
  thTotal: { flex: 1.5, fontSize: 7.5, fontWeight: 700, color: MUTED, textAlign: 'right' },
  tdDesc:  { flex: 5, fontSize: 9.5 },
  tdQty:   { flex: 1, fontSize: 9.5, textAlign: 'right' },
  tdPrice: { flex: 1.5, fontSize: 9.5, textAlign: 'right' },
  tdTotal: { flex: 1.5, fontSize: 9.5, textAlign: 'right', fontWeight: 700 },

  totalsBlock: { marginTop: 16, alignItems: 'flex-end' },
  totalsRow: { flexDirection: 'row', width: 220, justifyContent: 'space-between', paddingVertical: 3 },
  totalsLabel: { fontSize: 9.5, color: MUTED },
  totalsValue: { fontSize: 9.5 },
  grandTotalRow: {
    flexDirection: 'row', width: 220, justifyContent: 'space-between',
    paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: INK,
  },
  grandTotalLabel: { fontSize: 11, fontWeight: 700 },
  grandTotalValue: { fontSize: 11, fontWeight: 700, color: ACCENT },

  notes: { marginTop: 32, fontSize: 8.5, color: MUTED, lineHeight: 1.5 },
  footer: {
    position: 'absolute', bottom: 40, left: 48, right: 48,
    borderTopWidth: 0.5, borderTopColor: '#DDDDDD', paddingTop: 10,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  footerText: { fontSize: 7.5, color: MUTED },
})

function fmtMoney(n: number): string {
  return n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function fmtDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function DocumentPdf({ doc, company }: { doc: AccountingDocument; company: CompanyInfo }) {
  const items = doc.line_items ?? []
  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const tax = subtotal * (doc.tax_rate / 100)
  const total = subtotal + tax
  const isInvoice = doc.doc_type === 'invoice'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>{company.name || 'Mein Unternehmen'}</Text>
            <Text style={styles.companyLine}>{company.address || ''}</Text>
            <Text style={styles.companyLine}>
              {[company.email, company.phone].filter(Boolean).join('  ·  ')}
            </Text>
            {company.uid && <Text style={styles.companyLine}>UID: {company.uid}</Text>}
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>{isInvoice ? 'Rechnung' : 'Angebot'}</Text>
            <Text style={styles.docNumber}>Nr. {doc.doc_number}</Text>
          </View>
        </View>

        {/* Client + dates */}
        <View style={styles.metaRow}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>{isInvoice ? 'RECHNUNG AN' : 'ANGEBOT FÜR'}</Text>
            <Text style={styles.blockValue}>{doc.client_name}</Text>
            {doc.client_address && <Text style={styles.blockValue}>{doc.client_address}</Text>}
            {doc.client_email && <Text style={styles.blockValue}>{doc.client_email}</Text>}
          </View>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>{isInvoice ? 'RECHNUNGSDATUM' : 'ANGEBOTSDATUM'}</Text>
            <Text style={styles.blockValue}>{fmtDate(doc.issue_date)}</Text>
            {doc.due_date && (
              <>
                <Text style={[styles.blockLabel, { marginTop: 8 }]}>
                  {isInvoice ? 'FÄLLIG BIS' : 'GÜLTIG BIS'}
                </Text>
                <Text style={styles.blockValue}>{fmtDate(doc.due_date)}</Text>
              </>
            )}
          </View>
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.thDesc}>Beschreibung</Text>
            <Text style={styles.thQty}>Menge</Text>
            <Text style={styles.thPrice}>Einzelpreis</Text>
            <Text style={styles.thTotal}>Gesamt</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tdDesc}>{item.description}</Text>
              <Text style={styles.tdQty}>{item.qty}</Text>
              <Text style={styles.tdPrice}>{fmtMoney(item.unit_price)}</Text>
              <Text style={styles.tdTotal}>{fmtMoney(item.qty * item.unit_price)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Zwischensumme</Text>
            <Text style={styles.totalsValue}>{fmtMoney(subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>USt. ({doc.tax_rate}%)</Text>
            <Text style={styles.totalsValue}>{fmtMoney(tax)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Gesamtbetrag</Text>
            <Text style={styles.grandTotalValue}>{fmtMoney(total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {doc.notes && <Text style={styles.notes}>{doc.notes}</Text>}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{company.name || ''}</Text>
          {company.iban && <Text style={styles.footerText}>IBAN: {company.iban}</Text>}
        </View>
      </Page>
    </Document>
  )
}
