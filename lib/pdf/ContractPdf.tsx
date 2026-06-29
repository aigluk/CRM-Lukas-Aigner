import { Document, Page, Text, View, StyleSheet, Svg, Polygon } from '@react-pdf/renderer'
import type { AccountingContract, DocLanguage } from '@/lib/types'
import type { CompanyInfo } from './DocumentPdf'

const INK = '#1A1A1A'
const MUTED = '#7A7A7A'
const RULE_LIGHT = '#BFBFBF'

const GERICHTSSTAND = '4020 Linz, Österreich'

const styles = StyleSheet.create({
  page: { paddingTop: 44, paddingHorizontal: 44, paddingBottom: 92, fontSize: 9, fontFamily: 'Helvetica', color: INK },

  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  logo: { width: 22, height: 22, marginRight: 10 },
  brandName: { fontSize: 14, fontWeight: 700, color: INK },
  brandRule: { borderBottomWidth: 0.5, borderBottomColor: RULE_LIGHT, marginBottom: 22 },

  titleRow: { marginBottom: 4 },
  titleText: { fontSize: 13, fontWeight: 700, color: INK },
  subTitleText: { fontSize: 8.5, color: MUTED, marginTop: 3 },

  partiesBlock: { marginTop: 18, marginBottom: 18 },
  partiesLabel: { fontSize: 8, fontWeight: 700, color: MUTED, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  partyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  partyCol: { width: '48%' },
  partyColRight: { width: '48%', alignItems: 'flex-end' },
  partyRole: { fontSize: 8, fontWeight: 700, color: MUTED, marginBottom: 3, textTransform: 'uppercase' },
  partyRoleRight: { fontSize: 8, fontWeight: 700, color: MUTED, marginBottom: 3, textTransform: 'uppercase', textAlign: 'right' },
  partyName: { fontSize: 9.5, fontWeight: 700, color: INK, marginBottom: 2 },
  partyNameRight: { fontSize: 9.5, fontWeight: 700, color: INK, marginBottom: 2, textAlign: 'right' },
  partyLine: { fontSize: 8.5, color: INK, marginBottom: 1.5 },
  partyLineRight: { fontSize: 8.5, color: INK, marginBottom: 1.5, textAlign: 'right' },

  preamble: { fontSize: 8.5, lineHeight: 1.5, marginBottom: 14, color: INK },

  section: { marginBottom: 11 },
  sectionTitle: { fontSize: 9.5, fontWeight: 700, color: INK, marginBottom: 4 },
  paragraph: { fontSize: 8.5, lineHeight: 1.5, color: INK, marginBottom: 4, textAlign: 'justify' },

  signBlock: { marginTop: 28 },
  signRule: { borderTopWidth: 0.5, borderTopColor: RULE_LIGHT, marginBottom: 16 },
  signRow: { flexDirection: 'row', justifyContent: 'space-between' },
  signCol: { width: '46%' },
  signLine: { borderTopWidth: 0.5, borderTopColor: INK, marginTop: 30, paddingTop: 4 },
  signLabel: { fontSize: 8, color: MUTED },

  pageFooter: { position: 'absolute', bottom: 36, left: 44, right: 44 },
  bottomRule: { borderTopWidth: 0.5, borderTopColor: RULE_LIGHT, marginBottom: 10 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bottomCol: { flexDirection: 'column', width: '48%' },
  bottomLine: { fontSize: 8, color: INK, marginBottom: 2, fontWeight: 700 },
  bottomLineMuted: { fontSize: 8, color: INK, marginBottom: 2, fontWeight: 700 },
})

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

function fmtDate(d?: string, lang: DocLanguage = 'de'): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Wie bei Rechnung/Angebot: USt-ID, wenn umsatzsteuerpflichtig — sonst GISA-Zahl (Kleinunternehmer/Einzelunternehmer). */
function partyIdentityLine(contract: AccountingContract): string {
  if (contract.party_vat_number) return `UID ${contract.party_vat_number}`
  if (contract.party_gisa_number) return `GISA ${contract.party_gisa_number}`
  return ''
}

/** Formatiert einen rein numerisch eingegebenen Preis (z. B. "4500") als "€ 4.500,-"; bereits formatierte Eingaben (mit Text/Symbolen) bleiben unverändert. */
function fmtPrice(raw?: string | null): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!/^\d+([.,]\d+)?$/.test(trimmed)) return trimmed
  const num = parseFloat(trimmed.replace(',', '.'))
  const formatted = num.toLocaleString('de-AT', { maximumFractionDigits: 2 })
  return `€ ${formatted},-`
}

