import { createContext, useContext, useState, useEffect } from 'react'
import apiClient from '../services/api'
import { useAuth } from './AuthContext'

const DotThucTapContext = createContext(null)

const mapTrangThai = (trangThai) => {
  switch (trangThai) {
    case 'ChuaBatDau':
    case 'SapDienRa':
      return 'Sắp diễn ra'
    case 'DangDienRa':
      return 'Đang diễn ra'
    case 'DaKetThuc':
      return 'Đã kết thúc'
    default:
      return trangThai || 'Đang diễn ra'
  }
}

const formatDateRange = (bd, kt) => {
  if (!bd || !kt) return ''
  try {
    const d1 = new Date(bd)
    const d2 = new Date(kt)
    return `${d1.toLocaleDateString('vi-VN')} - ${d2.toLocaleDateString('vi-VN')}`
  } catch {
    return ''
  }
}

export function DotThucTapProvider({ children }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [danhSachNamHoc, setDanhSachNamHoc] = useState([])
  const [selectedDot, setSelectedDot] = useState(null)

  useEffect(() => {
    if (!user) {
      setSelectedDot(null)
      setDanhSachNamHoc([])
      setLoading(false)
      return
    }

    let isMounted = true
    const fetchRounds = async () => {
      setLoading(true)
      try {
        const { data } = await apiClient.get('/DotThucTap')
        if (!isMounted) return

        const rounds = Array.isArray(data) ? data : []
        const grouped = {}
        const mappedList = []

        rounds.forEach((r) => {
          const item = {
            maDot: r.maSo,
            tenDot: r.tenDot,
            namHoc: r.namHoc,
            thoiGian: formatDateRange(r.thoiGianBD, r.thoiGianKT),
            trangThai: r.trangThai,
            labelTrangThai: mapTrangThai(r.trangThai),
            isDefault: r.trangThai === 'DangDienRa',
          }
          mappedList.push(item)

          const yr = r.namHoc || 'Khác'
          if (!grouped[yr]) {
            grouped[yr] = []
          }
          grouped[yr].push(item)
        })

        const years = Object.keys(grouped).map((yr, idx) => ({
          namHoc: yr,
          isCurrentYear: idx === 0,
          dots: grouped[yr],
        }))

        setDanhSachNamHoc(years)

        let defaultDot = mappedList.find((d) => d.trangThai === 'DangDienRa') || mappedList[0] || null

        const savedMaDot = localStorage.getItem('selected_dot_thuc_tap')
        if (savedMaDot) {
          const found = mappedList.find((d) => d.maDot === savedMaDot)
          if (found) defaultDot = found
        }

        setSelectedDot(defaultDot)
      } catch (err) {
        console.error('Không tải được danh sách đợt thực tập:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchRounds()

    return () => {
      isMounted = false
    }
  }, [user])

  const changeDot = (dot) => {
    if (!dot) return
    setSelectedDot(dot)
    try {
      localStorage.setItem('selected_dot_thuc_tap', dot.maDot)
    } catch (_e) {
      // ignore storage error
    }
  }

  const resetToCurrentDot = () => {
    const allDots = danhSachNamHoc.flatMap((y) => y.dots || [])
    const defaultDot = allDots.find((d) => d.trangThai === 'DangDienRa') || allDots[0] || null
    if (defaultDot) {
      setSelectedDot(defaultDot)
      try {
        localStorage.setItem('selected_dot_thuc_tap', defaultDot.maDot)
      } catch (_e) {
        // ignore storage error
      }
    }
  }

  const isReadOnly = selectedDot?.trangThai === 'DaKetThuc'

  return (
    <DotThucTapContext.Provider
      value={{
        loading,
        selectedDot,
        changeDot,
        resetToCurrentDot,
        isReadOnly,
        danhSachNamHoc,
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
