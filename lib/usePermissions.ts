'use client'

import { useEffect, useState } from 'react'

export function usePermissions() {
  const [isAdmin, setIsAdmin]     = useState(true)
  const [permissions, setPermissions] = useState<string[] | null>(null)
  const [hiddenNav, setHiddenNav] = useState<string[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        setIsAdmin(!!data.isAdmin)
        setPermissions(data.isAdmin ? null : (data.myPermissions ?? null))
        setHiddenNav(data.myHiddenNav ?? [])
      })
      .finally(() => setLoading(false))

    function onNavPrefsChanged(e: Event) {
      const detail = (e as CustomEvent).detail
      if (Array.isArray(detail?.hiddenNav)) setHiddenNav(detail.hiddenNav)
    }
    window.addEventListener('nav-prefs-changed', onNavPrefsChanged)
    return () => window.removeEventListener('nav-prefs-changed', onNavPrefsChanged)
  }, [])

  return { isAdmin, permissions, hiddenNav, loading }
}