type Section = { title: string; paragraphs: string[] }

function Header({ company, title, subtitle }: { company: CompanyInfo; title: string; subtitle: string }) {
  return (
    <>
      <View style={styles.brandRow}>
        <BrandLogo />
        <Text style={styles.brandName}>{company.name || 'Lukas Aigner'}</Text>
      </View>
      <View style={styles.brandRule} />
      <View style={styles.titleRow}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.subTitleText}>{subtitle}</Text>
      </View>
    </>
  )
}

function Parties({
  roleA, roleB, company, contract,
}: {
  roleA: string
  roleB: string
  company: CompanyInfo
  contract: AccountingContract
}) {
  const addressLines = (company.address || '').split('\n').filter(Boolean)
  const partyAddressLines = (contract.party_address || '').split('\n').filter(Boolean)
  return (
    <View style={styles.partiesBlock} wrap={false}>
      <Text style={styles.partiesLabel}>Vertragsparteien</Text>
      <View style={styles.partyRow}>
        <View style={styles.partyCol}>
          <Text style={styles.partyRole}>{roleA}</Text>
          <Text style={styles.partyName}>{company.name || '-'}</Text>
          {addressLines.map((l, i) => <Text key={i} style={styles.partyLine}>{l}</Text>)}
        </View>
        <View style={styles.partyColRight}>
          <Text style={styles.partyRoleRight}>{roleB}</Text>
          <Text style={styles.partyNameRight}>{contract.party_name}</Text>
          {partyAddressLines.map((l, i) => <Text key={i} style={styles.partyLineRight}>{l}</Text>)}
          {contract.party_birthdate && <Text style={styles.partyLineRight}>geb. {fmtDate(contract.party_birthdate)}</Text>}
          {partyIdentityLine(contract) && <Text style={styles.partyLineRight}>{partyIdentityLine(contract)}</Text>}
        </View>
      </View>
    </View>
  )
}

function Sections({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((s, i) => (
        <View key={i} style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>{s.title}</Text>
          {s.paragraphs.map((p, j) => <Text key={j} style={styles.paragraph}>{p}</Text>)}
        </View>
      ))}
    </>
  )
}

function SignatureBlock({ roleA, roleB }: { roleA: string; roleB: string }) {
  return (
    <View style={styles.signBlock} wrap={false}>
      <View style={styles.signRule} />
      <Text style={styles.paragraph}>Ort, Datum: ____________________________</Text>
      <View style={styles.signRow}>
        <View style={styles.signCol}>
          <View style={styles.signLine}><Text style={styles.signLabel}>{roleA} (Unterschrift)</Text></View>
        </View>
        <View style={styles.signCol}>
          <View style={styles.signLine}><Text style={styles.signLabel}>{roleB} (Unterschrift)</Text></View>
        </View>
      </View>
    </View>
  )
}

