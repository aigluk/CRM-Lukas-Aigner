'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, Zap, Settings } from 'lucide-react'

const NAV = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads',     label: 'Leads',     icon: Users },
  { href: '/calendar',  label: 'Kalender',  icon: Calendar },
  { href: '/generator', label: 'Generator', icon: Zap },
  { href: '/settings',  label: 'Profil',    icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-accent safe-bottom">
      <div className="flex items-stretch overflow-x-auto scrollbar-none">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 min-w-15 flex flex-col items-center justify-center gap-1 py-3 relative transition-colors ${
                active ? 'bg-dark/20' : ''
              }`}
            >
              <Icon
                size={19}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? 'text-white' : 'text-white/55'}
              />
              <span className={`text-[9px] font-black tracking-wide ${active ? 'text-white' : 'text-white/50'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
