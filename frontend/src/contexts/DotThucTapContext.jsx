import { createContext, useContext, useState, useEffect } from 'react'

// Danh sách các năm học và đợt thực tập khớp chính xác với CSDL SQL Server (DOTTHUCTAP)
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
        trangThai: 'DangDienRa', // DangDienRa | DaKetThuc | SapDienRa
        labelTrangThai: 'Đang diễn ra',
        isDefault: true,
      },
    ],
  },
  {
    namHoc: '2025 - 2026',
    isCurrentYear: false,
    dots: [
      {
        maDot: 'DOT01',
        tenDot: 'Thực tập tốt nghiệp đợt 1 năm 2026',
        hocKy: 'Học kỳ 2',
        thoiGian: '02/02/2026 - 15/05/2026',
        trangThai: 'DaKetThuc',
        labelTrangThai: 'Đã kết thúc',
        isDefault: false,
      },
    ],
  },
]

// Tìm đợt mặc định đang mở
const defaultDot = DANH_SACH_DOT_THUC_TAP[0].dots[0]

const DotThucTapContext = createContext(null)

export function DotThucTapProvider({ children }) {
  const [selectedDot, setSelectedDot] = useState(() => {
    try {
      const savedMaDot = localStorage.getItem('selected_dot_thuc_tap')
      if (savedMaDot) {
        for (const year of DANH_SACH_DOT_THUC_TAP) {
          const found = year.dots?.find((d) => d.maDot === savedMaDot)
          if (found) return found
        }
      }
    } catch {
      // Fallback nếu localStorage bị chặn hoặc lỗi
    }
    return defaultDot
  })

  // Đổi đợt thực tập và lưu vào localStorage
  const changeDot = (dot) => {
    if (!dot) return
    setSelectedDot(dot)
    try {
      localStorage.setItem('selected_dot_thuc_tap', dot.maDot)
    } catch {}
  }

  // Đưa về đợt đang diễn ra mặc định
  const resetToCurrentDot = () => {
    setSelectedDot(defaultDot)
    try {
      localStorage.setItem('selected_dot_thuc_tap', defaultDot.maDot)
    } catch {}
  }

  // Đợt đang chọn có phải đợt đang mở tác vụ không?
  const isReadOnly = (selectedDot || defaultDot)?.trangThai === 'DaKetThuc'

  return (
    <DotThucTapContext.Provider
      value={{
        selectedDot,
        changeDot,
        resetToCurrentDot,
        isReadOnly,
        danhSachNamHoc: DANH_SACH_DOT_THUC_TAP,
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
