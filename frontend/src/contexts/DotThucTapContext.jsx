import { createContext, useContext, useState, useEffect } from 'react'
import { thongKeService } from '../services/thongKeService'
import { useAuth } from './AuthContext'
import { useRoundLock } from '../hooks/useRoundLock'

// Danh sách các đợt thực tập chuẩn khớp với bảng DOTTHUCTAP trong SQL Server
export const DANH_SACH_DOT_THUC_TAP = [
  {
    namHoc: '2026 - 2027',
    isCurrentYear: true,
    dots: [
      {
        maDot: 'DOT02',
        tenDot: 'Thực tập tốt nghiệp đợt 2 năm 2026',
        hocKy: 'Học kỳ 1',
        thoiGian: '14/09/2026 - 25/12/2026',
        trangThai: 'DangDienRa',
        labelTrangThai: 'Đang diễn ra',
        maRubric: 'CNTT_CLO_V1',
        isDefault: true,
      },
      {
        maDot: 'DOT01',
        tenDot: 'Thực tập tốt nghiệp đợt 1 năm 2026',
        hocKy: 'Học kỳ 2',
        thoiGian: '02/02/2026 - 15/05/2026',
        trangThai: 'DaKetThuc',
        labelTrangThai: 'Đã kết thúc',
        isDefault: false,
      },
      {
        maDot: 'DOT03',
        tenDot: 'Thực tập tốt nghiệp đợt 1 năm 2027',
        hocKy: 'Học kỳ 1',
        thoiGian: '15/02/2027 - 30/05/2027',
        trangThai: 'ChuaBatDau',
        labelTrangThai: 'Chưa bắt đầu',
        isDefault: false,
      },
    ],
  },
]

const defaultDot = DANH_SACH_DOT_THUC_TAP[0].dots[0]

const DotThucTapContext = createContext(null)

export function DotThucTapProvider({ children }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [danhSachNamHoc, setDanhSachNamHoc] = useState(DANH_SACH_DOT_THUC_TAP)

  const [selectedDot, setSelectedDot] = useState(() => {
    const savedMaDot = localStorage.getItem('selected_dot_thuc_tap')
    if (savedMaDot) {
      for (const year of DANH_SACH_DOT_THUC_TAP) {
        const found = year.dots.find((d) => d.maDot === savedMaDot)
        if (found) return found
      }
    }
    return defaultDot
  })

  // Đồng bộ đợt thực tập từ database
  useEffect(() => {
    if (!user) return
    let isMounted = true

    async function syncFromDb() {
      setLoading(true)
      try {
        const res = await thongKeService.getDanhSachDotThucTap()
        const dots = res.data?.data || []
        if (dots.length > 0 && isMounted) {
          // Gom nhóm theo namHoc
          const grouped = {}
          dots.forEach((d) => {
            const nh = d.namHoc || '2026 - 2027'
            if (!grouped[nh]) grouped[nh] = []
            grouped[nh].push({
              maDot: d.maDot,
              tenDot: d.tenDot,
              namHoc: d.namHoc,
              thoiGian: d.thoiGian,
              trangThai: d.trangThai,
              labelTrangThai: d.labelTrangThai,
              maRubric: d.maRubric,
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
          const savedMaDot = localStorage.getItem('selected_dot_thuc_tap') || selectedDot?.maDot
          const matched = dots.find((d) => d.maDot === savedMaDot) || dots.find((d) => d.trangThai === 'DangDienRa') || dots[0]
          if (matched) {
            setSelectedDot({
              maDot: matched.maDot,
              tenDot: matched.tenDot,
              namHoc: matched.namHoc,
              thoiGian: matched.thoiGian,
              trangThai: matched.trangThai,
              labelTrangThai: matched.labelTrangThai,
              maRubric: matched.maRubric,
            })
          }
        }
      } catch (err) {
        console.warn('Không tải được đợt thực tập từ API, sử dụng dữ liệu mặc định:', err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    syncFromDb()

    return () => {
      isMounted = false
    }
  }, [user, refreshVersion])

  // Đổi đợt thực tập và lưu vào localStorage
  const changeDot = (dot) => {
    if (!dot) return
    setSelectedDot(dot)
    try {
      localStorage.setItem('selected_dot_thuc_tap', dot.maDot)
    } catch (_e) {
      // ignore storage error
    }
  }

  // Đợt đang chọn có phải đợt đang mở tác vụ không?
  const resetToCurrentDot = () => {
    const allDots = danhSachNamHoc.flatMap((y) => y.dots || [])
    const defaultCurrent = allDots.find((d) => d.trangThai === 'DangDienRa') || allDots[0] || null
    if (defaultCurrent) {
      setSelectedDot(defaultCurrent)
      try {
        localStorage.setItem('selected_dot_thuc_tap', defaultCurrent.maDot)
      } catch (_e) {
        // ignore storage error
      }
    }
  }

  const roundLock = useRoundLock(user ? selectedDot?.maDot : null)
  const isReadOnly = selectedDot?.trangThai === 'DaKetThuc' || roundLock.structureBlocked

  return (
    <DotThucTapContext.Provider
      value={{
        loading,
        refreshRounds: () => setRefreshVersion(v => v + 1),
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
