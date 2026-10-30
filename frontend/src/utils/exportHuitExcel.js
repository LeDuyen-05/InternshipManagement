import { requestReportAuthor, resolveReportAuthor } from './reportAuthor.js'

/**
 * Tách họ và tên lót an toàn theo chuẩn Phòng Đào tạo HUIT:
 * - Dùng trim, gộp khoảng trắng thừa
 * - Tách ở khoảng trắng cuối cùng (lastIndexOf)
 * - Giữ nguyên họ tên đầy đủ để đối chiếu
 */
export function tachHoTen(fullName) {
  const raw = String(fullName || '').trim().replace(/\s+/g, ' ')
  if (!raw) return { hoLot: '', ten: '', hoTen: '' }
  const idx = raw.lastIndexOf(' ')
  if (idx === -1) {
    return { hoLot: '', ten: raw, hoTen: raw }
  }
  return {
    hoLot: raw.slice(0, idx),
    ten: raw.slice(idx + 1),
    hoTen: raw,
  }
}

/**
 * Định dạng ngày lập hành chính thực tế:
 * Ví dụ: "TP. Hồ Chí Minh, ngày 24 tháng 10 năm 2026"
 */
export function formatNgayHanhChinh(date = new Date()) {
  const d = new Date(date)
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(d)
  const part = type => parts.find(x => x.type === type).value
  const day = part('day'), month = part('month'), year = part('year')
  return `TP. Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}`
}

/**
 * Áp dụng cấu trúc trang HUIT tiêu chuẩn lên một Worksheet ExcelJS:
 * - Khối Tiêu đề (Header): Cơ quan ban hành, Title lớn in hoa đậm, Đợt/Năm học
 * - Khối Dữ liệu: Headers có viền, fill màu, căn lề tự động, dòng xen kẽ zebra
 * - Khối Chân trang (Footer): Ngày lập thực tế và các chức danh ký tên
 */