function Footer({ company, showBank = true }: { company: CompanyInfo; showBank?: boolean }) {
  const addressLines = (company.address || '').split('\n').filter(Boolean)
  return (
    <View style={styles.pageFooter} fixed>
      <View style={styles.bottomRule} />
      <View style={styles.bottomRow}>
        <View style={styles.bottomCol}>
          <Text style={styles.bottomLine}>{company.name || ''}</Text>
          {addressLines.map((l, i) => <Text key={i} style={styles.bottomLineMuted}>{l}</Text>)}
          {company.gisa && <Text style={styles.bottomLineMuted}>GISA-Zahl: {company.gisa}</Text>}
        </View>
        {showBank && (
          <View style={[styles.bottomCol, { alignItems: 'flex-end' }]}>
            {company.bank_name && <Text style={styles.bottomLineMuted}>{company.bank_name}</Text>}
            {company.iban && <Text style={styles.bottomLineMuted}>IBAN: {company.iban}</Text>}
            {company.bic && <Text style={styles.bottomLineMuted}>BIC: {company.bic}</Text>}
          </View>
        )}
      </View>
    </View>
  )
}

/* ────────────────────────────────────────────────────────────
   Vertragstext-Bausteine je Vertragstyp
   ──────────────────────────────────────────────────────────── */

