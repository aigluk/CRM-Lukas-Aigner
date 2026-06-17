'use client'

import { useState, useRef } from 'react'
import { X, Upload, Check, ChevronDown } from 'lucide-react'
import { Lead, LeadStatus } from '@/lib/types'
import { STATUSES, STATUS_LABELS, BRANCHES } from '@/lib/constants'

interface Props {
  onClose: () => void
  onImported: (leads: Lead[]) => void
}

type Row = Record<string, string>

const FIELD_MAP: Record<string, string> = {
  'name': 'name', 'firma': 'name', 'company': 'name', 'unternehmen': 'name', 'firmenname': 'name',
  'phone': 'phone', 'telefon': 'phone', 'tel': 'phone', 'mobile': 'phone', 'handy': 'phone', 'mobil': 'phone',
  'email': 'email', 'e-mail': 'email', 'mail': 'email',
  'website': 'website', 'web': 'website', 'url': 'website', 'homepage': 'website',
  'branche': 'branche', 'industry': 'branche', 'industrie': 'branche', 'kategorie': 'branche', 'bereich': 'branche',
  'city': 'city', 'stadt': 'city', 'ort': 'city', 'region': 'city', 'standort': 'city',
  'ceos': 'ceos', 'ceo': 'ceos', 'ansprechpartner': 'ceos', 'kontakt': 'ceos', 'person': 'ceos', 'inhaber': 'ceos',
  'notes': 'notes', 'notizen': 'notes', 'kommentar': 'notes', 'beschreibung': 'notes', 'info': 'notes',
}

// Returns true if a row looks like a header row (e.g. all numeric, or a title row with only 1 non-empty cell)
function looksLikeTitle(row: Row): boolean {
  const values = Object.values(row).filter(v => v.trim())
  if (values.length <= 1) return true
  // If ALL values are numeric-ish or empty, it's not a header row
  return false
}

function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  // Detect delimiter from first line
  const firstLine = lines[0]
  const delim = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','

  function splitLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if ((ch === '"' || ch === "'") && !inQuote) { inQuote = true; continue }
      if ((ch === '"' || ch === "'") && inQuote) { inQuote = false; continue }
      if (ch === delim && !inQuote) { result.push(current.trim()); current = ''; continue }
      current += ch
    }
    result.push(current.trim())
    return result
  }

  const headers = splitLine(lines[0]).map(h => h.toLowerCase().trim())

  // Skip a potential title row: if first data row has only 1 non-empty cell and headers look like data
  let dataStart = 1
  if (lines.length > 2) {
    const firstDataVals = splitLine(lines[1])
    const nonEmpty = firstDataVals.filter(v => v.trim())
    if (nonEmpty.length <= 1 && headers.some(h => FIELD_MAP[h])) {
      // first line was headers, second line might be empty/title - skip
    }
  }

  return lines.slice(dataStart).map(line => {
    const vals = splitLine(line)
    const row: Row = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  }).filter(row => Object.values(row).some(v => v.trim()))
}

async function parseExcel(file: File): Promise<Row[]> {
  const XLSX = await import('xlsx')
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]

        // Check for a title row: if first row has only 1 merged cell, skip it
        const ref = ws['!ref']
        let startRow = 1
        if (ref) {
          const range = XLSX.utils.decode_range(ref)
          // If row 0 has only 1 filled cell across all columns, it's a title
          let filledInRow0 = 0
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r: 0, c })]
            if (cell && cell.v !== undefined && String(cell.v).trim()) filledInRow0++
          }
          if (filledInRow0 === 1) {
            // skip row 0 as title, use row 1 as header
            const newRef = XLSX.utils.encode_range({ s: { r: 1, c: range.s.c }, e: range.e })
            ws['!ref'] = newRef
          }
        }

        const data = XLSX.utils.sheet_to_json<Row>(ws, { defval: '', raw: false })
        const normalised = data.map(row => {
          const r: Row = {}
          Object.entries(row).forEach(([k, v]) => { r[k.toLowerCase().trim()] = String(v) })
          return r
        }).filter(row => Object.values(row).some(v => v.trim()))
        resolve(normalised)
      } catch { resolve([]) }
    }
    reader.readAsArrayBuffer(file)
  })
}

