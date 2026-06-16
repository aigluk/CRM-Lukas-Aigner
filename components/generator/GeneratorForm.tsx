'use client'

import { useState } from 'react'
import { Lead } from '@/lib/types'
import { Zap, CheckCircle, Plus, Loader2, Globe, MapPin } from 'lucide-react'

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
    items: ['IT / Software', 'Finanzen / Versicherung', 'Gesundheit / Pflege', 'Handel'],
  },
]

const COUNTRIES = [
  {
    id: 'at', label: 'Österreich',
    regions: ['Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt'],
  },
  {
    id: 'de', label: 'Deutschland',
    regions: ['Berlin', 'München', 'Hamburg', 'Frankfurt', 'Köln', 'Stuttgart'],
  },
  {
    id: 'ch', label: 'Schweiz',
    regions: ['Zürich', 'Genf', 'Basel', 'Bern', 'Lausanne'],
  },
  {
    id: 'es', label: 'Spanien',
    regions: ['Madrid', 'Barcelona', 'Marbella', 'Ibiza', 'Mallorca', 'Valencia'],
  },
  {
    id: 'cy', label: 'Zypern',
    regions: ['Limassol', 'Nikosia', 'Paphos', 'Larnaka', 'Ayia Napa'],
  },
  {
    id: 'ae', label: 'Dubai',
    regions: ['Dubai', 'Abu Dhabi', 'Sharjah'],
  },
  {
    id: 'us', label: 'USA',
    regions: ['New York', 'Los Angeles', 'Miami', 'Las Vegas', 'Chicago'],
  },
]

function Label({ text }: { text: string }) {
  return <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mb-2">{text}</p>
}

export function GeneratorForm() {
  const [branche, setBranche]       = useState('')
  const [countryId, setCountryId]   = useState('at')
  const [region, setRegion]         = useState('')
  const [customRegion, setCustomRegion] = useState('')
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState<GenResult | null>(null)
  const [error, setError]           = useState('')
  const [saved, setSaved]           = useState(false)
  const [saving, setSaving]         = useState(false)

  const country   = COUNTRIES.find(c => c.id === countryId)!
  const isWorld   = countryId === 'world'
  const regionStr = isWorld ? customRegion : (region || country.label)

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    if (!branche) return
    setLoading(true)
    setError('')
    setResult(null)
    setSaved(false)
    try {
      const res = await fetch('/api/generate', {
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
      const res = await fetch('/api/leads', {
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight leading-none">Lead Generator</h1>
        <p className="text-sm text-white/30 mt-2 font-medium">Google Maps · Outscraper · E-Mail Enrichment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* LEFT — Config */}
        <form onSubmit={generate} className="lg:col-span-2 space-y-4">

          {/* Branche clusters */}
          <div className="bg-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-accent" />
              <h2 className="text-sm font-black text-white">Branche</h2>
            </div>
            {CLUSTERS.map(cluster => (
              <div key={cluster.group}>
                <Label text={cluster.group} />
                <div className="flex flex-wrap gap-1.5">
                  {cluster.items.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setBranche(branche === item ? '' : item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        branche === item
                          ? 'bg-accent text-white'
                          : 'bg-dark text-white/35 hover:text-white/70'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Country + Region */}
          <div className="bg-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Globe size={14} className="text-white/30" />
              <h2 className="text-sm font-black text-white">Region</h2>
            </div>

            <div>
              <Label text="Land" />
              <div className="flex flex-wrap gap-1.5">
                {COUNTRIES.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setCountryId(c.id); setRegion('') }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      countryId === c.id
                        ? 'bg-white text-dark'
                        : 'bg-dark text-white/35 hover:text-white/70'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {!isWorld && country.regions.length > 0 && (
              <div>
                <Label text="Stadt / Ort" />
                <div className="flex flex-wrap gap-1.5">
                  {country.regions.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(region === r ? '' : r)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        region === r
                          ? 'bg-white text-dark'
                          : 'bg-dark text-white/35 hover:text-white/70'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/15 mt-2">
                  Kein Ort gewählt = ganzes Land
                </p>
              </div>
            )}

            {isWorld && (
              <div>
                <Label text="Land / Stadt / Region" />
                <div className="flex items-center gap-2 bg-dark rounded-xl px-3.5 py-3">
                  <MapPin size={13} className="text-white/20 shrink-0" />
                  <input
                    type="text"
                    value={customRegion}
                    onChange={e => setCustomRegion(e.target.value)}
                    placeholder="z.B. Dubai, Singapur, London..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sources info */}
          <div className="bg-panel rounded-2xl p-5">
            <Label text="Datenquellen" />
            <div className="space-y-2">
              {[
                { dot: 'bg-accent',       label: 'Google Maps (Outscraper)' },
                { dot: 'bg-white/40',     label: 'Firmenbuch Austria' },
                { dot: 'bg-accent-green', label: 'E-Mail Enrichment' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                  <span className="text-xs text-white/30 font-medium">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !branche}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-30 text-white font-black text-sm py-3.5 rounded-xl transition-all active:scale-[0.98]"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Generiere…</>
              : <><Zap size={15} /> Leads generieren</>
            }
          </button>
        </form>

        {/* RIGHT — Results */}
        <div className="lg:col-span-3">
          {error && (
            <div className="bg-accent/10 rounded-2xl px-5 py-4 mb-4">
              <p className="text-sm text-accent font-bold">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="bg-panel rounded-2xl p-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-3xl font-black text-white leading-none">{result.total}</p>
                      <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mt-1">Leads</p>
                    </div>
                    <div>
                      <p className="text-3xl font-black text-accent-green leading-none">{result.emailFound}</p>
                      <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mt-1">E-Mails</p>
                    </div>
                    <div>
                      <p className="text-3xl font-black text-white/50 leading-none">{result.ceoFound}</p>
                      <p className="text-[10px] font-black text-white/25 uppercase tracking-widest mt-1">CEOs</p>
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
                      className="flex items-center gap-2 bg-accent-green/15 hover:bg-accent-green/25 text-accent-green disabled:opacity-40 text-sm font-black px-4 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      In CRM speichern
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-white/15 mt-3 font-medium truncate">Suche: {result.query}</p>
              </div>

              {/* Lead list */}
              <div className="bg-panel rounded-2xl overflow-hidden">
                {result.leads.map((lead, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-panel-hover transition-colors border-t border-white/4 first:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{lead.name}</p>
                      <p className="text-xs text-white/25 truncate mt-0.5">
                        {[lead.region, lead.industry].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {lead.ceos && (
                      <p className="text-xs text-white/30 truncate hidden md:block w-32 shrink-0">{lead.ceos}</p>
                    )}
                    {(lead.email || (lead as any).email_general) && (
                      <span className="shrink-0 text-[10px] font-black bg-accent-green/10 text-accent-green px-2 py-1 rounded-lg">
                        E-Mail ✓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="bg-panel rounded-2xl flex flex-col items-center justify-center py-24 text-center">
              <div className="w-12 h-12 rounded-2xl bg-dark flex items-center justify-center mb-4">
                <Zap size={22} className="text-white/15" />
              </div>
              <p className="text-sm font-bold text-white/20">Branche & Region wählen</p>
              <p className="text-xs text-white/12 mt-1">dann Leads generieren</p>
            </div>
          )}

          {loading && (
            <div className="bg-panel rounded-2xl flex flex-col items-center justify-center py-24 text-center">
              <Loader2 size={28} className="text-accent animate-spin mb-4" />
              <p className="text-sm font-bold text-white/30">Generiere Leads…</p>
              <p className="text-xs text-white/15 mt-1">Google Maps wird durchsucht</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
