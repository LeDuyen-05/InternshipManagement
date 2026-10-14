import { createContext, useContext, useState, useEffect } from 'react'

// Danh sách các năm học và đợt thực tập mô phỏng chuẩn nghiệp vụ đại học
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
        maDot: 'DOT001',
        tenDot: 'Đợt thực tập HK1 (Mặc định)',
        hocKy: 'Học kỳ 1',
        thoiGian: '17/08/2026 - 08/11/2026',
        trangThai: 'DangDienRa',
        labelTrangThai: 'Đang diễn ra',
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
