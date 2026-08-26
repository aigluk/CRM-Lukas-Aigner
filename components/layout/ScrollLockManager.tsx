'use client'

import { useEffect } from 'react'

export function ScrollLockManager() {
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      if (!document.querySelector('.modal-open')) return

      // Walk up from touch target; if we find a scrollable element
      // before hitting the modal-open backdrop, allow the scroll.
      let el = e.target as Element | null
      while (el && !el.classList.contains('modal-open')) {
        const style = window.getComputedStyle(el)
        const ov = style.overflow + style.overflowY
        if (/auto|scroll/.test(ov) && el.scrollHeight > el.clientHeight) return
        el = el.parentElement
      }

      e.preventDefault()
    }

    document.addEventListener('touchmove', handler, { passive: false })
    return () => document.removeEventListener('touchmove', handler)
  }, [])

  return null
}
