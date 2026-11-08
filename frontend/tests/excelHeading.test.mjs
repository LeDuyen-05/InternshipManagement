import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { addHuitHeader, appendHuitSheet } from '../src/utils/exportHuitExcel.js'
import { xuatBangDiemTheoMauKhoa } from '../src/utils/bangDiemExcel.js'
import { laCotMaDoanhNghiep, laCotTenDoanhNghiep, timDongTieuDeCot } from '../src/utils/excelImport.js'

globalThis.localStorage = { getItem: () => JSON.stringify({ tenKhoa: 'Khoa Công nghệ thông tin' }) }
const logo = readFileSync(new URL('../src/assets/huit-logo.png', import.meta.url))
const groups = [laCotMaDoanhNghiep, laCotTenDoanhNghiep]

test('tìm dòng tiêu đề cột dưới khối logo/tiêu đề/ghi chú, vẫn đọc được tệp mẫu cũ', () => {
  const title = 'BIỂU MẪU NHẬP DANH SÁCH DOANH NGHIỆP ĐỐI TÁC'
  const note = 'Lưu ý: Cột "Mã doanh nghiệp" không trùng lặp.'
  const rows = [[null, 'KHOA CÔNG NGHỆ THÔNG TIN'], [title, title, title], [note, note, note], ['Mã doanh nghiệp (*)', 'Tên doanh nghiệp (*)'], ['CT_FPT', 'FPT']]
  assert.equal(timDongTieuDeCot(rows, groups), 3)
  assert.equal(timDongTieuDeCot([['maCongTy', 'tenCongTy'], ['CT1', 'A']], groups), 0)
  assert.equal(timDongTieuDeCot([[title], [note]], groups), -1)
})

test('mẫu nhập có logo vẫn được đọc lại đúng dòng tiêu đề và dữ liệu', async () => {
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('Mau')
  const widths = [22, 42, 32, 20, 20, 48]
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w })
  const noteRow = addHuitHeader(ws, { title: 'Biểu mẫu nhập danh sách doanh nghiệp đối tác', widths, logo, unit: 'Khoa Công nghệ thông tin' })
  ws.getCell(noteRow, 1).value = 'Lưu ý: Các cột có dấu (*) là bắt buộc. Cột "Mã doanh nghiệp" không trùng lặp.'
  ws.mergeCells(noteRow, 1, noteRow, 6)
  ws.getRow(noteRow + 2).values = ['Mã doanh nghiệp (*)', 'Tên doanh nghiệp (*)', 'Vị trí tuyển dụng', 'Thời gian thực tập', 'Chỉ tiêu tiếp nhận', 'Yêu cầu tuyển dụng']
  ws.getRow(noteRow + 3).values = ['CT_FPT', 'FPT Software', 'Java', '12 tuần', 15, 'GPA >= 2.5']

  const reloaded = new ExcelJS.Workbook()
  await reloaded.xlsx.load(await workbook.xlsx.writeBuffer())
  const rows = []
  reloaded.worksheets[0].eachRow({ includeEmpty: false }, (row) => rows.push(row.values.slice(1).map((v) => v ?? '')))
  const header = timDongTieuDeCot(rows, groups)
  assert.equal(rows[header][0], 'Mã doanh nghiệp (*)')
  assert.deepEqual(rows[header + 1].slice(0, 2), ['CT_FPT', 'FPT Software'])
  assert.equal(reloaded.worksheets[0].getImages().length, 1)
})

test('bảng điểm có khối tiêu đề và công thức tổng điểm trỏ đúng dòng sinh viên', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bang-diem-'))
  try {
    const file = join(dir, 'bang-diem.xlsx')
    const tieuChis = [{ maTieuChi: 'T1', maCLO: 'CLO1.1', tenTieuChi: 'Mục tiêu', diemToiDa: 5 }, { maTieuChi: 'T2', maCLO: 'CLO4.1', tenTieuChi: 'Nhận xét DN', diemToiDa: 5 }]
    const rows = [{ stt: 1, maSV: '2001220334', hoLot: 'Kim Quốc', ten: 'Bảo', lop: '13DHTH07', ketQua: 'Đạt', diem: { T1: 4, T2: 5 } }]
    assert.equal(await xuatBangDiemTheoMauKhoa({ maDot: 'DOT02', tenDot: 'Đợt 2', namHoc: '2025 - 2026', maLoaiThucTap: 'TTNN', tieuChis, rows }, file,
      { preparedBy: 'Nguyễn Văn A', logo }), true)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(file)
    const ws = workbook.worksheets[0]
    const values = []
    ws.eachRow((row, n) => values.push([n, row.values.slice(1)]))
    const titleRow = values.find(([, v]) => String(v[0]).startsWith('BẢNG ĐIỂM ĐÁNH GIÁ CHUẨN ĐẦU RA'))
    const student = values.find(([, v]) => v[1] === '2001220334')
    assert.ok(titleRow && student && titleRow[0] < student[0])
    assert.ok(values.some(([, v]) => v.some((x) => String(x).includes('Năm học: 2025 - 2026'))))
    const total = ws.getCell(student[0], 8).value
    assert.equal(total.formula, `IF(COUNT(F${student[0]}:G${student[0]})=2,SUM(F${student[0]}:G${student[0]}),"Chưa đủ điểm")`)
    assert.equal(ws.pageSetup.printTitlesRow, `${student[0] - 3}:${student[0] - 1}`)
    assert.equal(ws.getImages().length, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('bảng chung đặt tiêu đề cột ngay sau khối tiêu đề và lặp lại khi in', () => {
  const ws = new ExcelJS.Workbook().addWorksheet('DanhSach')
  const columns = [{ header: 'STT', key: 'stt', width: 6 }, { header: 'MSSV', key: 'maSV', width: 14 }, { header: 'Họ và tên', key: 'hoTen', width: 26 },
    { header: 'Doanh nghiệp', key: 'dn', width: 30 }, { header: 'Kết quả', key: 'kq', width: 12 }]
  appendHuitSheet(ws, { title: 'Danh sách', subTitle: 'Đợt 2', columns, rows: [{ stt: 1, maSV: '001', hoTen: 'A', dn: 'FPT', kq: 'Đạt' }], reportType: 'internal', logo })
  const header = ws.getRow(Number(ws.pageSetup.printTitlesRow.split(':')[0]))
  assert.deepEqual(header.values.slice(1), ['STT', 'MSSV', 'Họ và tên', 'Doanh nghiệp', 'Kết quả'])
  assert.deepEqual(ws.getRow(header.number + 1).values.slice(1), [1, '001', 'A', 'FPT', 'Đạt'])
  assert.equal(ws.getImages().length, 1)
})
