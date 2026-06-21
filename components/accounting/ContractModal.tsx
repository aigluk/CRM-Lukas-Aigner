'use client'

import { useState, useEffect } from 'react'
import { X, Save, ChevronDown } from 'lucide-react'
import type { AccountingContract, AccountingCustomer, AccountingPartner, AccountingSalesPartner, ContractType, DocLanguage } from '@/lib/types'
import { DatePicker } from '@/components/accounting/DatePicker'

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'
const labelCls = 'block text-xs font-bold text-white/30 mb-1.5'

const TYPE_META: Record<ContractType, { title: string; partyLabel: string; partyPlaceholder: string; newLabel: string; pickerLabel: string; endpoint: string; listKey: string }> = {
  service:     { title: 'Dienstleistungsvertrag', partyLabel: 'Kunde / Auftraggeber', partyPlaceholder: 'Firma oder Name', newLabel: 'Neuer Dienstleistungsvertrag', pickerLabel: 'Gespeicherten Kunden übernehmen', endpoint: '/api/accounting/customers', listKey: 'customers' },
  fulfillment: { title: 'Fulfillment-Vertrag', partyLabel: 'Partneragentur', partyPlaceholder: 'Name der Partneragentur', newLabel: 'Neuer Fulfillment-Vertrag', pickerLabel: 'Gespeicherten Partner übernehmen', endpoint: '/api/accounting/partners', listKey: 'partners' },
  agent:       { title: 'Handelsagentenvertrag', partyLabel: 'Handelsagent', partyPlaceholder: 'Vor- und Nachname', newLabel: 'Neuer Handelsagentenvertrag', pickerLabel: 'Gespeicherten Vertriebspartner übernehmen', endpoint: '/api/accounting/sales-partners', listKey: 'salesPartners' },
}

