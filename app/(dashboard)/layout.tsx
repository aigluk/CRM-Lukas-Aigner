import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { RouteGuard } from '@/components/layout/RouteGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-[#F1F5F9]">
      <RouteGuard />
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto min-w-0 overscroll-none bg-[#F1F5F9]"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="h-full flex flex-col p-5 pb-8 lg:p-10 lg:pb-10">
          {children}
          {/* Mobile-only spacer so content clears the nav + safe area */}
          <div className="lg:hidden shrink-0" style={{ height: 'calc(5.75rem + env(safe-area-inset-bottom))' }} />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
