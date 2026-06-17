'use client'

import { useState } from 'react'
import { Lead } from '@/lib/types'
import {
  Zap, CheckCircle, Plus, Loader2, MapPin,
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
  { id: 'at', code: 'AT', label: 'Österreich', cities: ['Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'St. Pölten', 'Wels'] },
  { id: 'de', code: 'DE', label: 'Deutschland', cities: ['München', 'Berlin', 'Hamburg', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Köln', 'Nürnberg'] },
  { id: 'ch', code: 'CH', label: 'Schweiz',     cities: ['Zürich', 'Genf', 'Basel', 'Bern', 'Lausanne', 'Zug'] },
  { id: 'ae', code: 'AE', label: 'Dubai / UAE', cities: ['Dubai', 'Abu Dhabi', 'Sharjah'] },
  { id: 'cy', code: 'CY', label: 'Zypern',      cities: ['Limassol', 'Nikosia', 'Paphos', 'Larnaka'] },
  { id: 'es', code: 'ES', label: 'Spanien',     cities: ['Marbella', 'Barcelona', 'Madrid', 'Ibiza', 'Mallorca'] },
  { id: 'us', code: 'US', label: 'USA',         cities: ['Miami', 'New York', 'Los Angeles', 'Las Vegas', 'Chicago'] },
]

const RADII = [
  { value: '2',   label: '2 km' },
  { value: '5',   label: '5 km' },
  { value: '10',  label: '10 km' },
  { value: '25',  label: '25 km' },
  { value: '50',  label: '50 km' },
  { value: '0',   label: 'Überall' },
]

function getDomain(url?: string | null) {
  if (!url) return null
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '') }
  catch { return url }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-2.5">{children}</p>
}

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

  const country   = COUNTRIES.find(c => c.id === countryId)!
  const locationStr = customCity || city || country.label

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    if (!branche) return
    setLoading(true); setError(''); setResult(null); setSaved(false)
    try {
      const res  = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branches: branche, custom: locationStr, radius }),
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight leading-none">Lead Generator</h1>
        <p className="text-sm text-white/30 mt-2 font-medium">Google Maps · Outscraper · E-Mail Enrichment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

        {/* ── LEFT CONFIG ── */}
        <form onSubmit={generate} className="lg:col-span-2 flex flex-col gap-4">

          {/* Branche */}
          <div className="bg-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-accent" />
                <h2 className="text-sm font-black text-white">Branche</h2>
              </div>
              {branche && (
                <button
                  type="button"
                  onClick={() => setBranche('')}
                  className="text-[10px] font-bold text-accent/70 hover:text-accent transition-colors"
                >
                  Zurücksetzen
                </button>
              )}
            </div>

            <div className="space-y-4">
              {CLUSTERS.map(cluster => (
                <div key={cluster.group}>
                  <SectionTitle>{cluster.group}</SectionTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {cluster.items.map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setBranche(branche === item ? '' : item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          branche === item
                            ? 'bg-accent text-white'
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
            <div className="flex items-center gap-2 mb-5">
              <MapPin size={14} className="text-white/30" />
              <h2 className="text-sm font-black text-white">Region</h2>
            </div>

            {/* Country */}
            <SectionTitle>Land</SectionTitle>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {COUNTRIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCountryId(c.id); setCity(''); setCustomCity('') }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    countryId === c.id
                      ? 'bg-dark text-white ring-1 ring-white/12'
                      : 'bg-dark text-white/35 hover:text-white/70'
                  }`}
                >
                  <span className={`text-[9px] font-black tracking-widest px-1 py-0.5 rounded ${
                    countryId === c.id ? 'bg-accent text-white' : 'bg-white/8 text-white/30'
                  }`}>{c.code}</span>
                  {c.label}
                </button>
              ))}
            </div>

            {/* Cities */}
            <SectionTitle>Stadt / Ort</SectionTitle>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {country.cities.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCity(city === c ? '' : c); setCustomCity('') }}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold text-center transition-all truncate ${
                    city === c
                      ? 'bg-accent text-white'
                      : 'bg-dark text-white/35 hover:text-white/70'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Custom city */}
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
                <button type="button" onClick={() => setCustomCity('')} className="text-white/25 hover:text-white/60 text-xs leading-none">✕</button>
              )}
            </div>
            {!city && !customCity && (
              <p className="text-[10px] text-white/20 mt-1.5 pl-1">Kein Ort = ganzes Land</p>
            )}
          </div>

          {/* Radius */}
          <div className="bg-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full border-2 border-white/20 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
              </div>
              <h2 className="text-sm font-black text-white">Suchradius</h2>
              <span className="ml-auto text-xs font-bold text-white/30">
                {radius === '0' ? 'Kein Limit' : `${radius} km`}
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {RADII.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRadius(r.value)}
                  className={`flex-1 min-w-14 py-2 rounded-xl text-xs font-bold transition-all text-center ${
                    radius === r.value
                      ? 'bg-dark text-white ring-1 ring-white/15'
                      : 'bg-dark text-white/30 hover:text-white/60'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <button
            type="submit"
            disabled={loading || !branche}
            className="w-full flex items-center justify-center gap-2.5 bg-accent hover:bg-accent-hover disabled:opacity-30 text-white font-black text-sm py-4 rounded-2xl transition-all active:scale-[0.98]"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" />Generiere…</>
              : <><Zap size={16} />Leads generieren</>
            }
          </button>
        </form>

        {/* ── RIGHT RESULTS ── */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {error && (
            <div className="bg-accent/10 border border-accent/20 rounded-2xl px-5 py-4">
              <p className="text-sm text-accent font-bold">{error}</p>
            </div>
          )}

          {/* Empty */}
          {!result && !loading && !error && (
            <div className="bg-panel rounded-2xl flex flex-col items-center justify-center py-40 text-center">
              <div className="w-14 h-14 rounded-2xl bg-dark flex items-center justify-center mb-5">
                <Zap size={24} className="text-white/10" />
              </div>
              <p className="text-sm font-black text-white/20">Branche & Region wählen</p>
              <p className="text-xs text-white/15 mt-1">dann Leads generieren</p>
            </div>
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

          {/* Results */}
          {result && (
            <>
              {/* Stats + save */}
              <div className="bg-panel rounded-2xl p-5">
                <div className="flex items-center gap-5">
                  <div>
                    <p className="text-2xl font-black text-white leading-none">{result.total}</p>
                    <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mt-1">Leads</p>
                  </div>
                  <div className="w-px h-8 bg-white/6" />
                  <div>
                    <p className="text-2xl font-black text-accent-green leading-none">{result.emailFound}</p>
                    <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mt-1">E-Mails</p>
                  </div>
                  <div className="w-px h-8 bg-white/6" />
                  <div>
                    <p className="text-2xl font-black text-white/40 leading-none">{result.ceoFound}</p>
                    <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mt-1">CEOs</p>
                  </div>
                  <div className="flex-1" />
                  {saved ? (
                    <div className="flex items-center gap-2 text-accent-green text-sm font-black">
                      <CheckCircle size={14} />Gespeichert
                    </div>
                  ) : (
                    <button
                      onClick={saveLeads}
                      disabled={saving}
                      className="flex items-center gap-2 bg-accent-green/15 hover:bg-accent-green/25 text-accent-green disabled:opacity-40 text-sm font-black px-4 py-2.5 rounded-xl transition-all shrink-0"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      In CRM speichern
                    </button>
                  )}
                </div>
              </div>

              {/* Lead list */}
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
                        <div className="w-8 h-8 rounded-xl bg-dark flex items-center justify-center shrink-0 mt-0.5">
                          <Building2 size={14} className="text-white/20" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 justify-between">
                            <p className="text-sm font-bold text-white leading-snug truncate">{lead.name}</p>
                            {email && (
                              <span className="text-[10px] font-black bg-accent-green/12 text-accent-green px-2 py-0.5 rounded-lg shrink-0">E-Mail</span>
                            )}
                          </div>
                          {(lead.city || lead.region) && (
                            <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                              <MapPin size={9} />
                              {lead.city || lead.region}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            {lead.ceos && (
                              <span className="flex items-center gap-1 text-xs text-white/30">
                                <User size={10} />{lead.ceos}
                              </span>
                            )}
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
