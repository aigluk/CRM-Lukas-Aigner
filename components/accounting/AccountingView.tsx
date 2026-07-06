'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, FileText, TrendingUp, TrendingDown, Wallet,
  Download, FileDown, Trash2, ChevronDown, ChevronLeft, ChevronRight, Image as ImageIcon, Eye, EyeOff,
  Loader2, Search, Upload, RefreshCw, Pencil,
} from 'lucide-react'
import type { AccountingDocument, AccountingReceipt, AccountingSubscription, AccountingContract, AccountingSalaryEntry, ContractType, DocType, DocStatus, ReceiptType, SubscriptionInterval, SalaryEntryType } from '@/lib/types'
import type { CompanyInfo } from '@/lib/pdf/DocumentPdf'
import type { ClosingPdfData } from '@/lib/pdf/ClosingPdf'
import { DocumentModal } from './DocumentModal'
import { ReceiptModal } from './ReceiptModal'
import { ReceiptPreviewModal } from './ReceiptPreviewModal'
import { PdfPreviewModal } from './PdfPreviewModal'
import { InvoiceImportModal } from './InvoiceImportModal'
import { ImportedInvoiceEditModal } from './ImportedInvoiceEditModal'
import { SubscriptionModal } from './SubscriptionModal'
import { SalaryModal } from './SalaryModal'
import { SalaryPreviewModal } from './SalaryPreviewModal'
import { ContractModal } from './ContractModal'
import { ContractPreviewModal } from './ContractPreviewModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useClickOutside } from '@/lib/useClickOutside'
import { useRef } from 'react'

type Tab = 'overview' | 'invoices' | 'quotes' | 'receipts' | 'subscriptions' | 'salaries' | 'closings' | 'service_contracts' | 'fulfillment' | 'sales_partners'

