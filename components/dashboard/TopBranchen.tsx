import { Lead } from '@/lib/types'

export function TopBranchen({ leads }: { leads: Lead[] }) {
  const total = leads.length
  const map: Record<string, number> = {}
  leads.forEach(l => {
    const b = l.branche || l.industry || 'Unbekannt'
    map[b] = (map[b] ?? 0) + 1
  })
  const top = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div className="bg-panel rounded-2xl p-6">
      <h2 className="text-sm font-black text-white mb-5">Top Branchen</h2>
      {top.length === 0 ? (
        <p className="text-sm text-white/35 font-medium py-6 text-center">Noch keine Daten.</p>
      ) : (
        <ul className="space-y-3">
          {top.map(([b, count]) => {
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <li key={b}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-white/55 truncate">{b}</span>
                  <span className="text-xs font-bold text-white">{count}</span>
                </div>
                <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
