'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, FileText, TrendingUp, TrendingDown, Wallet,
  Download, Trash2, ChevronDown, ChevronLeft, ChevronRight, Image as ImageIcon, Eye, EyeOff,
  Loader2, Search, Upload, RefreshCw, Pencil,
} from 'lucide-react'
import type { AccountingDocument, AccountingReceipt, AccountingSubscription, DocType, DocStatus, ReceiptType, SubscriptionInterval } from '@/lib/types'
import type { CompanyInfo } from '@/lib/pdf/DocumentPdf'
import type { ClosingPdfData } from '@/lib/pdf/ClosingPdf'
import { DocumentModal } from './DocumentModal'
import { ReceiptModal } from './ReceiptModal'
import { PdfPreviewModal } from './PdfPreviewModal'
import { InvoiceImportModal } from './InvoiceImportModal'
import { SubscriptionModal } from './SubscriptionModal'
import { useClickOutside } from '@/lib/useClickOutside'
import { useRef } from 'react'

type Tab = 'overview' | 'invoices' | 'quotes' | 'receipts' | 'subscriptions' | 'closings'

type MonthPeriod = { month: number; year: number }
type ListPeriod = 'all' | MonthPeriod | number

const MONTHS_SHORT = ['Jän','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

function inListPeriod(dateStr: string | undefined, period: ListPeriod): boolean {
  if (period === 'all') return true
  const d = new Date(dateStr || '')
  if (isNaN(d.getTime())) return false
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
  { id: 'overview',      label: 'Übersicht' },
  { id: 'invoices',      label: 'Rechnungen' },
  { id: 'quotes',        label: 'Angebote' },
  { id: 'receipts',      label: 'Belege' },
  { id: 'subscriptions', label: 'Abos' },
  { id: 'closings',      label: 'Abschlüsse' },
]

const SUBSCRIPTION_INTERVAL_LABELS: Record<SubscriptionInterval, string> = {
  monthly: 'Monatlich', quarterly: 'Quartal', yearly: 'Jährlich',
}

function monthlyEquivalent(sub: AccountingSubscription): number {
  if (sub.interval === 'monthly') return sub.amount
  if (sub.interval === 'quarterly') return sub.amount / 3
  return sub.amount / 12
}

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
  if (!d) return '-'
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

const KPI_TONE_STYLES = {
  default: { cardBg: 'bg-white',         textColor: 'text-dark',  labelColor: 'text-dark/45',  iconBg: 'bg-dark/8',  iconColor: 'text-dark' },
  gray:    { cardBg: 'bg-[#C7C7C7]',      textColor: 'text-dark',  labelColor: 'text-dark/45',  iconBg: 'bg-dark/10', iconColor: 'text-dark' },
  accent:  { cardBg: 'bg-accent',         textColor: 'text-white', labelColor: 'text-white/60', iconBg: 'bg-white/15', iconColor: 'text-white' },
  green:   { cardBg: 'bg-accent-green',   textColor: 'text-dark',  labelColor: 'text-dark/45',  iconBg: 'bg-dark/8',  iconColor: 'text-dark' },
} as const

function KpiCard({ icon, label, value, tone = 'default' }: { icon: React.ReactNode; label: string; value: string; tone?: keyof typeof KPI_TONE_STYLES }) {
  const s = KPI_TONE_STYLES[tone]
  return (
    <div className={`${s.cardBg} flex-1 min-w-0 p-3.5 sm:p-5`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 sm:mb-4 ${s.iconBg} ${s.iconColor}`}>
        {icon}
      </div>
      <p className={`text-xl sm:text-2xl font-black leading-none ${s.textColor}`}>{value}</p>
      <p className={`text-[11px] sm:text-xs font-medium mt-2 leading-tight ${s.labelColor}`}>{label}</p>
    </div>
  )
}

export function AccountingView() {
  const [tab, setTab] = useState<Tab>('invoices')
  const [documents, setDocuments] = useState<AccountingDocument[]>([])
  const [receipts, setReceipts]   = useState<AccountingReceipt[]>([])
  const [subscriptions, setSubscriptions] = useState<AccountingSubscription[]>([])
  const [loading, setLoading]     = useState(true)
  const [docModal, setDocModal]   = useState<{ type: DocType; doc?: AccountingDocument } | null>(null)
  const [receiptModal, setReceiptModal] = useState(false)
  const [subscriptionModal, setSubscriptionModal] = useState<{ sub?: AccountingSubscription } | null>(null)
  const [previewDoc, setPreviewDoc] = useState<AccountingDocument | null>(null)
  const [kpiVisible, setKpiVisible] = useState(false)
  const [company, setCompany] = useState<CompanyInfo>({})
  const [listPeriod, setListPeriod] = useState<ListPeriod>('all')
  const [exportingPdf, setExportingPdf] = useState(false)
  const [search, setSearch] = useState('')
  const [importModal, setImportModal] = useState(false)

  const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
  const now = new Date()
  const [periodYear, setPeriodYear]   = useState(now.getFullYear())
  const [periodMonth, setPeriodMonth] = useState(now.getMonth()) // 0-11
  const [periodQuarter, setPeriodQuarter] = useState(Math.floor(now.getMonth() / 3)) // 0-3

  async function loadAll() {
    setLoading(true)
    try {
      const [docsRes, receiptsRes, subsRes] = await Promise.all([
        fetch('/api/accounting/documents').then(r => r.json()),
        fetch('/api/accounting/receipts').then(r => r.json()),
        fetch('/api/accounting/subscriptions').then(r => r.json()),
      ])
      setDocuments(docsRes.documents ?? [])
      setReceipts(receiptsRes.receipts ?? [])
      setSubscriptions(subsRes.subscriptions ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function toggleSubscriptionActive(sub: AccountingSubscription) {
    setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, active: !s.active } : s))
    await fetch('/api/accounting/subscriptions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sub.id, active: !sub.active }),
    })
  }

  async function deleteSubscription(id: string) {
    if (!confirm('Abo wirklich löschen?')) return
    setSubscriptions(prev => prev.filter(s => s.id !== id))
    await fetch(`/api/accounting/subscriptions?id=${id}`, { method: 'DELETE' })
  }

  useEffect(() => {
    loadAll()
    fetch('/api/company').then(r => r.json()).then(d => setCompany(d.company ?? {})).catch(() => {})
  }, [])

  const invoices = useMemo(() => documents.filter(d => d.doc_type === 'invoice'), [documents])
  const quotes   = useMemo(() => documents.filter(d => d.doc_type === 'quote'), [documents])

  const searchQ = search.trim().toLowerCase()
  const matchesDoc = (d: AccountingDocument) => !searchQ || d.client_name.toLowerCase().includes(searchQ) || d.doc_number.toLowerCase().includes(searchQ)
  const matchesReceipt = (r: AccountingReceipt) => !searchQ || (r.vendor ?? '').toLowerCase().includes(searchQ) || (r.category ?? '').toLowerCase().includes(searchQ)

  const listInvoices = useMemo(() => invoices.filter(d => inListPeriod(d.issue_date, listPeriod) && matchesDoc(d)), [invoices, listPeriod, searchQ])
  const listQuotes   = useMemo(() => quotes.filter(d => inListPeriod(d.issue_date, listPeriod) && matchesDoc(d)), [quotes, listPeriod, searchQ])
  const listReceipts = useMemo(() => receipts.filter(r => inListPeriod(r.date, listPeriod) && matchesReceipt(r)), [receipts, listPeriod, searchQ])

  const overviewItems = useMemo(() => {
    const merged: any[] = [
      ...documents.map(d => ({ ...d, _isReceipt: false as const })),
      ...receipts.map(r => ({ ...r, _isReceipt: true as const })),
    ]
    return merged
      .filter(item => inListPeriod(item._isReceipt ? item.date : item.issue_date, listPeriod))
      .filter(item => item._isReceipt ? matchesReceipt(item) : matchesDoc(item))
      .sort((a, b) => new Date(b.created_at ?? b.issue_date).getTime() - new Date(a.created_at ?? a.issue_date).getTime())
  }, [documents, receipts, listPeriod, searchQ])

  function openOverviewItem(item: any) {
    if (item._isReceipt) {
      if (item.file_path) window.open(`/api/accounting/receipts/${item.id}/file`, '_blank')
    } else {
      setPreviewDoc(item)
    }
  }

  function subscriptionContribution(sub: AccountingSubscription, period: ListPeriod): number {
    if (!sub.active) return 0
    const start = new Date(sub.start_date)
    const monthly = monthlyEquivalent(sub)
    if (period === 'all') {
      const now = new Date()
      const months = Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1)
      return monthly * months
    }
    if (typeof period === 'object') {
      const monthEnd = new Date(period.year, period.month + 1, 0)
      return start <= monthEnd ? monthly : 0
    }
    const year = period
    if (start.getFullYear() > year) return 0
    const monthsActiveInYear = start.getFullYear() === year ? 12 - start.getMonth() : 12
    return monthly * monthsActiveInYear
  }

  const totals = useMemo(() => {
    const incomePaid = invoices.filter(d => d.status === 'paid' && inListPeriod(d.issue_date, listPeriod)).reduce((s, d) => s + docTotal(d), 0)
    const incomeOpen = invoices.filter(d => d.status !== 'paid' && inListPeriod(d.issue_date, listPeriod)).reduce((s, d) => s + docTotal(d), 0)
    const expensesReceipts = receipts.filter(r => r.receipt_type === 'expense' && inListPeriod(r.date, listPeriod)).reduce((s, r) => s + r.amount, 0)
    const expensesSubs = subscriptions.reduce((s, sub) => s + subscriptionContribution(sub, listPeriod), 0)
    const expenses = expensesReceipts + expensesSubs
    return { incomePaid, incomeOpen, expenses, profit: incomePaid - expenses }
  }, [invoices, receipts, subscriptions, listPeriod])

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
    const monthsInPeriod = periodMode === 'month' ? 1 : periodMode === 'quarter' ? 3 : 12
    const periodEnd = periodMode === 'month' ? new Date(periodYear, periodMonth + 1, 0)
      : periodMode === 'quarter' ? new Date(periodYear, periodQuarter * 3 + 3, 0)
      : new Date(periodYear, 11, 31)
    const subsExpenses = subscriptions
      .filter(s => s.active && new Date(s.start_date) <= periodEnd)
      .reduce((s, sub) => s + monthlyEquivalent(sub) * monthsInPeriod, 0)
    const expensesGross = periodExpenses.reduce((s, r) => s + r.amount, 0) + subsExpenses
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

    const profitAfterTax = profitBeforeTax - estimatedIncomeTax

    return {
      label, revenueGross, revenueNet, vatCollected,
      expensesGross, expensesNet, vorsteuer, vatPayable, profitBeforeTax,
      invoiceCount: periodInvoices.length, receiptCount: periodExpenses.length,
      periodInvoices,
      smallBusinessActive, ytdRevenueGross,
      estimatedIncomeTax, estimatedAnnualIncomeTax, estimatedQuarterlyPrepayment,
      profitAfterTax,
    }
  }, [invoices, receipts, subscriptions, periodMode, periodYear, periodMonth, periodQuarter, company])

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
          <div className="flex items-center gap-2">
            <button onClick={() => setImportModal(true)} className="flex items-center gap-2 bg-panel hover:bg-panel-hover text-white/60 hover:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95">
              <Upload size={16} /><span className="hidden sm:inline">Importieren</span>
            </button>
            <button onClick={() => setDocModal({ type: 'invoice' })} className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95">
              <Plus size={16} /><span className="hidden sm:inline">Neue Rechnung</span>
            </button>
          </div>
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
        {tab === 'subscriptions' && (
          <button onClick={() => setSubscriptionModal({})} className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95">
            <Plus size={16} /><span className="hidden sm:inline">Neues Abo</span>
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

      {(tab === 'overview' || tab === 'invoices' || tab === 'quotes' || tab === 'receipts') && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="w-full bg-panel rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:ring-1 focus:ring-accent transition-all"
            />
          </div>
          <ListPeriodFilter period={listPeriod} onChange={setListPeriod} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-white/30 text-center py-16 font-medium">Lädt…</p>
      ) : tab === 'overview' ? (
        <div className="space-y-5">
          {kpiVisible && (
            <div className="flex items-center justify-end">
              <button
                onClick={() => setKpiVisible(false)}
                title="Verbergen"
                className="w-7 h-7 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <EyeOff size={13} />
              </button>
            </div>
          )}

          {kpiVisible ? (
            <div className="flex rounded-2xl overflow-hidden">
              <KpiCard icon={<TrendingUp size={16} />} label="Einnahmen (bezahlt)" value={fmtMoney(totals.incomePaid)} tone="default" />
              <KpiCard icon={<Wallet size={16} />} label="Offene Rechnungen" value={fmtMoney(totals.incomeOpen)} tone="gray" />
              <KpiCard icon={<TrendingDown size={16} />} label="Ausgaben" value={fmtMoney(totals.expenses)} tone="accent" />
              <KpiCard icon={<TrendingUp size={16} />} label="Gewinn" value={fmtMoney(totals.profit)} tone={totals.profit >= 0 ? 'green' : 'accent'} />
            </div>
          ) : (
            <button
              title="Anzeigen"
              onClick={() => setKpiVisible(true)}
              className="w-full h-24 bg-accent rounded-2xl flex items-center justify-center hover:opacity-90 transition-all active:scale-[0.99]"
            >
              <Eye size={20} className="text-white" />
            </button>
          )}

          <div className="bg-panel rounded-2xl p-6">
            <h2 className="text-sm font-black text-white mb-4">Letzte Belege & Rechnungen</h2>
            {overviewItems.slice(0, 20).map((item: any, i) => (
              <button
                key={item.id}
                onClick={() => openOverviewItem(item)}
                className={`flex items-center justify-between gap-3 py-2.5 w-full text-left rounded-xl px-2 -mx-2 hover:bg-panel-hover transition-colors ${i > 0 ? 'border-t border-panel-2' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {item._isReceipt ? (item.vendor || RECEIPT_TYPE_LABELS[item.receipt_type as ReceiptType]) : item.client_name}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">{fmtDate(item._isReceipt ? item.date : item.issue_date)}</p>
                </div>
                <p className={`text-sm font-bold shrink-0 ${item._isReceipt ? 'text-accent' : 'text-accent-green'}`}>
                  {item._isReceipt ? '−' : '+'}{fmtMoney(item._isReceipt ? item.amount : docTotal(item))}
                </p>
              </button>
            ))}
            {overviewItems.length === 0 && (
              <p className="text-sm text-white/35 text-center py-6 font-medium">Noch keine Einträge.</p>
            )}
          </div>
        </div>
      ) : tab === 'subscriptions' ? (
        subscriptions.length === 0 ? (
          <div className="bg-panel rounded-2xl py-16 text-center">
            <p className="text-white/40 text-sm font-medium">Noch keine Abos.</p>
          </div>
        ) : (
          <div className="bg-panel rounded-2xl overflow-hidden">
            <ul>
              {subscriptions.map((s, i) => (
                <li key={s.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i < subscriptions.length - 1 ? 'border-b border-panel-2' : ''} ${s.active ? '' : 'opacity-40'}`}>
                  <div className="w-9 h-9 rounded-xl bg-white/8 text-white/50 flex items-center justify-center shrink-0">
                    <RefreshCw size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                    <p className="text-xs text-white/35 mt-0.5">{SUBSCRIPTION_INTERVAL_LABELS[s.interval]} · seit {fmtDate(s.start_date)}</p>
                  </div>
                  <p className="text-sm font-bold text-accent shrink-0">{fmtMoney(s.amount)}</p>
                  <button
                    onClick={() => toggleSubscriptionActive(s)}
                    title={s.active ? 'Pausieren' : 'Aktivieren'}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                      s.active ? 'bg-accent-green/15 text-accent-green hover:bg-accent-green/25' : 'bg-white/6 text-white/30 hover:bg-white/12'
                    }`}
                  >
                    {s.active ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  <button
                    onClick={() => setSubscriptionModal({ sub: s })}
                    title="Bearbeiten"
                    className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => deleteSubscription(s.id)}
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
      ) : tab === 'closings' ? (
        <div className="space-y-5">
          <div className="bg-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-white">Zeitraum</h2>
              <button
                onClick={exportClosingPdf}
                disabled={exportingPdf}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                {exportingPdf ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                PDF-Export
              </button>
            </div>
            <div className="flex gap-1.5 mb-3">
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
            <div className="flex gap-1.5 flex-wrap items-center">
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
              <ListYearDropdown year={periodYear} isActive onSelect={setPeriodYear} />
            </div>
          </div>

          <div>
            <p className="text-xs text-white/30 mb-2 px-1">Abschluss · {closing.label} - {closing.invoiceCount} bezahlte Rechnung(en)</p>
            <DocList docs={closing.periodInvoices} type="invoice" />
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
      {importModal && (
        <InvoiceImportModal
          nextNumberHint={nextNumberHint('invoice')}
          onClose={() => setImportModal(false)}
          onSaved={() => { setImportModal(false); loadAll() }}
        />
      )}
      {subscriptionModal && (
        <SubscriptionModal
          subscription={subscriptionModal.sub}
          onClose={() => setSubscriptionModal(null)}
          onSaved={() => { setSubscriptionModal(null); loadAll() }}
        />
      )}
      {previewDoc && (
        <PdfPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  )
}
