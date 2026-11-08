import { requestReportAuthor, resolveReportAuthor } from './reportAuthor.js'

const NAVY = 'FF002060'
const TEN_TRUONG = 'TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP. HỒ CHÍ MINH'
const LOGO_SIZE = { width: 300, height: 62 }

// Đơn vị ban hành trên file xuất: khoa của người đang đăng nhập (QTV không thuộc khoa nào).
export function donViBanHanh() {
  try {
    return JSON.parse(localStorage.getItem('internship_user') || 'null')?.tenKhoa || 'HỆ THỐNG QUẢN LÝ THỰC TẬP'
  } catch {
    return 'HỆ THỐNG QUẢN LÝ THỰC TẬP'
  }
}

let logoRequest = null
// Logo trường (src/assets/huit-logo.png) cho tiêu đề tệp Excel. Ngoài trình duyệt hoặc tải lỗi thì trả về null
// và tiêu đề dùng tên trường dạng chữ, không làm hỏng việc xuất tệp.
export function loadHuitLogo() {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return Promise.resolve(null)
  logoRequest ??= import('../assets/huit-logo.png')
    .then((module) => fetch(module.default))
    .then((response) => (response.ok ? response.arrayBuffer() : null))
    .catch(() => null)
  return logoRequest
}

// Mỗi workbook chỉ nhúng ảnh logo một lần, các sheet dùng chung.
const logoIds = new WeakMap()
function workbookLogo(workbook, logo) {
  if (!logo || !workbook) return null
  if (!logoIds.has(workbook)) logoIds.set(workbook, workbook.addImage({ buffer: logo, extension: 'png' }))
  return logoIds.get(workbook)
}

const ngayXuat = () =>
  new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())

/**
 * Khối tiêu đề theo mẫu của Khoa (phiếu chấm thực tập):
 * - Dòng 1–3: logo trường; bên phải logo là mã mẫu (nếu có), đơn vị ban hành và ngày xuất
 *   (bảng hẹp thì đơn vị và ngày xuất xuống dòng dưới logo).
 * - Tiêu đề in hoa, Times New Roman 16 đậm, xanh đậm; các dòng thông tin (đợt, năm học, học phần...).
 * Ghi từ `startRow`, trả về số dòng trống đầu tiên để vẽ bảng. `widths` là độ rộng các cột của bảng.
 */
