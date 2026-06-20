'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, Target, Settings, Calculator, Contact } from 'lucide-react'
import { usePermissions } from '@/lib/usePermissions'
import { hasAccess } from '@/lib/permissions'

const NAV = [
  { href: '/',           label: 'Dashboard',   icon: LayoutDashboard, solid: true },
  { href: '/leads',      label: 'Leads',       icon: Users,      solid: false },
  { href: '/customers',  label: 'Kunden',      icon: Contact,    solid: false },
  { href: '/generator',  label: 'Generator',   icon: Target,     solid: false },
  { href: '/calendar',   label: 'Kalender',    icon: Calendar,   solid: false },
  { href: '/accounting', label: 'Buchhaltung', icon: Calculator, solid: false },
  { href: '/settings',   label: 'Profil',      icon: Settings,   solid: false },
]

export function MobileNav() {
  const pathname = usePathname()
  const { permissions } = usePermissions()
  const nav = NAV.filter(item => item.href === '/settings' || hasAccess(permissions, item.href))

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
        {nav.map(({ href, label, icon: Icon, solid }) => {
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
                size={22}
                strokeWidth={solid ? 1.5 : (active ? 2.75 : 2.3)}
                fill={solid ? 'currentColor' : 'none'}
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