const TAB_CONTRACT_TYPE: Record<'service_contracts' | 'fulfillment' | 'sales_partners', ContractType> = {
  service_contracts: 'service',
  fulfillment: 'fulfillment',
  sales_partners: 'agent',
}

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
  { id: 'overview',           label: 'Übersicht' },
  { id: 'invoices',           label: 'Rechnungen' },
  { id: 'quotes',             label: 'Angebote' },
  { id: 'service_contracts',  label: 'Dienstleistungsverträge' },
  { id: 'fulfillment',        label: 'Fulfillment' },
  { id: 'sales_partners',     label: 'Vertriebspartner' },
  { id: 'receipts',           label: 'Zahlungen' },
  { id: 'subscriptions',      label: 'Abos' },
  { id: 'salaries',           label: 'Gehälter' },
  { id: 'closings',           label: 'Abschlüsse' },
]

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  service: 'Dienstleistungsvertrag', fulfillment: 'Fulfillment-Vertrag', agent: 'Handelsagentenvertrag',
}

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
  const [contracts, setContracts] = useState<AccountingContract[]>([])
  const [salaries, setSalaries] = useState<AccountingSalaryEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [docModal, setDocModal]   = useState<{ type: DocType; doc?: AccountingDocument } | null>(null)
  const [receiptModal, setReceiptModal] = useState(false)
  const [editReceipt, setEditReceipt] = useState<AccountingReceipt | null>(null)
  const [subscriptionModal, setSubscriptionModal] = useState<{ sub?: AccountingSubscription } | null>(null)
  const [contractModal, setContractModal] = useState<{ type: ContractType; contract?: AccountingContract } | null>(null)
  const [previewDoc, setPreviewDoc] = useState<AccountingDocument | null>(null)
  const [previewReceipt, setPreviewReceipt] = useState<AccountingReceipt | null>(null)
  const [previewContract, setPreviewContract] = useState<AccountingContract | null>(null)
  const [kpiVisible, setKpiVisible] = useState(false)
  const [company, setCompany] = useState<CompanyInfo>({})
  const [listPeriod, setListPeriod] = useState<ListPeriod>('all')
  const [exportingPdf, setExportingPdf] = useState(false)
  const [search, setSearch] = useState('')
  const [importModal, setImportModal] = useState(false)
  const [importedEditDoc, setImportedEditDoc] = useState<AccountingDocument | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; action: () => Promise<void> } | null>(null)
  const [salaryModal, setSalaryModal] = useState<{ entry?: AccountingSalaryEntry } | null>(null)
  const [salaryPreview, setSalaryPreview] = useState<AccountingSalaryEntry | null>(null)

  const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
  const now = new Date()
  const [periodYear, setPeriodYear]   = useState(now.getFullYear())
  const [periodMonth, setPeriodMonth] = useState(now.getMonth()) // 0-11
  const [periodQuarter, setPeriodQuarter] = useState(Math.floor(now.getMonth() / 3)) // 0-3

  async function loadAll() {
    setLoading(true)
    try {
      const [docsRes, receiptsRes, subsRes, contractsRes, salariesRes] = await Promise.all([
        fetch('/api/accounting/documents').then(r => r.json()),
        fetch('/api/accounting/receipts').then(r => r.json()),
        fetch('/api/accounting/subscriptions').then(r => r.json()),
        fetch('/api/accounting/contracts').then(r => r.json()),
        fetch('/api/accounting/salaries').then(r => r.json()),
      ])
      setDocuments(docsRes.documents ?? [])
      setReceipts(receiptsRes.receipts ?? [])
      setSubscriptions(subsRes.subscriptions ?? [])
      setContracts(contractsRes.contracts ?? [])
      setSalaries(salariesRes.salaries ?? [])
    } finally {
      setLoading(false)
    }
  }

  function deleteContract(id: string) {
    setConfirmDelete({
      message: 'Vertrag wirklich löschen?',
      action: async () => {
        setContracts(prev => prev.filter(c => c.id !== id))
        await fetch(`/api/accounting/contracts?id=${id}`, { method: 'DELETE' })
        setConfirmDelete(null)
      },
    })
  }

  function nextContractNumberHint(type: ContractType): string {
    const year = new Date().getFullYear()
    const prefix = type === 'service' ? 'DV' : type === 'fulfillment' ? 'FF' : 'HA'
    const existing = contracts.filter(c => c.contract_type === type && c.contract_number.startsWith(`${prefix}-${year}-`))
    const max = existing.reduce((m, c) => {
      const n = parseInt(c.contract_number.split('-').pop() || '0', 10)
      return Math.max(m, n)
    }, 0)
    return `${prefix}-${year}-${String(max + 1).padStart(3, '0')}`
  }

  async function toggleSubscriptionActive(sub: AccountingSubscription) {
    setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, active: !s.active } : s))
    await fetch('/api/accounting/subscriptions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sub.id, active: !sub.active }),
    })
  }

  function deleteSubscription(id: string) {
    setConfirmDelete({
      message: 'Abo wirklich löschen?',
      action: async () => {
        setSubscriptions(prev => prev.filter(s => s.id !== id))
        await fetch(`/api/accounting/subscriptions?id=${id}`, { method: 'DELETE' })
        setConfirmDelete(null)
      },
    })
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
  const matchesContract = (c: AccountingContract) => !searchQ || c.party_name.toLowerCase().includes(searchQ) || c.contract_number.toLowerCase().includes(searchQ)

  const listInvoices = useMemo(() => invoices.filter(d => inListPeriod(d.issue_date, listPeriod) && matchesDoc(d)), [invoices, listPeriod, searchQ])
  const listQuotes   = useMemo(() => quotes.filter(d => inListPeriod(d.issue_date, listPeriod) && matchesDoc(d)), [quotes, listPeriod, searchQ])
  const listReceipts = useMemo(() => receipts.filter(r => inListPeriod(r.date, listPeriod) && matchesReceipt(r)), [receipts, listPeriod, searchQ])
  const listServiceContracts = useMemo(() => contracts.filter(c => c.contract_type === 'service' && inListPeriod(c.start_date, listPeriod) && matchesContract(c)), [contracts, listPeriod, searchQ])
  const listFulfillmentContracts = useMemo(() => contracts.filter(c => c.contract_type === 'fulfillment' && inListPeriod(c.start_date, listPeriod) && matchesContract(c)), [contracts, listPeriod, searchQ])
  const listAgentContracts = useMemo(() => contracts.filter(c => c.contract_type === 'agent' && inListPeriod(c.start_date, listPeriod) && matchesContract(c)), [contracts, listPeriod, searchQ])

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
      if (item.file_path) setPreviewReceipt(item)
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

    const periodStart = periodMode === 'month' ? new Date(periodYear, periodMonth, 1)
      : periodMode === 'quarter' ? new Date(periodYear, periodQuarter * 3, 1)
      : new Date(periodYear, 0, 1)
    const periodEnd = periodMode === 'month' ? new Date(periodYear, periodMonth + 1, 0)
      : periodMode === 'quarter' ? new Date(periodYear, periodQuarter * 3 + 3, 0)
      : new Date(periodYear, 11, 31)

    // Cap subscription months at the start of the current month — don't count future months
    const todayMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const effectiveSubEnd = periodEnd < todayMonthStart ? periodEnd : todayMonthStart

    // Build per-subscription items, month-by-month using price_history for accuracy
    const subItems = subscriptions
      .filter(s => s.active && new Date(s.start_date) <= effectiveSubEnd)
      .map(sub => {
        const subStart = new Date(sub.start_date)
        const actualFrom = subStart > periodStart ? subStart : periodStart
        const fromY = actualFrom.getFullYear(), fromM = actualFrom.getMonth()
        const toY = effectiveSubEnd.getFullYear(), toM = effectiveSubEnd.getMonth()
        const totalMonths = Math.max(0, (toY - fromY) * 12 + toM - fromM + 1)

        const history = [...(sub.price_history ?? [])].sort((a, b) => a.effective_from.localeCompare(b.effective_from))
        const intervalFactor = sub.interval === 'monthly' ? 1 : sub.interval === 'quarterly' ? 3 : 12

        let totalAmount = 0
        for (let i = 0; i < totalMonths; i++) {
          const monthDate = new Date(fromY, fromM + i, 1)
          const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`
          const applicable = history.filter(e => e.effective_from <= monthStr)
          const priceEntry = applicable.length > 0 ? applicable[applicable.length - 1] : null
          totalAmount += (priceEntry ? priceEntry.amount : sub.amount) / intervalFactor
        }

        const monthly = totalMonths > 0 ? totalAmount / totalMonths : 0
        return { ...sub, months: totalMonths, monthly, amount: totalAmount }
      })
      .filter(x => x.amount > 0)

    const subsExpenses = subItems.reduce((s, x) => s + x.amount, 0)
    const expensesGross = periodExpenses.reduce((s, r) => s + r.amount, 0) + subsExpenses

    const smallBusinessActive = !!company.small_business
    // KU cannot claim Vorsteuer (§ 6 Abs. 1 Z 27 UStG removes input VAT deduction right)
    const vorsteuer = smallBusinessActive ? 0 : expensesGross * (ASSUMED_EXPENSE_VAT_RATE / (100 + ASSUMED_EXPENSE_VAT_RATE))
    const expensesNet = expensesGross - vorsteuer

    const vatPayable = smallBusinessActive ? 0 : vatCollected - vorsteuer
    const profitBeforeTax = revenueNet - expensesNet

    // Expense breakdown items for PDF
    const expenseItems = [
      ...periodExpenses.map(r => ({
        label: r.vendor || r.category || RECEIPT_TYPE_LABELS[r.receipt_type as ReceiptType] || 'Ausgabe',
        date: r.date,
        amount: r.amount,
        months: undefined as number | undefined,
        monthly: undefined as number | undefined,
      })),
      ...subItems.map(x => ({
        label: x.name,
        date: undefined as string | undefined,
        amount: x.amount,
        months: x.months,
        monthly: x.monthly,
      })),
    ]

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

    // Salary entries for this year (always full-year context)
    const periodSalaries = salaries.filter(s => s.period_year === periodYear)
    const salaryGrossTotal = periodSalaries.reduce((s, e) => s + e.gross_amount, 0)
    const salaryTaxWithheld = periodSalaries.reduce((s, e) => s + e.tax_withheld, 0)

    return {
      label, revenueGross, revenueNet, vatCollected,
      expensesGross, expensesNet, vorsteuer, vatPayable, profitBeforeTax,
      invoiceCount: periodInvoices.length, receiptCount: periodExpenses.length,
      periodInvoices, expenseItems,
      smallBusinessActive, ytdRevenueGross,
      estimatedIncomeTax, estimatedAnnualIncomeTax, estimatedQuarterlyPrepayment,
      profitAfterTax,
      periodSalaries, salaryGrossTotal, salaryTaxWithheld,
    }
  }, [invoices, receipts, subscriptions, salaries, periodMode, periodYear, periodMonth, periodQuarter, company])

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
        invoices: [...closing.periodInvoices]
          .sort((a, b) => a.issue_date.localeCompare(b.issue_date))
          .map(d => ({
            doc_number: d.doc_number,
            client_name: d.client_name,
            issue_date: d.issue_date,
            amount_gross: docTotal(d),
          })),
        expenseItems: closing.expenseItems,
        salaryItems: closing.periodSalaries.map(s => ({
          reference_number: s.reference_number,
          employer_name: s.employer_name,
          entry_type: s.entry_type as 'employment' | 'gf_salary',
          gross_amount: s.gross_amount,
          tax_withheld: s.tax_withheld,
        })),
        salaryGrossTotal: closing.salaryGrossTotal,
        salaryTaxWithheld: closing.salaryTaxWithheld,
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

  function deleteDoc(id: string) {
    setConfirmDelete({
      message: 'Dokument wirklich löschen?',
      action: async () => {
        setDocuments(prev => prev.filter(d => d.id !== id))
        await fetch(`/api/accounting/documents?id=${id}`, { method: 'DELETE' })
        setConfirmDelete(null)
      },
    })
  }

  function deleteReceipt(id: string) {
    setConfirmDelete({
      message: 'Zahlung wirklich löschen?',
      action: async () => {
        setReceipts(prev => prev.filter(r => r.id !== id))
        await fetch(`/api/accounting/receipts?id=${id}`, { method: 'DELETE' })
        setConfirmDelete(null)
      },
    })
  }

  function deleteSalary(id: string) {
    setConfirmDelete({
      message: 'Gehalt-Eintrag wirklich löschen?',
      action: async () => {
        setSalaries(prev => prev.filter(s => s.id !== id))
        await fetch(`/api/accounting/salaries?id=${id}`, { method: 'DELETE' })
        setConfirmDelete(null)
      },
    })
  }

  const SALARY_TYPE_LABELS: Record<SalaryEntryType, string> = {
    employment: 'Anstellung',
    gf_salary:  'GF-Gehalt',
  }

  function DocList({ docs, type, className }: { docs: AccountingDocument[]; type: DocType; className?: string }) {
    if (docs.length === 0) {
      return (
        <div className={`bg-panel rounded-2xl py-16 text-center ${className ?? ''}`}>
          <p className="text-white/40 text-sm font-medium">Noch keine {type === 'invoice' ? 'Rechnungen' : 'Angebote'}.</p>
        </div>
      )
    }
    const sorted = [...docs].sort((a, b) => {
      // Primary: doc_number numerically descending — numbering defines the order
      const numA = parseInt(a.doc_number.split('-').pop() || '0', 10)
      const numB = parseInt(b.doc_number.split('-').pop() || '0', 10)
      if (numA !== numB) return numB - numA
      return new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
    })
    return (
      <div className={`bg-panel rounded-2xl ${className ?? ''}`}>
        <ul>
          {sorted.map((doc, i) => (
            <li key={doc.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i < sorted.length - 1 ? 'border-b border-panel-2' : ''}`}>
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
                className="hidden sm:flex w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
              >
                <Download size={13} />
              </a>
              <button
                onClick={() => doc.is_imported ? setImportedEditDoc(doc) : setDocModal({ type, doc })}
                title="Bearbeiten"
                className="hidden sm:flex w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
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

  function ContractList({ items, type, className }: { items: AccountingContract[]; type: ContractType; className?: string }) {
    if (items.length === 0) {
      return (
        <div className={`bg-panel rounded-2xl py-16 text-center ${className ?? ''}`}>
          <p className="text-white/40 text-sm font-medium">Noch keine {CONTRACT_TYPE_LABELS[type]}e.</p>
        </div>
      )
    }
    const sortedItems = [...items].sort((a, b) => {
      const numA = parseInt(a.contract_number.split('-').pop() || '0', 10)
      const numB = parseInt(b.contract_number.split('-').pop() || '0', 10)
      if (numA !== numB) return numB - numA
      return new Date(b.start_date ?? 0).getTime() - new Date(a.start_date ?? 0).getTime()
    })
    return (
      <div className={`bg-panel rounded-2xl ${className ?? ''}`}>
        <ul>
          {sortedItems.map((c, i) => (
            <li key={c.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i < sortedItems.length - 1 ? 'border-b border-panel-2' : ''}`}>
              <button
                onClick={() => setPreviewContract(c)}
                className="min-w-0 flex-1 text-left"
                title="Vorschau anzeigen"
              >
                <p className="text-sm font-semibold text-white truncate">{c.party_name}</p>
                <p className="text-xs text-white/35 mt-0.5">{c.contract_number} · {fmtDate(c.start_date)}</p>
              </button>
              <button
                onClick={() => setPreviewContract(c)}
                title="Vorschau"
                className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
              >
                <Eye size={13} />
              </button>
              <a
                href={`/api/accounting/contracts/${c.id}/pdf?dl=1`}
                title="PDF herunterladen"
                className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
              >
                <Download size={13} />
              </a>
              <button
                onClick={() => setContractModal({ type, contract: c })}
                title="Bearbeiten"
                className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
              >
                <FileText size={13} />
              </button>
              <button
                onClick={() => deleteContract(c.id)}
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
    <div className="h-full flex flex-col">
      <div className="shrink-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">Buchhaltung</h1>
          <p className="text-sm text-white/30 mt-2 font-medium">Rechnungen, Angebote & Zahlungen</p>
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
            <Plus size={16} /><span className="hidden sm:inline">Zahlung hinzufügen</span>
          </button>
        )}
        {tab === 'subscriptions' && (
          <button onClick={() => setSubscriptionModal({})} className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95">
            <Plus size={16} /><span className="hidden sm:inline">Neues Abo</span>
          </button>
        )}
        {tab === 'salaries' && (
          <button onClick={() => setSalaryModal({})} className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95">
            <Plus size={16} /><span className="hidden sm:inline">Gehalt erfassen</span>
          </button>
        )}
        {(tab === 'service_contracts' || tab === 'fulfillment' || tab === 'sales_partners') && (
          <button
            onClick={() => setContractModal({ type: TAB_CONTRACT_TYPE[tab] })}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          >
            <Plus size={16} /><span className="hidden sm:inline">Neuer Vertrag</span>
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

      {(tab === 'overview' || tab === 'invoices' || tab === 'quotes' || tab === 'receipts' || tab === 'service_contracts' || tab === 'fulfillment' || tab === 'sales_partners') && (
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
      </div>{/* /shrink-0 */}

      <div className="flex-1 min-h-0 flex flex-col">
      {loading ? (
        <p className="text-sm text-white/30 text-center py-16 font-medium">Lädt…</p>
      ) : tab === 'overview' ? (
        <div className="flex-1 min-h-0 flex flex-col gap-5">
          <div className="shrink-0">
            {kpiVisible && (
              <div className="flex items-center justify-end mb-3">
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
          </div>
          <div className="bg-panel rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="shrink-0 px-6 pt-5 pb-0">
              <h2 className="text-sm font-black text-white mb-4">Letzte Zahlungen & Rechnungen</h2>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
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
        </div>
      ) : tab === 'subscriptions' ? (
        subscriptions.length === 0 ? (
          <div className="bg-panel rounded-2xl py-16 text-center flex-1 min-h-0">
            <p className="text-white/40 text-sm font-medium">Noch keine Abos.</p>
          </div>
        ) : (
          <div className="bg-panel rounded-2xl flex-1 min-h-0 overflow-y-auto">
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
      ) : tab === 'salaries' ? (
        salaries.length === 0 ? (
          <div className="bg-panel rounded-2xl py-16 text-center flex-1 min-h-0">
            <p className="text-white/40 text-sm font-medium">Noch keine Gehälter erfasst.</p>
            <p className="text-white/25 text-xs mt-1">Trage deine Lohnzettel (L16) hier ein.</p>
          </div>
        ) : (
          <div className="bg-panel rounded-2xl flex-1 min-h-0 overflow-y-auto">
            <ul>
              {salaries.map((s, i) => (
                <li key={s.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i < salaries.length - 1 ? 'border-b border-panel-2' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{s.employer_name}</p>
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/8 text-white/35">
                        {SALARY_TYPE_LABELS[s.entry_type]}
                      </span>
                    </div>
                    <p className="text-xs text-white/35 mt-0.5">
                      {s.reference_number ?? `GH-${s.period_year}`} · {s.issue_date ? new Date(s.issue_date).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : s.period_year}{s.notes ? ` · ${s.notes}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-accent-green">{fmtMoney(s.gross_amount)}</p>
                    {s.tax_withheld > 0 && (
                      <p className="text-xs text-white/30 mt-0.5">LSt {fmtMoney(s.tax_withheld)}</p>
                    )}
                  </div>
                  {s.file_path && (
                    <button onClick={() => setSalaryPreview(s)} title="Lohnzettel ansehen"
                      className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0">
                      <Eye size={13} />
                    </button>
                  )}
                  <button onClick={() => setSalaryModal({ entry: s })} title="Bearbeiten"
                    className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteSalary(s.id)} title="Löschen"
                    className="w-8 h-8 rounded-full bg-white/6 hover:bg-accent/20 flex items-center justify-center text-white/30 hover:text-accent transition-all shrink-0">
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : tab === 'closings' ? (
        <div className="flex-1 min-h-0 flex flex-col gap-5">
          <div className="bg-panel rounded-2xl p-5 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-white">Zeitraum</h2>
              <button
                onClick={exportClosingPdf}
                disabled={exportingPdf}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all active:scale-95 disabled:opacity-50"
              >
                {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} strokeWidth={2.2} />}
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
          <div className="flex-1 min-h-0 flex flex-col">
            <p className="shrink-0 text-xs text-white/30 mb-2 px-1">Abschluss · {closing.label} · {closing.invoiceCount} bezahlte Rechnung(en)</p>
            <DocList docs={closing.periodInvoices} type="invoice" className="flex-1 min-h-0 overflow-y-auto" />
          </div>
        </div>
      ) : tab === 'invoices' ? (
        <DocList docs={listInvoices} type="invoice" className="flex-1 min-h-0 overflow-y-auto" />
      ) : tab === 'quotes' ? (
        <DocList docs={listQuotes} type="quote" className="flex-1 min-h-0 overflow-y-auto" />
      ) : tab === 'service_contracts' ? (
        <ContractList items={listServiceContracts} type="service" className="flex-1 min-h-0 overflow-y-auto" />
      ) : tab === 'fulfillment' ? (
        <ContractList items={listFulfillmentContracts} type="fulfillment" className="flex-1 min-h-0 overflow-y-auto" />
      ) : tab === 'sales_partners' ? (
        <ContractList items={listAgentContracts} type="agent" className="flex-1 min-h-0 overflow-y-auto" />
      ) : (
        <div className="bg-panel rounded-2xl flex-1 min-h-0 overflow-y-auto">
          {listReceipts.length === 0 ? (
            <div className="py-16 text-center"><p className="text-white/40 text-sm font-medium">Noch keine Zahlungen.</p></div>
          ) : (
            <ul>
              {listReceipts.map((r, i) => (
                <li key={r.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i < listReceipts.length - 1 ? 'border-b border-panel-2' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{r.vendor || RECEIPT_TYPE_LABELS[r.receipt_type]}</p>
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/8 text-white/35">
                        {RECEIPT_TYPE_LABELS[r.receipt_type]}
                      </span>
                    </div>
                    <p className="text-xs text-white/35 mt-0.5">{fmtDate(r.date)}{r.category ? ` · ${r.category}` : ''}</p>
                  </div>
                  <p className="text-sm font-bold text-accent shrink-0">{fmtMoney(r.amount)}</p>
                  <button
                    onClick={() => setPreviewReceipt(r)}
                    title="Vorschau"
                    className={`w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center transition-all shrink-0 ${r.file_path ? 'text-white/40 hover:text-white' : 'text-white/15 cursor-default'}`}
                    disabled={!r.file_path}
                  >
                    <ImageIcon size={13} />
                  </button>
                  <button
                    onClick={() => setEditReceipt(r)}
                    title="Bearbeiten"
                    className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
                  >
                    <Pencil size={13} />
                  </button>
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

      </div>{/* /flex-1 */}

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
      {editReceipt && (
        <ReceiptModal
          receipt={editReceipt}
          onClose={() => setEditReceipt(null)}
          onSaved={() => { setEditReceipt(null); loadAll() }}
        />
      )}
      {importModal && (
        <InvoiceImportModal
          nextNumberHint={nextNumberHint('invoice')}
          onClose={() => setImportModal(false)}
          onSaved={() => { setImportModal(false); loadAll() }}
        />
      )}
      {importedEditDoc && (
        <ImportedInvoiceEditModal
          doc={importedEditDoc}
          onClose={() => setImportedEditDoc(null)}
          onSaved={() => { setImportedEditDoc(null); loadAll() }}
        />
      )}
      {subscriptionModal && (
        <SubscriptionModal
          subscription={subscriptionModal.sub}
          onClose={() => setSubscriptionModal(null)}
          onSaved={() => { setSubscriptionModal(null); loadAll() }}
        />
      )}
      {salaryModal && (
        <SalaryModal
          entry={salaryModal.entry}
          onClose={() => setSalaryModal(null)}
          onSaved={() => { setSalaryModal(null); loadAll() }}
          onPreview={salaryModal.entry?.file_path ? () => setSalaryPreview(salaryModal.entry!) : undefined}
        />
      )}
      {salaryPreview && (
        <SalaryPreviewModal entry={salaryPreview} onClose={() => setSalaryPreview(null)} />
      )}
      {previewDoc && (
        <PdfPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
      {previewReceipt && (
        <ReceiptPreviewModal receipt={previewReceipt} onClose={() => setPreviewReceipt(null)} />
      )}
      {contractModal && (
        <ContractModal
          contractType={contractModal.type}
          contract={contractModal.contract}
          nextNumberHint={contractModal.contract ? undefined : nextContractNumberHint(contractModal.type)}
          onClose={() => setContractModal(null)}
          onSaved={() => { setContractModal(null); loadAll() }}
        />
      )}
      {previewContract && (
        <ContractPreviewModal contract={previewContract} onClose={() => setPreviewContract(null)} />
      )}
      {confirmDelete && (
        <ConfirmDialog
          message={confirmDelete.message}
          onConfirm={confirmDelete.action}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
