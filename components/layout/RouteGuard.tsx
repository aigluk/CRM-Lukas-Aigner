'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePermissions } from '@/lib/usePermissions'
import { hasAccess, PERMISSION_ITEMS } from '@/lib/permissions'

const ALWAYS_ALLOWED = ['/settings']

export function RouteGuard() {
  const pathname = usePathname()
  const router = useRouter()
  const { permissions, loading } = usePermissions()

  useEffect(() => {
    if (loading || permissions === null) return
    if (ALWAYS_ALLOWED.some(p => pathname.startsWith(p))) return

    const matched = PERMISSION_ITEMS.find(item =>
      item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
    )
    if (matched && !hasAccess(permissions, matched.href)) {
      const firstAllowed = PERMISSION_ITEMS.find(item => hasAccess(permissions, item.href))
      router.replace(firstAllowed?.href ?? '/settings')
    }
  }, [pathname, permissions, loading, router])

  return null
}
