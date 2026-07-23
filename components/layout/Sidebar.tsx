'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Calendar, Search, LogOut, Settings, Calculator, Contact, Briefcase, BarChart3, Newspaper, GraduationCap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import { usePermissions } from '@/lib/usePermissions'
import { hasAccess } from '@/lib/permissions'

const NAV = [
  { href: '/',           label: 'Dashboard',   icon: LayoutDashboard, solid: true },
  { href: '/leads',      label: 'Leads',       icon: Users,      solid: false },
  { href: '/customers',  label: 'Kunden',      icon: Contact,    solid: false },
  { href: '/partners',   label: 'Partner',     icon: Briefcase,  solid: true },
  { href: '/sales',      label: 'Vertrieb',    icon: BarChart3,  solid: true },
  { href: '/generator',  label: 'Generator',   icon: Search,     solid: false },
  { href: '/calendar',   label: 'Kalender',    icon: Calendar,   solid: false },
  { href: '/accounting', label: 'Buchhaltung', icon: Calculator,    solid: false },
  { href: '/briefing',   label: 'Briefing',    icon: Newspaper,     solid: false },
  { href: '/academy',    label: 'Academy',     icon: GraduationCap, solid: false },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const { permissions, hiddenNav } = usePermissions()
  const nav = NAV.filter(item => hasAccess(permissions, item.href) && !hiddenNav.includes(item.href))

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
    <aside className="w-52 bg-accent h-full flex flex-col shrink-0 rounded-r-[36px] overflow-hidden">

      {/* Top navigation — start well down, generous spacing */}
      <nav className="pt-14 px-4 flex flex-col gap-2">
        {nav.map(({ href, label, icon: Icon, solid }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`${linkBase} ${
                active
                  ? 'bg-dark text-white'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Icon
                size={16}
                strokeWidth={solid ? 1.75 : (active ? 2.75 : 2.4)}
                fill={solid ? 'currentColor' : 'none'}
                className={active ? 'text-accent' : 'text-white'}
              />
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
              : 'text-white hover:bg-white/10'
          }`}
        >
          <Settings size={16} strokeWidth={isActive('/settings') ? 2.75 : 2.4} className={isActive('/settings') ? 'text-accent' : 'text-white'} />
          Einstellungen
        </Link>
        <button
          onClick={logout}
          className={`${linkBase} text-white hover:bg-white/10 w-full`}
        >
          <LogOut size={16} strokeWidth={2.4} className="text-white" />
          Abmelden
        </button>
      </div>
    </aside>
  )
}
