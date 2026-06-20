'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Calendar, Zap, LogOut, Settings, Wallet, Contact,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

const NAV = [
  { href: '/',           label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/leads',      label: 'Leads',       icon: Users },
  { href: '/customers',  label: 'Kunden',      icon: Contact },
  { href: '/generator',  label: 'Generator',   icon: Zap },
  { href: '/calendar',   label: 'Kalender',    icon: Calendar },
  { href: '/accounting', label: 'Buchhaltung', icon: Wallet },
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

  const linkBase = 'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all'

  return (
    <aside className="w-52 bg-accent h-screen flex flex-col shrink-0 rounded-r-[36px] overflow-hidden">

      {/* Top navigation — start well down, generous spacing */}
      <nav className="pt-14 px-4 flex flex-col gap-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`${linkBase} ${
                active
                  ? 'bg-dark text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.75 : 2.4} className={active ? 'text-accent' : 'text-white/55'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logo — vertically centered */}
      <div className="flex-1 flex items-center justify-center">
        <Logo className="h-11 w-auto text-white/85" />
      </div>

      {/* Bottom account */}
      <div className="px-4 pb-10 flex flex-col gap-2">
        <Link
          href="/settings"
          className={`${linkBase} ${
            isActive('/settings')
              ? 'bg-dark text-white'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Settings size={16} strokeWidth={isActive('/settings') ? 2.75 : 2.4} className={isActive('/settings') ? 'text-accent' : 'text-white/55'} />
          Einstellungen
        </Link>
        <button
          onClick={logout}
          className={`${linkBase} text-white/70 hover:text-white hover:bg-white/10 w-full`}
        >
          <LogOut size={16} strokeWidth={2.4} className="text-white/55" />
          Abmelden
        </button>
      </div>
    </aside>
  )
}
