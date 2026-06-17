'use client'

import { useState } from 'react'
import { Lead } from '@/lib/types'
import {
  Zap, CheckCircle, Plus, Loader2, Globe, MapPin,
  Phone, Mail, ExternalLink, User, Building2,
} from 'lucide-react'

type GenResult = {
  leads: Partial<Lead>[]
  total: number
  ceoFound: number
  emailFound: number
  query: string
}

const CLUSTERS = [
  {
    group: 'Immobilien',
    items: ['Makler', 'Bauträger', 'Architekten', 'Developer / Projektentwicklung'],
  },
  {
    group: 'Hospitality',
    items: ['Hotels', 'Gastronomie', 'Events / Eventlocations', 'Wellness / Spa'],
  },
  {
    group: 'Business',
    items: ['IT / Software', 'Finanzen / Versicherung', 'Gesundheit / Pflege', 'Handel', 'Logistik'],
  },
]

const COUNTRIES = [
  {
    id: 'at', label: 'Österreich', flag: '🇦🇹',
    regions: ['Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'St. Pölten', 'Wels'],
  },
  {
    id: 'de', label: 'Deutschland', flag: '🇩🇪',
    regions: ['München', 'Berlin', 'Hamburg', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Köln', 'Nürnberg'],
  },
  {
    id: 'ch', label: 'Schweiz', flag: '🇨🇭',
    regions: ['Zürich', 'Genf', 'Basel', 'Bern', 'Lausanne', 'Zug'],
  },
  {
    id: 'ae', label: 'Dubai', flag: '🇦🇪',
    regions: ['Dubai', 'Abu Dhabi', 'Sharjah'],
  },
  {
    id: 'cy', label: 'Zypern', flag: '🇨🇾',
    regions: ['Limassol', 'Nikosia', 'Paphos', 'Larnaka'],
  },
  {
    id: 'es', label: 'Spanien', flag: '🇪🇸',
    regions: ['Marbella', 'Barcelona', 'Madrid', 'Ibiza', 'Mallorca', 'Valencia'],
  },
  {
    id: 'us', label: 'USA', flag: '🇺🇸',
    regions: ['Miami', 'New York', 'Los Angeles', 'Las Vegas', 'Chicago'],
  },
]

function getDomain(url?: string | null) {
  if (!url) return null
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '') }
  catch { return url }
}

