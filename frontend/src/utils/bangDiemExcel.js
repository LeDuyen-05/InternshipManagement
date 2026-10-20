import * as XLSX from 'xlsx'

// Xuất bảng điểm đúng bố cục file chấm điểm Thực tập của Khoa:
// dòng 1 tên tiêu chí, dòng 2 mã CLO, dòng 3 tiêu đề cột + điểm tối đa, từ dòng 4 là sinh viên;
// cột Tổng điểm là công thức SUM, sau đó là GVHD và Tên công ty.
export function xuatBangDiemTheoMauKhoa(bangDiem, fileName) {
  const tieuChis = bangDiem?.tieuChis || []
  const rows = bangDiem?.rows || []
  const nCot = 5 + tieuChis.length // A..E thông tin SV, sau đó là các CLO
  const col = (i) => XLSX.utils.encode_col(i)
  const cotDau = col(5)
  const cotCuoi = col(nCot - 1)
  const cotTong = nCot
  const cotGV = nCot + 1
  const cotCT = nCot + 2

  const aoa = []
  const r1 = new Array(cotCT + 1).fill(null)
  r1[0] = `Thực tập tốt nghiệp CNTT${bangDiem?.tenDot ? ` – ${bangDiem.tenDot}` : ''}`
  tieuChis.forEach((t, i) => { r1[5 + i] = t.tenTieuChi })
  r1[cotTong] = 'Tổng điểm'
  r1[cotGV] = 'GVHD'
  r1[cotCT] = 'Tên Công ty'
  aoa.push(r1)

  const r2 = new Array(cotCT + 1).fill(null)
  tieuChis.forEach((t, i) => { r2[5 + i] = t.maTieuChi })
  aoa.push(r2)

  const r3 = new Array(cotCT + 1).fill(null)
  ;['STT', 'Mã số sinh viên', 'Họ và', 'Tên', 'Lớp'].forEach((h, i) => { r3[i] = h })
  tieuChis.forEach((t, i) => { r3[5 + i] = Number(t.diemToiDa) })
  aoa.push(r3)

  rows.forEach((r) => {
    const line = new Array(cotCT + 1).fill(null)
    line[0] = r.stt
    line[1] = r.maSV
    line[2] = r.hoLot
    line[3] = r.ten
    line[4] = r.lop || ''
    tieuChis.forEach((t, i) => {
      const v = r.diem?.[t.maTieuChi]
      line[5 + i] = v == null ? null : Number(v)
    })
    line[cotGV] = r.tenGVHD || ''
    line[cotCT] = r.tenCongTy || ''
    aoa.push(line)
  })

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  // Công thức tổng điểm giống file gốc: =SUM(F3:P3) cho dòng điểm tối đa và từng sinh viên
  for (let r = 3; r <= aoa.length; r++) {
    const ref = `${col(cotTong)}${r}`
    ws[ref] = { t: 'n', f: `SUM(${cotDau}${r}:${cotCuoi}${r})` }
  }
  ws['!merges'] = [
    XLSX.utils.decode_range('A1:E2'),
    XLSX.utils.decode_range(`${col(cotTong)}1:${col(cotTong)}2`),
    XLSX.utils.decode_range(`${col(cotGV)}1:${col(cotGV)}3`),
    XLSX.utils.decode_range(`${col(cotCT)}1:${col(cotCT)}3`),
  ]
  ws['!cols'] = [
    { wch: 5 }, { wch: 15 }, { wch: 18 }, { wch: 9 }, { wch: 11 },
    ...tieuChis.map(() => ({ wch: 12 })),
    { wch: 10 }, { wch: 22 }, { wch: 40 },
  ]
  ws['!rows'] = [{ hpt: 90 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Chấm Thực tập')
  XLSX.writeFile(wb, fileName)
}
