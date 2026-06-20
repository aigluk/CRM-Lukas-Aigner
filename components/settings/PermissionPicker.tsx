'use client'

import { Check } from 'lucide-react'
import { PERMISSION_ITEMS } from '@/lib/permissions'

export function PermissionPicker({
  value, onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(href: string) {
    onChange(value.includes(href) ? value.filter(h => h !== href) : [...value, href])
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {PERMISSION_ITEMS.map(item => {
        const active = value.includes(item.href)
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => toggle(item.href)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
              active ? 'bg-accent text-white' : 'bg-dark text-white/40 hover:text-white/70'
            }`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${
              active ? 'bg-white border-white' : 'border-white/25'
            }`}>
              {active && <Check size={10} className="text-accent" strokeWidth={3.5} />}
            </span>
            <span className="truncate">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