function autoMap(rows: Row[]): Record<string, string> {
  if (!rows.length) return {}
  const mapping: Record<string, string> = {}
  Object.keys(rows[0]).forEach(col => {
    const normalized = col.toLowerCase().replace(/[\s_-]/g, '')
    const target = FIELD_MAP[col] ?? FIELD_MAP[normalized] ?? FIELD_MAP[col.split(/[\s_-]/)[0]]
    if (target && !mapping[target]) mapping[target] = col
  })
  return mapping
}

const selectCls = 'w-full bg-dark rounded-xl px-3 py-2.5 pr-8 text-sm text-white outline-none focus:ring-1 focus:ring-accent appearance-none cursor-pointer'

export function ImportModal({ onClose, onImported }: Props) {
  const [rows, setRows]             = useState<Row[]>([])
  const [columns, setColumns]       = useState<string[]>([])
  const [mapping, setMapping]       = useState<Record<string, string>>({})
  const [status, setStatus]         = useState<LeadStatus>('NEU')
  const [globalBranche, setGlobalBranche] = useState<string>('')
  const [step, setStep]             = useState<'upload' | 'map' | 'importing' | 'done'>('upload')
  const [imported, setImported]     = useState(0)
  const [error, setError]           = useState('')
  const [dragging, setDragging]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadFile(file: File) {
    setError('')
    try {
      let parsed: Row[] = []
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const text = await file.text()
        parsed = parseCSV(text)
      } else if (file.name.match(/\.xlsx?$/i)) {
        parsed = await parseExcel(file)
      } else {
        setError('Bitte CSV oder Excel-Datei auswählen (.csv, .xlsx, .xls)')
        return
      }
      if (!parsed.length) { setError('Keine Daten gefunden oder falsches Format.'); return }
      setRows(parsed)
      setColumns(Object.keys(parsed[0]))
      setMapping(autoMap(parsed))
      setStep('map')
    } catch (e: any) {
      setError('Datei konnte nicht gelesen werden: ' + e.message)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  async function doImport() {
    setStep('importing')
    setError('')
    const leads = rows
      .map(row => {
        const lead: any = { status }
        Object.entries(mapping).forEach(([field, col]) => {
          if (col && row[col]) lead[field] = row[col]
        })
        // Global branche overrides column mapping if set
        if (globalBranche) lead.branche = globalBranche
        return lead
      })
      .filter(l => l.name?.trim())

    if (!leads.length) { setError('Keine Zeilen mit einem Firmenname gefunden.'); setStep('map'); return }

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }),
      })
      const text = await res.text()
      let json: any = {}
      try { json = JSON.parse(text) } catch {}
      if (!res.ok) throw new Error(json.error || `Serverfehler ${res.status}`)
      setImported((json.inserted ?? 0) + (json.updated ?? 0))
      setStep('done')
      onImported([])
    } catch (e: any) {
      setError(e.message)
      setStep('map')
    }
  }

  const LEAD_FIELDS = [
    { key: 'name', label: 'Firma *' }, { key: 'ceos', label: 'Ansprechpartner' },
    { key: 'phone', label: 'Telefon' }, { key: 'email', label: 'E-Mail' },
    { key: 'website', label: 'Website' }, { key: 'branche', label: 'Branche (Spalte)' },
    { key: 'city', label: 'Stadt / Region' }, { key: 'notes', label: 'Notizen' },
  ]

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-panel w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/6">
          <div>
            <h2 className="text-base font-black text-white">Leads importieren</h2>
            <p className="text-xs text-white/30 mt-0.5">CSV oder Excel-Datei hochladen</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-panel-hover text-white/30 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Step: Upload */}
          {step === 'upload' && (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                  dragging ? 'border-accent bg-accent/8' : 'border-white/10 hover:border-white/25 hover:bg-white/3'
                }`}
              >
                <Upload size={28} className="text-white/30" />
                <p className="text-sm font-bold text-white/60">Datei hierher ziehen oder klicken</p>
                <p className="text-xs text-white/25">CSV, Excel (.xlsx, .xls)</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f) }} />
              {error && <p className="text-xs text-accent font-bold">{error}</p>}
            </>
          )}

          {/* Step: Column mapping */}
          {step === 'map' && (
            <>
              <p className="text-xs text-white/40 font-medium">{rows.length} Zeilen erkannt. Weise die Spalten zu:</p>

              {/* Column mapping selects */}
              <div className="grid grid-cols-2 gap-3">
                {LEAD_FIELDS.map(({ key, label }) => (
                  <div key={key} className="relative">
                    <label className="block text-[11px] font-medium text-white/35 mb-1">{label}</label>
                    <select
                      value={mapping[key] ?? ''}
                      onChange={e => setMapping(m => ({ ...m, [key]: e.target.value }))}
                      className={selectCls}
                    >
                      <option value="">— nicht importieren —</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-[calc(50%+9px)] -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>
                ))}
              </div>

              {/* Global branche override — always uses our own BRANCHES list */}
              <div className="bg-dark rounded-xl p-4 space-y-3">
                <p className="text-[11px] font-bold text-white/35 tracking-wide">Branche für alle Leads</p>
                <p className="text-[11px] text-white/25">Wähle eine Branche — überschreibt den Spalten-Wert.</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setGlobalBranche('')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      !globalBranche ? 'bg-accent text-white' : 'bg-panel-hover text-white/35 hover:text-white'
                    }`}
                  >
                    Aus Datei
                  </button>
                  {BRANCHES.map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setGlobalBranche(b)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        globalBranche === b ? 'bg-accent text-white' : 'bg-panel-hover text-white/35 hover:text-white'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-medium text-white/35 mb-2">Standard-Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(s => (
                    <button key={s} type="button" onClick={() => setStatus(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        status === s ? 'bg-accent text-white' : 'bg-panel-hover text-white/35 hover:text-white'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-dark rounded-xl overflow-hidden">
                <p className="px-4 py-2 text-[10px] font-bold text-white/25 tracking-wide border-b border-white/5">
                  Vorschau (erste 3 Zeilen)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        {LEAD_FIELDS.filter(f => mapping[f.key]).map(f => (
                          <th key={f.key} className="px-3 py-2 text-left text-white/30 font-medium whitespace-nowrap">{f.label.replace(' (Spalte)', '')}</th>
                        ))}
                        {globalBranche && <th className="px-3 py-2 text-left text-white/30 font-medium whitespace-nowrap">Branche</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b border-white/4">
                          {LEAD_FIELDS.filter(f => mapping[f.key]).map(f => (
                            <td key={f.key} className="px-3 py-2 text-white/60 truncate max-w-32">{row[mapping[f.key]] ?? '—'}</td>
                          ))}
                          {globalBranche && <td className="px-3 py-2 text-accent/80 truncate max-w-32">{globalBranche}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && <p className="text-xs text-accent font-bold">{error}</p>}
            </>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="py-10 flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-sm text-white/60 font-medium">Leads werden importiert…</p>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="py-10 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent-green/20 flex items-center justify-center">
                <Check size={22} className="text-accent-green" />
              </div>
              <p className="text-sm font-bold text-white">{imported} Leads importiert</p>
              <button onClick={onClose} className="bg-accent hover:opacity-90 text-white font-black text-sm px-6 py-2.5 rounded-xl transition-all">
                Fertig
              </button>
            </div>
          )}
        </div>

        {(step === 'upload' || step === 'map') && (
          <div className="px-6 pb-5 flex gap-3">
            {step === 'map' && (
              <button onClick={doImport} disabled={!mapping['name']}
                className="flex-1 bg-accent hover:opacity-90 disabled:opacity-40 text-white font-black text-sm py-2.5 rounded-xl transition-all">
                {rows.length} Leads importieren
              </button>
            )}
            <button onClick={onClose}
              className="px-5 py-2.5 bg-panel-hover text-white/40 hover:text-white font-bold text-sm rounded-xl transition-all">
              Abbrechen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
