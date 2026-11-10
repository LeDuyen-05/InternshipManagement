import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { thongKeService } from '../services/thongKeService'
import { useAuth } from './AuthContext'
import { useRoundLock } from '../hooks/useRoundLock'
import { formatTenDot } from '../utils/dotThucTap'

const DotThucTapContext = createContext(null)

export function DotThucTapProvider({ children }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [danhSachNamHoc, setDanhSachNamHoc] = useState([])
  const [selectedDot, setSelectedDot] = useState(null)
  const currentSelection = useRef(null)
  const accountId = user?.maTaiKhoan
  const selectionKey = accountId ? `selected_dot_thuc_tap:${accountId}` : null

  // Đồng bộ đợt thực tập từ database
  useEffect(() => {
    let isMounted = true
    currentSelection.current = null
    setDanhSachNamHoc([])
    setSelectedDot(null)
    setError('')
    if (!accountId) {
      currentSelection.current = null
      setLoading(false)
      return () => { isMounted = false }
    }

    async function syncFromDb() {
      setLoading(true)
      try {
        const res = await thongKeService.getDanhSachDotThucTap()
        if (!Array.isArray(res.data?.data)) throw new Error('Invalid rounds response')
        const dots = res.data.data
        if (dots.length === 0 && isMounted) {
          currentSelection.current = null
          localStorage.removeItem(selectionKey)
          localStorage.removeItem('selected_dot_thuc_tap')
        }
        if (dots.length > 0 && isMounted) {
          // Gom nhóm theo namHoc
          const grouped = {}
          dots.forEach((d) => {
            const nh = d.namHoc || 'Chưa xác định năm học'
            if (!grouped[nh]) grouped[nh] = []
            grouped[nh].push({
              maDot: d.maDot,
              tenDot: formatTenDot(d),
              namHoc: d.namHoc,
              thoiGian: d.thoiGian,
              thoiGianBD: d.thoiGianBD,
              thoiGianKT: d.thoiGianKT,
              trangThai: d.trangThai,
              labelTrangThai: d.labelTrangThai,
              maRubric: d.maRubric,
              maLoaiThucTap: d.maLoaiThucTap,
              tenLoaiThucTap: d.tenLoaiThucTap,
              maKhoa: d.maKhoa,
              tenKhoa: d.tenKhoa,
              isDefault: d.trangThai === 'DangDienRa',
            })
          })

          const listYears = Object.entries(grouped).map(([namHoc, dList], idx) => ({
            namHoc,
            isCurrentYear: idx === 0,
            dots: dList,
          }))

          setDanhSachNamHoc(listYears)

          // Cập nhật selectedDot nếu khớp mã
          const savedMaDot = currentSelection.current || localStorage.getItem(selectionKey)
          const matched = dots.find((d) => d.maDot === savedMaDot) || dots.find((d) => d.trangThai === 'DangDienRa') || dots[0]
          if (matched) {
            currentSelection.current = matched.maDot
            // Ghi đè lựa chọn cũ nếu SV không còn thuộc đợt đã lưu.
            try {
              localStorage.setItem(selectionKey, matched.maDot)
            } catch {
              // Vẫn cho xem đợt hợp lệ khi trình duyệt không cho ghi bộ nhớ.
            }
            setSelectedDot({
              maDot: matched.maDot,
              tenDot: formatTenDot(matched),
              namHoc: matched.namHoc,
              thoiGian: matched.thoiGian,
              thoiGianBD: matched.thoiGianBD,
              thoiGianKT: matched.thoiGianKT,
              trangThai: matched.trangThai,
              labelTrangThai: matched.labelTrangThai,
              maRubric: matched.maRubric,
              maLoaiThucTap: matched.maLoaiThucTap,
            })
          }
        }
      } catch {
        if (isMounted) setError('Không thể tải danh sách đợt thực tập. Vui lòng tải lại.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    syncFromDb()

    return () => {
      isMounted = false
    }
  }, [accountId, selectionKey, refreshVersion])

  // Đổi đợt thực tập và lưu vào localStorage
  const changeDot = (dot) => {
    if (!dot || !danhSachNamHoc.some((year) => year.dots.some((d) => d.maDot === dot.maDot))) return
    currentSelection.current = dot.maDot
    const formatted = {
      ...dot,
      tenDot: formatTenDot(dot),
      maLoaiThucTap: dot.maLoaiThucTap,
    }
    setSelectedDot(formatted)
    try {
      localStorage.setItem(selectionKey, dot.maDot)
    } catch {
      // ignore storage error
    }
  }

  // Đợt đang chọn có phải đợt đang mở tác vụ không?
  const resetToCurrentDot = () => {
    const allDots = danhSachNamHoc.flatMap((y) => y.dots || [])
    const defaultCurrent = allDots.find((d) => d.trangThai === 'DangDienRa') || allDots[0] || null
    if (defaultCurrent) {
      currentSelection.current = defaultCurrent.maDot
      setSelectedDot(defaultCurrent)
      try {
        localStorage.setItem(selectionKey, defaultCurrent.maDot)
      } catch {
        // ignore storage error
      }
    }
  }

  const roundLock = useRoundLock(user ? selectedDot?.maDot : null)
  const isReadOnly = loading || !selectedDot || selectedDot.trangThai === 'DaKetThuc' || roundLock.structureBlocked

  return (
    <DotThucTapContext.Provider
      value={{
        loading,
        error,
        refreshRounds: () => setRefreshVersion((v) => v + 1),
        selectedDot,
        changeDot,
        resetToCurrentDot,
        isReadOnly,
        roundLock,
        danhSachNamHoc,
        danhSachDot: danhSachNamHoc,
      }}
    >
      {children}
    </DotThucTapContext.Provider>
  )
}

export function useDotThucTap() {
  const context = useContext(DotThucTapContext)
  if (!context) {
    throw new Error('useDotThucTap must be used within a DotThucTapProvider')
  }
  return context
}
