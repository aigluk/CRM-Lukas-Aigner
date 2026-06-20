export const PERMISSION_ITEMS = [
  { href: '/',           label: 'Dashboard' },
  { href: '/leads',      label: 'Leads' },
  { href: '/customers',  label: 'Kunden' },
  { href: '/generator',  label: 'Generator' },
  { href: '/calendar',   label: 'Kalender' },
  { href: '/accounting', label: 'Buchhaltung' },
] as const

export type PermissionHref = typeof PERMISSION_ITEMS[number]['href']

// permissions === null means unrestricted (admin, or legacy user with no restrictions set)
export function hasAccess(permissions: string[] | null, href: string): boolean {
  if (permissions === null) return true
  if (href === '/') return permissions.includes('/')
  return permissions.includes(href)
}
