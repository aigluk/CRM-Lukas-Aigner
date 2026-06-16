export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-panel rounded-2xl ${className ?? ''}`} />
}