function serviceContractSections(company: CompanyInfo, contract: AccountingContract): Section[] {
  const provider = company.name || 'der Auftragnehmer'
  const pkg = contract.package_name || 'individuell vereinbartes Leistungspaket'
  const price = fmtPrice(contract.package_price) || 'laut Angebot'
  const payment = contract.payment_mode === 'raten'
    ? `Ratenzahlung über ${contract.term_months || 36} Monate`
    : 'Einmalzahlung'
  const quoteRef = contract.linked_quote_number
    ? `dem Angebot Nr. ${contract.linked_quote_number}${contract.linked_quote_date ? ` vom ${fmtDate(contract.linked_quote_date)}` : ''}`
    : 'dem zugehörigen Angebot bzw. der Leistungsbeschreibung'

  return [
    {
      title: '§ 1 Vertragsgegenstand',
      paragraphs: [
        `Gegenstand dieses Vertrages ist die Erbringung von Dienstleistungen durch ${provider} (im Folgenden „Auftragnehmer") für den Auftraggeber im Bereich digitales Marketing, Webdesign, Markenaufbau und/oder verwandter Leistungen, wie im gewählten Leistungspaket gemäß § 2 näher beschrieben.`,
        'Sofern im Rahmen der Anbahnung oder Durchführung dieses Vertrages Leistungen Dritter vermittelt werden, erfolgt dies ausschließlich im Wege der Vermittlung; eine eigene Leistungserbringung des Auftragnehmers wird dadurch nicht begründet.',
      ],
    },
    {
      title: '§ 2 Auswahl des Dienstleistungspakets',
      paragraphs: [
        `Der Auftraggeber wählt folgendes Leistungspaket: ${pkg}.`,
        `Vereinbarter Pauschalpreis: ${price}.`,
        `Zahlungsmodalität: ${payment}.`,
        `Vertragslaufzeit: ${contract.term_months ? `${contract.term_months} Monate` : 'laut Angebot/Beilage'}.`,
        `Die genaue Leistungsbeschreibung sowie Preis- und Zahlungsdetails ergeben sich aus ${quoteRef}, das/die als Beilage integrierender Bestandteil dieses Vertrages ist.`,
      ],
    },
    {
      title: '§ 3 Zahlungsbedingungen',
      paragraphs: [
        'Rechnungen sind, sofern nicht anders vereinbart, innerhalb von 14 Tagen ab Rechnungslegung ohne Abzug zur Zahlung fällig.',
        'Bei Zahlungsverzug ist der Auftragnehmer berechtigt, nach erfolgloser Mahnung mit einer Nachfrist von 14 Tagen vom Vertrag zurückzutreten und die bereits erbrachten Leistungen anteilig in Rechnung zu stellen.',
        'Verzugszinsen richten sich nach § 1333 ABGB.',
      ],
    },
    {
      title: '§ 4 Leistungserbringung',
      paragraphs: [
        'Der Auftragnehmer beginnt mit der Leistungserbringung innerhalb von 30 Tagen nach Vertragsabschluss bzw. nach Bereitstellung der für die Leistungserbringung notwendigen Unterlagen und Mitwirkung durch den Auftraggeber.',
        'Verzögerungen, die auf eine verspätete Mitwirkung des Auftraggebers zurückzuführen sind, verlängern die Leistungsfristen entsprechend.',
      ],
    },
    {
      title: '§ 5 Laufzeit und Kündigung',
      paragraphs: [
        'Dieser Vertrag verlängert sich nach Ablauf der vereinbarten Laufzeit automatisch um jeweils denselben Zeitraum, sofern er nicht von einer der Vertragsparteien unter Einhaltung einer Kündigungsfrist von einem Monat zum Ende der Laufzeit schriftlich gekündigt wird.',
        'Eine vorzeitige ordentliche Kündigung während der laufenden Vertragslaufzeit ist ausgeschlossen. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt davon unberührt.',
      ],
    },
    {
      title: '§ 6 Vertraulichkeit und Datenschutz',
      paragraphs: [
        'Beide Vertragsparteien verpflichten sich, alle im Rahmen der Zusammenarbeit bekannt gewordenen vertraulichen Informationen streng vertraulich zu behandeln und nicht an Dritte weiterzugeben.',
        'Die Verarbeitung personenbezogener Daten erfolgt im Einklang mit der DSGVO. Nähere Informationen sind der Datenschutzerklärung des Auftragnehmers zu entnehmen, die auf Wunsch jederzeit zur Verfügung gestellt wird.',
      ],
    },
    {
      title: '§ 7 Haftung',
      paragraphs: [
        'Der Auftragnehmer haftet für Schäden nur bei Vorsatz oder grober Fahrlässigkeit. Eine Haftung für mittelbare Schäden, entgangenen Gewinn oder Folgeschäden ist ausgeschlossen, soweit gesetzlich zulässig.',
        'Höhere Gewalt sowie Umstände außerhalb der Einflussmöglichkeit des Auftragnehmers befreien diesen für die Dauer und im Umfang ihrer Auswirkung von der Leistungspflicht.',
      ],
    },
    {
      title: '§ 8 Urheberrechte und Nutzungsrechte',
      paragraphs: [
        'Der Auftragnehmer behält sämtliche Urheberrechte an den im Rahmen der Leistungserbringung erstellten Werken (insbesondere Grafiken, Texte, Konzepte, Websites). Der Auftraggeber erhält nach vollständiger Bezahlung ein einfaches, nicht-exklusives Nutzungsrecht für den vertraglich vereinbarten Zweck.',
        'Ein Recht zur Bearbeitung, Weiterentwicklung oder Übertragung der Werke an Dritte besteht nicht, sofern nicht ausdrücklich schriftlich vereinbart. Rohdaten (z. B. unbearbeitetes Bild- und Videomaterial) sind im Pauschalpreis nicht inkludiert und werden nur gegen gesonderte Vereinbarung übergeben.',
      ],
    },
    {
      title: '§ 9 Schlussbestimmungen',
      paragraphs: [
        'Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Sollte eine Bestimmung dieses Vertrages unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt; die unwirksame Bestimmung ist durch eine ihrem wirtschaftlichen Zweck möglichst nahekommende wirksame Bestimmung zu ersetzen.',
        'Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts.',
        `Für sämtliche Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag wird die ausschließliche Zuständigkeit des sachlich zuständigen Gerichts in ${GERICHTSSTAND} vereinbart.`,
        'Maßgeblich für die Auslegung dieses Vertrages ist die deutsche Sprachfassung.',
      ],
    },
  ]
}

