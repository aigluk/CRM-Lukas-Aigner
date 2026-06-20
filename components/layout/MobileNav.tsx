'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, Zap, Settings, Wallet, Contact } from 'lucide-react'

const NAV = [
  { href: '/',           label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/leads',      label: 'Leads',       icon: Users },
  { href: '/customers',  label: 'Kunden',      icon: Contact },
  { href: '/generator',  label: 'Generator',   icon: Zap },
  { href: '/calendar',   label: 'Kalender',    icon: Calendar },
  { href: '/accounting', label: 'Buchhaltung', icon: Wallet },
  { href: '/settings',   label: 'Profil',      icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-panel border-t border-rim-subtle"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-18 overflow-x-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 min-w-16 flex flex-col items-center justify-center gap-1 relative transition-all active:opacity-60"
            >
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-accent" />
              )}
              <Icon
                size={21}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? 'text-accent' : 'text-white/30'}
              />
              <span className={`text-[9px] font-black tracking-wide ${active ? 'text-accent' : 'text-white/25'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
