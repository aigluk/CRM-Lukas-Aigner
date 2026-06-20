'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, FileText, TrendingUp, TrendingDown, Wallet,
  Download, Trash2, ChevronDown, ChevronLeft, ChevronRight, Image as ImageIcon, Eye, EyeOff, Calculator,
  AlertTriangle, ShieldCheck, Landmark, Loader2,
} from 'lucide-react'
import type { AccountingDocument, AccountingReceipt, DocType, DocStatus, ReceiptType } from '@/lib/types'
import type { CompanyInfo } from '@/lib/pdf/DocumentPdf'
import type { ClosingPdfData } from '@/lib/pdf/ClosingPdf'
import { DocumentModal } from './DocumentModal'
import { ReceiptModal } from './ReceiptModal'
import { PdfPreviewModal } from './PdfPreviewModal'
import { useClickOutside } from '@/lib/useClickOutside'
import { useRef } from 'react'

type Tab = 'invoices' | 'quotes' | 'receipts' | 'closings' | 'overview'

type MonthPeriod = { month: number; year: number }
type ListPeriod = 'all' | 'heute' | MonthPeriod | number

const MONTHS_SHORT = ['Jän','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

function inListPeriod(dateStr: string | undefined, period: ListPeriod): boolean {
  if (period === 'all') return true
  const d = new Date(dateStr || '')
  if (isNaN(d.getTime())) return false
  if (period === 'heute') return d.toDateString() === new Date().toDateString()
  if (typeof period === 'object') return d.getMonth() === period.month && d.getFullYear() === period.year
  return d.getFullYear() === period
}

function ListMonthDropdown({ period, onSelect }: { period: ListPeriod; onSelect: (p: MonthPeriod) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))
  const isActive = typeof period === 'object'
  const activeMonth = isActive ? (period as MonthPeriod).month : new Date().getMonth()
  const [pickerYear, setPickerYear] = useState(() => isActive ? (period as MonthPeriod).year : new Date().getFullYear())

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
          isActive ? 'bg-accent text-white' : 'bg-dark text-white/40 hover:text-white/70'
        }`}
      >
        {isActive ? `${MONTHS_SHORT[activeMonth]} ${(period as MonthPeriod).year}` : 'Monat'}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#2a2a2a] rounded-xl z-20 shadow-xl border border-white/8 p-2 min-w-40">
          <div className="flex items-center justify-between mb-2 px-1">
            <button onClick={() => setPickerYear(y => y - 1)} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/8"><ChevronLeft size={13} /></button>
            <span className="text-xs font-bold text-white/70">{pickerYear}</span>
            <button onClick={() => setPickerYear(y => y + 1)} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/8"><ChevronRight size={13} /></button>
          </div>
          <div className="grid grid-cols-4 gap-0.5">
            {MONTHS_SHORT.map((m, i) => (
              <button
                key={m}
                onClick={() => { onSelect({ month: i, year: pickerYear }); setOpen(false) }}
                className={`text-[11px] font-semibold py-1.5 rounded-lg transition-all ${
                  isActive && i === activeMonth && (period as MonthPeriod).year === pickerYear ? 'bg-accent text-white' : 'text-white/55 hover:text-white hover:bg-white/8'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ListYearDropdown({ year, isActive, onSelect }: { year: number; isActive: boolean; onSelect: (y: number) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))
  const current = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => current - i)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { onSelect(year); setOpen(o => !o) }}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
          isActive ? 'bg-accent text-white' : 'bg-dark text-white/40 hover:text-white/70'
        }`}
      >
        {year} <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#2a2a2a] rounded-xl overflow-hidden z-20 shadow-xl border border-white/8 min-w-20">
          {years.map(y => (
            <button
              key={y}
              onClick={() => { onSelect(y); setOpen(false) }}
              className={`block w-full text-left px-4 py-2.5 text-xs font-semibold transition-all ${
                y === year && isActive ? 'text-accent' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ListPeriodFilter({ period, onChange }: { period: ListPeriod; onChange: (p: ListPeriod) => void }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onChange('all')}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${period === 'all' ? 'bg-accent text-white' : 'bg-dark text-white/40 hover:text-white/70'}`}
      >
        Alle
      </button>
      <button
        onClick={() => onChange('heute')}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${period === 'heute' ? 'bg-accent text-white' : 'bg-dark text-white/40 hover:text-white/70'}`}
      >
        Heute
      </button>
      <ListMonthDropdown period={period} onSelect={p => onChange(p)} />
      <ListYearDropdown
        year={selectedYear}
        isActive={typeof period === 'number'}
        onSelect={y => { setSelectedYear(y); onChange(y) }}
      />
    </div>
  )
}

