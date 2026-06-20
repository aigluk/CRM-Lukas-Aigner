'use client'

import { useState } from 'react'
import { X, Loader2, Trash2 } from 'lucide-react'
import { PermissionPicker } from './PermissionPicker'
import { PERMISSION_ITEMS } from '@/lib/permissions'

export type EditableUser = {
  id: string
  email: string
  username: string
  permissions: string[] | null
}

export function EditUserModal({
  user, onClose, onSaved, onRemove,
}: {
  user: EditableUser
  onClose: () => void
  onSaved: () => void
  onRemove: (id: string) => void
}) {
  const [username, setUsername] = useState(user.username)
  const [permissions, setPermissions] = useState<string[]>(
    user.permissions ?? PERMISSION_ITEMS.map(i => i.href)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, username, permissions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-panel rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-rim-subtle" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-white">Benutzer bearbeiten</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2 -m-2">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-white/30 mb-4">{user.email}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/30 mb-1.5">Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="z. B. Max M."
              className="w-full bg-dark rounded-xl px-3.5 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/30 mb-2">Zugriff auf</label>
            <PermissionPicker value={permissions} onChange={setPermissions} />
          </div>

          {error && <p className="text-xs text-accent font-bold">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 bg-accent hover:opacity-90 disabled:opacity-30 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]"
            >
              {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Speichern'}
            </button>
            <button
              onClick={() => onRemove(user.id)}
              title="Benutzer löschen"
              className="px-3.5 py-3 rounded-xl bg-white/8 hover:bg-accent/20 text-white/50 hover:text-accent transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
