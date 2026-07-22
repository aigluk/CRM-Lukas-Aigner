'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Calendar, Search, Settings, Calculator, Contact,
  Briefcase, BarChart3, MoreHorizontal, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/lib/usePermissions'
import { hasAccess } from '@/lib/permissions'

const PRIMARY = [
  { href: '/',           label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/leads',      label: 'Leads',       icon: Users },
  { href: '/calendar',   label: 'Kalender',    icon: Calendar },
  { href: '/accounting', label: 'Buchhaltung', icon: Calculator },
]

const SECONDARY = [
  { href: '/customers',  label: 'Kunden',       icon: Contact },
  { href: '/generator',  label: 'Generator',    icon: Search },
  { href: '/partners',   label: 'Partner',      icon: Briefcase },
  { href: '/sales',      label: 'Vertrieb',     icon: BarChart3 },
  { href: '/settings',   label: 'Einstellungen', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const { permissions, hiddenNav } = usePermissions()
  const [moreOpen, setMoreOpen] = useState(false)

  const primary   = PRIMARY.filter(item => hasAccess(permissions, item.href) && !hiddenNav.includes(item.href))
  const secondary = SECONDARY.filter(item => item.href === '/settings' || (hasAccess(permissions, item.href) && !hiddenNav.includes(item.href)))

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const moreActive = secondary.some(item => isActive(item.href))

  async function logout() {
    setMoreOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* "Mehr"-Sheet */}
      {moreOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 z-59"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 border-t-2 border-accent rounded-t-3xl pt-5 px-4 z-60"
            style={{ background: '#1A1A1A', paddingBottom: 'calc(env(safe-area-inset-bottom) + 4.5rem + 1rem)' }}
          >
            {secondary.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={`min-h-14 flex items-center gap-4 px-2 text-base font-bold transition-colors active:opacity-60 ${
                    active ? 'text-accent' : 'text-white'
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                  {label}
                </Link>
              )
            })}
            <div className="border-t border-white/10 mt-2 pt-2">
              <button
                onClick={logout}
                className="min-h-14 w-full flex items-center gap-4 px-2 text-base font-bold text-white/40 transition-colors active:opacity-60"
              >
                <LogOut size={22} strokeWidth={2} />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottombar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t-2 border-accent"
        style={{ background: '#1A1A1A', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch h-18">
          {primary.map(({ href, label, icon: Icon }) => {
            const active = isActive(href) && !moreOpen
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 relative transition-all active:opacity-60"
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.6 : 2}
                  className={active ? 'text-accent' : 'text-white'}
                />
                <span className={`text-[10px] font-bold tracking-wide truncate max-w-full px-0.5 ${active ? 'text-accent' : 'text-white/70'}`}>
                  {label}
                </span>
              </Link>
            )
          })}

          {/* Mehr */}
          <button
            onClick={() => setMoreOpen(o => !o)}
            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 relative transition-all active:opacity-60"
          >
            <MoreHorizontal
              size={22}
              strokeWidth={moreActive || moreOpen ? 2.6 : 2}
              className={moreActive || moreOpen ? 'text-accent' : 'text-white'}
            />
            <span className={`text-[10px] font-bold tracking-wide ${moreActive || moreOpen ? 'text-accent' : 'text-white/70'}`}>
              Mehr
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
