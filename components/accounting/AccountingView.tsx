'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, FileText, TrendingUp, TrendingDown, Wallet,
  Download, Trash2, ChevronDown, Image as ImageIcon, Eye, EyeOff, Calculator,
} from 'lucide-react'
import type { AccountingDocument, AccountingReceipt, DocType, DocStatus, ReceiptType } from '@/lib/types'
import { DocumentModal } from './DocumentModal'
import { ReceiptModal } from './ReceiptModal'
import { PdfPreviewModal } from './PdfPreviewModal'
import { useClickOutside } from '@/lib/useClickOutside'
import { useRef } from 'react'

type Tab = 'invoices' | 'quotes' | 'receipts' | 'closings' | 'overview'

const TABS: { id: Tab; label: string }[] = [
  { id: 'invoices',  label: 'Rechnungen' },
  { id: 'quotes',    label: 'Angebote' },
  { id: 'receipts',  label: 'Belege' },
  { id: 'closings',  label: 'Abschlüsse' },
  { id: 'overview',  label: 'Übersicht' },
]

const ASSUMED_EXPENSE_VAT_RATE = 20

type PeriodMode = 'month' | 'quarter' | 'year'

const STATUS_LABELS: Record<DocStatus, string> = {
  draft: 'Entwurf', sent: 'Versendet', paid: 'Bezahlt', overdue: 'Überfällig',
}
const STATUS_STYLES: Record<DocStatus, string> = {
  draft:   'bg-white/8 text-white/40',
  sent:    'bg-white/14 text-white/70',
  paid:    'bg-accent-green/20 text-accent-green',
  overdue: 'bg-accent/20 text-accent',
}
const RECEIPT_TYPE_LABELS: Record<ReceiptType, string> = {
  expense: 'Ausgabe', cash: 'Barrechnung', income_other: 'Einnahme',
}

