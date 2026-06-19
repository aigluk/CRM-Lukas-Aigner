'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, FileText, TrendingUp, TrendingDown, Wallet,
  Download, Trash2, ChevronDown, Image as ImageIcon,
} from 'lucide-react'
import type { AccountingDocument, AccountingReceipt, DocType, DocStatus, ReceiptType } from '@/lib/types'
import { DocumentModal } from './DocumentModal'
import { ReceiptModal } from './ReceiptModal'
import { useClickOutside } from '@/lib/useClickOutside'
import { useRef } from 'react'

type Tab = 'overview' | 'invoices' | 'quotes' | 'receipts'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'invoices', label: 'Rechnungen' },
  { id: 'quotes',   label: 'Angebote' },
  { id: 'receipts', label: 'Belege' },
]

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
  const [tab, setTab] = useState<Tab>('overview')
  const [documents, setDocuments] = useState<AccountingDocument[]>([])
  const [receipts, setReceipts]   = useState<AccountingReceipt[]>([])
  const [loading, setLoading]     = useState(true)
  const [docModal, setDocModal]   = useState<{ type: DocType; doc?: AccountingDocument } | null>(null)
  const [receiptModal, setReceiptModal] = useState(false)

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
      <div className="bg-panel rounded-2xl overflow-hidden">
        <ul>
          {docs.map((doc, i) => (
            <li key={doc.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i < docs.length - 1 ? 'border-b border-panel-2' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{doc.client_name}</p>
                <p className="text-xs text-white/35 mt-0.5">{doc.doc_number} · {fmtDate(doc.issue_date)}</p>
              </div>
              <p className="text-sm font-bold text-white shrink-0 hidden sm:block">{fmtMoney(docTotal(doc))}</p>
              <StatusPicker status={doc.status} onChange={s => updateDocStatus(doc.id, s)} />
              <a
                href={`/api/accounting/documents/${doc.id}/pdf`} target="_blank" rel="noopener noreferrer"
                title="PDF öffnen"
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<TrendingUp size={16} />} label="Einnahmen (bezahlt)" value={fmtMoney(totals.incomePaid)} tone="green" />
            <KpiCard icon={<Wallet size={16} />} label="Offene Rechnungen" value={fmtMoney(totals.incomeOpen)} />
            <KpiCard icon={<TrendingDown size={16} />} label="Ausgaben" value={fmtMoney(totals.expenses)} tone="accent" />
            <KpiCard icon={<TrendingUp size={16} />} label="Gewinn (dieses Jahr)" value={fmtMoney(totals.profit)} tone={totals.profit >= 0 ? 'green' : 'accent'} />
          </div>

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
    </div>
  )
}
