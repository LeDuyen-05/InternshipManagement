import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function ResponsiveNavigation({ children }) {
  const { key } = useLocation()
  const [openedAt, setOpenedAt] = useState(null)
  const open = openedAt === key
  const id = useId()
  const panel = useRef(null)
  const trigger = useRef(null)
  const closeButton = useRef(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const triggerElement = trigger.current
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    const close = () => setOpenedAt(null)
    const onKey = (event) => {
      if (event.key === 'Escape') close()
      if (event.key !== 'Tab') return
      const elements = [...panel.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]')]
        .filter(element => element.getClientRects().length > 0)
      const first = elements[0], last = elements.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onResize = () => { if (desktop.matches) close() }
    document.addEventListener('keydown', onKey)
    desktop.addEventListener('change', onResize)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      desktop.removeEventListener('change', onResize)
      triggerElement?.focus()
    }
  }, [open])

  return <>
    <button ref={trigger} type="button" aria-label="Mở menu điều hướng" aria-expanded={open} aria-controls={id}
      onClick={() => setOpenedAt(key)} className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 rounded-lg bg-white border border-slate-200 text-blue-700">
      <span aria-hidden="true" className="material-symbols-outlined">menu</span>
    </button>
    {open && <button type="button" aria-label="Đóng nền menu điều hướng" tabIndex={-1} onClick={() => setOpenedAt(null)}
      className="lg:hidden fixed inset-0 z-[60] bg-slate-900/50" />}
    <div ref={panel} id={id} role={open ? 'dialog' : undefined} aria-modal={open ? true : undefined}
      aria-label="Menu điều hướng" className={`${open ? 'block' : 'hidden'} lg:block relative z-[70] lg:z-50`}>
      {children}
      {open && <button ref={closeButton} type="button" aria-label="Đóng menu điều hướng" onClick={() => setOpenedAt(null)}
        className="lg:hidden fixed top-3 left-[264px] w-10 h-10 rounded-lg bg-white text-slate-800 shadow">
        <span aria-hidden="true" className="material-symbols-outlined">close</span>
      </button>}
    </div>
  </>
}