function fmtMoney(n: number): string {
  return n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fmtDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function docTotal(doc: AccountingDocument): number {
  const subtotal = (doc.line_items ?? []).reduce((s, i) => s + i.qty * i.unit_price, 0)
  return subtotal * (1 + doc.tax_rate / 100)
}

function StatusPicker({ status, onChange }: { status: DocStatus; onChange: (s: DocStatus) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button" onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${STATUS_STYLES[status]}`}
      >
        {STATUS_LABELS[status]}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-20 bg-panel-hover rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 p-1 min-w-32">
          {(Object.keys(STATUS_LABELS) as DocStatus[]).map(s => (
            <button
              key={s} type="button" onClick={() => { onChange(s); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/8 transition-colors ${s === status ? 'text-accent font-bold' : 'text-white/60'}`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value, tone = 'default' }: { icon: React.ReactNode; label: string; value: string; tone?: 'default' | 'green' | 'accent' }) {
  return (
    <div className="bg-panel rounded-2xl p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
        tone === 'green' ? 'bg-accent-green/15 text-accent-green' : tone === 'accent' ? 'bg-accent/15 text-accent' : 'bg-white/8 text-white/50'
      }`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
      <p className="text-xs text-white/35 mt-1 font-medium">{label}</p>
    </div>
  )
}

export function AccountingView() {
  const [tab, setTab] = useState<Tab>('invoices')
  const [documents, setDocuments] = useState<AccountingDocument[]>([])
  const [receipts, setReceipts]   = useState<AccountingReceipt[]>([])
  const [loading, setLoading]     = useState(true)
  const [docModal, setDocModal]   = useState<{ type: DocType; doc?: AccountingDocument } | null>(null)
  const [receiptModal, setReceiptModal] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<AccountingDocument | null>(null)
  const [kpiVisible, setKpiVisible] = useState(false)

  const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
  const now = new Date()
  const [periodYear, setPeriodYear]   = useState(now.getFullYear())
  const [periodMonth, setPeriodMonth] = useState(now.getMonth()) // 0-11
  const [periodQuarter, setPeriodQuarter] = useState(Math.floor(now.getMonth() / 3)) // 0-3

  async function loadAll() {
    setLoading(true)
    try {
      const [docsRes, receiptsRes] = await Promise.all([
        fetch('/api/accounting/documents').then(r => r.json()),
        fetch('/api/accounting/receipts').then(r => r.json()),
      ])
      setDocuments(docsRes.documents ?? [])
      setReceipts(receiptsRes.receipts ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const invoices = useMemo(() => documents.filter(d => d.doc_type === 'invoice'), [documents])
  const quotes   = useMemo(() => documents.filter(d => d.doc_type === 'quote'), [documents])

  const totals = useMemo(() => {
    const year = new Date().getFullYear()
    const inYear = (d: string) => new Date(d).getFullYear() === year
    const incomePaid = invoices.filter(d => d.status === 'paid' && inYear(d.issue_date)).reduce((s, d) => s + docTotal(d), 0)
    const incomeOpen = invoices.filter(d => d.status !== 'paid' && inYear(d.issue_date)).reduce((s, d) => s + docTotal(d), 0)
    const expenses = receipts.filter(r => r.receipt_type === 'expense' && inYear(r.date)).reduce((s, r) => s + r.amount, 0)
    return { incomePaid, incomeOpen, expenses, profit: incomePaid - expenses }
  }, [invoices, receipts])

  const availableYears = useMemo(() => {
    const years = new Set<number>([now.getFullYear()])
    documents.forEach(d => years.add(new Date(d.issue_date).getFullYear()))
    receipts.forEach(r => years.add(new Date(r.date).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }, [documents, receipts])

  const closing = useMemo(() => {
    let inPeriod: (isoDate: string) => boolean
    let label: string
    if (periodMode === 'month') {
      inPeriod = iso => { const d = new Date(iso); return d.getFullYear() === periodYear && d.getMonth() === periodMonth }
      label = new Date(periodYear, periodMonth, 1).toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })
    } else if (periodMode === 'quarter') {
      const startM = periodQuarter * 3
      inPeriod = iso => { const d = new Date(iso); return d.getFullYear() === periodYear && d.getMonth() >= startM && d.getMonth() < startM + 3 }
      label = `Q${periodQuarter + 1} ${periodYear}`
    } else {
      inPeriod = iso => new Date(iso).getFullYear() === periodYear
      label = `${periodYear}`
    }

    const periodInvoices = invoices.filter(d => d.status === 'paid' && inPeriod(d.issue_date))
    const revenueGross = periodInvoices.reduce((s, d) => s + docTotal(d), 0)
    const revenueNet = periodInvoices.reduce((s, d) => s + (d.line_items ?? []).reduce((x, i) => x + i.qty * i.unit_price, 0), 0)
    const vatCollected = revenueGross - revenueNet

    const periodExpenses = receipts.filter(r => r.receipt_type === 'expense' && inPeriod(r.date))
    const expensesGross = periodExpenses.reduce((s, r) => s + r.amount, 0)
    const vorsteuer = expensesGross * (ASSUMED_EXPENSE_VAT_RATE / (100 + ASSUMED_EXPENSE_VAT_RATE))
    const expensesNet = expensesGross - vorsteuer

    const vatPayable = vatCollected - vorsteuer
    const profitBeforeTax = revenueNet - expensesNet

    return {
      label, revenueGross, revenueNet, vatCollected,
      expensesGross, expensesNet, vorsteuer, vatPayable, profitBeforeTax,
      invoiceCount: periodInvoices.length, receiptCount: periodExpenses.length,
    }
  }, [invoices, receipts, periodMode, periodYear, periodMonth, periodQuarter])

  function nextNumberHint(type: DocType): string {
    const year = new Date().getFullYear()
    const prefix = type === 'invoice' ? 'RE' : 'AN'
    const existing = documents.filter(d => d.doc_type === type && d.doc_number.startsWith(`${prefix}-${year}-`))
    const max = existing.reduce((m, d) => {
      const n = parseInt(d.doc_number.split('-').pop() || '0', 10)
      return Math.max(m, n)
    }, 0)
    return `${prefix}-${year}-${String(max + 1).padStart(3, '0')}`
  }

  async function updateDocStatus(id: string, status: DocStatus) {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status } : d))
    await fetch('/api/accounting/documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
  }

  async function deleteDoc(id: string) {
    if (!confirm('Dokument wirklich löschen?')) return
    setDocuments(prev => prev.filter(d => d.id !== id))
    await fetch(`/api/accounting/documents?id=${id}`, { method: 'DELETE' })
  }

  async function deleteReceipt(id: string) {
    if (!confirm('Beleg wirklich löschen?')) return
    setReceipts(prev => prev.filter(r => r.id !== id))
    await fetch(`/api/accounting/receipts?id=${id}`, { method: 'DELETE' })
  }

  function DocList({ docs, type }: { docs: AccountingDocument[]; type: DocType }) {
    if (docs.length === 0) {
      return (
        <div className="bg-panel rounded-2xl py-16 text-center">
          <p className="text-white/40 text-sm font-medium">Noch keine {type === 'invoice' ? 'Rechnungen' : 'Angebote'}.</p>
        </div>
      )
    }
    return (
      <div className="bg-panel rounded-2xl overflow-visible">
        <ul className="overflow-visible">
          {docs.map((doc, i) => (
            <li key={doc.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i < docs.length - 1 ? 'border-b border-panel-2' : ''}`}>
              <button
                onClick={() => setPreviewDoc(doc)}
                className="min-w-0 flex-1 text-left"
                title="Vorschau anzeigen"
              >
                <p className="text-sm font-semibold text-white truncate">{doc.client_name}</p>
                <p className="text-xs text-white/35 mt-0.5">{doc.doc_number} · {fmtDate(doc.issue_date)}</p>
              </button>
              <p className="text-sm font-bold text-white shrink-0 hidden sm:block">{fmtMoney(docTotal(doc))}</p>
              <StatusPicker status={doc.status} onChange={s => updateDocStatus(doc.id, s)} />
              <button
                onClick={() => setPreviewDoc(doc)}
                title="Vorschau"
                className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
              >
                <Eye size={13} />
              </button>
              <a
                href={`/api/accounting/documents/${doc.id}/pdf?dl=1`}
                title="PDF herunterladen"
                className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
              >
                <Download size={13} />
              </a>
              <button
                onClick={() => setDocModal({ type, doc })}
                title="Bearbeiten"
                className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
              >
                <FileText size={13} />
              </button>
              <button
                onClick={() => deleteDoc(doc.id)}
                title="Löschen"
                className="w-8 h-8 rounded-full bg-white/6 hover:bg-accent/20 flex items-center justify-center text-white/30 hover:text-accent transition-all shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">Buchhaltung</h1>
          <p className="text-sm text-white/30 mt-2 font-medium">Rechnungen, Angebote & Belege</p>
        </div>
        {tab === 'invoices' && (
          <button onClick={() => setDocModal({ type: 'invoice' })} className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95">
            <Plus size={16} /><span className="hidden sm:inline">Neue Rechnung</span>
          </button>
        )}
        {tab === 'quotes' && (
          <button onClick={() => setDocModal({ type: 'quote' })} className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95">
            <Plus size={16} /><span className="hidden sm:inline">Neues Angebot</span>
          </button>
        )}
        {tab === 'receipts' && (
          <button onClick={() => setReceiptModal(true)} className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95">
            <Plus size={16} /><span className="hidden sm:inline">Beleg hinzufügen</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-accent text-white' : 'bg-panel text-white/40 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-white/30 text-center py-16 font-medium">Lädt…</p>
      ) : tab === 'overview' ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-white/30 uppercase tracking-wide">Kennzahlen</h2>
            <button
              onClick={() => setKpiVisible(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-white/35 hover:text-white transition-colors"
            >
              {kpiVisible ? <EyeOff size={13} /> : <Eye size={13} />}
              {kpiVisible ? 'Verbergen' : 'Anzeigen'}
            </button>
          </div>

          {kpiVisible ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={<TrendingUp size={16} />} label="Einnahmen (bezahlt)" value={fmtMoney(totals.incomePaid)} tone="green" />
              <KpiCard icon={<Wallet size={16} />} label="Offene Rechnungen" value={fmtMoney(totals.incomeOpen)} />
              <KpiCard icon={<TrendingDown size={16} />} label="Ausgaben" value={fmtMoney(totals.expenses)} tone="accent" />
              <KpiCard icon={<TrendingUp size={16} />} label="Gewinn (dieses Jahr)" value={fmtMoney(totals.profit)} tone={totals.profit >= 0 ? 'green' : 'accent'} />
            </div>
          ) : (
            <button
              onClick={() => setKpiVisible(true)}
              className="w-full bg-panel rounded-2xl py-8 flex flex-col items-center justify-center gap-2 text-white/20 hover:text-white/40 transition-colors"
            >
              <Eye size={20} />
              <span className="text-xs font-bold">Kennzahlen ausgeblendet — klicken zum Anzeigen</span>
            </button>
          )}

          <div className="bg-panel rounded-2xl p-6">
            <h2 className="text-sm font-black text-white mb-4">Letzte Belege & Rechnungen</h2>
            {[...documents, ...receipts.map(r => ({ ...r, _isReceipt: true }))]
              .sort((a: any, b: any) => new Date(b.created_at ?? b.issue_date).getTime() - new Date(a.created_at ?? a.issue_date).getTime())
              .slice(0, 8)
              .map((item: any, i) => (
                <div key={item.id} className={`flex items-center justify-between py-2.5 ${i > 0 ? 'border-t border-panel-2' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {item._isReceipt ? (item.vendor || RECEIPT_TYPE_LABELS[item.receipt_type as ReceiptType]) : item.client_name}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">{fmtDate(item._isReceipt ? item.date : item.issue_date)}</p>
                  </div>
                  <p className={`text-sm font-bold shrink-0 ${item._isReceipt ? 'text-accent' : 'text-accent-green'}`}>
                    {item._isReceipt ? '−' : '+'}{fmtMoney(item._isReceipt ? item.amount : docTotal(item))}
                  </p>
                </div>
              ))}
            {documents.length === 0 && receipts.length === 0 && (
              <p className="text-sm text-white/35 text-center py-6 font-medium">Noch keine Einträge.</p>
            )}
          </div>
        </div>
      ) : tab === 'closings' ? (
        <div className="space-y-5">
          <div className="bg-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={14} className="text-white/30" />
              <h2 className="text-sm font-black text-white">Zeitraum</h2>
            </div>
            <div className="flex gap-1.5 mb-4">
              {([['month', 'Monat'], ['quarter', 'Quartal'], ['year', 'Jahr']] as [PeriodMode, string][]).map(([m, l]) => (
                <button
                  key={m} onClick={() => setPeriodMode(m)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    periodMode === m ? 'bg-accent text-white' : 'bg-dark text-white/35 hover:text-white/70'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {periodMode === 'month' && Array.from({ length: 12 }, (_, i) => i).map(m => (
                <button
                  key={m} onClick={() => setPeriodMonth(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    periodMonth === m ? 'bg-accent text-white' : 'bg-dark text-white/35 hover:text-white/70'
                  }`}
                >
                  {new Date(2000, m, 1).toLocaleDateString('de-AT', { month: 'short' })}
                </button>
              ))}
              {periodMode === 'quarter' && [0, 1, 2, 3].map(q => (
                <button
                  key={q} onClick={() => setPeriodQuarter(q)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    periodQuarter === q ? 'bg-accent text-white' : 'bg-dark text-white/35 hover:text-white/70'
                  }`}
                >
                  Q{q + 1}
                </button>
              ))}
              {periodMode !== 'year' && (
                <select
                  value={periodYear}
                  onChange={e => setPeriodYear(parseInt(e.target.value, 10))}
                  className="bg-dark text-white text-xs font-bold rounded-xl px-3 py-1.5 outline-none"
                >
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
              {periodMode === 'year' && availableYears.map(y => (
                <button
                  key={y} onClick={() => setPeriodYear(y)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    periodYear === y ? 'bg-accent text-white' : 'bg-dark text-white/35 hover:text-white/70'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-panel rounded-2xl p-6">
            <h2 className="text-sm font-black text-white mb-1">Abschluss · {closing.label}</h2>
            <p className="text-xs text-white/30 mb-5">{closing.invoiceCount} bezahlte Rechnung(en) · {closing.receiptCount} Ausgabenbeleg(e)</p>

            <div className="space-y-2.5">
              {[
                ['Umsatz netto', closing.revenueNet, false],
                ['Umsatzsteuer (USt.)', closing.vatCollected, false],
                ['Umsatz brutto', closing.revenueGross, true],
                ['Ausgaben netto', -closing.expensesNet, false],
                ['Vorsteuer', -closing.vorsteuer, false],
                ['Ausgaben brutto', -closing.expensesGross, true],
              ].map(([label, val, bold], i) => (
                <div key={i} className={`flex items-center justify-between py-2 ${bold ? 'border-t border-panel-2 pt-2.5' : ''}`}>
                  <span className={`text-sm ${bold ? 'font-bold text-white' : 'text-white/50'}`}>{label as string}</span>
                  <span className={`text-sm font-bold ${(val as number) < 0 ? 'text-accent' : 'text-white'}`}>
                    {(val as number) < 0 ? '−' : ''}{fmtMoney(Math.abs(val as number))}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between py-2.5 border-t border-panel-2 pt-3">
                <span className="text-sm font-bold text-white">USt-Zahllast</span>
                <span className={`text-sm font-black ${closing.vatPayable >= 0 ? 'text-accent' : 'text-accent-green'}`}>
                  {fmtMoney(closing.vatPayable)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-base font-black text-white">Gewinn vor Steuern</span>
                <span className={`text-base font-black ${closing.profitBeforeTax >= 0 ? 'text-accent-green' : 'text-accent'}`}>
                  {fmtMoney(closing.profitBeforeTax)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : tab === 'invoices' ? (
        <DocList docs={invoices} type="invoice" />
      ) : tab === 'quotes' ? (
        <DocList docs={quotes} type="quote" />
      ) : (
        <div className="bg-panel rounded-2xl overflow-hidden">
          {receipts.length === 0 ? (
            <div className="py-16 text-center"><p className="text-white/40 text-sm font-medium">Noch keine Belege.</p></div>
          ) : (
            <ul>
              {receipts.map((r, i) => (
                <li key={r.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i < receipts.length - 1 ? 'border-b border-panel-2' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{r.vendor || RECEIPT_TYPE_LABELS[r.receipt_type]}</p>
                    <p className="text-xs text-white/35 mt-0.5">{fmtDate(r.date)}{r.category ? ` · ${r.category}` : ''}</p>
                  </div>
                  <p className="text-sm font-bold text-accent shrink-0">{fmtMoney(r.amount)}</p>
                  {r.file_path && (
                    <a
                      href={`/api/accounting/receipts/${r.id}/file`} target="_blank" rel="noopener noreferrer"
                      title="Beleg ansehen"
                      className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
                    >
                      <ImageIcon size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => deleteReceipt(r.id)}
                    title="Löschen"
                    className="w-8 h-8 rounded-full bg-white/6 hover:bg-accent/20 flex items-center justify-center text-white/30 hover:text-accent transition-all shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {docModal && (
        <DocumentModal
          docType={docModal.type}
          doc={docModal.doc}
          nextNumberHint={docModal.doc ? undefined : nextNumberHint(docModal.type)}
          onClose={() => setDocModal(null)}
          onSaved={() => { setDocModal(null); loadAll() }}
        />
      )}
      {receiptModal && (
        <ReceiptModal
          onClose={() => setReceiptModal(false)}
          onSaved={() => { setReceiptModal(false); loadAll() }}
        />
      )}
      {previewDoc && (
        <PdfPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  )
}
