'use client'

import { useEffect, useState } from 'react'
import { X, Copy, Check, Smartphone } from 'lucide-react'

export function CalendarSyncModal({ onClose }: { onClose: () => void }) {
  const [icsUrl, setIcsUrl]     = useState('')
  const [webcalUrl, setWebcalUrl] = useState('')
  const [copied, setCopied]     = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    fetch('/api/calendar/token')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        const base = window.location.origin
        const url  = `${base}/api/calendar/ics?token=${d.token}`
        setIcsUrl(url)
        setWebcalUrl(url.replace(/^https?:\/\//, 'webcal://'))
      })
      .catch(() => setError('Token konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  async function copy() {
    await navigator.clipboard.writeText(icsUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-60 flex items-end sm:items-center justify-center px-3 sm:p-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="bg-panel w-full sm:max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-rim-subtle flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-white">Kalender verbinden</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {loading ? (
            <p className="text-sm text-white/40 text-center py-4">Laden...</p>
          ) : error ? (
            <p className="text-sm text-accent font-bold">{error}</p>
          ) : (
            <>
              {/* iPhone / iOS - primary */}
              <div className="bg-dark rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone size={15} className="text-accent shrink-0" />
                  <p className="text-sm font-black text-white">iPhone / iPad</p>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">
                  Tippe auf den Button. iOS fragt dich, ob du den Kalender abonnieren möchtest. Einmal bestatigen, fertig.
                </p>
                <a
                  href={webcalUrl}
                  className="flex items-center justify-center gap-2 bg-accent hover:opacity-90 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98] w-full"
                >
                  Auf iPhone öffnen
                </a>
              </div>

              {/* Android / Other */}
              <div className="bg-dark rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-white/30">Android / Outlook / andere Kalender-Apps</p>
                <p className="text-xs text-white/40 leading-relaxed">
                  URL kopieren und in der Kalender-App als abonnierten Kalender hinzufügen.
                </p>
                <div className="flex items-center gap-2 bg-panel rounded-xl px-3 py-2">
                  <span className="text-xs text-white/30 truncate flex-1 font-mono">{icsUrl}</span>
                  <button onClick={copy} className="shrink-0 text-white/40 hover:text-white transition-all">
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-white/25 text-center leading-relaxed">
                Der Kalender aktualisiert sich automatisch alle 15 Minuten. Unter iOS Einstellungen: Kalender, Konten kannst du die Aktualisierungsfrequenz anpassen.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
