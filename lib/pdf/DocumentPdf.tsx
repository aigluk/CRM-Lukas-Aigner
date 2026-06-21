import { Document, Page, Text, View, StyleSheet, Svg, Polygon } from '@react-pdf/renderer'
import type { AccountingDocument, DocLanguage } from '@/lib/types'

export interface CompanyInfo {
  name?: string
  legal_form?: 'einzelunternehmer' | 'gmbh'
  fn?: string
  address?: string
  email?: string
  phone?: string
  iban?: string
  uid?: string
  bank_name?: string
  bic?: string
  gisa?: string
  small_business?: boolean
}

const INK = '#1A1A1A'
const MUTED = '#7A7A7A'
const RULE = '#1A1A1A'
const RULE_LIGHT = '#BFBFBF'
const HEAD_BG = '#E2E2E2'
const TOTAL_BG = '#C9C9C9'

const T = {
  de: {
    docTitle: { invoice: 'Rechnung', quote: 'Angebot' },
    customer: 'Kunde:', address: 'Anschrift:', country: 'Land:', vat: 'Ust. Nr.:',
    docNo: { invoice: 'Rechnungsnr.', quote: 'Angebotsnr.' },
    issueDate: { invoice: 'Rechnungsdatum:', quote: 'Angebotsdatum:' },
    serviceDate: 'Leistungsdatum:',
    dueDate: { invoice: 'Fälligkeitsdatum:', quote: 'Gültig bis:' },
    greeting: {
      invoice: 'Sehr geehrte Damen und Herren,\nvielen Dank für Ihren Auftrag und das damit verbundene Vertrauen!\nHiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:',
      quote: 'Sehr geehrte Damen und Herren,\nvielen Dank für Ihre Anfrage!\nHiermit unterbreite ich Ihnen folgendes Angebot:',
    },
    smallBusiness: 'Gemäß § 6 Abs. 1 Z 27 UStG wird keine USt. berechnet!',
    pos: 'Pos.:', service: 'Leistung', qty: 'Anzahl', duration: 'Laufzeit', sum: 'Summe:',
    total: 'Ges.:',
    payment: 'Bitte überweisen Sie den Rechnungsbetrag auf das unten angegebene Konto unter Angabe der Rechnungsnummer!',
    terms: {
      invoice: 'Die Leistungserbringung erfolgt auf Grundlage meiner Allgemeinen Geschäftsbedingungen (AGB), die die Rahmenbedingungen der Zusammenarbeit festlegen.\nDiese Rechnung bezieht sich auf diese Bedingungen.\nDie AGB sowie die Datenschutzerklärung werden auf Wunsch jederzeit gerne in geeigneter Form zur Verfügung gestellt.',
      quote: 'Die Leistungserbringung erfolgt - bei Auftragserteilung - auf Grundlage meiner Allgemeinen Geschäftsbedingungen (AGB), die die Rahmenbedingungen der Zusammenarbeit festlegen.\nDieses Angebot bezieht sich auf diese Bedingungen.\nDie AGB sowie die Datenschutzerklärung werden auf Wunsch jederzeit gerne in geeigneter Form zur Verfügung gestellt.',
    },
    bank: 'Bank:', iban: 'IBAN.:', bic: 'BIC.:', gisa: 'GISA-Zahl:',
  },
  en: {
    docTitle: { invoice: 'Invoice', quote: 'Quote' },
    customer: 'Customer:', address: 'Address:', country: 'Country:', vat: 'VAT No.:',
    docNo: { invoice: 'Invoice No.', quote: 'Quote No.' },
    issueDate: { invoice: 'Invoice Date:', quote: 'Quote Date:' },
    serviceDate: 'Service Date:',
    dueDate: { invoice: 'Due Date:', quote: 'Valid Until:' },
    greeting: {
      invoice: 'Dear Sir or Madam,\nthank you for your order and your trust!\nPlease find the following services invoiced below:',
      quote: 'Dear Sir or Madam,\nthank you for your inquiry!\nPlease find the following quote below:',
    },
    smallBusiness: 'No VAT is charged in accordance with § 6 para. 1 no. 27 of the Austrian VAT Act (small business exemption).',
    pos: 'Item:', service: 'Description', qty: 'Qty', duration: 'Duration', sum: 'Total:',
    total: 'Total:',
    payment: 'Please transfer the invoice amount to the account stated below, quoting the invoice number.',
    terms: {
      invoice: 'Services are provided on the basis of my General Terms and Conditions (GTC), which govern the framework of our cooperation.\nThis invoice is subject to these terms.\nThe GTC and privacy policy are available on request at any time in a suitable format.',
      quote: 'Should this quote be accepted, services will be provided on the basis of my General Terms and Conditions (GTC), which govern the framework of our cooperation.\nThis quote is subject to these terms.\nThe GTC and privacy policy are available on request at any time in a suitable format.',
    },
    bank: 'Bank:', iban: 'IBAN:', bic: 'BIC:', gisa: 'GISA No.:',
  },
} as const

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 9, fontFamily: 'Helvetica', color: INK },

  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  logo: { width: 22, height: 22, marginRight: 10 },
  brandName: { fontSize: 14, fontWeight: 700, color: INK },
  brandRule: { borderBottomWidth: 0.5, borderBottomColor: RULE_LIGHT, marginBottom: 22 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 26 },
  metaCol: { flexDirection: 'column', width: '48%' },
  metaLine: { flexDirection: 'row', marginBottom: 5 },
  metaLineRight: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  metaLabel: { width: 64, fontSize: 8.5, fontWeight: 700, color: INK },
  metaLabelRight: { fontSize: 8.5, fontWeight: 700, color: INK },
  metaValue: { flex: 1, fontSize: 8.5, color: INK, textAlign: 'left' },
  metaValueRight: { fontSize: 8.5, color: INK, textAlign: 'right' },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  titleText: { fontSize: 13, fontWeight: 700, color: INK },

  greeting: { fontSize: 9, lineHeight: 1.5, marginBottom: 10 },
  smallBizNote: { fontSize: 9, lineHeight: 1.5, marginBottom: 16 },

  table: { marginTop: 4, marginBottom: 16, borderWidth: 0.5, borderColor: RULE_LIGHT },
  tHeadRow: { flexDirection: 'row', backgroundColor: HEAD_BG, borderBottomWidth: 0.5, borderBottomColor: RULE_LIGHT },
  tRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: RULE_LIGHT },
  cPos:  { width: 48, fontSize: 8.5, fontWeight: 700, paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 0.5, borderRightColor: RULE_LIGHT },
  cSvc:  { flex: 1, fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 0.5, borderRightColor: RULE_LIGHT },
  cQty:  { width: 50, fontSize: 8.5, textAlign: 'right', paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 0.5, borderRightColor: RULE_LIGHT },
  cDur:  { width: 60, fontSize: 8.5, textAlign: 'right', paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 0.5, borderRightColor: RULE_LIGHT },
  cSum:  { width: 70, fontSize: 8.5, textAlign: 'right', fontWeight: 700, paddingVertical: 6, paddingHorizontal: 8 },
  thText: { fontSize: 8, fontWeight: 700, color: INK },

  totalRow: { flexDirection: 'row', backgroundColor: TOTAL_BG },

  notes: { fontSize: 8.5, lineHeight: 1.5, marginBottom: 14, color: INK },

  footerNotes: { marginTop: 'auto', paddingTop: 10 },
  footerPara: { fontSize: 8, lineHeight: 1.5, color: MUTED, marginBottom: 8 },

  bottomRule: { borderTopWidth: 0.5, borderTopColor: RULE_LIGHT, marginTop: 6, marginBottom: 10 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bottomCol: { flexDirection: 'column', width: '48%' },
  bottomLine: { fontSize: 8, color: INK, marginBottom: 2, fontWeight: 700 },
  bottomLineMuted: { fontSize: 8, color: INK, marginBottom: 2, fontWeight: 700 },
})

