import { requestReportAuthor } from './reportAuthor.js'
import { addHuitHeader, formatNgayHanhChinh, loadHuitLogo, taiFileExcel } from './exportHuitExcel.js'
import { roundReportLabel } from './roundLock.js'

// Bảng điểm theo mẫu chấm thực tập của Khoa: khối tiêu đề (logo, đơn vị, tiêu đề, học phần/đợt/năm học),
// rồi ba dòng tiêu chí/CLO/điểm tối đa và điểm từng sinh viên. ExcelJS chỉ tải khi xuất.
export async function xuatBangDiemTheoMauKhoa(bangDiem, fileName, { preparedBy, logo } = {}) {
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
  const letter = (i) => ws.getColumn(i).letter

  const officialType =
    bangDiem?.tenLoaiThucTap ||
    (bangDiem?.maLoaiThucTap === 'TTKS'
      ? 'Thực tập kỹ sư'
      : bangDiem?.maLoaiThucTap === 'TTNN'
      ? 'Thực tập nghề nghiệp'
      : 'Thực tập tốt nghiệp')

  const widths = [5, 15, 18, 10, 12, ...criteria.map(() => 12), 12, 24, 38]
  widths.forEach((width, i) => {
    ws.getColumn(i + 1).width = width
  })
  const top = addHuitHeader(ws, {
    title: 'BẢNG ĐIỂM ĐÁNH GIÁ CHUẨN ĐẦU RA (CLO) HỌC PHẦN THỰC TẬP',
    infoLines: [
      [`Học phần: ${officialType}`, bangDiem?.namHoc && `Năm học: ${bangDiem.namHoc}`].filter(Boolean).join(' — '),
      [
        bangDiem?.tenDot && `Đợt: ${bangDiem.tenDot}${bangDiem?.maDot ? ` (${bangDiem.maDot})` : ''}`,
        bangDiem?.maRubric && `Bộ tiêu chí: ${bangDiem.maRubric}`,
      ].filter(Boolean).join(' — '),
      roundReportLabel(bangDiem),
    ],
    widths,
    logo: logo === undefined ? await loadHuitLogo() : logo,
    formCode: '03C_CĐR',
  })
  // Ba dòng tiêu đề bảng: tên tiêu chí, mã CLO, điểm tối đa (dòng thứ ba kèm STT/MSSV/Họ tên/Lớp).
  const nameRow = top, cloRow = top + 1, maxRow = top + 2, firstStudent = top + 3
  const lastRow = maxRow + rows.length

  ws.getCell(nameRow, 1).value = 'THÔNG TIN SINH VIÊN'
  ws.mergeCells(nameRow, 1, cloRow, 5)
  criteria.forEach((criterion, i) => {
    ws.getCell(nameRow, 6 + i).value = criterion.tenTieuChi
    ws.getCell(cloRow, 6 + i).value = criterion.maCLO || criterion.maTieuChi
    ws.getCell(maxRow, 6 + i).value = Number(criterion.diemToiDa)
  })
  ;['STT', 'Mã số sinh viên', 'Họ và', 'Tên', 'Lớp'].forEach((value, i) => {
    ws.getCell(maxRow, i + 1).value = value
  })
  ws.getCell(nameRow, totalColumn).value = 'Tổng điểm'
  ws.getCell(nameRow, teacherColumn).value = 'GVHD'
  ws.getCell(nameRow, companyColumn).value = 'Tên Công ty'
  ws.mergeCells(nameRow, totalColumn, cloRow, totalColumn)
  ws.mergeCells(nameRow, teacherColumn, maxRow, teacherColumn)
  ws.mergeCells(nameRow, companyColumn, maxRow, companyColumn)
  rows.forEach((student, i) => {
    const row = firstStudent + i
    ;[student.stt, student.maSV, student.hoLot, student.ten, student.lop || ''].forEach((value, c) => {
      ws.getCell(row, c + 1).value = value ?? ''
    })
    criteria.forEach((criterion, c) => {
      const score = student.diem?.[criterion.maTieuChi]
      ws.getCell(row, 6 + c).value = score == null ? null : Number(score)
    })
    ws.getCell(row, teacherColumn).value = student.tenGVHD || ''
    ws.getCell(row, companyColumn).value = student.tenCongTy || ''
  })
  for (let row = maxRow; row <= lastRow; row++) {
    const range = 'F' + row + ':' + letter(totalColumn - 1) + row
    const status = rows[row - firstStudent]?.ketQua
    ws.getCell(row, totalColumn).value =
      row === maxRow
        ? { formula: criteria.length ? 'SUM(' + range + ')' : '0' }
        : !criteria.length || (status && !['Đạt', 'Không đạt'].includes(status))
        ? status || 'Chưa cấu hình rubric'
        : { formula: 'IF(COUNT(' + range + ')=' + criteria.length + ',SUM(' + range + '),"Chưa đủ điểm")' }
  }
  const navy = { argb: 'FF002060' }
  for (let row = nameRow; row <= lastRow; row++) {
    for (let col = 1; col <= companyColumn; col++) {
      const cell = ws.getCell(row, col)
      const heading = row <= maxRow
      cell.font = { name: 'Times New Roman', size: 10, bold: heading, ...(heading ? { color: navy } : {}) }
      if (heading) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
      cell.alignment = {
        horizontal: heading || col === totalColumn ? 'center' : 'left',
        vertical: 'middle',
        wrapText: true,
      }
      cell.border = Object.fromEntries(
        ['top', 'bottom', 'left', 'right'].map((side) => [side, { style: 'thin', color: { argb: 'FF8EA9C1' } }])
      )
    }
  }
  ws.getRow(nameRow).height = 90
  const dateRow = lastRow + 2,
    titleRow = dateRow + 1,
    noteRow = dateRow + 2,
    authorRow = noteRow + 5
  ws.mergeCells(dateRow, 1, dateRow, companyColumn)
  ws.getCell(dateRow, 1).value = formatNgayHanhChinh()
  ws.getCell(dateRow, 1).alignment = { horizontal: 'right' }
  ws.getCell(dateRow, 1).font = { name: 'Times New Roman', size: 10, italic: true }
  // Mỗi chữ ký gộp trên vài cột liền nhau để chức danh không bị gãy dòng trong cột hẹp.
  const middle = Math.floor((totalColumn - 1) / 2) + 1
  const left = [1, Math.max(1, Math.min(3, middle - 2))]
  const center = [Math.max(left[1] + 1, middle - 1), Math.min(middle + 1, teacherColumn - 1)]
  const signatures = [
    { span: left, title: 'NGƯỜI LẬP BẢNG', note: '(Ký, ghi rõ họ tên)' },
    { span: center, title: 'TRƯỞNG BỘ MÔN', note: '(Ký, ghi rõ họ tên)' },
    { span: [teacherColumn, companyColumn], title: 'TRƯỞNG KHOA', note: '(Ký, đóng dấu)' },
  ]
  const signatureCell = (row, [from, to], value, font) => {
    if (to > from) ws.mergeCells(row, from, row, to)
    const cell = ws.getCell(row, from)
    cell.value = value
    cell.font = { name: 'Times New Roman', size: 10, ...font }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  }
  signatures.forEach(({ span, title, note }) => {
    signatureCell(titleRow, span, title, { bold: true })
    signatureCell(noteRow, span, note, { italic: true })
  })
  ws.getRow(titleRow).height = 22
  signatureCell(authorRow, left, author, { bold: true })
  ws.views = [{ state: 'frozen', ySplit: maxRow, xSplit: 5 }]
  ws.pageSetup = {
    // Keep wide CLO tables legible when printed; compact tables retain A4.
    paperSize: criteria.length > 8 ? 8 : 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: `${nameRow}:${maxRow}`,
    printArea: 'A1:' + letter(companyColumn) + authorRow,
    margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 },
  }
  ws.headerFooter.oddFooter = '&LTrang &P / &N&RMẫu trình ký'
  if (typeof document === 'undefined') await workbook.xlsx.writeFile(fileName)
  else taiFileExcel(await workbook.xlsx.writeBuffer(), fileName)
  return true
}