const KU_LIMIT = 55000
const KU_TOLERANCE = 60500
const SVS_RATE = 0.2683

const INCOME_TAX_BRACKETS_AT: [number, number, number][] = [
  [0, 13539, 0],
  [13539, 21992, 0.20],
  [21992, 36458, 0.30],
  [36458, 70365, 0.40],
  [70365, 104859, 0.48],
  [104859, 1000000, 0.50],
  [1000000, Infinity, 0.55],
]

function estimateIncomeTaxAT(taxable: number): number {
  if (taxable <= 0) return 0
  let tax = 0
  for (const [lo, hi, rate] of INCOME_TAX_BRACKETS_AT) {
    if (taxable <= lo) break
    tax += (Math.min(taxable, hi) - lo) * rate
  }
  return tax
}

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
  const [company, setCompany] = useState<CompanyInfo>({})
  const [listPeriod, setListPeriod] = useState<ListPeriod>('all')
  const [exportingPdf, setExportingPdf] = useState(false)

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

  useEffect(() => {
    loadAll()
    fetch('/api/company').then(r => r.json()).then(d => setCompany(d.company ?? {})).catch(() => {})
  }, [])

  const invoices = useMemo(() => documents.filter(d => d.doc_type === 'invoice'), [documents])
  const quotes   = useMemo(() => documents.filter(d => d.doc_type === 'quote'), [documents])

  const listInvoices = useMemo(() => invoices.filter(d => inListPeriod(d.issue_date, listPeriod)), [invoices, listPeriod])
  const listQuotes   = useMemo(() => quotes.filter(d => inListPeriod(d.issue_date, listPeriod)), [quotes, listPeriod])
  const listReceipts = useMemo(() => receipts.filter(r => inListPeriod(r.date, listPeriod)), [receipts, listPeriod])

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

    const smallBusinessActive = !!company.small_business
    const vatPayable = smallBusinessActive ? 0 : vatCollected - vorsteuer
    const profitBeforeTax = revenueNet - expensesNet

    // Kleinunternehmer-Grenze bezieht sich immer auf das volle Kalenderjahr, unabhängig vom gewählten Zeitraum
    const ytdRevenueGross = invoices
      .filter(d => d.status === 'paid' && new Date(d.issue_date).getFullYear() === periodYear)
      .reduce((s, d) => s + docTotal(d), 0)

    const annualizeFactor = periodMode === 'month' ? 12 : periodMode === 'quarter' ? 4 : 1
    const annualizedProfit = profitBeforeTax * annualizeFactor
    const estimatedAnnualIncomeTax = estimateIncomeTaxAT(Math.max(0, annualizedProfit))
    const estimatedIncomeTax = estimatedAnnualIncomeTax / annualizeFactor
    const estimatedQuarterlyPrepayment = estimatedAnnualIncomeTax / 4

    const estimatedSvs = Math.max(0, profitBeforeTax) * SVS_RATE
    const profitAfterTax = profitBeforeTax - estimatedIncomeTax - estimatedSvs

    return {
      label, revenueGross, revenueNet, vatCollected,
      expensesGross, expensesNet, vorsteuer, vatPayable, profitBeforeTax,
      invoiceCount: periodInvoices.length, receiptCount: periodExpenses.length,
      smallBusinessActive, ytdRevenueGross,
      estimatedIncomeTax, estimatedAnnualIncomeTax, estimatedQuarterlyPrepayment,
      estimatedSvs, profitAfterTax,
    }
  }, [invoices, receipts, periodMode, periodYear, periodMonth, periodQuarter, company])

  async function exportClosingPdf() {
    setExportingPdf(true)
    try {
      const payload: ClosingPdfData = {
        label: closing.label,
        revenueNet: closing.revenueNet,
        vatCollected: closing.vatCollected,
        revenueGross: closing.revenueGross,
        expensesNet: closing.expensesNet,
        vorsteuer: closing.vorsteuer,
        expensesGross: closing.expensesGross,
        vatPayable: closing.vatPayable,
        profitBeforeTax: closing.profitBeforeTax,
        estimatedIncomeTax: closing.estimatedIncomeTax,
        profitAfterTax: closing.profitAfterTax,
        estimatedSvs: closing.estimatedSvs,
        smallBusinessActive: closing.smallBusinessActive,
        ytdRevenueGross: closing.ytdRevenueGross,
        kuLimit: KU_LIMIT,
        kuTolerance: KU_TOLERANCE,
        invoiceCount: closing.invoiceCount,
        receiptCount: closing.receiptCount,
      }
      const res = await fetch('/api/accounting/closing-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Abschluss-${closing.label.replace(/\s+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingPdf(false)
    }
  }

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

      {(tab === 'invoices' || tab === 'quotes' || tab === 'receipts') && (
        <div className="mb-4">
          <ListPeriodFilter period={listPeriod} onChange={setListPeriod} />
        </div>
      )}

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

          {/* Kleinunternehmer-Status */}
          <div className={`rounded-2xl p-5 ${
            closing.smallBusinessActive
              ? closing.ytdRevenueGross > KU_TOLERANCE ? 'bg-accent/10 border border-accent/30'
              : closing.ytdRevenueGross > KU_LIMIT ? 'bg-yellow-500/10 border border-yellow-500/25'
              : 'bg-panel'
              : 'bg-panel'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {closing.smallBusinessActive && closing.ytdRevenueGross <= KU_LIMIT
                ? <ShieldCheck size={14} className="text-accent-green" />
                : <AlertTriangle size={14} className={closing.smallBusinessActive ? 'text-accent' : 'text-white/30'} />}
              <h2 className="text-sm font-black text-white">Kleinunternehmer-Status (§ 6 Abs. 1 Z 27 UStG)</h2>
            </div>
            {closing.smallBusinessActive ? (
              <>
                <div className="flex items-center justify-between text-xs font-bold text-white/50 mb-1.5">
                  <span>Jahresumsatz brutto {periodYear}</span>
                  <span className="text-white">{fmtMoney(closing.ytdRevenueGross)} / {fmtMoney(KU_LIMIT)}</span>
                </div>
                <div className="h-2 bg-white/8 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${closing.ytdRevenueGross > KU_TOLERANCE ? 'bg-accent' : closing.ytdRevenueGross > KU_LIMIT ? 'bg-yellow-500' : 'bg-accent-green'}`}
                    style={{ width: `${Math.min(100, (closing.ytdRevenueGross / KU_LIMIT) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  {closing.ytdRevenueGross > KU_TOLERANCE
                    ? `Toleranzgrenze (${fmtMoney(KU_TOLERANCE)}) um mehr als 10 % überschritten — die USt-Befreiung entfällt sofort, rückwirkend ab dem Umsatz, mit dem die Grenze überschritten wurde. Bitte umgehend mit dem Finanzamt bzw. Steuerberater abklären.`
                    : closing.ytdRevenueGross > KU_LIMIT
                    ? `Grenze von ${fmtMoney(KU_LIMIT)} überschritten, aber innerhalb der 10 % Toleranz — die Befreiung bleibt ${periodYear} noch erhalten, entfällt aber automatisch ab ${periodYear + 1}.`
                    : `Aktiv — solange der Jahresumsatz unter ${fmtMoney(KU_LIMIT)} brutto bleibt, fällt keine Umsatzsteuer an. Rechnungen weisen daher keine USt aus.`}
                </p>
              </>
            ) : (
              <p className="text-xs text-white/50 leading-relaxed">
                Nicht aktiv — Regelbesteuerung. Umsatzsteuer wird auf Rechnungen ausgewiesen und ist im Rahmen der UVA an das Finanzamt abzuführen (siehe USt-Zahllast unten).
                Aktivierbar in den Einstellungen unter Firmeninformationen, sofern der Jahresumsatz unter {fmtMoney(KU_LIMIT)} brutto bleibt.
              </p>
            )}
          </div>

          <div className="bg-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-black text-white">Abschluss · {closing.label}</h2>
              <button
                onClick={exportClosingPdf}
                disabled={exportingPdf}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                {exportingPdf ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                PDF-Export
              </button>
            </div>
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
                <span className={`text-sm font-black ${closing.vatPayable > 0 ? 'text-accent' : 'text-accent-green'}`}>
                  {fmtMoney(closing.vatPayable)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-white/50">Geschätzte Einkommensteuer (hochgerechnet)</span>
                <span className="text-sm font-bold text-accent">−{fmtMoney(closing.estimatedIncomeTax)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-white/50">Geschätzte SVS-Beiträge (ca. 26,83 % v. Gewinn)</span>
                <span className="text-sm font-bold text-accent">−{fmtMoney(closing.estimatedSvs)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-t border-panel-2 pt-3">
                <span className="text-base font-black text-white">Gewinn vor Steuern</span>
                <span className={`text-base font-black ${closing.profitBeforeTax >= 0 ? 'text-accent-green' : 'text-accent'}`}>
                  {fmtMoney(closing.profitBeforeTax)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-base font-black text-white">Gewinn nach geschätzter Steuer & SVS</span>
                <span className={`text-base font-black ${closing.profitAfterTax >= 0 ? 'text-accent-green' : 'text-accent'}`}>
                  {fmtMoney(closing.profitAfterTax)}
                </span>
              </div>
            </div>
          </div>

          {/* An das Finanzamt zu zahlen */}
          <div className="bg-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Landmark size={14} className="text-white/30" />
              <h2 className="text-sm font-black text-white">Zahlungen ans Finanzamt</h2>
            </div>
            <div className="space-y-2.5 mb-4">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-white/50">USt-Zahllast {closing.label}</span>
                <span className="text-sm font-bold text-white">{fmtMoney(Math.max(0, closing.vatPayable))}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-white/50">ESt-Vorauszahlung pro Quartal (hochgerechnet)</span>
                <span className="text-sm font-bold text-white">{fmtMoney(closing.estimatedQuarterlyPrepayment)}</span>
              </div>
            </div>
            <p className="text-xs text-white/35 leading-relaxed">
              Fälligkeitstermine der quartalsweisen Einkommensteuer-Vorauszahlung: 15. Februar, 15. Mai, 15. August, 15. November.
              Die tatsächliche Höhe legt das Finanzamt per Vorauszahlungsbescheid auf Basis des Vorjahresergebnisses (zzgl. 4–9 %) fest — die hier gezeigte Zahl ist eine Hochrechnung auf Basis
              des aktuell erfassten Gewinns und kann abweichen. Da du als Einzelunternehmer auftrittst, fällt keine Körperschaftsteuer (KÖSt) an — diese wäre nur bei einer GmbH relevant.
            </p>
          </div>
        </div>
      ) : tab === 'invoices' ? (
        <DocList docs={listInvoices} type="invoice" />
      ) : tab === 'quotes' ? (
        <DocList docs={listQuotes} type="quote" />
      ) : (
        <div className="bg-panel rounded-2xl overflow-hidden">
          {listReceipts.length === 0 ? (
            <div className="py-16 text-center"><p className="text-white/40 text-sm font-medium">Noch keine Belege.</p></div>
          ) : (
            <ul>
              {listReceipts.map((r, i) => (
                <li key={r.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i < listReceipts.length - 1 ? 'border-b border-panel-2' : ''}`}>
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
