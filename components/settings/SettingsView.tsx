'use client'

import { useEffect, useState } from 'react'
import { Mail, Lock, Users, Plus, Loader2, Check, Trash2, AtSign, User, LogOut, Building2, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { PermissionPicker } from './PermissionPicker'
import { EditUserModal } from './EditUserModal'
import { PERMISSION_ITEMS } from '@/lib/permissions'

type AdminUser = {
  id: string
  email: string
  username: string
  created_at: string
  last_sign_in_at: string | null
  permissions: string[] | null
}

function Label({ text }: { text: string }) {
  return <label className="block text-xs font-bold text-white/30 mb-1.5">{text}</label>
}

const inputCls = 'w-full bg-dark rounded-xl px-3.5 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-accent transition-all'

export function SettingsView() {
  const supabase = createClient()
  const router = useRouter()

  const [currentEmail, setCurrentEmail] = useState('')
  const [joinedAt, setJoinedAt]         = useState('')
  const [newEmail, setNewEmail]         = useState('')
  const [emailSaving, setEmailSaving]   = useState(false)
  const [emailMsg, setEmailMsg]         = useState('')

  const [displayName, setDisplayName]   = useState('')
  const [nameSaving, setNameSaving]     = useState(false)
  const [nameMsg, setNameMsg]           = useState('')

  const [pwSending, setPwSending]       = useState(false)
  const [pwSentMsg, setPwSentMsg]       = useState('')

  const [company, setCompany]           = useState({
    name: '', legal_form: 'einzelunternehmer' as 'einzelunternehmer' | 'gmbh', fn: '',
    address: '', email: '', phone: '', iban: '', uid: '',
    bank_name: '', bic: '', gisa: '', small_business: false,
  })
  const [companySaving, setCompanySaving] = useState(false)
  const [companyMsg, setCompanyMsg]     = useState('')

  const [isAdmin, setIsAdmin]           = useState(false)
  const [users, setUsers]               = useState<AdminUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName]   = useState('')
  const [resetSending, setResetSending] = useState<Set<string>>(new Set())
  const [newUserPerms, setNewUserPerms] = useState<string[]>(PERMISSION_ITEMS.filter(i => i.default === true).map(i => i.href))
  const [addingUser, setAddingUser]     = useState(false)
  const [userError, setUserError]       = useState('')
  const [editingUser, setEditingUser]   = useState<AdminUser | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentEmail(data.user?.email ?? '')
      setDisplayName(data.user?.user_metadata?.display_name ?? '')
      setJoinedAt(data.user?.created_at ?? '')
      setCompany({
        name: '', legal_form: 'einzelunternehmer', fn: '',
        address: '', email: '', phone: '', iban: '', uid: '',
        bank_name: '', bic: '', gisa: '', small_business: false,
        ...(data.user?.user_metadata?.company ?? {}),
      })
    })
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoadingUsers(true)
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    if (res.ok) {
      setUsers(data.users)
      setIsAdmin(!!data.isAdmin)
    }
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

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setNameSaving(true)
    setNameMsg('')
    const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } })
    setNameMsg(error ? error.message : 'Benutzername gespeichert.')
    setNameSaving(false)
  }

  async function sendResetLink() {
    setPwSending(true)
    setPwSentMsg('')
    const { error } = await supabase.auth.resetPasswordForEmail(currentEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setPwSentMsg(error ? error.message : 'Reset-Link gesendet! Prüfe deine E-Mail.')
    setPwSending(false)
  }

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault()
    setCompanySaving(true)
    setCompanyMsg('')
    const { error } = await supabase.auth.updateUser({ data: { company } })
    setCompanyMsg(error ? error.message : 'Firmendaten gespeichert.')
    setCompanySaving(false)
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newUserEmail) return
    setAddingUser(true)
    setUserError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newUserEmail, username: newUserName, permissions: newUserPerms }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      setNewUserEmail('')
      setNewUserName('')
      setNewUserPerms(PERMISSION_ITEMS.filter(i => i.default === true).map(i => i.href))
      loadUsers()
    } catch (err: any) {
      setUserError(err.message)
    } finally {
      setAddingUser(false)
    }
  }

  async function sendResetToUser(email: string, id: string) {
    setResetSending(prev => new Set(prev).add(id))
    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_reset', email }),
      })
    } finally {
      setResetSending(prev => { const s = new Set(prev); s.delete(id); return s })
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

      {/* Profile card */}
      <div className="bg-panel rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center shrink-0">
            <User size={36} className="text-white" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black text-white truncate">
              {displayName || <span className="text-white/30 italic font-semibold">Kein Name gesetzt</span>}
            </h2>
            <p className="text-sm text-white/40 mt-0.5 truncate">{currentEmail}</p>
            {joinedAt && (
              <p className="text-xs text-white/20 mt-1">Nutzer seit {formatDate(joinedAt)}</p>
            )}
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/6 hover:bg-white/10 text-white/50 hover:text-white text-xs font-bold rounded-xl transition-all active:scale-95 shrink-0"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Abmelden</span>
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-5`}>
        {/* Profile */}
        <div className="space-y-5">

          {/* Username */}
          <div className="bg-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <AtSign size={14} className="text-accent" />
              <h2 className="text-sm font-black text-white">Benutzername</h2>
            </div>
            <p className="text-xs text-white/25">Wird bei Leads als Bearbeiter angezeigt.</p>
            <form onSubmit={saveName} className="space-y-3">
              <div>
                <Label text="Anzeigename" />
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="z. B. Lukas A."
                  className={inputCls}
                />
              </div>
              {nameMsg && <p className="text-xs text-white/40">{nameMsg}</p>}
              <button
                type="submit"
                disabled={nameSaving || !displayName.trim()}
                className="w-full bg-accent hover:opacity-90 disabled:opacity-30 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]"
              >
                {nameSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Speichern'}
              </button>
            </form>
          </div>

          {/* Company info — used as sender block on Buchhaltung PDFs */}
          <div className="bg-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={14} className="text-accent" />
              <h2 className="text-sm font-black text-white">Meine Firma</h2>
            </div>
            <p className="text-xs text-white/25">Erscheint als Absender auf Rechnungen & Angeboten.</p>
            <form onSubmit={saveCompany} className="space-y-3">
              <div>
                <Label text="Firmenname" />
                <input type="text" value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))}
                  placeholder="z. B. Lukas Aigner e.U." className={inputCls} />
              </div>
              <div>
                <Label text="Rechtsform" />
                <div className="flex bg-dark rounded-xl p-1">
                  <button type="button" onClick={() => setCompany(c => ({ ...c, legal_form: 'einzelunternehmer' }))}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${company.legal_form !== 'gmbh' ? 'bg-accent text-white' : 'text-white/40 hover:text-white'}`}
                  >Einzelunternehmer</button>
                  <button type="button" onClick={() => setCompany(c => ({ ...c, legal_form: 'gmbh' }))}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${company.legal_form === 'gmbh' ? 'bg-accent text-white' : 'text-white/40 hover:text-white'}`}
                  >GmbH</button>
                </div>
              </div>
              {company.legal_form === 'gmbh' && (
                <div>
                  <Label text="Firmenbuchnummer (FN)" />
                  <input type="text" value={company.fn} onChange={e => setCompany(c => ({ ...c, fn: e.target.value }))}
                    placeholder="FN 000000a" className={inputCls} />
                </div>
              )}
              <div>
                <Label text="Adresse (mehrzeilig: Straße / PLZ Ort / Land)" />
                <textarea value={company.address} onChange={e => setCompany(c => ({ ...c, address: e.target.value }))}
                  placeholder={'Mahring 24\n4113 Sankt Martin i.M.\nÖsterreich'} rows={3}
                  className={`${inputCls} resize-none`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label text="E-Mail" />
                  <input type="email" value={company.email} onChange={e => setCompany(c => ({ ...c, email: e.target.value }))}
                    placeholder="office@firma.at" className={inputCls} />
                </div>
                <div>
                  <Label text="Telefon" />
                  <input type="tel" value={company.phone} onChange={e => setCompany(c => ({ ...c, phone: e.target.value }))}
                    placeholder="+43 ..." className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label text="IBAN" />
                  <input type="text" value={company.iban} onChange={e => setCompany(c => ({ ...c, iban: e.target.value }))}
                    placeholder="AT00 0000 0000 0000 0000" className={inputCls} />
                </div>
                <div>
                  <Label text="BIC" />
                  <input type="text" value={company.bic} onChange={e => setCompany(c => ({ ...c, bic: e.target.value }))}
                    placeholder="RZOOAT2L300" className={inputCls} />
                </div>
              </div>
              <div>
                <Label text="Bank" />
                <input type="text" value={company.bank_name} onChange={e => setCompany(c => ({ ...c, bank_name: e.target.value }))}
                  placeholder="z. B. Raiffeisenbank Neufelden" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label text="UID / Steuernummer" />
                  <input type="text" value={company.uid} onChange={e => setCompany(c => ({ ...c, uid: e.target.value }))}
                    placeholder="ATU00000000" className={inputCls} />
                </div>
                <div>
                  <Label text="GISA-Zahl" />
                  <input type="text" value={company.gisa} onChange={e => setCompany(c => ({ ...c, gisa: e.target.value }))}
                    placeholder="38510595" className={inputCls} />
                </div>
              </div>
              <label className="flex items-center gap-2.5 bg-dark rounded-xl px-3.5 py-3 cursor-pointer">
                <input type="checkbox" checked={company.small_business}
                  onChange={e => setCompany(c => ({ ...c, small_business: e.target.checked }))}
                  className="w-4 h-4 rounded accent-accent" />
                <span className="text-sm text-white/70 font-medium">Kleinunternehmer (§ 6 Abs. 1 Z 27 UStG) - keine USt. auf Rechnungen</span>
              </label>
              {companyMsg && <p className="text-xs text-white/40">{companyMsg}</p>}
              <button type="submit" disabled={companySaving}
                className="w-full bg-accent hover:opacity-90 disabled:opacity-30 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]">
                {companySaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Firmendaten speichern'}
              </button>
            </form>
          </div>

          {/* Email */}
          <div className="bg-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail size={14} className="text-accent" />
              <h2 className="text-sm font-black text-white">E-Mail ändern</h2>
            </div>
            <p className="text-xs text-white/25">Aktuell: {currentEmail || '-'}</p>
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

          {/* Password */}
          <div className="bg-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={14} className="text-accent" />
              <h2 className="text-sm font-black text-white">Passwort ändern</h2>
            </div>
            <p className="text-xs text-white/25">Du erhältst einen sicheren Link per E-Mail zum Setzen eines neuen Passworts.</p>
            {pwSentMsg && <p className="text-xs text-white/40">{pwSentMsg}</p>}
            <button type="button" onClick={sendResetLink} disabled={pwSending || !currentEmail}
              className="w-full bg-accent hover:opacity-90 disabled:opacity-30 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]">
              {pwSending ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Reset-Link per E-Mail senden'}
            </button>
          </div>
        </div>

        {/* User management — admin only */}
        {isAdmin && <div className="bg-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-accent" />
            <h2 className="text-sm font-black text-white">Benutzer verwalten</h2>
          </div>

          <form onSubmit={addUser} className="space-y-3">
            <div>
              <Label text="Benutzername" />
              <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)}
                placeholder="z. B. Max M." className={inputCls} />
            </div>
            <div>
              <Label text="E-Mail" />
              <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
                placeholder="kollege@firma.at" className={inputCls} />
            </div>
            <div>
              <Label text="Zugriff auf" />
              <PermissionPicker value={newUserPerms} onChange={setNewUserPerms} />
            </div>
            {userError && <p className="text-xs text-accent font-bold">{userError}</p>}
            <button type="submit" disabled={addingUser || !newUserEmail}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-30 text-white font-black text-sm py-3 rounded-xl transition-all active:scale-[0.98]">
              {addingUser ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Einladen & Passwort-Link senden
            </button>
          </form>

          <div className="pt-2 space-y-1">
            {loadingUsers ? (
              <p className="text-sm text-white/40 text-center py-4 font-medium">Lädt…</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4 font-medium">Keine Benutzer.</p>
            ) : (
              users.map(u => (
                <div
                  key={u.id}
                  onClick={() => u.email !== currentEmail && setEditingUser(u)}
                  className={`flex items-center gap-3 bg-dark rounded-xl px-3.5 py-3 ${u.email !== currentEmail ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">
                      {u.username ? u.username : <span className="text-white/30 italic">Kein Name</span>}
                    </p>
                    <p className="text-xs text-white/30 truncate mt-0.5">{u.email}</p>
                    <p className="text-xs text-white/20 mt-0.5">
                      Seit {formatDate(u.created_at)}
                      {u.last_sign_in_at && ` · aktiv ${formatDate(u.last_sign_in_at)}`}
                    </p>
                  </div>
                  {u.email === currentEmail ? (
                    <span className="text-xs font-black text-accent-green flex items-center gap-1 shrink-0">
                      <Check size={11} /> Du
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        title="Reset-Link senden"
                        onClick={e => { e.stopPropagation(); sendResetToUser(u.email, u.id) }}
                        disabled={resetSending.has(u.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
                      >
                        {resetSending.has(u.id) ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); removeUser(u.id) }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-accent hover:bg-accent/10 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>}
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); loadUsers() }}
          onRemove={async id => { await removeUser(id); setEditingUser(null) }}
        />
      )}
    </div>
  )
}
