const labels = {
  VT01: 'Quản trị viên', VT02: 'Cán bộ Khoa', VT03: 'Giảng viên',
  VT04: 'Sinh viên', VT05: 'Đại diện doanh nghiệp',
}
export const roleLabel = (id) => labels[id] || 'Người dùng'