function fulfillmentContractSections(company: CompanyInfo, contract: AccountingContract): Section[] {
  const client = company.name || 'der Auftraggeber'
  const partner = contract.party_name
  const fee = fmtPrice(contract.package_price) || 'laut Anlage 1 (Leistungs- und Vergütungsvereinbarung)'

  return [
    {
      title: '§ 1 Vertragsgegenstand und Leistungen',
      paragraphs: [
        `${client} (im Folgenden „Auftraggeber") vermittelt im eigenen Namen Kundenaufträge im Bereich digitales Marketing, Webdesign und verwandter Leistungen. Die operative Ausführung dieser Aufträge erfolgt durch die Partneragentur ${partner} (im Folgenden „Partneragentur") als selbstständige Auftragnehmerin gemäß den Bestimmungen dieses Vertrages.`,
        'Die Partneragentur ist verpflichtet, angenommene Aufträge mit der Sorgfalt eines ordentlichen Unternehmers im Sinne der §§ 1295 und 1299 ABGB auszuführen. Eine Ablehnung einzelner Aufträge ist nur aus sachlich gerechtfertigtem Grund und unverzüglich nach Übermittlung zulässig.',
      ],
    },
    {
      title: '§ 2 Vergütung',
      paragraphs: [
        `Für die vereinbarten Leistungen erhält die Partneragentur eine Pauschalvergütung gemäß Anlage 1 (Leistungs- und Vergütungsvereinbarung): ${fee}.`,
        'Die Auszahlung erfolgt innerhalb von 14 Tagen nach Zahlungseingang des Endkunden beim Auftraggeber.',
        'Verzugszinsen richten sich nach § 1333 ABGB.',
      ],
    },
    {
      title: '§ 3 Termine und Abnahme',
      paragraphs: [
        'Bei Überschreitung vereinbarter Liefertermine, die die Partneragentur zu vertreten hat, fällt eine Vertragsstrafe von 1 % der vereinbarten Pauschale pro Werktag Verzug, begrenzt auf maximal 10 % der Pauschale, an.',
        'Der Auftraggeber hat erbrachte Leistungen innerhalb von 5 Werktagen nach Übermittlung abzunehmen oder begründet zu beanstanden; andernfalls gilt die Leistung als abgenommen. Die Gewährleistung richtet sich nach § 932 ABGB.',
      ],
    },
    {
      title: '§ 4 Vertraulichkeit und Datenschutz',
      paragraphs: [
        'Beide Vertragsparteien verpflichten sich zur Geheimhaltung aller im Rahmen der Zusammenarbeit bekannt gewordenen vertraulichen Informationen; diese Verpflichtung wirkt drei Jahre über die Beendigung dieses Vertrages hinaus.',
        'Soweit die Partneragentur personenbezogene Daten von Endkunden des Auftraggebers verarbeitet, schließen die Vertragsparteien eine Vereinbarung zur Auftragsverarbeitung gemäß Art. 28 DSGVO ab.',
      ],
    },
    {
      title: '§ 5 Haftung und Versicherung',
      paragraphs: [
        'Bei Vorsatz und grober Fahrlässigkeit haftet die Partneragentur unbeschränkt. Bei leichter Fahrlässigkeit haftet sie nur für die Verletzung wesentlicher Vertragspflichten und der Höhe nach begrenzt auf den vereinbarten Auftragswert.',
        'Die Partneragentur hat eine aufrechte Betriebshaftpflichtversicherung mit einer Deckungssumme von mindestens € 5.000.000,- nachzuweisen.',
      ],
    },
    {
      title: '§ 6 Rechte an Leistungen',
      paragraphs: [
        'Sämtliche im Rahmen der Auftragsausführung erstellten Werke gehen mit vollständiger Bezahlung gemäß § 16 UrhG in das uneingeschränkte Nutzungs- und Verwertungsrecht des Auftraggebers über, der sie wiederum im Verhältnis zu seinen Endkunden vertraglich weitergibt.',
      ],
    },
    {
      title: '§ 7 Wettbewerbsverbot',
      paragraphs: [
        'Die Partneragentur verpflichtet sich, für die Dauer von 24 Monaten nach Beendigung dieses Vertrages keine Endkunden, die ihr im Rahmen dieser Zusammenarbeit vom Auftraggeber vermittelt wurden, direkt oder über Dritte zu akquirieren oder zu betreuen. Davon ausgenommen sind Kunden, die bereits vor Beginn dieser Zusammenarbeit eigene Kunden der Partneragentur waren.',
        'Bei Verstoß gegen diese Bestimmung wird eine verschuldensunabhängige Konventionalstrafe von € 10.000,- pro Verstoß vereinbart, unbeschadet des Rechts auf Geltendmachung eines darüber hinausgehenden Schadens.',
      ],
    },
    {
      title: '§ 8 Laufzeit und Kündigung',
      paragraphs: [
        'Dieser Vertrag wird auf unbestimmte Zeit geschlossen und kann von jeder Vertragspartei unter Einhaltung einer Kündigungsfrist von drei Monaten zum Ende eines Kalenderquartals schriftlich gekündigt werden.',
        'Das Recht zur außerordentlichen Kündigung aus wichtigem Grund gemäß § 918 ABGB bleibt unberührt.',
      ],
    },
    {
      title: '§ 9 Schlussbestimmungen',
      paragraphs: [
        'Änderungen dieses Vertrages bedürfen der Schriftform. Salvatorische Klausel gemäß § 863a ABGB: Die Unwirksamkeit einzelner Bestimmungen berührt die Wirksamkeit der übrigen Bestimmungen nicht.',
        'Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts.',
        `Für sämtliche Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag wird die ausschließliche Zuständigkeit des sachlich zuständigen Gerichts in ${GERICHTSSTAND} vereinbart.`,
        'Anlage 1 (Leistungs- und Vergütungsvereinbarung) ist integrierender Bestandteil dieses Vertrages.',
      ],
    },
  ]
}

