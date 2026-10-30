import { requestReportAuthor } from './reportAuthor.js'
import { formatNgayHanhChinh, taiFileExcel } from './exportHuitExcel.js'
import { roundReportLabel } from './roundLock.js'

// Giữ bố cục ba dòng tiêu chí/CLO/điểm tối đa của mẫu Khoa; ExcelJS chỉ tải khi xuất.
export async function xuatBangDiemTheoMauKhoa(bangDiem, fileName, { preparedBy } = {}) {
  const author = await requestReportAuthor(preparedBy)
  if (author === null) return false
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = author
  const ws = workbook.addWorksheet('Chấm Thực tập')
  const criteria = bangDiem?.tieuChis || []
  const rows = bangDiem?.rows || []
  const totalColumn = 6 + criteria.length
  const teacherColumn = totalColumn + 1, companyColumn = totalColumn + 2
  const letter = i => ws.getColumn(i).letter

  ws.getCell('A1').value = 'Thực tập tốt nghiệp CNTT' + (bangDiem?.tenDot ? ' – ' + bangDiem.tenDot : '') + '\n' + roundReportLabel(bangDiem)
  ws.mergeCells('A1:E2')
  criteria.forEach((criterion, i) => {
    ws.getCell(1, 6 + i).value = criterion.tenTieuChi
    ws.getCell(2, 6 + i).value = criterion.maTieuChi
    ws.getCell(3, 6 + i).value = Number(criterion.diemToiDa)
  })
  ;['STT', 'Mã số sinh viên', 'Họ và', 'Tên', 'Lớp'].forEach((value, i) => { ws.getCell(3, i + 1).value = value })
  ws.getCell(1, totalColumn).value = 'Tổng điểm'
  ws.getCell(1, teacherColumn).value = 'GVHD'
  ws.getCell(1, companyColumn).value = 'Tên Công ty'
  ws.mergeCells(1, totalColumn, 2, totalColumn)
  ws.mergeCells(1, teacherColumn, 3, teacherColumn)
  ws.mergeCells(1, companyColumn, 3, companyColumn)
  rows.forEach((student, i) => {
    const row = 4 + i
    ;[student.stt, student.maSV, student.hoLot, student.ten, student.lop || ''].forEach((value, c) => { ws.getCell(row, c + 1).value = value ?? '' })
    criteria.forEach((criterion, c) => {
      const score = student.diem?.[criterion.maTieuChi]
      ws.getCell(row, 6 + c).value = score == null ? null : Number(score)
    })
    ws.getCell(row, teacherColumn).value = student.tenGVHD || ''
    ws.getCell(row, companyColumn).value = student.tenCongTy || ''
  })
  for (let row = 3; row <= rows.length + 3; row++) {
    const range = 'F' + row + ':' + letter(totalColumn - 1) + row
    const status = rows[row - 4]?.ketQua
    ws.getCell(row, totalColumn).value = row === 3 ? { formula: criteria.length ? 'SUM(' + range + ')' : '0' }
      : !criteria.length || (status && !['Đạt', 'Không đạt'].includes(status)) ? status || 'Chưa cấu hình rubric'
      : { formula: 'IF(COUNT(' + range + ')=' + criteria.length + ',SUM(' + range + '),"Chưa đủ điểm")' }
  }
  ;[5, 15, 18, 10, 12, ...criteria.map(() => 12), 12, 24, 38].forEach((width, i) => { ws.getColumn(i + 1).width = width })
  for (let row = 1; row <= rows.length + 3; row++) {
    for (let col = 1; col <= companyColumn; col++) {
      const cell = ws.getCell(row, col)
      cell.font = { name: 'Times New Roman', size: 10, bold: row <= 3 }
      cell.alignment = { horizontal: row <= 3 || col === totalColumn ? 'center' : 'left', vertical: 'middle', wrapText: true }
      cell.border = Object.fromEntries(['top', 'bottom', 'left', 'right'].map(side => [side, { style: 'thin' }]))
    }
  }
  ws.getRow(1).height = 90
  const dateRow = rows.length + 5, titleRow = dateRow + 1, noteRow = dateRow + 2, authorRow = noteRow + 5
  ws.mergeCells(dateRow, 1, dateRow, companyColumn)
  ws.getCell(dateRow, 1).value = formatNgayHanhChinh()
  ws.getCell(dateRow, 1).alignment = { horizontal: 'right' }
  const signatures = [{ col: 2, title: 'NGƯỜI LẬP BẢNG', note: '(Ký, ghi rõ họ tên)' },
    { col: Math.floor((totalColumn - 1) / 2) + 1, title: 'TRƯỞNG BỘ MÔN', note: '(Ký, ghi rõ họ tên)' },
    { col: Math.max(6, companyColumn - 1), title: 'TRƯỞNG KHOA', note: '(Ký, đóng dấu)' }]
  signatures.forEach(({ col, title, note }) => {
    ws.getCell(titleRow, col).value = title
    ws.getCell(noteRow, col).value = note
    ws.getCell(titleRow, col).font = { name: 'Times New Roman', size: 10, bold: true }
    ws.getCell(titleRow, col).alignment = { horizontal: 'center', wrapText: true }
    ws.getCell(noteRow, col).alignment = { horizontal: 'center', wrapText: true }
  })
  ws.getRow(titleRow).height = 32
  ws.getCell(authorRow, 2).value = author
  ws.getCell(authorRow, 2).alignment = { horizontal: 'center', wrapText: true }
  ws.getCell(authorRow, 2).font = { name: 'Times New Roman', size: 10, bold: true }
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    printTitlesRow: '1:3', printArea: 'A1:' + letter(companyColumn) + authorRow,
    margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 } }
  ws.headerFooter.oddFooter = '&LTrang &P / &N&RMẫu trình ký'
  if (typeof document === 'undefined') await workbook.xlsx.writeFile(fileName)
  else taiFileExcel(await workbook.xlsx.writeBuffer(), fileName)
  return true
}