function fmtMoney(n: number): string {
  return n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function fmtDate(d?: string, lang: DocLanguage = 'de'): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDocNumber(n: string, lang: DocLanguage): string {
  if (lang !== 'en') return n
  return n.replace(/^RE-/, 'INV-').replace(/^AN-/, 'QT-')
}

function Lines({ text, style }: { text: string; style: any }) {
  return (
    <>
      {text.split('\n').map((line, i) => <Text key={i} style={style}>{line}</Text>)}
    </>
  )
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

export function DocumentPdf({ doc, company }: { doc: AccountingDocument; company: CompanyInfo }) {
  const items = doc.line_items ?? []
  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const tax = company.small_business ? 0 : subtotal * (doc.tax_rate / 100)
  const total = subtotal + tax
  const isInvoice = doc.doc_type === 'invoice'
  const k = isInvoice ? 'invoice' : 'quote'
  const lang: DocLanguage = doc.language === 'en' ? 'en' : 'de'
  const tr = T[lang]
  const addressLines = (company.address || '').split('\n').filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Brand header */}
        <View style={styles.brandRow}>
          <BrandLogo />
          <Text style={styles.brandName}>{company.name || 'Lukas Aigner'}</Text>
        </View>
        <View style={styles.brandRule} />

        {/* Client + meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>{tr.customer}</Text>
              <Text style={styles.metaValue}>{doc.client_name}</Text>
            </View>
            {doc.client_address && (
              <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>{tr.address}</Text>
                <Text style={styles.metaValue}>{doc.client_address}</Text>
              </View>
            )}
            {doc.client_country && (
              <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>{tr.country}</Text>
                <Text style={styles.metaValue}>{doc.client_country}</Text>
              </View>
            )}
            {doc.client_vat && (
              <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>{tr.vat}</Text>
                <Text style={styles.metaValue}>{doc.client_vat}</Text>
              </View>
            )}
          </View>
          <View style={styles.metaCol}>
            <View style={styles.metaLineRight}>
              <Text style={styles.metaLabelRight}>{tr.docNo[k]}</Text>
              <Text style={styles.metaValueRight}>{fmtDocNumber(doc.doc_number, lang)}</Text>
            </View>
            <View style={styles.metaLineRight}>
              <Text style={styles.metaLabelRight}>{tr.issueDate[k]}</Text>
              <Text style={styles.metaValueRight}>{fmtDate(doc.issue_date, lang)}</Text>
            </View>
            {doc.service_date && (
              <View style={styles.metaLineRight}>
                <Text style={styles.metaLabelRight}>{tr.serviceDate}</Text>
                <Text style={styles.metaValueRight}>{fmtDate(doc.service_date, lang)}</Text>
              </View>
            )}
            {doc.due_date && (
              <View style={styles.metaLineRight}>
                <Text style={styles.metaLabelRight}>{tr.dueDate[k]}</Text>
                <Text style={styles.metaValueRight}>{fmtDate(doc.due_date, lang)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Title bar */}
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>{tr.docTitle[k]}:</Text>
          <Text style={styles.titleText}>{fmtDocNumber(doc.doc_number, lang)}</Text>
        </View>

        {/* Greeting */}
        <Lines text={tr.greeting[k]} style={styles.greeting} />
        {isInvoice && company.small_business && (
          <Text style={styles.smallBizNote}>{tr.smallBusiness}</Text>
        )}

        {/* Line items table */}
        <View style={styles.table}>
          <View style={styles.tHeadRow}>
            <Text style={[styles.cPos, styles.thText]}>{tr.pos}</Text>
            <Text style={[styles.cSvc, styles.thText]}>{tr.service}</Text>
            <Text style={[styles.cQty, styles.thText]}>{tr.qty}</Text>
            <Text style={[styles.cDur, styles.thText]}>{tr.duration}</Text>
            <Text style={[styles.cSum, styles.thText]}>{tr.sum}</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tRow}>
              <Text style={styles.cPos}>{tr.pos} {i + 1}</Text>
              <Text style={styles.cSvc}>{item.description}</Text>
              <Text style={styles.cQty}>x{item.qty}</Text>
              <Text style={styles.cDur}>{item.duration || '-'}</Text>
              <Text style={styles.cSum}>{fmtMoney(item.qty * item.unit_price)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.cPos, styles.thText]}></Text>
            <Text style={[styles.cSvc, styles.thText]}></Text>
            <Text style={[styles.cQty, styles.thText]}></Text>
            <Text style={[styles.cDur, styles.thText]}>{tr.total}</Text>
            <Text style={[styles.cSum, styles.thText]}>{fmtMoney(total)}</Text>
          </View>
        </View>

        {/* Custom notes */}
        {doc.notes && <Text style={styles.notes}>{doc.notes}</Text>}

        {/* Footer notes + bank block, pushed to bottom */}
        <View style={styles.footerNotes}>
          {isInvoice && <Text style={styles.footerPara}>{tr.payment}</Text>}
          <Lines text={tr.terms[k]} style={styles.footerPara} />

          <View style={styles.bottomRule} />
          <View style={styles.bottomRow}>
            <View style={styles.bottomCol}>
              <Text style={styles.bottomLine}>{company.name || ''}</Text>
              {addressLines.map((l, i) => <Text key={i} style={styles.bottomLineMuted}>{l}</Text>)}
            </View>
            <View style={[styles.bottomCol, { alignItems: 'flex-end' }]}>
              {company.gisa && <Text style={styles.bottomLineMuted}>{tr.gisa} {company.gisa}</Text>}
              {company.bank_name && <Text style={styles.bottomLineMuted}>{company.bank_name}</Text>}
              {company.iban && <Text style={styles.bottomLineMuted}>{tr.iban} {company.iban}</Text>}
              {company.bic && <Text style={styles.bottomLineMuted}>{tr.bic} {company.bic}</Text>}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
