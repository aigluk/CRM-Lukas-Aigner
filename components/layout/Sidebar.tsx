'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Calendar, Zap, LogOut, Settings,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

const NAV = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads',     label: 'Leads',     icon: Users },
  { href: '/calendar',  label: 'Kalender',  icon: Calendar },
  { href: '/generator', label: 'Generator', icon: Zap },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-55 bg-accent h-screen flex flex-col shrink-0">
      {/* Brand — pt-10 aligns logo with page headings (main content also has p-10) */}
      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center gap-2.5">
          <Logo className="h-7 w-auto text-white shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-black text-white tracking-tight leading-none truncate">Lukas Aigner</p>
            <p className="text-[9px] text-white/50 font-black tracking-[0.2em] uppercase mt-0.5">CRM</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                active
                  ? 'bg-dark text-white shadow-sm'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} className={active ? 'text-accent' : 'text-white/70'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Account */}
      <div className="p-3 pb-6 space-y-1">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
            isActive('/settings')
              ? 'bg-dark text-white shadow-sm'
              : 'text-white/75 hover:text-white hover:bg-white/10'
          }`}
        >
          <Settings size={16} strokeWidth={isActive('/settings') ? 2.5 : 2} className={isActive('/settings') ? 'text-accent' : 'text-white/70'} />
          Einstellungen
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/75 hover:text-white hover:bg-white/10 transition-all w-full"
        >
          <LogOut size={16} strokeWidth={2} className="text-white/70" />
          Abmelden
        </button>
      </div>
    </aside>
  )
}
