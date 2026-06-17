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
    <aside className="w-52 bg-accent h-screen flex flex-col shrink-0 rounded-r-[28px] overflow-hidden">

      {/* Top navigation */}
      <nav className="pt-8 px-3 space-y-1">
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

      {/* Logo — centered in the remaining space */}
      <div className="flex-1 flex items-center justify-center">
        <Logo className="h-16 w-auto text-white/90" />
      </div>

      {/* Bottom account links */}
      <div className="px-3 pb-8 space-y-1">
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
