'use client'

import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface ZinsCountdown {
  fed_date: string | null
  ezb_date: string | null
  fed_consensus: string
  ezb_consensus: string
}

interface MakroEvent {
  event: string
  date: string
  previous: string
  expected: string
}

interface Earnings {
  company: string
  date: string
  expected_eps: string
}

interface SentimentAmpel {
  vix: number
  level: string
  label: string
}

interface GeoRisk {
  region: string
  status: string
}

interface Snapshot {
  date: string
  zins_countdown: ZinsCountdown | null
  makro_kalender: MakroEvent[] | null
  earnings_watch: Earnings[] | null
  sentiment_ampel: SentimentAmpel | null
  geo_risiko: GeoRisk[] | null
}

function fmtDate(d: string | null) {
  if (!d) return 'k.A.'
  return new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })
}

function VixColor({ level }: { level: string }) {
  const map: Record<string, string> = {
    ruhig: 'text-accent-green',
    nervos: 'text-yellow-400',
    nervös: 'text-yellow-400',
    panisch: 'text-accent',
  }
  return map[level.toLowerCase()] ?? 'text-white'
}

export function MarketRadarWidget() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market-drivers')
      .then(r => r.json())
      .then(d => setSnapshot(d.snapshot ?? null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-panel rounded-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <span className="text-[10px] font-black text-white">KR</span>
          </div>
          <h2 className="text-sm font-black text-white">Kursfaktoren</h2>
        </div>
        <Link href="/briefing" className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors font-bold">
          Briefing <ChevronRight size={11} />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !snapshot ? (
        <div className="px-5 pb-5">
          <p className="text-xs text-white/30 text-center py-4">Noch kein Snapshot. Wird täglich um 06:00 generiert.</p>
        </div>
      ) : (
        <div className="px-5 pb-4 space-y-3 flex-1 overflow-y-auto">

          {/* Zins-Countdown */}
          {snapshot.zins_countdown && (
            <div className="bg-panel-2 rounded-xl px-3.5 py-3">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Zins-Countdown</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-white/30 mb-0.5 font-bold">FED · {fmtDate(snapshot.zins_countdown.fed_date)}</p>
                  <p className="text-xs font-black text-white">{snapshot.zins_countdown.fed_consensus || 'k.A.'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 mb-0.5 font-bold">EZB · {fmtDate(snapshot.zins_countdown.ezb_date)}</p>
                  <p className="text-xs font-black text-white">{snapshot.zins_countdown.ezb_consensus || 'k.A.'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sentiment-Ampel */}
          {snapshot.sentiment_ampel && (
            <div className="bg-panel-2 rounded-xl px-3.5 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Sentiment</p>
                <span className={`text-xs font-black ${VixColor({ level: snapshot.sentiment_ampel.level })}`}>
                  VIX {snapshot.sentiment_ampel.vix}
                </span>
              </div>
              <p className="text-xs text-white/55 font-medium">{snapshot.sentiment_ampel.label}</p>
            </div>
          )}

          {/* Makro-Kalender */}
          {snapshot.makro_kalender && snapshot.makro_kalender.length > 0 && (
            <div className="bg-panel-2 rounded-xl px-3.5 py-3">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Makro-Kalender</p>
              <div className="space-y-2">
                {snapshot.makro_kalender.slice(0, 3).map((ev, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-white/60 truncate flex-1">{ev.event}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-white/25 font-bold">{fmtDate(ev.date)}</span>
                      <span className="text-xs font-black text-white">{ev.expected}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Earnings Watch */}
          {snapshot.earnings_watch && snapshot.earnings_watch.length > 0 && (
            <div className="bg-panel-2 rounded-xl px-3.5 py-3">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Earnings</p>
              <div className="space-y-2">
                {snapshot.earnings_watch.slice(0, 3).map((e, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-white truncate flex-1">{e.company}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-white/25 font-bold">{fmtDate(e.date)}</span>
                      <span className="text-xs text-white/45 font-bold">EPS {e.expected_eps}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Geo-Risiko */}
          {snapshot.geo_risiko && snapshot.geo_risiko.length > 0 && (
            <div className="bg-panel-2 rounded-xl px-3.5 py-3">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Geo-Risiko</p>
              <div className="space-y-1.5">
                {snapshot.geo_risiko.slice(0, 3).map((g, i) => (
                  <div key={i}>
                    <p className="text-[10px] font-bold text-white/40 mb-0.5">{g.region}</p>
                    <p className="text-xs text-white/55 leading-snug">{g.status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {snapshot.date && (
            <p className="text-[10px] text-white/20 text-right">Stand: {fmtDate(snapshot.date)}</p>
          )}
        </div>
      )}
    </div>
  )
}