function agentContractSections(company: CompanyInfo, contract: AccountingContract): Section[] {
  const firm = company.name || 'das Unternehmen'
  const agent = contract.party_name

  return [
    {
      title: '§ 1 Vertragsgegenstand',
      paragraphs: [
        `${firm} (im Folgenden „Unternehmen") betraut ${agent} (im Folgenden „Handelsagent") im Sinne des § 1 HVertrG als selbstständigen Handelsvertreter mit der Vermittlung von Geschäften für das Unternehmen.`,
        'Der Handelsagent ist berechtigt, Kunden weltweit zu akquirieren. Eine direkte Kontaktaufnahme zu vom Unternehmen bereits betreuten Kunden zur Umgehung dieses Vertrages ist untersagt.',
      ],
    },
    {
      title: '§ 2 Aufgaben und Pflichten des Unternehmens',
      paragraphs: [
        'Das Unternehmen stellt dem Handelsagenten die für die Vermittlungstätigkeit erforderlichen Unterlagen und Vollmachten zur Verfügung.',
        'Das Unternehmen teilt dem Handelsagenten innerhalb von 14 Tagen mit, ob ein vermitteltes Geschäft angenommen oder abgelehnt wird; erfolgt binnen eines Monats keine Mitteilung, gilt das Geschäft als abgelehnt.',
        'Erfüllungsort für Mitteilungen an den Handelsagenten ist dessen Firmensitz.',
      ],
    },
    {
      title: '§ 3 Aufgaben und Pflichten des Handelsagenten',
      paragraphs: [
        'Der Handelsagent hat seine Tätigkeit mit der Sorgfalt eines ordentlichen Unternehmers auszuüben und dem Unternehmen monatlich über seine Tätigkeit zu berichten.',
        'Der Handelsagent ist für seine steuerlichen, gewerberechtlichen und sozialversicherungsrechtlichen Verpflichtungen selbst verantwortlich. Eine Haftung für die Zahlungsfähigkeit vermittelter Kunden besteht nicht.',
        'Die Beauftragung von Subagenten bedarf der vorherigen schriftlichen Zustimmung des Unternehmens. Verhinderungen sind dem Unternehmen binnen 7 Tagen zu melden.',
      ],
    },
    {
      title: '§ 4 Karriereplan und Aktivstatus',
      paragraphs: [
        'Der jeweils gültige Karriereplan ist integrierender Bestandteil dieses Vertrages und regelt Einstufung, Provisionsstufen und Aktivstatus des Handelsagenten.',
        'Bleibt der Handelsagent über zwei aufeinanderfolgende Quartale ohne Aktivstatus, erfolgt eine Abstufung gemäß Karriereplan.',
      ],
    },
    {
      title: '§ 5 Provision und Provisionsabrechnung',
      paragraphs: [
        'Der Provisionsanspruch entsteht mit Rechtswirksamkeit des vermittelten Geschäfts, die Auszahlung erfolgt jedoch erst nach Zahlungseingang des Kunden beim Unternehmen; bei Ratenzahlung anteilig je geleisteter Rate.',
        'Die Provisionsabrechnung erfolgt monatlich samt Buchauszug bis zum letzten Tag des Folgemonats; die Auszahlung erfolgt jeweils zum 15. des Monats. Beide Vertragsparteien können die Abrechnung innerhalb von vier Wochen beanstanden.',
        'Übt der Handelsagent eine Kleinunternehmerregelung aus, hat er eine drohende Überschreitung der relevanten Umsatzgrenze dem Unternehmen unverzüglich, spätestens binnen 14 Tagen, mitzuteilen; er haftet für Schäden aus der Verletzung dieser Meldepflicht.',
      ],
    },
    {
      title: '§ 6 Freiwillige widerrufliche Prämien',
      paragraphs: [
        'Für die Akquise neuer, aktiver Handelsagenten kann das Unternehmen eine freiwillige Prämie gewähren, sofern der neu akquirierte Agent binnen zwei Monaten einen Geschäftsabschluss erbringt. Die Feststellung der Anspruchsvoraussetzungen obliegt dem Unternehmen; ein Rechtsanspruch besteht nicht.',
      ],
    },
    {
      title: '§ 7 Kundenstock',
      paragraphs: [
        'Bestandskunden, die der Handelsagent bereits vor Beginn dieser Zusammenarbeit selbst betreut hat, bleiben von den Bestimmungen dieses Vertrages über den Kundenstock unberührt und sind im Einzelfall gesondert zu dokumentieren.',
      ],
    },
    {
      title: '§ 8 Vertragsdauer und Kündigung',
      paragraphs: [
        'Dieser Vertrag wird auf unbestimmte Zeit geschlossen. Die Kündigungsfrist beträgt gestaffelt nach Vertragsjahren ein bis sechs Monate und ist mittels eingeschriebenem Brief zu erklären.',
        'Eine außerordentliche Kündigung aus wichtigem Grund gemäß § 22 HVertrG bleibt unberührt. Ein Ausgleichsanspruch des Handelsagenten richtet sich nach § 24 HVertrG.',
        'Nach Vertragsende sind sämtliche überlassenen Unterlagen unverzüglich zurückzustellen.',
      ],
    },
    {
      title: '§ 9 Geschäfts- und Betriebsgeheimnisse',
      paragraphs: [
        'Der Handelsagent ist auch nach Vertragsende zur Verschwiegenheit über Geschäfts- und Betriebsgeheimnisse verpflichtet und darf Kundenlisten des Unternehmens nach Vertragsende nicht verwenden.',
        'Bei Verstoß wird eine verschuldensunabhängige Konventionalstrafe von € 10.000,- vereinbart, ohne dass dem Gericht ein richterliches Mäßigungsrecht zukommt, soweit gesetzlich zulässig.',
      ],
    },
    {
      title: '§ 10 Wettbewerbsverbot',
      paragraphs: [
        'Während der Vertragslaufzeit ist dem Handelsagenten jede Konkurrenztätigkeit untersagt; bei Verstoß wird eine Konventionalstrafe von € 10.000,- pro Verstoß vereinbart.',
        'Für 12 Monate nach Vertragsende ist dem Handelsagenten das Abwerben von Mitarbeitern und Kunden des Unternehmens untersagt; bei Verstoß wird je eine Konventionalstrafe von € 5.000,- vereinbart.',
      ],
    },
    {
      title: '§ 11 Haftung',
      paragraphs: [
        'Der Handelsagent haftet dem Unternehmen gegenüber für Schäden, die er vorsätzlich oder grob fahrlässig verursacht, unbeschränkt; für leichte Fahrlässigkeit nur im Rahmen der Verletzung wesentlicher Vertragspflichten.',
      ],
    },
    {
      title: '§ 12 Rechtswahl und Gerichtsstand',
      paragraphs: [
        'Es gilt österreichisches Recht unter Ausschluss der Verweisungsnormen des IPRG und des UN-Kaufrechts (CISG).',
        `Für sämtliche Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag wird die ausschließliche Zuständigkeit des sachlich zuständigen Gerichts in ${GERICHTSSTAND} vereinbart.`,
      ],
    },
    {
      title: '§ 13 Schlussbestimmungen',
      paragraphs: [
        'Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Mit Inkrafttreten dieses Vertrages treten alle vorherigen Vereinbarungen zwischen den Vertragsparteien zu diesem Gegenstand außer Kraft.',
        'Der Karriereplan ist integrierender Bestandteil dieses Vertrages.',
      ],
    },
  ]
}

