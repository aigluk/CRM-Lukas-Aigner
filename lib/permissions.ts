export const PERMISSION_ITEMS = [
  { href: '/',           label: 'Dashboard',   default: true },
  { href: '/leads',      label: 'Leads',       default: true },
  { href: '/customers',  label: 'Kunden',      default: true },
  { href: '/partners',   label: 'Partner',     default: false },
  { href: '/sales',      label: 'Vertrieb',    default: false },
  { href: '/generator',  label: 'Generator',   default: true },
  { href: '/calendar',   label: 'Kalender',    default: true },
  { href: '/accounting', label: 'Buchhaltung', default: true },
  { href: '/briefing',   label: 'Briefing',    default: true },
  { href: '/academy',    label: 'Academy',     default: true },
] as const

export type PermissionHref = typeof PERMISSION_ITEMS[number]['href']

// permissions === null means unrestricted (admin, or legacy user with no restrictions set)
export function hasAccess(permissions: string[] | null, href: string): boolean {
  if (permissions === null) return true
  if (href === '/') return permissions.includes('/')
  return permissions.includes(href)
}
