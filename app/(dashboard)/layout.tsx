import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-dark">
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Main content — scrollbar-gutter:stable prevents layout shift when scrollbar appears */}
      <main
        className="flex-1 overflow-y-auto min-w-0 overscroll-none"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="p-6 pb-28 lg:p-10 lg:pb-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
