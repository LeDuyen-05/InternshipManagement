import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import Pagination from '../../components/common/Pagination'
import { usePagination } from '../../hooks/usePagination'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import apiClient from '../../services/api'
import DieuChinhNoiThucTapPanel from '../../components/khoa/DieuChinhNoiThucTapPanel'
import BoTriBanDauPanel from '../../components/khoa/BoTriBanDauPanel'
import PlacementPeriodEditor from '../../components/khoa/PlacementPeriodEditor'
import LanHoTroPanel from '../../components/khoa/LanHoTroPanel'
import DanhSachDuKienPanel from '../../components/common/DanhSachDuKienPanel'
import RaSoatNoiPanel from '../../components/khoa/RaSoatNoiPanel'

function parseRoundDates(thoiGian) {
  const match = String(thoiGian || '').match(
    /(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/
  )
  if (!match) return { startIso: null, endIso: null, display: '' }
  return {
    startIso: `${match[3]}-${match[2]}-${match[1]}`,
    endIso: `${match[6]}-${match[5]}-${match[4]}`,
    display: `${match[1]}/${match[2]}/${match[3]} → ${match[4]}/${match[5]}/${match[6]}`,
  }
}

function normalizeRosterData(raw, selectedDot) {
  if (!raw || !Array.isArray(raw.sinhViens) || !Array.isArray(raw.thongKe))
    return raw
  const { startIso, endIso, display } = parseRoundDates(selectedDot?.thoiGian)
  const todayIso = new Date().toISOString().slice(0, 10)
  let defaultCode = 'DangThucTap'
  let defaultName = 'Đang thực tập'
  if (
    selectedDot?.trangThai === 'ChuaBatDau' ||
    (startIso && todayIso < startIso)
  ) {
    defaultCode = 'ChuaBatDau'
    defaultName = 'Đã phân bổ, chưa bắt đầu'
  } else if (
    selectedDot?.trangThai === 'DaKetThuc' ||
    (endIso && todayIso > endIso)
  ) {
    defaultCode = 'ChoHoanTat'
    defaultName = 'Hết thời gian, chờ hoàn tất'
  }

  const sinhViens = raw.sinhViens.map((row) => {
    if (row.trangThai === 'ChuaXacMinhThoiGian') {
      const rangeNote = display ? ` (${display})` : ''
      return {
        ...row,
        trangThai: defaultCode,
        tenTrangThai: defaultName,
        canHoTro: false,
        ngayBatDauThucTap: row.ngayBatDauThucTap || startIso,
        ngayKetThucThucTap: row.ngayKetThucThucTap || endIso,
        nguonThoiGian:
          row.nguonThoiGian === 'KhoaXacMinh' ? 'KhoaXacMinh' : 'TheoDot',
        lyDo:
          defaultCode === 'ChuaBatDau'
            ? `Đã phân bổ chính thức, chưa đến ngày bắt đầu thực tập${rangeNote}.`
            : defaultCode === 'ChoHoanTat'
            ? `Đã kết thúc thời gian thực tập${rangeNote}, chờ hoàn tất học phần.`
            : `Đang thực tập theo lịch của đợt${rangeNote}.`,
      }
    }
    return {
      ...row,
      ngayBatDauThucTap:
        row.ngayBatDauThucTap || (row.coPhanBoChinhThuc ? startIso : null),
      ngayKetThucThucTap:
        row.ngayKetThucThucTap || (row.coPhanBoChinhThuc ? endIso : null),
    }
  })

  const countsByCode = {}
  for (const r of sinhViens) {
    countsByCode[r.trangThai] = (countsByCode[r.trangThai] || 0) + 1
  }

  const thongKe = raw.thongKe
    .filter((g) => g.ma !== 'ChuaXacMinhThoiGian')
    .map((g) => ({
      ...g,
      soLuong: countsByCode[g.ma] ?? g.soLuong ?? 0,
    }))

  return {
    ...raw,
    canHoTro: sinhViens.filter((r) => r.canHoTro).length,
    sinhViens,
    thongKe,
  }
}

function formatAcademicNote(row) {
  if (!row) return '—'
  const raw = String(row.lyDo || '').trim()
  if (raw.includes('Chưa có hồ sơ đăng ký hoặc phân bổ trong đợt')) {
    return 'Chưa phát sinh hồ sơ đăng ký trong đợt'
  }
  return raw || '—'
}

function getStudentContextLink(row) {
  const code = encodeURIComponent(row?.maSV || '')
  if (row?.trangThai === 'ChoCongNhan') {
    return {
      to: `/khoa/dang-ky?loai=tu-tim&maSV=${code}`,
      label: 'Duyệt nơi tự tìm',
    }
  }
  if (['ChoKhoaChot', 'ChoXacNhan'].includes(row?.trangThai)) {
    return {
      to: `/khoa/dang-ky?loai=chot-phan-bo&maSV=${code}`,
      label: 'Chốt phân bổ',
    }
  }
  if (row?.trangThai === 'DangUngTuyen') {
    return {
      to: `/khoa/dang-ky?maSV=${code}`,
      label: 'Đơn đăng ký',
    }
  }
  if (row?.coPhanBoChinhThuc) {
    return {
      to: `/khoa/phan-bo`,
      label: 'Phân công GVHD',
    }
  }
  return {
    to: `/khoa/dang-ky?maSV=${code}`,
    label: 'Xem hồ sơ',
  }
}

function parseStudentCodeList(raw) {
  if (!raw) return []
  return [
    ...new Set(
      String(raw)
        .trim()
        .split(/[\s,;|\t\r\n]+/)
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .filter((item) => item && !/^(masv|mssv|ma_sv|student_id)$/i.test(item))
    ),
  ]
}

export default function SinhVienTheoDotPage() {
  const { selectedDot, loading: roundLoading, roundLock } = useDotThucTap()
  const round = selectedDot?.maDot || ''
  const roundDates = parseRoundDates(selectedDot?.thoiGian)
  const canEdit =
    !roundLoading &&
    !roundLock.structureBlocked &&
    ['ChuaBatDau', 'DangDienRa'].includes(selectedDot?.trangThai)
  const canEditCustomPeriod =
    canEdit &&
    selectedDot?.trangThai === 'ChuaBatDau' &&
    (!roundDates.startIso ||
      new Date().toISOString().slice(0, 10) < roundDates.startIso)

  const [activeTab, setActiveTab] = useState('sv-thoi-gian')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [onlySupport, setOnlySupport] = useState(false)
  const [showZeroGroups, setShowZeroGroups] = useState(false)

  // Trạng thái thêm sinh viên quy mô lớn (Theo lớp / Danh mục Khoa / File CSV / Dán mã)
  const [showAdd, setShowAdd] = useState(false)
  const [studentCodes, setStudentCodes] = useState('')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogStudents, setCatalogStudents] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [catalogClass, setCatalogClass] = useState('')
  const [catalogMajor, setCatalogMajor] = useState('')
  const [catalogCohort, setCatalogCohort] = useState('')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [hideExistingInCatalog, setHideExistingInCatalog] = useState(true)

  const [selectedStudent, setSelectedStudent] = useState(null)
  const [initialStudent, setInitialStudent] = useState(null)
  const [periodStudent, setPeriodStudent] = useState(null)
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [publicationVersion, setPublicationVersion] = useState(0)
  const version = useRef(0)
  const currentRound = useRef(round)
  currentRound.current = round

  const load = useCallback(async () => {
    if (!round || currentRound.current !== round) return
    const request = ++version.current
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get('/khoa/sinh-vien-theo-dot', {
        params: { maDot: round },
      })
      if (currentRound.current !== round || request !== version.current) return
      if (
        !Array.isArray(response.data?.sinhViens) ||
        !Array.isArray(response.data?.thongKe)
      )
        throw new Error(
          'API danh sách SV theo đợt chưa đúng phiên bản. Hãy khởi động lại backend.'
        )
      setData(normalizeRosterData(response.data, selectedDot))
    } catch (e) {
      if (currentRound.current === round && request === version.current) {
        setData(null)
        setError(
          e.response?.data?.message ||
            e.message ||
            'Không tải được danh sách SV theo đợt.'
        )
      }
    } finally {
      if (currentRound.current === round && request === version.current)
        setLoading(false)
    }
  }, [round])

  useEffect(() => {
    setData(null)
    setLoading(false)
    setBusy('')
    setError('')
    setMessage('')
    setSearch('')
    setGroup('')
    setClassFilter('')
    setSourceFilter('')
    setOnlySupport(false)
    setShowZeroGroups(false)
    setShowAdd(false)
    setStudentCodes('')
    setCatalogOpen(false)
    setSelectedStudent(null)
    setInitialStudent(null)
    load()
    const requestVersion = version
    return () => {
      requestVersion.current++
    }
  }, [load])

  const loadCatalog = useCallback(async () => {
    setCatalogOpen(true)
    if (catalogStudents.length > 0 || catalogLoading) return
    setCatalogLoading(true)
    setCatalogError('')
    try {
      const res = await apiClient.get('/khoa/sinh-vien')
      setCatalogStudents(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setCatalogError(
        e.response?.data?.message || 'Không tải được danh mục sinh viên của Khoa.'
      )
    } finally {
      setCatalogLoading(false)
    }
  }, [catalogStudents.length, catalogLoading])

  const existingCodesSet = useMemo(
    () => new Set((data?.sinhViens || []).map((row) => String(row.maSV || '').trim())),
    [data?.sinhViens]
  )

  const parsedCodes = useMemo(
    () => parseStudentCodeList(studentCodes),
    [studentCodes]
  )

  const selectedCodesSet = useMemo(() => new Set(parsedCodes), [parsedCodes])

  const newCodesCount = useMemo(
    () => parsedCodes.filter((code) => !existingCodesSet.has(code)).length,
    [parsedCodes, existingCodesSet]
  )

  const duplicateInRoundCount = parsedCodes.length - newCodesCount

  const toggleCatalogStudent = (maSV) => {
    const code = String(maSV || '').trim()
    if (!code) return
    const next = new Set(parsedCodes)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    setStudentCodes(Array.from(next).join('\n'))
  }

  const selectFilteredCatalog = (items, shouldSelect) => {
    const next = new Set(parsedCodes)
    for (const item of items) {
      const code = String(item.maSV || '').trim()
      if (!code || existingCodesSet.has(code)) continue
      if (shouldSelect) next.add(code)
      else next.delete(code)
    }
    setStudentCodes(Array.from(next).join('\n'))
  }

  const handleCsvFileSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result || '')
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
      const extracted = []
      for (const line of lines) {
        const firstCol = line.split(/[,;\t]/)[0]?.trim().replace(/^["']|["']$/g, '')
        if (firstCol && !/^(masv|mssv|ma_sv|stt|mã sv)$/i.test(firstCol)) {
          extracted.push(firstCol)
        }
      }
      const merged = [...new Set([...parsedCodes, ...extracted])]
      setStudentCodes(merged.join('\n'))
    }
    reader.readAsText(file, 'utf-8')
    event.target.value = ''
  }

  const add = async (event) => {
    event.preventDefault()
    if (!canEdit || loading || busy) return
    const codes = parseStudentCodeList(studentCodes)
    if (!codes.length) return
    const request = version.current
    setBusy('add')
    setError('')
    setMessage('')
    try {
      const response = await apiClient.post('/khoa/sinh-vien-theo-dot', {
        maDot: round,
        maSinhViens: codes,
      })
      if (currentRound.current !== round || request !== version.current) return
      setStudentCodes('')
      setMessage(
        `Đã thêm ${response.data.soLuongThem} SV vào danh sách Khoa của đợt. MSSV đã có không bị thêm trùng.`
      )
      await load()
    } catch (e) {
      if (currentRound.current === round && request === version.current)
        setError(e.response?.data?.message || 'Không thêm được SV vào đợt.')
    } finally {
      if (currentRound.current === round && version.current <= request + 1)
        setBusy('')
    }
  }

  const remove = async (row) => {
    if (!canEdit || loading || busy || !row.canGoKhoiDanhSach) return
    if (
      !window.confirm(
        `Gỡ ${row.hoTen} (${row.maSV}) khỏi danh sách đợt đang chọn? Chỉ gỡ khi chưa có nghiệp vụ trong đợt.`
      )
    )
      return
    const request = version.current
    setBusy(row.maSV)
    setError('')
    setMessage('')
    try {
      await apiClient.delete(
        `/khoa/sinh-vien-theo-dot/${encodeURIComponent(row.maSV)}`,
        { params: { maDot: round } }
      )
      if (currentRound.current !== round || request !== version.current) return
      setMessage(`Đã gỡ ${row.maSV} khỏi danh sách Khoa của đợt.`)
      await load()
    } catch (e) {
      if (currentRound.current === round && request === version.current)
        setError(
          e.response?.data?.message || 'Không gỡ được SV khỏi danh sách.'
        )
    } finally {
      if (currentRound.current === round && version.current <= request + 1)
        setBusy('')
    }
  }

  // Danh sách lớp có trong đợt hiện tại để lọc nhanh
  const availableClasses = useMemo(() => {
    const classes = new Set()
    for (const row of data?.sinhViens || []) {
      if (row.lop) classes.add(String(row.lop).trim())
    }
    return Array.from(classes).sort((a, b) => a.localeCompare(b, 'vi-VN'))
  }, [data?.sinhViens])

  // Dữ liệu lọc trong Danh mục Khoa (hỗ trợ chọn theo Lớp / Khóa / Chuyên ngành)
  const catalogClasses = useMemo(
    () =>
      [...new Set(catalogStudents.map((s) => s.lop).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b), 'vi-VN')
      ),
    [catalogStudents]
  )
  const catalogCohorts = useMemo(
    () =>
      [...new Set(catalogStudents.map((s) => s.khoaHoc).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b), 'vi-VN')
      ),
    [catalogStudents]
  )
  const catalogMajors = useMemo(
    () =>
      [...new Set(catalogStudents.map((s) => s.chuyenNganh).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b), 'vi-VN')
      ),
    [catalogStudents]
  )

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLocaleLowerCase('vi-VN')
    return catalogStudents.filter((s) => {
      if (hideExistingInCatalog && existingCodesSet.has(String(s.maSV || '').trim()))
        return false
      if (catalogClass && s.lop !== catalogClass) return false
      if (catalogCohort && String(s.khoaHoc || '') !== catalogCohort) return false
      if (catalogMajor && s.chuyenNganh !== catalogMajor) return false
      if (
        q &&
        ![s.maSV, s.hoTen, s.lop, s.chuyenNganh].some((val) =>
          String(val || '').toLocaleLowerCase('vi-VN').includes(q)
        )
      )
        return false
      return true
    })
  }, [
    catalogStudents,
    hideExistingInCatalog,
    existingCodesSet,
    catalogClass,
    catalogCohort,
    catalogMajor,
    catalogSearch,
  ])

  const catalogPagination = usePagination(
    filteredCatalog,
    JSON.stringify([
      catalogClass,
      catalogCohort,
      catalogMajor,
      catalogSearch,
      hideExistingInCatalog,
    ])
  )

  const query = search.trim().toLocaleLowerCase('vi-VN')
  const rows = (data?.sinhViens || []).filter(
    (row) =>
      (!onlySupport || row.canHoTro) &&
      (!group || row.trangThai === group) &&
      (!classFilter || row.lop === classFilter) &&
      (!sourceFilter ||
        (sourceFilter === 'khoa' ? row.daCoDanhSachKhoa : !row.daCoDanhSachKhoa)) &&
      (!query ||
        [row.maSV, row.hoTen, row.lop, row.tenCongTy].some((value) =>
          String(value || '').toLocaleLowerCase('vi-VN').includes(query)
        ))
  )
  const pagination = usePagination(
    rows,
    JSON.stringify([round, search, group, classFilter, sourceFilter, onlySupport])
  )

  const activeStatGroups = useMemo(
    () => (data?.thongKe || []).filter((x) => x.soLuong > 0 || x.ma === group),
    [data?.thongKe, group]
  )
  const visibleStatGroups = showZeroGroups ? data?.thongKe || [] : activeStatGroups

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header trang điều hành học vụ */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">Quản lý học vụ Khoa</span>
              <span>/</span>
              <span>{selectedDot?.tenDot || 'Chưa chọn đợt thực tập'}</span>
              {selectedDot?.namHoc && (
                <>
                  <span>·</span>
                  <span>Năm học {selectedDot.namHoc}</span>
                </>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Danh sách sinh viên & nơi thực tập theo đợt
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!round || loading}
              onClick={() => setShowPolicyModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cấu hình hạn điều chỉnh nơi thực tập
            </button>

            <button
              type="button"
              disabled={!round || loading || !!busy}
              onClick={load}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {loading ? 'Đang tải…' : 'Làm mới'}
            </button>
          </div>
        </div>

        {/* Thông báo lỗi & nút Thử lại ngay */}
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3"
          >
            <span className="text-xs font-medium">{error}</span>
            <button
              type="button"
              onClick={load}
              className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 shrink-0 cursor-pointer"
            >
              Thử lại ngay
            </button>
          </div>
        )}

        {/* Thông báo thành công */}
        {message && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between gap-2"
          >
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage('')}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Trạng thái đang tải */}
        {loading && !data && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-xs text-slate-500">
            <div role="status">Đang tải danh sách…</div>
          </div>
        )}

        {/* Thanh chỉ số học vụ của đợt */}
        {data && (
          <div className="bg-white rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-4">
              <p className="text-xs text-slate-500">Tổng sinh viên trong đợt</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {data.tongSinhVien ?? 0}
              </p>
              <span className="sr-only">Tham gia đợt: {data.tongSinhVien}</span>
            </div>

            <div className="p-4">
              <p className="text-xs text-slate-500">Cần hỗ trợ / xác minh</p>
              <p
                className={`text-2xl font-bold mt-1 font-mono ${
                  data.canHoTro > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}
              >
                {data.canHoTro ?? 0}
              </p>
              <span className="sr-only">Cần hỗ trợ/kiểm tra: {data.canHoTro}</span>
            </div>

            <div className="p-4">
              <p className="text-xs text-slate-500">Đã phân bổ chính thức</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
                {data.daPhanBoChinhThuc ?? 0}
              </p>
              <span className="sr-only">Phân bổ chính thức: {data.daPhanBoChinhThuc}</span>
            </div>

            <div className="p-4">
              <p className="text-xs text-slate-500">Thuộc danh sách Khoa</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {data.tuDanhSachKhoa ?? 0}
              </p>
              <span className="sr-only">Danh sách Khoa: {data.tuDanhSachKhoa}</span>
            </div>

            <div className="p-4">
              <p className="text-xs text-slate-500">Phát sinh từ hồ sơ đăng ký</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {data.tuNghiepVu ?? 0}
              </p>
              <span className="sr-only">Bổ sung từ nghiệp vụ: {data.tuNghiepVu}</span>
            </div>
          </div>
        )}

        {/* Thanh chuyển tab chức năng */}
        <div className="bg-white rounded-xl border border-slate-200 p-1.5 flex flex-wrap items-center gap-1.5 w-fit">
          {[
            ['sv-thoi-gian', 'Danh sách sinh viên'],
            ['ho-tro', 'Hỗ trợ bố trí'],
            ['ra-soat', 'Rà soát trước chốt'],
            ['cong-bo-chot', 'Công bố & Chốt danh sách'],
          ].map(([key, label]) => {
            const isCurrent = activeTab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Nội dung Tab 1: Danh sách SV & Thời gian thực tập */}
        {activeTab === 'sv-thoi-gian' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            {/* Hàng tiêu đề bảng & Nút mở công cụ Thêm SV */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                Danh sách sinh viên tham gia đợt ({rows.length}
                {data && rows.length !== data.tongSinhVien
                  ? ` / ${data.tongSinhVien}`
                  : ''}{' '}
                sinh viên)
              </h2>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={!canEdit || loading || !!busy}
                  onClick={() => setShowAdd(!showAdd)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  {showAdd ? 'Đóng khung thêm SV' : 'Thêm SV vào đợt'}
                </button>
              </div>
            </div>

            {/* Khung Thêm sinh viên vào đợt */}
            {showAdd && (
              <div className="rounded-xl border border-slate-300 bg-slate-50/70 p-4 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Bổ sung sinh viên vào đợt: {selectedDot?.tenDot}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
                      Nhập từ tệp CSV / TXT
                      <input
                        type="file"
                        accept=".csv,.txt,text/csv,text/plain"
                        onChange={handleCsvFileSelect}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        if (catalogOpen) setCatalogOpen(false)
                        else loadCatalog()
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        catalogOpen
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {catalogOpen
                        ? 'Ẩn danh mục Khoa'
                        : 'Chọn theo Lớp / Khóa từ danh mục Khoa'}
                    </button>
                  </div>
                </div>

                {/* Bộ chọn hàng loạt theo Lớp / Khóa / Chuyên ngành từ Danh mục Khoa */}
                {catalogOpen && (
                  <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Danh mục sinh viên toàn Khoa ({catalogStudents.length} hồ sơ)
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={!filteredCatalog.length}
                          onClick={() => selectFilteredCatalog(filteredCatalog, true)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 rounded-md cursor-pointer"
                        >
                          Chọn tất cả kết quả lọc ({filteredCatalog.length} SV)
                        </button>
                        <button
                          type="button"
                          disabled={!filteredCatalog.length}
                          onClick={() => selectFilteredCatalog(filteredCatalog, false)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-md cursor-pointer"
                        >
                          Bỏ chọn kết quả lọc
                        </button>
                      </div>
                    </div>

                    {catalogError && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                        {catalogError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                      <input
                        placeholder="Tìm MSSV hoặc họ tên..."
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                      />

                      <select
                        value={catalogClass}
                        onChange={(e) => setCatalogClass(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                      >
                        <option value="">Tất cả lớp ({catalogClasses.length})</option>
                        {catalogClasses.map((lop) => (
                          <option key={lop} value={lop}>
                            Lớp {lop}
                          </option>
                        ))}
                      </select>

                      <select
                        value={catalogCohort}
                        onChange={(e) => setCatalogCohort(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                      >
                        <option value="">Tất cả khóa học</option>
                        {catalogCohorts.map((k) => (
                          <option key={k} value={String(k)}>
                            Khóa {k}
                          </option>
                        ))}
                      </select>

                      <select
                        value={catalogMajor}
                        onChange={(e) => setCatalogMajor(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                      >
                        <option value="">Tất cả chuyên ngành</option>
                        {catalogMajors.map((cn) => (
                          <option key={cn} value={cn}>
                            {cn}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setHideExistingInCatalog((v) => !v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-left cursor-pointer ${
                          hideExistingInCatalog
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {hideExistingInCatalog
                          ? 'Đang ẩn SV đã có trong đợt'
                          : 'Đang hiện cả SV đã trong đợt'}
                      </button>
                    </div>

                    {catalogLoading ? (
                      <div className="py-4 text-center text-xs text-slate-500">
                        Đang tải danh mục sinh viên của Khoa…
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-64">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                              <tr>
                                <th className="p-2 w-24">Chọn</th>
                                <th className="p-2">MSSV</th>
                                <th className="p-2">Họ tên</th>
                                <th className="p-2">Lớp</th>
                                <th className="p-2">Chuyên ngành</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {catalogPagination.items.map((item) => {
                                const code = String(item.maSV || '').trim()
                                const inRound = existingCodesSet.has(code)
                                const isPicked = selectedCodesSet.has(code)
                                return (
                                  <tr
                                    key={code}
                                    className={
                                      isPicked
                                        ? 'bg-blue-50/60'
                                        : 'hover:bg-slate-50'
                                    }
                                  >
                                    <td className="p-2">
                                      {inRound ? (
                                        <span className="text-[11px] text-slate-400">
                                          Đã trong đợt
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => toggleCatalogStudent(code)}
                                          className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                                            isPicked
                                              ? 'bg-blue-700 text-white'
                                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                          }`}
                                        >
                                          {isPicked ? 'Đã chọn' : '+ Chọn'}
                                        </button>
                                      )}
                                    </td>
                                    <td className="p-2 font-mono font-semibold text-slate-900">
                                      {item.maSV}
                                    </td>
                                    <td className="p-2 font-medium text-slate-800">
                                      {item.hoTen}
                                    </td>
                                    <td className="p-2 font-mono text-slate-600">
                                      {item.lop || '—'}
                                    </td>
                                    <td className="p-2 text-slate-600">
                                      {item.chuyenNganh || '—'}
                                    </td>
                                  </tr>
                                )
                              })}
                              {!filteredCatalog.length && (
                                <tr>
                                  <td
                                    colSpan={5}
                                    className="p-4 text-center text-slate-500"
                                  >
                                    Không có sinh viên phù hợp với điều kiện lọc.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <Pagination
                          pagination={catalogPagination}
                          label="danh mục sinh viên"
                        />
                      </>
                    )}
                  </div>
                )}

                {/* Form lưu danh sách MSSV vào đợt */}
                <form onSubmit={add} className="space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <label className="text-xs font-bold text-slate-800">
                        Danh sách MSSV sẽ thêm vào đợt
                      </label>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-slate-600">
                          Đã nhận diện:{' '}
                          <strong className="font-mono text-slate-900">
                            {parsedCodes.length}
                          </strong>{' '}
                          mã
                        </span>
                        <span className="text-emerald-700">
                          Thêm mới:{' '}
                          <strong className="font-mono">{newCodesCount}</strong>
                        </span>
                        {duplicateInRoundCount > 0 && (
                          <span className="text-amber-700">
                            Đã có trong đợt:{' '}
                            <strong className="font-mono">
                              {duplicateInRoundCount}
                            </strong>
                          </span>
                        )}
                        {parsedCodes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setStudentCodes('')}
                            className="text-rose-600 hover:underline font-medium cursor-pointer"
                          >
                            Xóa danh sách
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      aria-label="MSSV tham gia đợt"
                      rows={4}
                      disabled={!!busy}
                      value={studentCodes}
                      onChange={(e) => setStudentCodes(e.target.value)}
                      placeholder="Dán trực tiếp cột MSSV từ Excel (mỗi dòng 1 mã) hoặc ngăn cách bằng dấu phẩy, chấm phẩy..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 outline-hidden focus:border-blue-600 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAdd(false)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg cursor-pointer"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={
                        !canEdit || loading || !!busy || !studentCodes.trim()
                      }
                      className="px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      {busy === 'add'
                        ? 'Đang thêm…'
                        : `Lưu danh sách tham gia${
                            parsedCodes.length ? ` (${parsedCodes.length} SV)` : ''
                          }`}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Thanh lọc trạng thái nhanh (Chỉ hiện khi đợt có dữ liệu hoặc người dùng mở rộng) */}
            {data && (data.tongSinhVien > 0 || showZeroGroups) && (
              <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setOnlySupport(false)
                    setGroup('')
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    !group && !onlySupport
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ({data.tongSinhVien || 0})
                </button>

                {visibleStatGroups.map((x) => {
                  const isSelected = group === x.ma
                  return (
                    <button
                      key={x.ma}
                      type="button"
                      onClick={() => {
                        setOnlySupport(false)
                        setGroup(isSelected ? '' : x.ma)
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {x.ten} ({x.soLuong})
                    </button>
                  )
                })}

                {(data.thongKe || []).length > activeStatGroups.length && (
                  <button
                    type="button"
                    onClick={() => setShowZeroGroups((v) => !v)}
                    className="px-2 py-1 text-[11px] font-medium text-blue-700 hover:underline cursor-pointer"
                  >
                    {showZeroGroups
                      ? 'Thu gọn nhóm trống'
                      : `+ Xem thêm ${
                          (data.thongKe || []).length - activeStatGroups.length
                        } nhóm trống (0)`}
                  </button>
                )}
              </div>
            )}

            {/* Thanh công cụ tìm kiếm & lọc đa chiều (Lớp, Nguồn, Trạng thái, Cần hỗ trợ) */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px] flex-1">
                <input
                  aria-label="Tìm SV theo đợt"
                  placeholder="Tìm theo MSSV, họ tên, lớp hoặc tên đơn vị tiếp nhận..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-hidden focus:bg-white focus:border-blue-600"
                />
              </div>

              {availableClasses.length > 0 && (
                <select
                  aria-label="Lọc theo lớp"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-hidden"
                >
                  <option value="">Tất cả lớp ({availableClasses.length})</option>
                  {availableClasses.map((lop) => (
                    <option key={lop} value={lop}>
                      Lớp {lop}
                    </option>
                  ))}
                </select>
              )}

              <select
                aria-label="Nguồn danh sách"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-hidden"
              >
                <option value="">Tất cả nguồn</option>
                <option value="khoa">Danh sách Khoa ({data?.tuDanhSachKhoa ?? 0})</option>
                <option value="nghiep-vu">
                  Phát sinh hồ sơ ({data?.tuNghiepVu ?? 0})
                </option>
              </select>

              <select
                aria-label="Trạng thái nơi thực tập"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-hidden max-w-[260px]"
              >
                <option value="">Tất cả trạng thái</option>
                {(data?.thongKe || []).map((item) => (
                  <option key={item.ma} value={item.ma}>
                    {item.ten} ({item.soLuong})
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none px-2 py-1.5 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={onlySupport}
                  onChange={(e) => setOnlySupport(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-700 focus:ring-blue-600 cursor-pointer"
                />
                <span>Chỉ SV cần hỗ trợ/kiểm tra</span>
              </label>
            </div>

            {/* Bảng danh sách sinh viên */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-24">MSSV</th>
                    <th className="p-3">Họ và tên</th>
                    <th className="p-3 w-24">Lớp</th>
                    <th className="p-3 w-28">Nguồn</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Đơn vị tiếp nhận</th>
                    <th className="p-3">Chi tiết học vụ</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagination.items.map((row) => (
                    <tr key={row.maSV} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-semibold text-slate-900">
                        {row.maSV}
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        {row.hoTen}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {row.lop || '—'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                            row.daCoDanhSachKhoa
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.daCoDanhSachKhoa ? 'Danh sách Khoa' : 'Hồ sơ đăng ký'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-slate-800">
                          {row.tenTrangThai}
                        </span>
                        {row.canHoTro && (
                          <span className="block mt-0.5 text-[11px] font-semibold text-amber-700">
                            Cần xử lý / xác minh
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            row.tenCongTy
                              ? 'font-medium text-slate-800'
                              : 'text-slate-400'
                          }
                        >
                          {row.tenCongTy || 'Chưa có đơn vị'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs">
                        <div>{formatAcademicNote(row)}</div>
                        {(row.soNguyenVongDangXet > 0 ||
                          row.soPhanBoDaHuy > 0) && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {row.soNguyenVongDangXet > 0 &&
                              `Đang xét ${row.soNguyenVongDangXet} NV`}
                            {row.soNguyenVongDangXet > 0 &&
                              row.soPhanBoDaHuy > 0 &&
                              ' · '}
                            {row.soPhanBoDaHuy > 0 &&
                              `Đã hủy ${row.soPhanBoDaHuy} phân bổ`}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {['ChuaDangKy', 'ChuaCoNoiTiepNhan'].includes(
                            row.trangThai
                          ) && (
                            <button
                              type="button"
                              disabled={!canEdit || loading || !!busy}
                              onClick={() => setInitialStudent(row)}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                            >
                              Bố trí ban đầu
                            </button>
                          )}
                          {row.maPhanBo &&
                            row.coPhanBoChinhThuc &&
                            canEditCustomPeriod && (
                              <button
                                type="button"
                                disabled={loading || !!busy}
                                onClick={() =>
                                  setPeriodStudent({ round, student: row })
                                }
                                className="px-2.5 py-1 text-xs font-medium rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                                title="Điều chỉnh ngày thực tập riêng trước khi bắt đầu đợt"
                              >
                                Chỉnh ngày riêng
                              </button>
                            )}
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(row)}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Nơi thực tập / xử lý
                          </button>
                          {(() => {
                            const ctxLink = getStudentContextLink(row)
                            return (
                              <Link
                                to={ctxLink.to}
                                className="px-2 py-1 text-xs font-medium text-blue-700 hover:underline"
                              >
                                {ctxLink.label}
                              </Link>
                            )
                          })()}
                          {row.daCoDanhSachKhoa && (
                            <button
                              type="button"
                              disabled={
                                !canEdit ||
                                loading ||
                                !!busy ||
                                !row.canGoKhoiDanhSach
                              }
                              title={
                                row.canGoKhoiDanhSach
                                  ? 'Gỡ SV thêm nhầm khi chưa có nghiệp vụ'
                                  : 'Đã có nghiệp vụ trong đợt, không được gỡ khỏi theo dõi'
                              }
                              onClick={() => remove(row)}
                              className="px-2.5 py-1 text-xs font-medium rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40 cursor-pointer"
                            >
                              Gỡ khỏi danh sách
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-8 text-center text-slate-500"
                      >
                        {loading
                          ? 'Đang tải danh sách…'
                          : data?.tongSinhVien === 0
                          ? 'Đợt thực tập này chưa có sinh viên tham gia. Bấm "Thêm SV vào đợt" để chọn theo Lớp/Khóa từ danh mục Khoa, tải tệp CSV hoặc dán danh sách MSSV.'
                          : 'Không có sinh viên phù hợp với điều kiện lọc hiện tại.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Thanh phân trang ở đáy bảng */}
            <Pagination pagination={pagination} label="SV tham gia đợt" />
          </div>
        )}

        {/* Nội dung Tab 2: Hỗ trợ bố trí */}
        {activeTab === 'ho-tro' && round && (
          <LanHoTroPanel
            key={`${round}/${publicationVersion}`}
            maDot={round}
            onNavigateTab={setActiveTab}
            onChanged={async () => {
              setPublicationVersion((v) => v + 1)
              await load()
            }}
          />
        )}

        {/* Nội dung Tab 3: Rà soát nơi thực tập */}
        {activeTab === 'ra-soat' && round && (
          <RaSoatNoiPanel
            key={`ra-soat/${round}/${publicationVersion}`}
            maDot={round}
            onNavigateTab={setActiveTab}
            onChanged={async () => {
              setPublicationVersion((v) => v + 1)
              await load()
            }}
          />
        )}

        {/* Nội dung Tab 4: Công bố dự kiến & Chốt danh sách */}
        {activeTab === 'cong-bo-chot' && round && (
          <DanhSachDuKienPanel
            key={`cong-bo/${round}/${publicationVersion}`}
            maDot={round}
            faculty
            onNavigateTab={setActiveTab}
            onChanged={async () => {
              setPublicationVersion((v) => v + 1)
              setInitialStudent(null)
              setSelectedStudent(null)
              await load()
            }}
          />
        )}

        {/* Các Modal thao tác */}
        {periodStudent && periodStudent.round === round && (
          <PlacementPeriodEditor
            key={`${round}/${periodStudent.student.maPhanBo}`}
            maDot={round}
            student={periodStudent.student}
            onClose={() => setPeriodStudent(null)}
            onChanged={load}
          />
        )}

        {(selectedStudent || showPolicyModal) && round && (
          <DieuChinhNoiThucTapPanel
            maDot={round}
            student={selectedStudent}
            onClose={() => {
              setSelectedStudent(null)
              setShowPolicyModal(false)
            }}
            onChanged={load}
          />
        )}

        {initialStudent && round && (
          <BoTriBanDauPanel
            maDot={round}
            student={initialStudent}
            onClose={() => setInitialStudent(null)}
            onChanged={async () => {
              await load()
              setMessage(
                'Đã bố trí nơi thực tập ban đầu; SV đã sẵn sàng để Khoa phân công GVHD.'
              )
            }}
          />
        )}
      </div>
    </Layout>
  )
}
