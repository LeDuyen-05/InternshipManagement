import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Lớp nền mờ cho popup: render thẳng vào <body> (portal) để luôn phủ trên header/sidebar cố định,
// khóa cuộn trang phía sau, đóng bằng phím Esc hoặc bấm ra ngoài popup.
export default function ModalOverlay({ children, onClose }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      {children}
    </div>,
    document.body
  )
}
