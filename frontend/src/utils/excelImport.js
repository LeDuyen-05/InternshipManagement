// Tệp mẫu nhập liệu có khối tiêu đề (logo, tên biểu mẫu, ghi chú) phía trên bảng, nên không mặc định dòng 1 là tiêu đề cột.
// Dòng tiêu đề cột là dòng đầu tiên có đủ các nhóm cột cần thiết, mỗi nhóm khớp một ô riêng có nội dung khác nhau
// (ô gộp của tiêu đề/ghi chú lặp cùng nội dung nên không bị nhận nhầm). Trả về chỉ số trong `rows`, -1 nếu không thấy.
export function timDongTieuDeCot(rows, groups, { maxRows = 25 } = {}) {
  for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
    const cells = (rows[i] || []).map((value) => String(value ?? '').toLowerCase().trim())
    const usedIndexes = new Set()
    const usedTexts = new Set()
    const matched = groups.every((test) => {
      const index = cells.findIndex((text, j) => text && !usedIndexes.has(j) && !usedTexts.has(text) && test(text))
      if (index === -1) return false
      usedIndexes.add(index)
      usedTexts.add(cells[index])
      return true
    })
    if (matched) return i
  }
  return -1
}

export const laCotMaDoanhNghiep = (text) => text.includes('mã') || text.includes('macongty')
export const laCotTenDoanhNghiep = (text) => text.includes('tên') || text.includes('tencongty')
export const laCotMaSinhVien = (text) => text.includes('mssv') || text.includes('mã sv') || text.includes('masv') || text.includes('mã sinh viên')
export const laCotHoTen = (text) => text.includes('họ') || text.includes('hoten') || text.includes('tên')
