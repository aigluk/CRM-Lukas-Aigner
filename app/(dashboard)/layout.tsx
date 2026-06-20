import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { RouteGuard } from '@/components/layout/RouteGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-dark">
      <RouteGuard />
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto min-w-0 overscroll-none"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="p-5 pb-8 lg:p-10 lg:pb-10">
          {children}
          {/* Mobile-only spacer so content clears the nav + safe area */}
          <div className="lg:hidden" style={{ height: 'calc(5rem + env(safe-area-inset-bottom))' }} />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
