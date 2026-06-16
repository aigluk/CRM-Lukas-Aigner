import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex gap-1.5 mb-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
