'use client'

import { useState, useEffect, useRef } from 'react'
import { Lead } from '@/lib/types'
import {
  Sparkles, Plus, Loader2, MapPin, Phone, Mail,
  ExternalLink, User, Building2, CheckCircle,
  Clock, X, RotateCcw,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type GenResult = {
  leads: Partial<Lead>[]
  total: number
  ceoFound: number
  emailFound: number
  query: string
}

type RecentSearch = {
  branche: string
  countryId: string
  city: string
  customCity: string
  radius: string
  timestamp: number
  total?: number
  emailFound?: number
}

type BranchItem = {
  id: string
  label: string
  custom: boolean
}

type FilterMode = 'all' | 'email' | 'ceo'

// ── Static data ────────────────────────────────────────────────────────────────

const DEFAULT_LABELS = [
  'Immobilien/Makler', 'Real Estate', 'Bauträger', 'Developer',
  'Projektentwicklung', 'Hotels', 'Events/Eventlocations', 'Vermietung',
]

const COUNTRIES = [
  { id: 'at', code: 'AT', label: 'Österreich', cities: ['Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'St. Pölten', 'Wels'] },
  { id: 'de', code: 'DE', label: 'Deutschland', cities: ['München', 'Berlin', 'Hamburg', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Köln', 'Nürnberg'] },
  { id: 'ch', code: 'CH', label: 'Schweiz',     cities: ['Zürich', 'Genf', 'Basel', 'Bern', 'Lausanne', 'Zug'] },
  { id: 'ae', code: 'AE', label: 'Dubai / UAE', cities: ['Dubai', 'Abu Dhabi', 'Sharjah'] },
  { id: 'cy', code: 'CY', label: 'Zypern',      cities: ['Limassol', 'Nikosia', 'Paphos', 'Larnaka'] },
  { id: 'es', code: 'ES', label: 'Spanien',     cities: ['Marbella', 'Barcelona', 'Madrid', 'Ibiza', 'Mallorca'] },
  { id: 'us', code: 'US', label: 'USA',         cities: ['Miami', 'New York', 'Los Angeles', 'Las Vegas', 'Chicago'] },
]

const RADII = [
  { value: '2', label: '2 km' }, { value: '5', label: '5 km' },
  { value: '10', label: '10 km' }, { value: '25', label: '25 km' },
  { value: '50', label: '50 km' }, { value: '0', label: 'Überall' },
]

const LS_BRANCHES = 'la-crm-gen-branches-v2'
const LS_RECENT   = 'la-crm-gen-recent'

// ── Helpers ───────────────────────────────────────────────────────────────────

function ls<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

function getDomain(url?: string | null) {
  if (!url) return null
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '') }
  catch { return url }
}

function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return 'Gerade eben'
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  return `vor ${Math.floor(h / 24)} Tagen`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GeneratorForm() {
  const [branche, setBranche]           = useState('')
  const [countryId, setCountryId]       = useState('at')
  const [city, setCity]                 = useState('')
  const [customCity, setCustomCity]     = useState('')
  const [radius, setRadius]             = useState('10')
  const [loading, setLoading]           = useState(false)
  const [result, setResult]             = useState<GenResult | null>(null)
  const [error, setError]               = useState('')
  const [saved, setSaved]               = useState(false)
  const [saving, setSaving]             = useState(false)

  // Branch management
  const [branches, setBranches]         = useState<BranchItem[]>([])
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [newBranchInput, setNewBranchInput] = useState('')
  const [addingBranch, setAddingBranch] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  // Drag & drop
  const dragIdRef   = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Lead selection + filter
  const [filterMode, setFilterMode]     = useState<FilterMode>('all')
  const [selectedIdx, setSelectedIdx]   = useState<Set<number>>(new Set())

  useEffect(() => {
    const stored = ls<BranchItem[]>(LS_BRANCHES, [])
    setBranches(
      stored.length > 0
        ? stored
        : DEFAULT_LABELS.map(l => ({ id: l, label: l, custom: false }))
    )
    setRecentSearches(ls<RecentSearch[]>(LS_RECENT, []))
  }, [])

  useEffect(() => { if (addingBranch) addInputRef.current?.focus() }, [addingBranch])

  const country     = COUNTRIES.find(c => c.id === countryId)!
  const locationStr = customCity || city || country.label

  // ── Branch management ──────────────────────────────────────────────────────

  function saveBranches(updated: BranchItem[]) {
    setBranches(updated)
    localStorage.setItem(LS_BRANCHES, JSON.stringify(updated))
  }

  function addBranch() {
    const b = newBranchInput.trim()
    if (!b) return
    if (!branches.find(x => x.id === b)) {
      saveBranches([...branches, { id: b, label: b, custom: true }])
    }
    setNewBranchInput(''); setAddingBranch(false)
    setBranche(b)
  }

  function removeBranch(id: string) {
    saveBranches(branches.filter(b => b.id !== id))
    if (branche === id) setBranche('')
  }

  function restoreDefaults() {
    const customOnes = branches.filter(b => b.custom)
    saveBranches([
      ...DEFAULT_LABELS.map(l => ({ id: l, label: l, custom: false })),
      ...customOnes,
    ])
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  function reorderBranch(fromId: string, toId: string) {
    setBranches(prev => {
      const arr = [...prev]
      const fi = arr.findIndex(b => b.id === fromId)
      const ti = arr.findIndex(b => b.id === toId)
      if (fi < 0 || ti < 0 || fi === ti) return prev
      const [item] = arr.splice(fi, 1)
      arr.splice(ti, 0, item)
      localStorage.setItem(LS_BRANCHES, JSON.stringify(arr))
      return arr
    })
  }

  // ── Filtered leads (indices into result.leads) ─────────────────────────────

  const filteredIndices = result
    ? result.leads
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => {
          if (filterMode === 'email') return !!(l.email || (l as any).email_general)
          if (filterMode === 'ceo')   return !!l.ceos
          return true
        })
        .map(({ i }) => i)
    : []

  const allFilteredSelected =
    filteredIndices.length > 0 && filteredIndices.every(i => selectedIdx.has(i))

  function toggleIdx(i: number) {
    setSelectedIdx(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }
  function selectAll()   { setSelectedIdx(new Set(filteredIndices)) }
  function deselectAll() { setSelectedIdx(new Set()) }

  // ── Recent search helpers ──────────────────────────────────────────────────

  function saveRecent(gen: GenResult) {
    const entry: RecentSearch = {
      branche, countryId, city, customCity, radius,
      timestamp: Date.now(), total: gen.total, emailFound: gen.emailFound,
    }
    const updated = [entry, ...recentSearches.filter(r =>
      !(r.branche === branche && r.countryId === countryId && r.city === city && r.customCity === customCity)
    )].slice(0, 6)
    setRecentSearches(updated)
    localStorage.setItem(LS_RECENT, JSON.stringify(updated))
  }

  function applyRecent(r: RecentSearch) {
    setBranche(r.branche); setCountryId(r.countryId)
    setCity(r.city); setCustomCity(r.customCity); setRadius(r.radius)
    setResult(null); setSaved(false); setSelectedIdx(new Set())
  }

  // ── API calls ──────────────────────────────────────────────────────────────

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    if (!branche) return
    setLoading(true); setError(''); setResult(null)
    setSaved(false); setSelectedIdx(new Set()); setFilterMode('all')
    try {
      const res  = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branches: branche, custom: locationStr, radius }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Generieren.')
      setResult(data)
      saveRecent(data)
      // Pre-select all leads
      setSelectedIdx(new Set(Array.from({ length: data.leads.length }, (_, i) => i)))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveLeads() {
    if (!result || !selectedIdx.size) return
    const toSave = [...selectedIdx].sort((a, b) => a - b).map(i => result.leads[i]).filter(Boolean)
    if (!toSave.length) return
    setSaving(true)
    try {
      const res  = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: toSave }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Speichern.')
      setSaved(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Shared styles ──────────────────────────────────────────────────────────

  const pill = (active: boolean) =>
    `transition-all text-xs font-bold px-3 py-2 rounded-xl ${
      active ? 'bg-accent text-white' : 'bg-dark text-white/35 hover:text-white/70'
    }`

  const hasDefaultsHidden = !DEFAULT_LABELS.every(l => branches.some(b => b.id === l))

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="mb-5 shrink-0">
        <h1 className="text-3xl font-black text-white tracking-tight leading-none">Lead Generator</h1>
      </div>

      {/* Fixed-height two-column grid — both panels scroll internally on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:overflow-hidden lg:h-[calc(100dvh-11.5rem)]">

        {/* ── LEFT CONFIG ─────────────────────────────────────────────── */}
        <form
          onSubmit={generate}
          className="lg:col-span-2 flex flex-col gap-4 lg:overflow-y-auto lg:pr-1"
        >

          {/* Branche */}
          <div className="bg-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles size={14} strokeWidth={2.6} className="text-accent" />
                <h2 className="text-sm font-black text-white">Branche</h2>
              </div>
              {hasDefaultsHidden && (
                <button type="button" onClick={restoreDefaults}
                  className="text-[10px] font-bold text-white/25 hover:text-white/60 flex items-center gap-1 transition-colors">
                  <RotateCcw size={10} />Standard
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {branches.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => { dragIdRef.current = item.id }}
                  onDragOver={e => { e.preventDefault(); setDragOverId(item.id) }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={() => {
                    if (dragIdRef.current && dragIdRef.current !== item.id) {
                      reorderBranch(dragIdRef.current, item.id)
                    }
                    dragIdRef.current = null; setDragOverId(null)
                  }}
                  onDragEnd={() => { dragIdRef.current = null; setDragOverId(null) }}
                  className={`relative group/pill transition-all ${dragOverId === item.id ? 'ring-1 ring-accent/60 rounded-xl' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setBranche(branche === item.id ? '' : item.id)}
                    className={`${pill(branche === item.id)} pr-7 cursor-grab active:cursor-grabbing select-none`}
                  >
                    {item.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBranch(item.id)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover/pill:opacity-100 hover:bg-white/20 transition-all"
                  >
                    <X size={8} className="text-white/60" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4">
              {addingBranch ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={addInputRef}
                    type="text"
                    value={newBranchInput}
                    onChange={e => setNewBranchInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addBranch() }
                      if (e.key === 'Escape') setAddingBranch(false)
                    }}
                    placeholder="Branche eingeben…"
                    className="flex-1 bg-dark rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button type="button" onClick={addBranch}
                    className="bg-accent text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-accent-hover transition-all">OK</button>
                  <button type="button" onClick={() => setAddingBranch(false)}
                    className="text-white/30 hover:text-white px-2 py-2 rounded-xl transition-colors"><X size={13} /></button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingBranch(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-white/25 hover:text-white/60 transition-colors mt-2"
                >
                  <Plus size={12} />Eigene Branche
                </button>
              )}
            </div>
          </div>

          {/* Region */}
          <div className="bg-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <MapPin size={14} className="text-white/30" />
              <h2 className="text-sm font-black text-white">Region</h2>
            </div>

            <p className="text-xs font-black text-white/20 mb-2.5">Land</p>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {COUNTRIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCountryId(c.id); setCity(''); setCustomCity('') }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    countryId === c.id ? 'bg-accent text-white' : 'bg-dark text-white/35 hover:text-white/70'
                  }`}
                >
                  <span className={`text-[8px] font-black tracking-wider px-1 py-0.5 rounded ${
                    countryId === c.id ? 'bg-white/20 text-white' : 'bg-white/8 text-white/30'
                  }`}>{c.code}</span>
                  {c.label}
                </button>
              ))}
            </div>

            <p className="text-xs font-black text-white/20 mb-2.5">Stadt / Ort</p>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {country.cities.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCity(city === c ? '' : c); setCustomCity('') }}
                  className={`py-2 rounded-xl text-xs font-bold text-center truncate px-2 transition-all ${
                    city === c ? 'bg-accent text-white' : 'bg-dark text-white/35 hover:text-white/70'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 bg-dark ${customCity ? 'ring-1 ring-accent/25' : ''}`}>
              <MapPin size={11} className="text-white/20 shrink-0" />
              <input
                type="text"
                value={customCity}
                onChange={e => { setCustomCity(e.target.value); if (e.target.value) setCity('') }}
                placeholder="Eigener Ort…"
                className="flex-1 bg-transparent text-xs text-white placeholder-white/20 outline-none"
              />
              {customCity && (
                <button type="button" onClick={() => setCustomCity('')} className="text-white/25 hover:text-white/60">
                  <X size={11} />
                </button>
              )}
            </div>
            {!city && !customCity && (
              <p className="text-xs text-white/20 mt-1.5 pl-1">Kein Ort = ganzes Land</p>
            )}
          </div>

          {/* Radius */}
          <div className="bg-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-white">Suchradius</h2>
              <span className="text-xs font-bold text-white/30">
                {radius === '0' ? 'Kein Limit' : `${radius} km`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {RADII.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRadius(r.value)}
                  className={`py-2 rounded-xl text-xs font-bold text-center transition-all ${
                    radius === r.value ? 'bg-accent text-white' : 'bg-dark text-white/35 hover:text-white/70'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !branche}
            className="w-full flex items-center justify-center gap-2.5 bg-accent hover:bg-accent-hover disabled:opacity-30 text-white font-black text-sm py-4 rounded-2xl transition-all active:scale-[0.98] shrink-0"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" />Generiere…</>
              : <><Sparkles size={16} strokeWidth={2.4} />Leads generieren</>
            }
          </button>
        </form>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-4 lg:overflow-y-auto">

          {error && (
            <div className="bg-accent/10 border border-accent/20 rounded-2xl px-5 py-4">
              <p className="text-sm text-accent font-bold">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <>
              <div className="bg-panel rounded-2xl flex items-center gap-5 px-6 py-6">
                <div className="w-10 h-10 rounded-xl bg-accent/12 flex items-center justify-center shrink-0">
                  <Sparkles size={18} strokeWidth={2.4} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-black text-white/25">Branche &amp; Region wählen</p>
                  <p className="text-xs text-white/15 mt-0.5">Ergebnisse erscheinen hier zur Vorschau &amp; Auswahl</p>
                </div>
              </div>

              {recentSearches.length > 0 && (
                <div className="bg-panel rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
                    <Clock size={13} className="text-white/25" />
                    <h3 className="text-sm font-black text-white/60">Letzte Suchen</h3>
                  </div>
                  <div>
                    {recentSearches.map((r, i) => {
                      const loc = r.customCity || r.city || COUNTRIES.find(c => c.id === r.countryId)?.label || ''
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-4 px-5 py-3.5 hover:bg-panel-hover transition-colors ${
                            i < recentSearches.length - 1 ? 'border-b border-white/4' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white/80 truncate">{r.branche}</p>
                              <span className="text-white/20 text-xs shrink-0">·</span>
                              <p className="text-xs text-white/40 truncate">{loc}</p>
                              {r.radius !== '0' && (
                                <span className="text-[10px] bg-dark text-white/25 px-1.5 py-0.5 rounded-md font-bold shrink-0">{r.radius} km</span>
                              )}
                            </div>
                            <p className="text-xs text-white/20 mt-0.5 flex items-center gap-2">
                              {timeAgo(r.timestamp)}
                              {r.total !== undefined && <><span className="text-white/15">·</span>{r.total} Leads{r.emailFound ? `, ${r.emailFound} E-Mails` : ''}</>}
                            </p>
                          </div>
                          <button
                            onClick={() => applyRecent(r)}
                            className="shrink-0 flex items-center gap-1.5 bg-dark hover:bg-panel-hover text-white/40 hover:text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
                          >
                            <RotateCcw size={11} />
                            Wiederholen
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="bg-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                <Loader2 size={15} className="text-accent animate-spin" />
                <span className="text-sm font-bold text-white/40">Suche läuft…</span>
                <span className="ml-auto text-xs text-white/20">{branche} · {locationStr}</span>
              </div>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-xl bg-dark shimmer shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-dark shimmer rounded-lg" style={{ width: `${60 + (i % 3) * 15}%` }} />
                    <div className="h-2 bg-dark shimmer rounded-lg" style={{ width: `${35 + (i % 4) * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Leadpool — results with selection */}
          {result && (
            <>
              {/* Filter + action bar */}
              <div className="bg-panel rounded-2xl p-4">
                {/* Filter chips */}
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <button onClick={() => setFilterMode('all')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${filterMode === 'all' ? 'bg-accent text-white' : 'bg-dark text-white/35 hover:text-white/70'}`}>
                    Alle ({result.total})
                  </button>
                  {result.emailFound > 0 && (
                    <button onClick={() => setFilterMode('email')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${filterMode === 'email' ? 'bg-accent-green text-dark' : 'bg-dark text-white/35 hover:text-white/70'}`}>
                      Mit E-Mail ({result.emailFound})
                    </button>
                  )}
                  {result.ceoFound > 0 && (
                    <button onClick={() => setFilterMode('ceo')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${filterMode === 'ceo' ? 'bg-dark text-white' : 'bg-dark text-white/35 hover:text-white/70'}`}>
                      Mit CEO ({result.ceoFound})
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={allFilteredSelected ? deselectAll : selectAll}
                    className="text-xs font-bold text-white/30 hover:text-white transition-colors"
                  >
                    {allFilteredSelected ? 'Auswahl aufheben' : 'Alle auswählen'}
                  </button>
                </div>

                {/* Import action */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/30 font-medium">
                    <span className="text-white font-bold">{selectedIdx.size}</span> von {result.total} ausgewählt
                  </span>
                  {saved ? (
                    <div className="flex items-center gap-2 text-accent-green text-sm font-black">
                      <CheckCircle size={14} />Gespeichert
                    </div>
                  ) : (
                    <button
                      onClick={saveLeads}
                      disabled={saving || !selectedIdx.size}
                      className="flex items-center gap-2 bg-accent-green/15 hover:bg-accent-green/25 text-accent-green disabled:opacity-30 text-sm font-black px-4 py-2.5 rounded-xl transition-all shrink-0"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      {selectedIdx.size > 0 ? `${selectedIdx.size} importieren` : 'Auswählen & importieren'}
                    </button>
                  )}
                </div>
              </div>

              {/* Lead rows */}
              <div className="bg-panel rounded-2xl overflow-hidden">
                {filteredIndices.map((idx, j) => {
                  const lead    = result.leads[idx]
                  const domain  = getDomain(lead.website)
                  const email   = lead.email || (lead as any).email_general
                  const checked = selectedIdx.has(idx)
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleIdx(idx)}
                      className={`px-4 py-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                        checked ? 'bg-accent/7' : 'hover:bg-panel-hover'
                      } ${j < filteredIndices.length - 1 ? 'border-b border-white/4' : ''}`}
                    >
                      {/* Selection circle */}
                      <div className={`w-5 h-5 rounded-full shrink-0 mt-0.5 transition-all ${
                        checked ? 'bg-accent' : 'bg-white/10'
                      }`} />

                      <div className="w-7 h-7 rounded-xl bg-dark flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 size={13} className="text-white/20" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 justify-between">
                          <p className="text-sm font-bold text-white leading-snug truncate">{lead.name}</p>
                          {email && (
                            <span className="text-[10px] font-black bg-accent-green/12 text-accent-green px-2 py-0.5 rounded-lg shrink-0">E-Mail</span>
                          )}
                        </div>
                        {(lead.city || lead.region) && (
                          <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                            <MapPin size={9} />{lead.city || lead.region}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {lead.ceos && <span className="flex items-center gap-1 text-xs text-white/30"><User size={10} />{lead.ceos}</span>}
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-white/30 hover:text-accent transition-colors">
                              <Phone size={10} />{lead.phone}
                            </a>
                          )}
                          {email && (
                            <a href={`mailto:${email}`} onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-white/30 hover:text-accent-green transition-colors truncate max-w-48">
                              <Mail size={10} />{email}
                            </a>
                          )}
                          {domain && (
                            <a href={lead.website!} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-white/20 hover:text-white/50 transition-colors">
                              <ExternalLink size={10} />{domain}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
