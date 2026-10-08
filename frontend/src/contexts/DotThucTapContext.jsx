import { createContext, useContext, useState, useEffect } from 'react'

// Danh sách các năm học và đợt thực tập mô phỏng chuẩn nghiệp vụ đại học
export const DANH_SACH_DOT_THUC_TAP = [
  {
    namHoc: '2026 - 2027',
    isCurrentYear: true,
    dots: [
      {
        maDot: 'DOT_2627_HK1',
        tenDot: 'Đợt 1 - HK1 (2026-2027)',
        hocKy: 'Học kỳ 1',
        thoiGian: '05/09/2026 - 15/01/2027',
        trangThai: 'DangDienRa', // DangDienRa | DaKetThuc | SapDienRa
        labelTrangThai: 'Đang diễn ra',
        isDefault: true,
      },
      {
        maDot: 'DOT_2627_HK2',
        tenDot: 'Đợt 2 - HK2 (2026-2027)',
        hocKy: 'Học kỳ 2',
        thoiGian: '15/02/2027 - 30/06/2027',
        trangThai: 'SapDienRa',
        labelTrangThai: 'Sắp diễn ra',
        isDefault: false,
      },
    ],
  },
  {
    namHoc: '2025 - 2026',
    isCurrentYear: false,
    dots: [
      {
        maDot: 'DOT_2526_HK1',
        tenDot: 'Đợt 1 - HK1 (2025-2026)',
        hocKy: 'Học kỳ 1',
        thoiGian: '05/09/2025 - 15/01/2026',
        trangThai: 'DaKetThuc',
        labelTrangThai: 'Đã kết thúc',
        isDefault: false,
      },
      {
        maDot: 'DOT_2526_HK2',
        tenDot: 'Đợt 2 - HK2 (2025-2026)',
        hocKy: 'Học kỳ 2',
        thoiGian: '15/02/2026 - 30/06/2026',
        trangThai: 'DaKetThuc',
        labelTrangThai: 'Đã kết thúc',
        isDefault: false,
      },
    ],
  },
  {
    namHoc: '2024 - 2025',
    isCurrentYear: false,
    dots: [
      {
        maDot: 'DOT_2425_HK1',
        tenDot: 'Đợt 1 - HK1 (2024-2025)',
        hocKy: 'Học kỳ 1',
        thoiGian: '05/09/2024 - 15/01/2025',
        trangThai: 'DaKetThuc',
        labelTrangThai: 'Đã kết thúc',
        isDefault: false,
      },
      {
        maDot: 'DOT_2425_HK2',
        tenDot: 'Đợt 2 - HK2 (2024-2025)',
        hocKy: 'Học kỳ 2',
        thoiGian: '15/02/2025 - 30/06/2025',
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
    const savedMaDot = localStorage.getItem('selected_dot_thuc_tap')
    if (savedMaDot) {
      for (const year of DANH_SACH_DOT_THUC_TAP) {
        const found = year.dots.find((d) => d.maDot === savedMaDot)
        if (found) return found
      }
    }
    return defaultDot
  })

  // Đổi đợt thực tập và lưu vào localStorage
  const changeDot = (dot) => {
    setSelectedDot(dot)
    localStorage.setItem('selected_dot_thuc_tap', dot.maDot)
  }

  // Đợt đang chọn có phải đợt đang mở tác vụ không?
  const isReadOnly = selectedDot.trangThai === 'DaKetThuc'

  return (
    <DotThucTapContext.Provider
      value={{
        selectedDot,
        changeDot,
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
