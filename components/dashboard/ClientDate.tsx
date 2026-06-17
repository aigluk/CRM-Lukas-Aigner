'use client'

export function ClientDate() {
  const today = new Date().toLocaleDateString('de-AT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return (
    <p className="text-sm text-white/30 mt-2 capitalize font-medium">{today}</p>
  )
}