export function appendHuitSheet(ws, {
  title = 'DANH SÁCH BÁO CÁO HỌC VỤ',
  subTitle = '',
  columns = [],
  rows = [],
  signatures = null,
  preparedBy,
  reportType = 'official',
  freezeHeader = false,
  autoFilter = false,
  emptyMessage = '',
}) {
  if (!['official', 'internal'].includes(reportType)) throw new Error('Loại báo cáo không hợp lệ.')
  const nCols = Math.max(1, columns.length)

  // 1. Tiêu ngữ cơ quan ban hành (Dòng 1 & 2)
  const r1 = ws.addRow(['TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP. HỒ CHÍ MINH'])
  r1.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1E293B' } }
  ws.mergeCells(1, 1, 1, Math.min(4, nCols))

  const r2 = ws.addRow(['KHOA CÔNG NGHỆ THÔNG TIN'])
  r2.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1D4ED8' } }
  ws.mergeCells(2, 1, 2, Math.min(4, nCols))

  // Dòng trống
  ws.addRow([])

  // 2. Title chính trang trọng (Dòng 4)
  const r4 = ws.addRow([title.toUpperCase()])
  r4.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF0F172A' } }
  r4.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  r4.height = 28
  ws.mergeCells(4, 1, 4, nCols)

  // 3. Phụ đề Đợt thực tập / Năm học (Dòng 5)
  if (subTitle || reportType === 'internal') {
    const r5 = ws.addRow([[subTitle, reportType === 'internal' ? 'Danh sách nội bộ — phục vụ tra cứu' : ''].filter(Boolean).join(' — ')])
    r5.font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF475569' } }
    r5.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    r5.height = 15 * Math.max(1, Math.ceil(String(r5.getCell(1).value).length / Math.max(20, columns.reduce((sum, c) => sum + (c.width || 16), 0))))
    ws.mergeCells(5, 1, 5, nCols)
    ws.addRow([]) // Dòng trống 6
  } else {
    ws.addRow([]) // Dòng trống 5
  }

  // 4. Header Bảng dữ liệu
  const headerValues = columns.map((c) => c.header)
  const headerRow = ws.addRow(headerValues)
  headerRow.height = 26
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0F172A' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }, // Xám xanh trang nhã
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF64748B' } },
      left: { style: 'thin', color: { argb: 'FF64748B' } },
      bottom: { style: 'medium', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF64748B' } },
    }
  })

  // 5. Thêm các dòng dữ liệu
  rows.forEach((item, rIdx) => {
    const rowValues = columns.map((c) => (item[c.key] != null ? item[c.key] : ''))
    const row = ws.addRow(rowValues)
    row.height = Math.min(409, 15 * Math.max(1, ...rowValues.map((value, index) => {
      const width = Math.max(5, (columns[index].width || 16) - 2)
      return String(value).split('\n').reduce((lines, text) => lines + Math.max(1, Math.ceil(text.length / width)), 0)
    })) + 5)
    row.eachCell((cell, cIdx) => {
      const colDef = columns[cIdx - 1]
      cell.font = { name: 'Times New Roman', size: 10, color: { argb: 'FF0F172A' } }
      cell.alignment = {
        horizontal: colDef?.align || 'left',
        vertical: 'middle',
        wrapText: colDef?.wrapText ?? true,
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
      // Xen kẽ màu nhẹ cho các dòng chẵn
      if (rIdx % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        }
      }
    })
  })

  if (freezeHeader) ws.views = [{ state: 'frozen', ySplit: headerRow.number, showGridLines: false }]
  if (autoFilter && rows.length) ws.autoFilter = { from: { row: headerRow.number, column: 1 }, to: { row: headerRow.number + rows.length, column: nCols } }
  if (!rows.length && emptyMessage) {
    const empty = ws.addRow([emptyMessage])
    if (nCols > 1) ws.mergeCells(empty.number, 1, empty.number, nCols)
    empty.getCell(1).alignment = { wrapText: true, vertical: 'middle' }
    empty.height = 30
  }

  // 6. Định dạng độ rộng cột
  columns.forEach((col, idx) => {
    ws.getColumn(idx + 1).width = col.width || 16
  })

  ws.pageSetup = { paperSize: 9, orientation: nCols > 6 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    printTitlesRow: `${headerRow.number}:${headerRow.number}`, margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 } }
  ws.headerFooter.oddFooter = '&LTrang &P / &N&R' + (reportType === 'internal' ? 'Nội bộ' : 'Mẫu trình ký')
  const setPrintArea = () => { ws.pageSetup.printArea = `A1:${ws.getColumn(nCols).letter}${ws.rowCount}` }
  if (reportType === 'internal') {
    ws.addRow([]) // Dòng trống cách bảng
    const dateRow = ws.addRow([])
    ws.mergeCells(dateRow.number, 1, dateRow.number, nCols)
    dateRow.getCell(1).value = formatNgayHanhChinh()
    dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF334155' } }
    dateRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' }
    setPrintArea()
    return
  }

  // Dòng trống cách bảng
  ws.addRow([])

  // 7. Khối Chữ ký & Ngày tháng hành chính
  const dateText = formatNgayHanhChinh()
  const requestedSignatures = signatures || [
    { title: 'NGƯỜI LẬP BẢNG', note: '(Ký, ghi rõ họ tên)', col: Math.max(1, Math.floor(nCols * 0.25)) },
    { title: 'TRƯỞNG KHOA', note: '(Ký, đóng dấu)', col: Math.max(1, Math.floor(nCols * 0.8)) },
  ]
  // Mẫu cũ có thể chỉ định cột đã bị bỏ. Giữ các chữ ký trong bề rộng bảng.
  const visibleSignatures = requestedSignatures.slice(0, nCols)
  const validPositions = visibleSignatures.every(sig => Number.isInteger(sig.col) && sig.col >= 1 && sig.col <= nCols)
    && new Set(visibleSignatures.map(sig => sig.col)).size === visibleSignatures.length
  const sigs = visibleSignatures.map((sig, index) => ({
    ...sig,
    col: validPositions ? sig.col : Math.floor(index * nCols / visibleSignatures.length) + 1,
  }))

  // Dòng ngày tháng đặt phía trên chức danh người ký bên phải
  const rightSig = sigs[sigs.length - 1]
  const rightCol = rightSig?.col || nCols
  const dateRow = ws.addRow([])
  const dateCell = dateRow.getCell(rightCol)
  dateCell.value = dateText
  dateCell.font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF334155' } }
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' }
  // Ngày lập dài cần trải hết bề rộng bảng thay vì bị cắt ở cột chữ ký cuối.
  dateCell.value = null
  ws.mergeCells(dateRow.number, 1, dateRow.number, nCols)
  dateRow.getCell(1).value = dateText
  dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, italic: true }
  dateRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' }

  // Dòng chức danh
  const titleRow = ws.addRow([])
  titleRow.height = 32
  sigs.forEach((sig) => {
    const cell = titleRow.getCell(sig.col)
    cell.value = sig.title
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0F172A' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })

  // Dòng chú thích dưới chức danh
  const noteRow = ws.addRow([])
  sigs.forEach((sig) => {
    const cell = noteRow.getCell(sig.col)
    cell.value = sig.note
    cell.font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: 'FF64748B' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })

  // 4 dòng trống để ký
  ws.addRow([])
  ws.addRow([])
  ws.addRow([])
  ws.addRow([])
  const author = resolveReportAuthor(preparedBy)
  if (sigs.length && author) {
    const cell = ws.addRow([]).getCell(sigs[0].col)
    cell.value = author
    cell.font = { name: 'Times New Roman', size: 10, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  }
  setPrintArea()
}

/**
 * Xuất file Excel 1 Sheet chuẩn HUIT
 */
export async function xuatBangHuitExcel({
  fileName = 'BaoCao_HUIT.xlsx',
  sheetName = 'DanhSach',
  title = 'DANH SÁCH BÁO CÁO HỌC VỤ',
  subTitle = '',
  columns = [],
  rows = [],
  signatures = null,
  preparedBy,
  reportType = 'official',
}) {
  if (!['official', 'internal'].includes(reportType)) throw new Error('Loại báo cáo không hợp lệ.')
  const author = reportType === 'official' ? await requestReportAuthor(preparedBy) : resolveReportAuthor(preparedBy)
  if (author === null) return false
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = author || 'FIT HUIT Portal'
  workbook.created = new Date()

  const ws = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  })

  appendHuitSheet(ws, { title, subTitle, columns, rows, signatures, preparedBy: author, reportType })

  const buffer = await workbook.xlsx.writeBuffer()
  taiFileExcel(buffer, fileName)
  return true
}

