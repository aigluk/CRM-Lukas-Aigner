'use client'

import { useEffect, useState } from 'react'
import { Mail, Lock, Users, Plus, Loader2, Check, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

type AdminUser = { id: string; email: string; created_at: string; last_sign_in_at: string | null }

function Label({ text }: { text: string }) {
  return <label className="block text-[10px] font-black text-white/25 tracking-wide mb-1.5">{text}</label>
}

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'

export function SettingsView() {
  const supabase = createClient()

  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail]         = useState('')
  const [emailSaving, setEmailSaving]   = useState(false)
  const [emailMsg, setEmailMsg]         = useState('')

  const [newPassword, setNewPassword]   = useState('')
  const [pwSaving, setPwSaving]         = useState(false)
  const [pwMsg, setPwMsg]               = useState('')

  const [users, setUsers]               = useState<AdminUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPw, setNewUserPw]       = useState('')
  const [addingUser, setAddingUser]     = useState(false)
  const [userError, setUserError]       = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentEmail(data.user?.email ?? ''))
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoadingUsers(true)
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    if (res.ok) setUsers(data.users)
    setLoadingUsers(false)
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail) return
    setEmailSaving(true)
    setEmailMsg('')
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    setEmailMsg(error ? error.message : 'Bestätigungs-Mail an neue Adresse gesendet.')
    setEmailSaving(false)
    if (!error) setNewEmail('')
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword) return
    setPwSaving(true)
    setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwMsg(error ? error.message : 'Passwort aktualisiert.')
    setPwSaving(false)
    if (!error) setNewPassword('')
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newUserEmail || !newUserPw) return
    setAddingUser(true)
    setUserError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newUserEmail, password: newUserPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      setNewUserEmail('')
      setNewUserPw('')
      loadUsers()
    } catch (err: any) {
      setUserError(err.message)
    } finally {
      setAddingUser(false)
    }
  }

  async function removeUser(id: string) {
    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadUsers()
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight leading-none">Einstellungen</h1>
        <p className="text-sm text-white/30 mt-2 font-medium">Profil & Benutzerverwaltung</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile */}
        <div className="space-y-5">
          <div className="bg-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail size={14} className="text-accent" />
              <h2 className="text-sm font-black text-white">E-Mail ändern</h2>
            </div>
            <p className="text-xs text-white/25">Aktuell: {currentEmail || '—'}</p>
            <form onSubmit={saveEmail} className="space-y-3">
              <div>
                <Label text="Neue E-Mail" />
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="neue@email.com" className={inputCls} />
              </div>
              {emailMsg && <p className="text-xs text-white/40">{emailMsg}</p>}
              <button type="submit" disabled={emailSaving || !newEmail}
                className="w-full bg-accent hover:opacity-90 disabled:opacity-30 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]">
                {emailSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'E-Mail aktualisieren'}
              </button>
            </form>
          </div>

          <div className="bg-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={14} className="text-accent" />
              <h2 className="text-sm font-black text-white">Passwort ändern</h2>
            </div>
            <form onSubmit={savePassword} className="space-y-3">
              <div>
                <Label text="Neues Passwort" />
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••" className={inputCls} />
              </div>
              {pwMsg && <p className="text-xs text-white/40">{pwMsg}</p>}
              <button type="submit" disabled={pwSaving || !newPassword}
                className="w-full bg-accent hover:opacity-90 disabled:opacity-30 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]">
                {pwSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Passwort aktualisieren'}
              </button>
            </form>
          </div>
        </div>

        {/* User management */}
        <div className="bg-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-accent" />
            <h2 className="text-sm font-black text-white">Benutzer verwalten</h2>
          </div>

          <form onSubmit={addUser} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label text="E-Mail" />
                <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="kollege@firma.at" className={inputCls} />
              </div>
              <div>
                <Label text="Passwort" />
                <input type="password" value={newUserPw} onChange={e => setNewUserPw(e.target.value)}
                  placeholder="••••••••" className={inputCls} />
              </div>
            </div>
            {userError && <p className="text-xs text-accent font-bold">{userError}</p>}
            <button type="submit" disabled={addingUser || !newUserEmail || !newUserPw}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-30 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]">
              {addingUser ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Benutzer hinzufügen
            </button>
          </form>

          <div className="pt-2 space-y-1">
            {loadingUsers ? (
              <p className="text-sm text-white/40 text-center py-4 font-medium">Lädt…</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4 font-medium">Keine Benutzer.</p>
            ) : (
              users.map(u => (
                <div key={u.id} className="flex items-center gap-3 bg-dark rounded-xl px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{u.email}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">
                      Seit {formatDate(u.created_at)}
                      {u.last_sign_in_at && ` · zuletzt aktiv ${formatDate(u.last_sign_in_at)}`}
                    </p>
                  </div>
                  {u.email === currentEmail ? (
                    <span className="text-[10px] font-black text-accent-green flex items-center gap-1 shrink-0">
                      <Check size={11} /> Du
                    </span>
                  ) : (
                    <button onClick={() => removeUser(u.id)} className="text-white/20 hover:text-accent transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