export function addHuitHeader(ws, { title, infoLines = [], widths = [], logo = null, unit, formCode = '', startRow = 1 }) {
  const nCols = Math.max(1, widths.length)
  const font = (size, extra = {}) => ({ name: 'Times New Roman', size, color: { argb: NAVY }, ...extra })
  const merge = (row, from, to) => {
    if (to > from) ws.mergeCells(row, from, row, to)
  }
  const width = (i) => widths[i] || 12
  const totalWidth = widths.reduce((sum, _, i) => sum + width(i), 0) || 12
  // Bảng hẹp thì thu nhỏ logo cho vừa bề rộng in.
  const logoWidth = Math.min(LOGO_SIZE.width, Math.max(110, totalWidth * 7 - 10))
  const logoSize = { width: logoWidth, height: Math.round((logoWidth * LOGO_SIZE.height) / LOGO_SIZE.width) }
  const lines = (text, charWidth, span = totalWidth) => Math.max(1, Math.ceil(String(text).length / Math.max(8, span / charWidth)))
  let logoCols = 0
  let covered = 0
  while (logoCols < nCols && covered * 7 < logoSize.width + 12) covered += width(logoCols++)
  const rightStart = logoCols + 1
  const rightBlock = rightStart <= nCols && widths.slice(logoCols).reduce((sum, _, i) => sum + width(logoCols + i), 0) >= 26
  const unitText = String(unit || donViBanHanh()).toUpperCase()
  const exportedAt = `Ngày xuất: ${ngayXuat()}`

  let row = startRow
  for (let i = 0; i < 3; i++) ws.getRow(row + i).height = 18
  const imageId = workbookLogo(ws.workbook, logo)
  if (imageId != null) {
    ws.addImage(imageId, { tl: { col: 0.1, row: startRow - 1 + 0.1 }, ext: logoSize, editAs: 'oneCell' })
  } else {
    const school = ws.getCell(row, 1)
    school.value = TEN_TRUONG
    school.font = font(12, { bold: true })
    school.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    merge(row, 1, rightBlock ? logoCols : nCols)
    const span = rightBlock ? widths.slice(0, logoCols).reduce((sum, _, i) => sum + width(i), 0) : totalWidth
    ws.getRow(row).height = Math.max(18, lines(TEN_TRUONG, 1.25, span) * 16)
  }
  if (rightBlock) {
    const lines = [formCode ? [`Mẫu: ${formCode}`, font(11, { bold: true })] : null, [unitText, font(11, { bold: true })],
      [exportedAt, { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF475569' } }]].filter(Boolean)
    lines.forEach(([text, style], i) => {
      const cell = ws.getCell(row + i, rightStart)
      cell.value = text
      cell.font = style
      cell.alignment = { horizontal: 'right', vertical: 'middle' }
      merge(row + i, rightStart, nCols)
    })
  }
  row += 3
  if (!rightBlock) {
    const cell = ws.getCell(row, 1)
    cell.value = [formCode && `Mẫu: ${formCode}`, unitText, exportedAt].filter(Boolean).join(' — ')
    cell.font = font(11, { bold: true })
    cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true }
    merge(row, 1, nCols)
    ws.getRow(row).height = lines(cell.value, 1.1) * 16 + 2
    row++
  }
  ws.getRow(row++).height = 8
  const titleCell = ws.getCell(row, 1)
  titleCell.value = String(title || 'DANH SÁCH BÁO CÁO HỌC VỤ').toUpperCase()
  titleCell.font = font(16, { bold: true })
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  merge(row, 1, nCols)
  ws.getRow(row).height = lines(titleCell.value, 1.7) * 24 + 4
  row++
  infoLines.filter(Boolean).forEach((text) => {
    const cell = ws.getCell(row, 1)
    cell.value = text
    cell.font = font(11, { bold: true })
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    merge(row, 1, nCols)
    ws.getRow(row).height = lines(text, 1.1) * 16 + 4
    row++
  })
  ws.getRow(row++).height = 8
  return row
}

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
  logo = null,
}) {
  if (!['official', 'internal'].includes(reportType)) throw new Error('Loại báo cáo không hợp lệ.')
  const nCols = Math.max(1, columns.length)

  // 1–3. Khối tiêu đề theo mẫu của Khoa: logo trường, đơn vị, tiêu đề, thông tin đợt/năm học.
  const infoLine = [subTitle, reportType === 'internal' ? 'Danh sách nội bộ — phục vụ tra cứu' : ''].filter(Boolean).join(' — ')
  const tableStart = addHuitHeader(ws, { title, infoLines: [infoLine], widths: columns.map((c) => c.width || 16), logo })

  // 4. Header Bảng dữ liệu
  const headerValues = columns.map((c) => c.header)
  const headerRow = ws.getRow(tableStart)
  headerRow.values = headerValues
  headerRow.height = 26
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: NAVY } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDDEBF7' }, // Xanh nhạt, cùng tông với tiêu đề
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF8EA9C1' } },
      left: { style: 'thin', color: { argb: 'FF8EA9C1' } },
      bottom: { style: 'medium', color: { argb: 'FF1F3864' } },
      right: { style: 'thin', color: { argb: 'FF8EA9C1' } },
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
    dateRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true }
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
  // Mỗi chữ ký chiếm một nhóm cột liền nhau quanh vị trí yêu cầu, tránh dồn chữ vào cột hẹp (STT...).
  sigs.sort((a, b) => a.col - b.col)
  const spans = sigs.map((sig, index) => {
    const lower = index === 0 ? 1 : Math.floor((sigs[index - 1].col + sig.col) / 2) + 1
    const upper = index === sigs.length - 1 ? nCols : Math.floor((sig.col + sigs[index + 1].col) / 2)
    return [Math.min(lower, sig.col), Math.max(upper, sig.col)]
  })
  const placeSignatureCell = (rowNumber, index) => {
    const [from, to] = spans[index]
    if (to > from) ws.mergeCells(rowNumber, from, rowNumber, to)
    return ws.getRow(rowNumber).getCell(from)
  }

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
  sigs.forEach((sig, index) => {
    const cell = placeSignatureCell(titleRow.number, index)
    cell.value = sig.title
    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0F172A' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })

  // Dòng chú thích dưới chức danh
  const noteRow = ws.addRow([])
  sigs.forEach((sig, index) => {
    const cell = placeSignatureCell(noteRow.number, index)
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
    const cell = placeSignatureCell(ws.addRow([]).number, 0)
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

  const logo = await loadHuitLogo()
  appendHuitSheet(ws, { title, subTitle, columns, rows, signatures, preparedBy: author, reportType, logo })

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

  const logo = await loadHuitLogo()
  sheets.forEach((sheetConfig) => {
    const ws = workbook.addWorksheet(sheetConfig.sheetName || 'Sheet', {
      views: [{ showGridLines: true }],
    })
    appendHuitSheet(ws, { ...sheetConfig, reportType: sheetConfig.reportType || reportType, preparedBy: author, logo })
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

/**
 * Tải file từ response axios (responseType: 'blob')
 * Xử lý lỗi JSON nằm trong blob và đọc tên file từ Content-Disposition
 */
export async function downloadExcelResponse(response, defaultFileName) {
  if (
    response.data?.type === 'application/json' ||
    (response.data instanceof Blob && response.data.type?.includes('json'))
  ) {
    const text = await response.data.text()
    const json = JSON.parse(text)
    throw new Error(json.message || 'Lỗi khi tải tệp Excel.')
  }

  let fileName = defaultFileName
  const disposition = response.headers?.['content-disposition']
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i)
    if (match?.[1]) {
      fileName = decodeURIComponent(match[1].replace(/['"]/g, '').trim())
    }
  }

  const blob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Trích xuất lỗi từ response blob (khi backend trả về lỗi 400/500 JSON dạng blob)
 */
export async function parseBlobError(error) {
  if (error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text()
      const json = JSON.parse(text)
      return json.message || text
    } catch {
      // not JSON
    }
  }
  return error.response?.data?.message || error.message || 'Lỗi khi tải tệp Excel.'
}