export function ContractModal({
  contractType, contract, nextNumberHint, onClose, onSaved,
}: {
  contractType: ContractType
  contract?: AccountingContract
  nextNumberHint?: string
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!contract
  const meta = TYPE_META[contractType]

  const [contacts, setContacts] = useState<(AccountingCustomer | AccountingPartner | AccountingSalesPartner)[]>([])
  const [contactId, setContactId] = useState(
    contractType === 'fulfillment' ? contract?.partner_id ?? ''
    : contractType === 'agent' ? contract?.sales_partner_id ?? ''
    : contract?.customer_id ?? ''
  )
  const [contractNumber, setContractNumber] = useState(contract?.contract_number ?? nextNumberHint ?? '')
  const [partyName, setPartyName] = useState(contract?.party_name ?? '')
  const [partyAddress, setPartyAddress] = useState(contract?.party_address ?? '')
  const [partyEmail, setPartyEmail] = useState(contract?.party_email ?? '')
  const [partyPhone, setPartyPhone] = useState(contract?.party_phone ?? '')
  const [partyBirthdate, setPartyBirthdate] = useState(contract?.party_birthdate ?? '')
  const [packageName, setPackageName] = useState(contract?.package_name ?? '')
  const [packagePrice, setPackagePrice] = useState(contract?.package_price ?? '')
  const [paymentMode, setPaymentMode] = useState(contract?.payment_mode ?? 'einmalzahlung')
  const [termMonths, setTermMonths] = useState(contract?.term_months ?? 12)
  const [startDate, setStartDate] = useState(contract?.start_date ?? new Date().toISOString().slice(0, 10))
  const [language, setLanguage] = useState<DocLanguage>(contract?.language ?? 'de')
  const [notes, setNotes] = useState(contract?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(meta.endpoint).then(r => r.json()).then(d => setContacts(d[meta.listKey] ?? [])).catch(() => {})
  }, [meta.endpoint, meta.listKey])

  function applyContact(id: string) {
    setContactId(id)
    const c = contacts.find(x => x.id === id)
    if (c) {
      setPartyName(c.name)
      setPartyAddress(c.address || '')
      setPartyEmail(c.email || '')
      setPartyPhone(c.phone || '')
    }
  }

  async function save() {
    if (!partyName.trim()) { setError(`${meta.partyLabel} fehlt.`); return }
    setSaving(true)
    setError('')

    const payload = {
      contract_type: contractType,
      contract_number: contractNumber,
      customer_id: contractType === 'service' ? (contactId || null) : null,
      partner_id: contractType === 'fulfillment' ? (contactId || null) : null,
      sales_partner_id: contractType === 'agent' ? (contactId || null) : null,
      party_name: partyName.trim(),
      party_address: partyAddress || null,
      party_email: partyEmail || null,
      party_phone: partyPhone || null,
      party_birthdate: partyBirthdate || null,
      package_name: contractType === 'service' ? (packageName || null) : null,
      package_price: contractType !== 'agent' ? (packagePrice || null) : null,
      payment_mode: contractType === 'service' ? paymentMode : null,
      term_months: contractType === 'service' ? termMonths : null,
      start_date: startDate || null,
      language,
      notes: notes || null,
    }

    try {
      const res = await fetch('/api/accounting/contracts', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: contract!.id, ...payload } : payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Speichern fehlgeschlagen.')
      }
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-60 flex items-end sm:items-center justify-center px-3 sm:p-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="bg-panel w-full sm:max-w-2xl rounded-2xl overflow-y-auto shadow-2xl overscroll-contain"
        style={{ maxHeight: 'calc(94dvh - env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="sticky top-0 bg-panel z-10 px-5 pt-4 pb-3 border-b border-rim-subtle flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-white">{isEdit ? 'Bearbeiten' : meta.newLabel}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex bg-dark rounded-lg p-0.5">
              {(['de', 'en'] as DocLanguage[]).map(l => (
                <button
                  key={l} type="button" onClick={() => setLanguage(l)}
                  className={`px-2.5 py-1 rounded-md text-xs font-black transition-all ${
                    language === l ? 'bg-accent text-white' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Vertragsnummer</label>
              <input type="text" value={contractNumber} onChange={e => setContractNumber(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Vertragsbeginn</label>
              <DatePicker value={startDate} onChange={setStartDate} className={inputCls} />
            </div>
          </div>

          {contacts.length > 0 && (
            <div>
              <label className={labelCls}>{meta.pickerLabel}</label>
              <div className="relative">
                <select
                  value={contactId}
                  onChange={e => applyContact(e.target.value)}
                  className={`${inputCls} appearance-none pr-9`}
                >
                  <option value="">- Manuell eingeben -</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{meta.partyLabel}</label>
              <input type="text" value={partyName} onChange={e => setPartyName(e.target.value)} placeholder={meta.partyPlaceholder} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>E-Mail</label>
              <input type="email" value={partyEmail} onChange={e => setPartyEmail(e.target.value)} placeholder="kontakt@firma.at" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Adresse (mehrzeilig)</label>
            <textarea value={partyAddress} onChange={e => setPartyAddress(e.target.value)} rows={2}
              placeholder={'Straße Nr.\nPLZ Ort\nLand'} className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Telefon</label>
              <input type="tel" value={partyPhone} onChange={e => setPartyPhone(e.target.value)} placeholder="+43 ..." className={inputCls} />
            </div>
            {contractType === 'agent' && (
              <div>
                <label className={labelCls}>Geburtsdatum</label>
                <DatePicker value={partyBirthdate} onChange={setPartyBirthdate} className={inputCls} />
              </div>
            )}
          </div>

          {contractType === 'service' && (
            <div className="bg-dark rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-white/40">Leistungspaket</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Paket</label>
                  <input type="text" value={packageName} onChange={e => setPackageName(e.target.value)} placeholder="z. B. Starter, Enterprise, Custom" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Preis</label>
                  <input type="text" value={packagePrice} onChange={e => setPackagePrice(e.target.value)} placeholder="z. B. 499 €/Monat" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Zahlungsmodalität</label>
                  <div className="flex bg-panel rounded-xl p-1">
                    <button type="button" onClick={() => setPaymentMode('einmalzahlung')}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${paymentMode === 'einmalzahlung' ? 'bg-accent text-white' : 'text-white/40 hover:text-white'}`}
                    >Einmalzahlung</button>
                    <button type="button" onClick={() => setPaymentMode('raten')}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${paymentMode === 'raten' ? 'bg-accent text-white' : 'text-white/40 hover:text-white'}`}
                    >Ratenzahlung</button>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Laufzeit (Monate)</label>
                  <input type="number" value={termMonths} min={1} onChange={e => setTermMonths(parseInt(e.target.value) || 1)} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {contractType === 'fulfillment' && (
            <div>
              <label className={labelCls}>Pauschalvergütung</label>
              <input type="text" value={packagePrice} onChange={e => setPackagePrice(e.target.value)} placeholder="z. B. 1.200 € pro Projekt" className={inputCls} />
            </div>
          )}

          <div>
            <label className={labelCls}>Ergänzende Vereinbarungen / Notizen</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Zusätzliche individuelle Vereinbarungen, die im Vertrag ergänzt werden sollen..."
              className={`${inputCls} resize-none`} />
          </div>

          {error && <p className="text-xs text-accent font-bold">{error}</p>}

          <button
            onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-xl transition-all active:scale-[0.98]"
          >
            <Save size={14} />
            {saving ? 'Speichern…' : 'Speichern & PDF erstellen'}
          </button>

          <div style={{ height: 'max(1rem, env(safe-area-inset-bottom))' }} />
        </div>
      </div>
    </div>
  )
}