/**
 * Xuất file Excel nhiều Sheet chuẩn HUIT
 */
export async function xuatMultiSheetHuitExcel({
  fileName = 'BaoCao_TongHop_HUIT.xlsx',
  sheets = [],
  preparedBy,
  reportType = 'official',
}) {
  if (!['official', 'internal'].includes(reportType) || sheets.some(x => x.reportType && !['official', 'internal'].includes(x.reportType))) throw new Error('Loại báo cáo không hợp lệ.')
  if (!sheets.length) return false
  const needsAuthor = sheets.some(x => (x.reportType || reportType) === 'official')
  const author = needsAuthor ? await requestReportAuthor(preparedBy) : resolveReportAuthor(preparedBy)
  if (author === null) return false
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = author || 'FIT HUIT Portal'
  workbook.created = new Date()

  sheets.forEach((sheetConfig) => {
    const ws = workbook.addWorksheet(sheetConfig.sheetName || 'Sheet', {
      views: [{ showGridLines: true }],
    })
    appendHuitSheet(ws, { ...sheetConfig, reportType: sheetConfig.reportType || reportType, preparedBy: author })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  taiFileExcel(buffer, fileName)
  return true
}

/**
 * Helper tải Buffer về máy người dùng dưới dạng file .xlsx
 */
export function taiFileExcel(buffer, fileName) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
