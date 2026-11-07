import { useState, useEffect, useRef } from 'react'
import { roundStudentImportService } from '../../services/roundStudentImportService'
import { getLoaiThucTapInfo, loaiThucTapOptions } from '../../utils/dotThucTap'

const TRANG_THAI_DOT_LABELS = {
  ChuaBatDau: 'Chưa bắt đầu',
  DangDienRa: 'Đang diễn ra',
  DaKetThuc: 'Đã kết thúc',
}
const CHE_DO_LABELS = {
  NhapHoSo: 'Nhập hồ sơ và thêm vào đợt',
  ThemVaoDot: 'Thêm sinh viên vào đợt',
  DoiSoatKhongThamGia: 'Đối soát sinh viên không tham gia',
}

export default function RoundStudentImportWizard({
  initialMaDot,
  onSuccess,
  onClose,
}) {
  const [step, setStep] = useState(1) // 1: Select Round & Mode, 2: Upload & Map, 3: Preview, 4: Result
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1 states
  const [rounds, setRounds] = useState([])
  const [selectedNamHoc, setSelectedNamHoc] = useState('')
  const [selectedLoai, setSelectedLoai] = useState('ALL')
  const [selectedMaDot, setSelectedMaDot] = useState(initialMaDot || '')
  const [cheDo, setCheDo] = useState('NhapHoSo') // 'NhapHoSo' | 'ThemVaoDot' | 'DoiSoatKhongThamGia'

  // Step 2 states
  const [file, setFile] = useState(null)
  const [fileType, setFileType] = useState('') // 'csv' | 'xlsx'
  const [xlsxSheets, setXlsxSheets] = useState([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [sheetRows, setSheetRows] = useState([])
  const [headerRowIdx, setHeaderRowIdx] = useState(0)
  const [columnMapping, setColumnMapping] = useState({
    maSV: '',
    hoTen: '',
    hoDem: '',
    ten: '',
    lop: '',
    khoaHoc: '',
    gpa: '',
    chuyenNganh: '',
    kyNang: '',
    congNghe: '',
    duAnDaThucHien: '',
  })
  const [dungHoSoHienCoAll, setDungHoSoHienCoAll] = useState(false)

  // Step 3 states
  const [previewData, setPreviewData] = useState(null)
  const [commitResult, setCommitResult] = useState(null)
  const [pagePreview, setPagePreview] = useState(1)

  const fileInputRef = useRef(null)

  // Load available rounds
  useEffect(() => {
    async function fetchRounds() {
      try {
        setLoading(true)
        const list = await roundStudentImportService.getRounds()
        setRounds(list || [])

        if (list?.length > 0) {
          const current = initialMaDot
            ? list.find((r) => r.maSo === initialMaDot)
            : list.find((r) => r.trangThai === 'DangDienRa') || list[0]

          if (current) {
            setSelectedNamHoc(current.namHoc || '')
            setSelectedLoai(current.maLoaiThucTap || 'ALL')
            setSelectedMaDot(current.maSo)
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải danh sách đợt thực tập.')
      } finally {
        setLoading(false)
      }
    }
    fetchRounds()
  }, [initialMaDot])

  // Filtered rounds based on year and type
  const availableYears = Array.from(new Set(rounds.map((r) => r.namHoc).filter(Boolean)))
  const filteredRounds = rounds.filter((r) => {
    if (selectedNamHoc && r.namHoc !== selectedNamHoc) return false
    if (selectedLoai !== 'ALL' && r.maLoaiThucTap !== selectedLoai) return false
    return true
  })

  const currentRoundObj = rounds.find((r) => r.maSo === selectedMaDot)

  // Tải file mẫu CSV
  const handleDownloadMauCsv = async () => {
    try {
      const blob = await roundStudentImportService.downloadMauCsv()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mau-sinh-vien-theo-dot.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('Không thể tải file mẫu CSV.')
    }
  }

  // Handle file select
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setError('')
    setFile(selectedFile)

    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv') {
      setFileType('csv')
      setXlsxSheets([])
      setSheetRows([])
    } else if (ext === 'xlsx') {
      setFileType('xlsx')
      // Đọc file XLSX ở phía client bằng exceljs
      try {
        setLoading(true)
        const { default: ExcelJS } = await import('exceljs')
        const workbook = new ExcelJS.Workbook()
        const buffer = await selectedFile.arrayBuffer()
        await workbook.xlsx.load(buffer)

        const sheetNames = workbook.worksheets.map((ws) => ws.name)
        setXlsxSheets(sheetNames)
        const firstSheetName = sheetNames[0] || ''
        setSelectedSheet(firstSheetName)

        parseSheetData(workbook, firstSheetName)
      } catch (err) {
        setError('Không thể đọc file Excel (.xlsx): ' + err.message)
      } finally {
        setLoading(false)
      }
    } else {
      setError('Định dạng tệp không được hỗ trợ. Vui lòng chọn file .csv hoặc .xlsx.')
      setFile(null)
      setFileType('')
    }
  }

  const parseSheetData = (workbook, sheetName) => {
    const ws = workbook.getWorksheet(sheetName)
    if (!ws) return

    const rows = []
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : []
      rows.push({
        rowNumber,
        values: values.map((v) => (v != null && typeof v === 'object' && v.text ? v.text : v ?? '')),
      })
    })

    setSheetRows(rows)

    // Tự động đoán dòng tiêu đề (chứa 'MSSV' hoặc 'Mã SV')
    let headerIdx = 0
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rowText = rows[i].values.map((v) => String(v).toLowerCase()).join(' ')
      if (rowText.includes('mssv') || rowText.includes('mã sv') || rowText.includes('họ tên')) {
        headerIdx = i
        break
      }
    }
    setHeaderRowIdx(headerIdx)

    // Tự động ánh xạ cột
    const headerCols = rows[headerIdx]?.values || []
    const mapping = { ...columnMapping }

    headerCols.forEach((colName, cIdx) => {
      const name = String(colName || '').trim().toLowerCase()
      if (name.includes('mssv') || name.includes('mã sv') || name === 'masv') mapping.maSV = String(cIdx)
      else if (name === 'họ tên' || name === 'họ và tên' || name === 'hoten') mapping.hoTen = String(cIdx)
      else if (name === 'họ lót' || name === 'họ đệm' || name === 'hodem') mapping.hoDem = String(cIdx)
      else if (name === 'tên' || name === 'ten') mapping.ten = String(cIdx)
      else if (name.includes('lớp') || name === 'lop') mapping.lop = String(cIdx)
      else if (name.includes('khóa') || name === 'khoahoc') mapping.khoaHoc = String(cIdx)
      else if (name === 'gpa' || name.includes('điểm tb')) mapping.gpa = String(cIdx)
      else if (name.includes('chuyên ngành') || name === 'chuyennganh') mapping.chuyenNganh = String(cIdx)
      else if (name.includes('kỹ năng') || name === 'kynang') mapping.kyNang = String(cIdx)
      else if (name.includes('công nghệ') || name === 'congnghe') mapping.congNghe = String(cIdx)
      else if (name.includes('dự án') || name === 'duan') mapping.duAnDaThucHien = String(cIdx)
    })

    setColumnMapping(mapping)
  }

  // Chuyển sang sheet khác
  const handleSheetChange = async (sheetName) => {
    setSelectedSheet(sheetName)
    if (!file) return
    try {
      const { default: ExcelJS } = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      const buffer = await file.arrayBuffer()
      await workbook.xlsx.load(buffer)
      parseSheetData(workbook, sheetName)
    } catch {
      // ignore
    }
  }

  // Thực hiện Preview (Step 2 -> Step 3)
  const handleProcessPreview = async () => {
    if (!file) {
      setError('Vui lòng chọn tệp danh sách để tải lên.')
      return
    }

    setLoading(true)
    setError('')
    try {
      let previewRes

      if (fileType === 'csv') {
        const formData = new FormData()
        formData.append('maDot', selectedMaDot)
        formData.append('cheDo', cheDo)
        formData.append('file', file)
        previewRes = await roundStudentImportService.previewCsv(formData)
      } else {
        // XLSX: Build rows JSON from mapped sheet
        const dataRows = sheetRows.slice(headerRowIdx + 1)
        const jsonRows = []

        for (const r of dataRows) {
          const vals = r.values
          const rawMaSV = columnMapping.maSV !== '' ? String(vals[Number(columnMapping.maSV)] || '').trim() : ''
          if (!rawMaSV) continue // bỏ qua dòng trống mã SV

          let rawHoTen = columnMapping.hoTen !== '' ? String(vals[Number(columnMapping.hoTen)] || '').trim() : ''
          if (!rawHoTen && (columnMapping.hoDem !== '' || columnMapping.ten !== '')) {
            const hoDem = columnMapping.hoDem !== '' ? String(vals[Number(columnMapping.hoDem)] || '').trim() : ''
            const ten = columnMapping.ten !== '' ? String(vals[Number(columnMapping.ten)] || '').trim() : ''
            rawHoTen = `${hoDem} ${ten}`.trim()
          }

          const rawLop = columnMapping.lop !== '' ? String(vals[Number(columnMapping.lop)] || '').trim() : ''
          const rawKhoaHoc = columnMapping.khoaHoc !== '' ? String(vals[Number(columnMapping.khoaHoc)] || '').trim() : null
          const rawGpaVal = columnMapping.gpa !== '' ? vals[Number(columnMapping.gpa)] : null
          const rawGpa = rawGpaVal != null && rawGpaVal !== '' && !isNaN(Number(rawGpaVal)) ? Number(rawGpaVal) : null
          const rawChuyenNganh = columnMapping.chuyenNganh !== '' ? String(vals[Number(columnMapping.chuyenNganh)] || '').trim() : null
          const rawKyNang = columnMapping.kyNang !== '' ? String(vals[Number(columnMapping.kyNang)] || '').trim() : null
          const rawCongNghe = columnMapping.congNghe !== '' ? String(vals[Number(columnMapping.congNghe)] || '').trim() : null
          const rawDuAn = columnMapping.duAnDaThucHien !== '' ? String(vals[Number(columnMapping.duAnDaThucHien)] || '').trim() : null

          jsonRows.push({
            dong: r.rowNumber,
            maSV: rawMaSV,
            hoTen: rawHoTen || 'Chưa có họ tên',
            lop: rawLop || '',
            khoaHoc: rawKhoaHoc,
            gpa: rawGpa,
            chuyenNganh: rawChuyenNganh,
            kyNang: rawKyNang,
            congNghe: rawCongNghe,
            duAnDaThucHien: rawDuAn,
            dungHoSoHienCo: dungHoSoHienCoAll,
          })

          if (jsonRows.length >= 500) break // Backend limit 500 dòng/lần
        }

        if (jsonRows.length === 0) {
          throw new Error('Không tìm thấy dòng dữ liệu sinh viên nào hợp lệ trong sheet đã chọn.')
        }

        previewRes = await roundStudentImportService.previewJson({
          maDot: selectedMaDot,
          cheDo,
          tenNguon: file.name,
          namHoc: currentRoundObj?.namHoc,
          maLoaiThucTap: currentRoundObj?.maLoaiThucTap,
          rows: jsonRows,
        })
      }

      setPreviewData(previewRes)
      setStep(3)
      setPagePreview(1)
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Không thể xem trước dữ liệu import. Vui lòng kiểm tra lại.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Toggle dùng hồ sơ hiện có cho các dòng xung đột và xem trước lại
  const handleToggleDungHoSoHienCo = async (checked) => {
    setDungHoSoHienCoAll(checked)
    if (fileType === 'xlsx') {
      setTimeout(() => handleProcessPreview(), 50)
    }
  }

  // Xác nhận Commit (Step 3 -> Step 4)
  const handleCommit = async () => {
    if (!previewData?.id) {
      setError('Phiên xem trước không có ID hợp lệ để xác nhận.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await roundStudentImportService.commit(previewData.id, previewData.phienBan ?? 0)
      setCommitResult(res)
      setStep(4)
      onSuccess?.()
    } catch (err) {
      setError(
        err.response?.data?.message || 'Xác nhận nhập dữ liệu thất bại. Vui lòng xem trước lại.'
      )
    } finally {
      setLoading(false)
    }
  }

  const previewRows = previewData?.rows || []
  const previewPageSize = 10
  const previewTotalPages = Math.ceil(previewRows.length / previewPageSize) || 1
  const displayedPreviewRows = previewRows.slice(
    (pagePreview - 1) * previewPageSize,
    pagePreview * previewPageSize
  )

  const headerColOptions = sheetRows[headerRowIdx]?.values || []

  return (
    <div className="bg-white rounded-3xl p-6 shadow-2xl font-sans max-w-4xl w-full max-h-[92vh] overflow-y-auto">
      {/* Wizard Header & Steps */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>Tiếp nhận danh sách theo đợt</span>
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Tiếp nhận danh sách sinh viên vào đợt thực tập
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      {/* Stepper Breadcrumb */}
      <div className="flex items-center justify-between gap-2 mb-6 text-xs font-bold">
        {[
          { num: 1, label: 'Chọn đợt & chế độ' },
          { num: 2, label: 'Tải tệp & ánh xạ' },
          { num: 3, label: 'Xem trước & đối soát' },
          { num: 4, label: 'Kết quả nhập' },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex-1 flex items-center gap-2 p-2.5 rounded-2xl border transition-all ${
              step === s.num
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs'
                : step > s.num
                ? 'bg-slate-50 border-slate-200 text-emerald-700'
                : 'bg-white border-slate-200/60 text-slate-400'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s.num
                  ? 'bg-blue-600 text-white'
                  : step > s.num
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </span>
            <span className="truncate">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Lỗi chung */}
      {error && (
        <div className="p-3.5 mb-5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-rose-500 hover:text-rose-700"
          >
            ×
          </button>
        </div>
      )}

      {/* STEP 1: CHỌN ĐỢT & CHẾ ĐỘ */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Năm học
              </label>
              <select
                value={selectedNamHoc}
                onChange={(e) => {
                  setSelectedNamHoc(e.target.value)
                  const matching = rounds.filter((r) => r.namHoc === e.target.value)
                  if (matching.length > 0) setSelectedMaDot(matching[0].maSo)
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Loại thực tập
              </label>
              <select
                value={selectedLoai}
                onChange={(e) => setSelectedLoai(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="ALL">Tất cả loại thực tập</option>
                {loaiThucTapOptions(rounds).map((o) => (
                  <option key={o.code} value={o.code}>{o.label} ({o.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Đợt thực tập <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedMaDot}
                onChange={(e) => setSelectedMaDot(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                {filteredRounds.map((r) => (
                  <option key={r.maSo} value={r.maSo}>
                    {r.tenDot} [{TRANG_THAI_DOT_LABELS[r.trangThai] || r.trangThai}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentRoundObj && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Đợt học vụ: <strong className="text-slate-900">{currentRoundObj.tenDot}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Chương trình: <strong className="text-blue-700">{getLoaiThucTapInfo(currentRoundObj).label}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Tình trạng: <span className="font-semibold text-emerald-700">{TRANG_THAI_DOT_LABELS[currentRoundObj.trangThai] || currentRoundObj.trangThai}</span></span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Chọn chế độ nhập dữ liệu <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  cheDo === 'NhapHoSo'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-950 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="cheDo"
                    value="NhapHoSo"
                    checked={cheDo === 'NhapHoSo'}
                    onChange={() => setCheDo('NhapHoSo')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs block">1. Tiếp nhận danh sách &amp; Cấp tài khoản</span>
                    <span className="text-[11px] text-slate-500 leading-normal block mt-1">
                      Tiếp nhận sinh viên đủ điều kiện thực tập và tự động cấp tài khoản cổng thông tin học vụ (TK_MSSV / 123456) cho sinh viên mới.
                    </span>
                  </div>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  cheDo === 'ThemVaoDot'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-950 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="cheDo"
                    value="ThemVaoDot"
                    checked={cheDo === 'ThemVaoDot'}
                    onChange={() => setCheDo('ThemVaoDot')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs block">2. Bổ sung sinh viên vào đợt</span>
                    <span className="text-[11px] text-slate-500 leading-normal block mt-1">
                      Bổ sung sinh viên đã có thông tin trong danh mục học vụ của Khoa vào đợt thực tập hiện tại.
                    </span>
                  </div>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  cheDo === 'DoiSoatKhongThamGia'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-950 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="cheDo"
                    value="DoiSoatKhongThamGia"
                    checked={cheDo === 'DoiSoatKhongThamGia'}
                    onChange={() => setCheDo('DoiSoatKhongThamGia')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs block">3. Ghi nhận tạm hoãn / Chưa thực tập</span>
                    <span className="text-[11px] text-slate-500 leading-normal block mt-1">
                      Lưu trữ thông tin sinh viên xin hoãn hoặc chưa đủ điều kiện để Khoa theo dõi và xét học phần các đợt tiếp theo.
                    </span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={!selectedMaDot}
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <span>Tiếp tục: Chọn tệp &amp; Ánh xạ</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: TẢI TỆP & ÁNH XẠ CỘT */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-lg">info</span>
              <span>
                Đợt: <strong>{currentRoundObj?.tenDot || selectedMaDot}</strong> • Phương thức: <strong>{CHE_DO_LABELS[cheDo] || cheDo}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadMauCsv}
              className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Tải mẫu CSV chuẩn</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chọn tệp dữ liệu (.csv hoặc .xlsx)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
            >
              <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">
                upload_file
              </span>
              <p className="text-xs font-bold text-slate-700">
                {file ? file.name : 'Bấm vào đây để chọn tệp CSV hoặc Excel (XLSX)'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Hỗ trợ định dạng Excel (.xlsx) hoặc CSV (dung lượng tối đa 5 MB).
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Nếu là file XLSX: Hiển thị chọn Sheet & Ánh xạ cột */}
          {fileType === 'xlsx' && (
            <div className="space-y-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Chọn Sheet:</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {xlsxSheets.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Dòng tiêu đề:</label>
                  <select
                    value={headerRowIdx}
                    onChange={(e) => {
                      const idx = Number(e.target.value)
                      setHeaderRowIdx(idx)
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {sheetRows.slice(0, 15).map((r, i) => (
                      <option key={i} value={i}>
                        Dòng {r.rowNumber}: {r.values.slice(0, 4).join(' | ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bảng ánh xạ các cột */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Ánh xạ cột dữ liệu từ file Excel
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cột Mã số sinh viên (MSSV) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={columnMapping.maSV}
                      onChange={(e) => setColumnMapping({ ...columnMapping, maSV: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                    >
                      <option value="">-- Chọn cột MSSV --</option>
                      {headerColOptions.map((col, idx) => (
                        <option key={idx} value={String(idx)}>
                          Cột {idx + 1}: {String(col || `Cột ${idx + 1}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cột Họ và tên (đầy đủ)
                    </label>
                    <select
                      value={columnMapping.hoTen}
                      onChange={(e) => setColumnMapping({ ...columnMapping, hoTen: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                    >
                      <option value="">-- Chọn cột Họ tên (hoặc ghép từ 2 cột bên dưới) --</option>
                      {headerColOptions.map((col, idx) => (
                        <option key={idx} value={String(idx)}>
                          Cột {idx + 1}: {String(col || `Cột ${idx + 1}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cột Lớp sinh hoạt
                    </label>
                    <select
                      value={columnMapping.lop}
                      onChange={(e) => setColumnMapping({ ...columnMapping, lop: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                    >
                      <option value="">-- Chọn cột Lớp --</option>
                      {headerColOptions.map((col, idx) => (
                        <option key={idx} value={String(idx)}>
                          Cột {idx + 1}: {String(col || `Cột ${idx + 1}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cột Họ đệm (nếu tách họ và tên)
                    </label>
                    <select
                      value={columnMapping.hoDem}
                      onChange={(e) => setColumnMapping({ ...columnMapping, hoDem: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                    >
                      <option value="">-- Cột Họ đệm --</option>
                      {headerColOptions.map((col, idx) => (
                        <option key={idx} value={String(idx)}>
                          Cột {idx + 1}: {String(col || `Cột ${idx + 1}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cột Tên (nếu tách họ và tên)
                    </label>
                    <select
                      value={columnMapping.ten}
                      onChange={(e) => setColumnMapping({ ...columnMapping, ten: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                    >
                      <option value="">-- Cột Tên --</option>
                      {headerColOptions.map((col, idx) => (
                        <option key={idx} value={String(idx)}>
                          Cột {idx + 1}: {String(col || `Cột ${idx + 1}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cột GPA (0–4)
                    </label>
                    <select
                      value={columnMapping.gpa}
                      onChange={(e) => setColumnMapping({ ...columnMapping, gpa: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                    >
                      <option value="">-- Cột GPA --</option>
                      {headerColOptions.map((col, idx) => (
                        <option key={idx} value={String(idx)}>
                          Cột {idx + 1}: {String(col || `Cột ${idx + 1}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Quay lại
            </button>
            <button
              type="button"
              disabled={loading || !file || (fileType === 'xlsx' && columnMapping.maSV === '')}
              onClick={handleProcessPreview}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    progress_activity
                  </span>
                  <span>Đang phân tích...</span>
                </>
              ) : (
                <>
                  <span>Tiếp tục: Xem trước &amp; Đối soát</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: XEM TRƯỚC & ĐỐI SOÁT */}
      {step === 3 && previewData && (
        <div className="space-y-5">
          {/* Bento Thống kê Xem trước */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl">
              <span className="text-[10px] font-bold text-blue-700 uppercase">Sẽ thêm vào đợt</span>
              <p className="text-xl font-black text-blue-950 mt-1">{previewData.soSeThemVaoDot ?? 0}</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Hồ sơ mới</span>
              <p className="text-xl font-black text-emerald-950 mt-1">{previewData.soHoSoMoi ?? 0}</p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl">
              <span className="text-[10px] font-bold text-purple-700 uppercase">Hồ sơ đã có</span>
              <p className="text-xl font-black text-purple-950 mt-1">{previewData.soHoSoDaCo ?? 0}</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Đã có trong đợt</span>
              <p className="text-xl font-black text-slate-800 mt-1">{previewData.soDaThamGia ?? 0}</p>
            </div>
          </div>

          {/* Tùy chọn xử lý lệch hồ sơ */}
          {previewData.soHoSoDaCo > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between">
              <div>
                <p className="font-bold">Hồ sơ đã tồn tại khác thông tin trong file?</p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Bật tùy chọn này để giữ nguyên thông tin hồ sơ cũ mà không ghi đè, và vẫn thêm sinh viên vào đợt.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs bg-white px-3 py-1.5 rounded-xl border border-amber-300">
                <input
                  type="checkbox"
                  checked={dungHoSoHienCoAll}
                  onChange={(e) => handleToggleDungHoSoHienCo(e.target.checked)}
                />
                <span>Dùng hồ sơ hiện có</span>
              </label>
            </div>
          )}

          {/* Bảng xem trước từng dòng */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Danh sách các dòng xem trước ({previewRows.length} dòng)</span>
              {previewData.coTheNhap ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  ✓ Hợp lệ để xác nhận
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                  ⚠ Có dòng lỗi - Chưa thể nhập
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-center w-12">Dòng</th>
                    <th className="py-2 px-3">MSSV</th>
                    <th className="py-2 px-3">Họ tên</th>
                    <th className="py-2 px-3">Lớp</th>
                    <th className="py-2 px-3 text-center">Trạng thái</th>
                    <th className="py-2 px-3">Lỗi / Cảnh báo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedPreviewRows.map((r, idx) => (
                    <tr
                      key={idx}
                      className={r.loi?.length > 0 ? 'bg-rose-50/50' : 'hover:bg-slate-50/50'}
                    >
                      <td className="py-2 px-3 text-center font-mono text-slate-500">
                        {r.dong || idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.maSV}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{r.hoTen}</td>
                      <td className="py-2 px-3 text-slate-600">{r.lop || '—'}</td>
                      <td className="py-2 px-3 text-center">
                        {r.trangThai === 'TaoMoi' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Tạo mới
                          </span>
                        ) : r.trangThai === 'ThemVaoDot' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Thêm vào đợt
                          </span>
                        ) : r.trangThai === 'DaThamGia' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Đã tham gia
                          </span>
                        ) : r.trangThai === 'ChiDoiSoat' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Đối soát
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Lỗi
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {r.loi?.map((errStr, eIdx) => (
                          <p key={eIdx} className="text-rose-600 text-[11px] font-semibold">
                            • {errStr}
                          </p>
                        ))}
                        {r.canhBao?.map((warnStr, wIdx) => (
                          <p key={wIdx} className="text-amber-700 text-[11px]">
                            ⚠ {warnStr}
                          </p>
                        ))}
                        {(!r.loi || r.loi.length === 0) && (!r.canhBao || r.canhBao.length === 0) && (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {previewTotalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Trang {pagePreview} / {previewTotalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={pagePreview <= 1}
                    onClick={() => setPagePreview((p) => p - 1)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={pagePreview >= previewTotalPages}
                    onClick={() => setPagePreview((p) => p + 1)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Quay lại chọn tệp
            </button>
            <button
              type="button"
              disabled={loading || !previewData.coTheNhap}
              onClick={handleCommit}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    progress_activity
                  </span>
                  <span>Đang ghi dữ liệu vào hệ thống...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">task_alt</span>
                  <span>Xác nhận nhập dữ liệu vào đợt</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: KẾT QUẢ NHẬP DỮ LIỆU */}
      {step === 4 && commitResult && (
        <div className="space-y-5 text-center py-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Nhập danh sách sinh viên vào đợt thành công!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Dữ liệu học vụ đã được ghi nhận thành công vào đợt thực tập.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-left">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Hồ sơ tạo mới</span>
              <p className="text-xl font-black text-emerald-950 mt-1">
                {commitResult.soHoSoTaoMoi ?? 0}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
              <span className="text-[10px] font-bold text-blue-700 uppercase">Thêm vào đợt</span>
              <p className="text-xl font-black text-blue-950 mt-1">
                {commitResult.soThemVaoDot ?? 0}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200">
              <span className="text-[10px] font-bold text-indigo-700 uppercase">Tài khoản tự cấp</span>
              <p className="text-xl font-black text-indigo-950 mt-1">
                {commitResult.soTaiKhoanTaoMoi ?? 0}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Đã tham gia</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {commitResult.soDaThamGia ?? 0}
              </p>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 max-w-xl mx-auto flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 text-[18px]">key</span>
            <span>Đã tự động khởi tạo tài khoản cổng thông tin (Tên đăng nhập: <strong>MSSV</strong>, Mật khẩu khởi tạo: <strong>123456</strong>) cho sinh viên mới tiếp nhận.</span>
          </div>

          {commitResult.doiSoat?.length > 0 && (
            <div className="text-left max-w-lg mx-auto bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">Kết quả đối soát danh sách:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                {commitResult.doiSoat.slice(0, 5).map((d, idx) => (
                  <li key={idx}>
                    MSSV {d.maSV}: {d.canhBao?.join(', ') || 'Đã đối soát'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStep(1)
                setFile(null)
                setPreviewData(null)
                setCommitResult(null)
              }}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Nhập tệp khác
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                Hoàn tất &amp; Đóng
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