const TITLES: Record<AccountingContract['contract_type'], { title: string; roleA: string; roleB: string; greeting: string }> = {
  service: { title: 'Dienstleistungsvertrag', roleA: 'Auftragnehmer', roleB: 'Auftraggeber / Kunde', greeting: 'Dienstleistungsvertrag gemäß nachfolgenden Bestimmungen' },
  fulfillment: { title: 'Kooperations- und Fulfillmentvertrag', roleA: 'Auftraggeber', roleB: 'Partneragentur', greeting: 'Kooperations- und Fulfillmentvertrag gemäß nachfolgenden Bestimmungen' },
  agent: { title: 'Handelsagentenvertrag', roleA: 'Unternehmen', roleB: 'Handelsagent', greeting: 'Handelsagentenvertrag gemäß § 1 HVertrG' },
}

export function ContractPdf({ contract, company }: { contract: AccountingContract; company: CompanyInfo }) {
  const meta = TITLES[contract.contract_type]
  const sections = contract.contract_type === 'service'
    ? serviceContractSections(company, contract)
    : contract.contract_type === 'fulfillment'
      ? fulfillmentContractSections(company, contract)
      : agentContractSections(company, contract)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header
          company={company}
          title={meta.title}
          subtitle={`Vertrags-Nr. ${contract.contract_number} · ${fmtDate(contract.start_date || contract.created_at)}${contract.linked_quote_number ? ` · Bezug: Angebot ${contract.linked_quote_number}${contract.linked_quote_date ? ` vom ${fmtDate(contract.linked_quote_date)}` : ''}` : ''}`}
        />
        <Parties roleA={meta.roleA} roleB={meta.roleB} company={company} contract={contract} />
        <Text style={styles.preamble}>
          Zwischen den oben angeführten Vertragsparteien wird einvernehmlich folgender {meta.greeting} geschlossen:
        </Text>
        <Sections sections={sections} />
        {contract.notes && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Ergänzende Vereinbarungen</Text>
            <Text style={styles.paragraph}>{contract.notes}</Text>
          </View>
        )}
        <SignatureBlock roleA={meta.roleA} roleB={meta.roleB} />
        <Footer company={company} showBank={contract.contract_type !== 'agent'} />
      </Page>
    </Document>
  )
}