export function GeneratorForm() {
  const [branche, setBranche]           = useState('')
  const [countryId, setCountryId]       = useState('at')
  const [region, setRegion]             = useState('')
  const [customRegion, setCustomRegion] = useState('')
  const [loading, setLoading]           = useState(false)
  const [result, setResult]             = useState<GenResult | null>(null)
  const [error, setError]               = useState('')
  const [saved, setSaved]               = useState(false)
  const [saving, setSaving]             = useState(false)

  const country   = COUNTRIES.find(c => c.id === countryId)!
  const regionStr = customRegion || region || country.label

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    if (!branche) return
    setLoading(true); setError(''); setResult(null); setSaved(false)
    try {
      const res  = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branches: branche, custom: regionStr }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Generieren.')
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveLeads() {
    if (!result?.leads.length) return
    setSaving(true)
    try {
      const res  = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: result.leads }),
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

  const canGenerate = !!branche

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight leading-none">Lead Generator</h1>
        <p className="text-sm text-white/30 mt-2 font-medium">Google Maps · Outscraper · E-Mail Enrichment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

        {/* ── LEFT PANEL ── */}
        <form onSubmit={generate} className="lg:col-span-2 flex flex-col gap-4">

          {/* Branche */}
          <div className="bg-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                <Zap size={13} className="text-accent" />
              </div>
              <h2 className="text-sm font-black text-white">Branche</h2>
              {branche && (
                <span className="ml-auto text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                  {branche}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {CLUSTERS.map(cluster => (
                <div key={cluster.group}>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">{cluster.group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cluster.items.map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setBranche(branche === item ? '' : item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          branche === item
                            ? 'bg-accent text-white shadow-sm'
                            : 'bg-dark text-white/40 hover:text-white hover:bg-panel-hover'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Region */}
          <div className="bg-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-white/6 flex items-center justify-center">
                <Globe size={13} className="text-white/40" />
              </div>
              <h2 className="text-sm font-black text-white">Region</h2>
            </div>

            {/* Country tabs */}
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Land</p>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {COUNTRIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCountryId(c.id); setRegion(''); setCustomRegion('') }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    countryId === c.id
                      ? 'bg-dark text-white shadow-sm ring-1 ring-white/10'
                      : 'bg-dark text-white/35 hover:text-white/70'
                  }`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  {c.label}
                </button>
              ))}
            </div>

            {/* City grid */}
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Stadt / Ort</p>
            <div className="grid grid-cols-3 gap-1.5">
              {country.regions.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(region === r ? '' : r)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold text-center transition-all truncate ${
                    region === r
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-dark text-white/35 hover:text-white/70'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Custom override */}
            <div className="mt-3">
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all ${customRegion ? 'bg-dark ring-1 ring-accent/30' : 'bg-dark'}`}>
                <MapPin size={12} className="text-white/25 shrink-0" />
                <input
                  type="text"
                  value={customRegion}
                  onChange={e => { setCustomRegion(e.target.value); if (e.target.value) setRegion('') }}
                  placeholder="Eigene Eingabe überschreibt Auswahl…"
                  className="flex-1 bg-transparent text-xs text-white placeholder-white/20 outline-none"
                />
                {customRegion && (
                  <button type="button" onClick={() => setCustomRegion('')} className="text-white/25 hover:text-white text-xs">✕</button>
                )}
              </div>
              {!region && !customRegion && (
                <p className="text-[10px] text-white/25 mt-1.5 pl-1">Kein Ort = ganzes Land</p>
              )}
            </div>
          </div>

          {/* Data sources */}
          <div className="bg-panel rounded-2xl p-5">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-3">Datenquellen</p>
            <div className="space-y-2">
              {[
                { dot: 'bg-accent',       label: 'Google Maps via Outscraper' },
                { dot: 'bg-white/30',     label: 'Firmenbuch Austria' },
                { dot: 'bg-accent-green', label: 'E-Mail Enrichment' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                  <span className="text-xs text-white/30 font-medium">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Generate CTA */}
          <button
            type="submit"
            disabled={loading || !canGenerate}
            className="w-full flex items-center justify-center gap-2.5 bg-accent hover:bg-accent-hover disabled:opacity-30 text-white font-black text-sm py-4 rounded-2xl transition-all active:scale-[0.98] shadow-sm"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Generiere Leads…</>
              : <><Zap size={16} /> Leads generieren</>
            }
          </button>
        </form>

        {/* ── RIGHT PANEL ── */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {error && (
            <div className="bg-accent/10 border border-accent/20 rounded-2xl px-5 py-4">
              <p className="text-sm text-accent font-bold">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <div className="bg-panel rounded-2xl flex flex-col items-center justify-center py-32 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-dark flex items-center justify-center">
                <Zap size={28} className="text-white/10" />
              </div>
              <div>
                <p className="text-base font-black text-white/20">Branche & Region wählen</p>
                <p className="text-sm text-white/20 mt-1">dann Leads generieren</p>
              </div>
              <div className="flex items-center gap-6 mt-4">
                {[
                  { label: 'Google Maps', dot: 'bg-accent' },
                  { label: 'Firmenbuch', dot: 'bg-white/30' },
                  { label: 'E-Mails', dot: 'bg-accent-green' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span className="text-xs text-white/20 font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="bg-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                <Loader2 size={16} className="text-accent animate-spin" />
                <p className="text-sm font-bold text-white/50">Suche läuft…</p>
                <p className="text-xs text-white/25 ml-auto">{branche} · {regionStr}</p>
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-xl bg-dark shimmer shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-dark shimmer rounded-lg w-3/4" />
                    <div className="h-2.5 bg-dark shimmer rounded-lg w-1/2" />
                  </div>
                  <div className="h-5 w-16 bg-dark shimmer rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {result && (
            <>
              {/* Stats bar */}
              <div className="bg-panel rounded-2xl p-5">
                <div className="flex items-center gap-5 flex-wrap">
                  <div className="flex items-center gap-5 flex-1">
                    <div className="text-center">
                      <p className="text-2xl font-black text-white leading-none">{result.total}</p>
                      <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mt-1">Leads</p>
                    </div>
                    <div className="w-px h-8 bg-white/6" />
                    <div className="text-center">
                      <p className="text-2xl font-black text-accent-green leading-none">{result.emailFound}</p>
                      <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mt-1">E-Mails</p>
                    </div>
                    <div className="w-px h-8 bg-white/6" />
                    <div className="text-center">
                      <p className="text-2xl font-black text-white/50 leading-none">{result.ceoFound}</p>
                      <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mt-1">CEOs</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/25 truncate">"{result.query}"</p>
                    </div>
                  </div>

                  {saved ? (
                    <div className="flex items-center gap-2 text-accent-green text-sm font-black">
                      <CheckCircle size={15} />
                      Gespeichert
                    </div>
                  ) : (
                    <button
                      onClick={saveLeads}
                      disabled={saving}
                      className="flex items-center gap-2 bg-accent-green/15 hover:bg-accent-green/25 text-accent-green disabled:opacity-40 text-sm font-black px-4 py-2.5 rounded-xl transition-all active:scale-[0.98] shrink-0"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      In CRM speichern
                    </button>
                  )}
                </div>
              </div>

              {/* Lead cards */}
              <div className="bg-panel rounded-2xl overflow-hidden">
                {result.leads.map((lead, i) => {
                  const domain = getDomain(lead.website)
                  const email  = lead.email || (lead as any).email_general
                  return (
                    <div
                      key={i}
                      className={`px-5 py-4 hover:bg-panel-hover transition-colors ${
                        i < result.leads.length - 1 ? 'border-b border-white/4' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="w-9 h-9 rounded-xl bg-dark flex items-center justify-center shrink-0 mt-0.5">
                          <Building2 size={15} className="text-white/20" />
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white leading-snug truncate">{lead.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {(lead.city || lead.region) && (
                                  <span className="text-xs text-white/30 flex items-center gap-1">
                                    <MapPin size={10} />
                                    {lead.city || lead.region}
                                  </span>
                                )}
                                {(lead.branche || lead.industry) && (
                                  <span className="text-[10px] bg-dark text-white/25 px-1.5 py-0.5 rounded-md font-medium">
                                    {lead.branche || lead.industry}
                                  </span>
                                )}
                              </div>
                            </div>
                            {email && (
                              <span className="shrink-0 text-[10px] font-black bg-accent-green/12 text-accent-green px-2 py-1 rounded-lg whitespace-nowrap">
                                E-Mail ✓
                              </span>
                            )}
                          </div>

                          {/* Detail row */}
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            {lead.ceos && (
                              <span className="flex items-center gap-1 text-xs text-white/35">
                                <User size={10} />
                                {lead.ceos}
                              </span>
                            )}
                            {lead.phone && (
                              <a
                                href={`tel:${lead.phone}`}
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1 text-xs text-white/35 hover:text-accent transition-colors"
                              >
                                <Phone size={10} />
                                {lead.phone}
                              </a>
                            )}
                            {email && (
                              <a
                                href={`mailto:${email}`}
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1 text-xs text-white/35 hover:text-accent-green transition-colors truncate max-w-48"
                              >
                                <Mail size={10} />
                                {email}
                              </a>
                            )}
                            {domain && (
                              <a
                                href={lead.website!}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1 text-xs text-white/25 hover:text-white/60 transition-colors"
                              >
                                <ExternalLink size={10} />
                                {domain}
                              </a>
                            )}
                          </div>
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
