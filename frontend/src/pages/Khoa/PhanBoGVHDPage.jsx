import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'
import { Link } from 'react-router-dom'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import { tachHoTen, xuatBangHuitExcel } from '../../utils/exportHuitExcel'

export default function PhanBoGVHDPage() {
  const [data, setData] = useState({ students: [], lecturers: [], assigned: 0, unassigned: 0 })
  const { selectedDot, loading: roundLoading, roundLock } = useDotThucTap()
  const round = selectedDot?.maDot || ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all') // 'all' | 'assigned' | 'unassigned'
  const [choices, setChoices] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [loadedRound, setLoadedRound] = useState(null)
  const roundRef = useRef(round)
  const requestVersion = useRef(0)
  roundRef.current = round
  const canEditRound = !roundLoading && !roundLock.structureBlocked && ['ChuaBatDau', 'DangDienRa'].includes(selectedDot?.trangThai)

  const load = useCallback(async () => {
    if (!round) return
    const version = ++requestVersion.current
    setLoading(true)
    try {
      const response = await apiClient.get('/khoa/phan-cong', { params: { maDot: round } })
      if (roundRef.current !== round || requestVersion.current !== version) return
      setData(response.data)
      setLoadedRound(round)
      setError('')
    } catch (err) {
      if (roundRef.current === round && requestVersion.current === version) {
        setError(err.response?.data?.message || 'Không tải được danh sách phân công.')
      }
    } finally {
      if (roundRef.current === round && requestVersion.current === version) setLoading(false)
    }
  }, [round])

  useEffect(() => {
    const versionRef = requestVersion
    setChoices({})
    setSuccess('')
    setData({ students: [], lecturers: [], assigned: 0, unassigned: 0 })
    load()
    return () => { versionRef.current++ }
  }, [load])

  const assign = async (student) => {
    if (loading || !canEditRound || student.maDot !== round) {
      setError('Đợt thực tập hiện tại không cho phép chỉnh sửa phân công.')
      return
    }
    const lecturer = choices[student.maSV] ?? student.maGiangVien
    if (!lecturer) {
      setError('Vui lòng chọn giảng viên hướng dẫn trước khi lưu.')
      return
    }
    setSaving(student.maSV)
    setSuccess('')
    setError('')
    try {
      await apiClient.put(`/khoa/phan-cong/${encodeURIComponent(student.maSV)}`, {
        maGiangVien: lecturer,
        maDot: round,
      })
      if (roundRef.current !== round) return
      await load()
      setChoices((current) => {
        const next = { ...current }
        delete next[student.maSV]
        return next
      })
      setSuccess(`Đã lưu phân công GVHD cho sinh viên ${student.hoTen}.`)
    } catch (e) {
      if (roundRef.current === round) {
        setError(e.response?.data?.message || 'Không thể cập nhật giảng viên hướng dẫn.')
      }
    } finally {
      setSaving('')
    }
  }

  const exportDecision = async () => {
    if (!round || loading || loadedRound !== round || exporting) return
    const exportStudents = rows.filter((x) => x.maGiangVien)
    if (!exportStudents.length) {
      alert('Không có sinh viên đã phân công GVHD để xuất danh sách!')
      return
    }

    try {
      setExporting(true)
      const activeRoundObj = selectedDot
      const maDotSafe = round || 'TatCa'
      const ngayXuat = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const fileName = `DanhSach_GVHD_${maDotSafe}_${ngayXuat}.xlsx`

      const columns = [
        { header: 'STT', key: 'stt', width: 6, align: 'center' },
        { header: 'Mã SV', key: 'maSV', width: 14, align: 'center' },
        { header: 'Họ và tên', key: 'hoTen', width: 24, align: 'left' },
        { header: 'Lớp', key: 'lop', width: 12, align: 'center' },
        { header: 'Đơn vị thực tập tiếp nhận', key: 'congTy', width: 32, align: 'left' },
        { header: 'Mã GVHD', key: 'maGiangVien', width: 14, align: 'center' },
        { header: 'Cán bộ hướng dẫn (GVHD)', key: 'giangVien', width: 24, align: 'left' },
      ]

      const excelRows = exportStudents.map((x, idx) => {
        const { hoTen } = tachHoTen(x.hoTen)
        return {
          stt: idx + 1,
          maSV: x.maSV,
          hoTen: hoTen || x.hoTen,
          lop: x.lop || '-',
          congTy: x.congTy || 'Chưa phân bổ',
          maGiangVien: x.maGiangVien,
          giangVien: x.giangVien || 'Chưa phân công',
        }
      })

      await xuatBangHuitExcel({
        fileName,
        sheetName: 'PhanBoGVHD',
        reportType: 'internal',
        title: 'DANH SÁCH SINH VIÊN VÀ GIẢNG VIÊN HƯỚNG DẪN',
        subTitle: activeRoundObj
          ? `Đợt thực tập: ${activeRoundObj.tenDot} — Năm học: ${activeRoundObj.namHoc}`
          : 'Danh sách tổng hợp sinh viên đã phân công GVHD',
        columns,
        rows: excelRows,
      })
      setSuccess(`Đã xuất file Excel danh sách nội bộ (${exportStudents.length} SV) thành công!`)
    } catch (e) {
      setError('Lỗi khi xuất file Excel: ' + (e.message || ''))
    } finally {
      setExporting(false)
    }
  }

  const rows = useMemo(() => {
    return (data.students || []).filter((x) => {
      const matchSearch =
        !search ||
        `${x.maSV} ${x.hoTen} ${x.lop || ''} ${x.congTy || ''} ${x.giangVien || ''}`
          .toLowerCase()
          .includes(search.toLowerCase().trim())
      const matchStatus =
        status === 'all'
          ? true
          : status === 'unassigned'
          ? !x.maGiangVien
          : !!x.maGiangVien
      return matchSearch && matchStatus
    })
  }, [data.students, search, status])

  const pagination = usePagination(rows, JSON.stringify([round, search, status]))

  const totalStudents = data.students?.length || 0
  const assignedCount = data.assigned || 0
  const unassignedCount = data.unassigned || 0
  const percentAssigned = totalStudents > 0 ? Math.round((assignedCount / totalStudents) * 100) : 0

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Trang */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">manage_accounts</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 m-0">
                Danh sách & Điều chỉnh GVHD
              </h1>
              <p className="text-xs text-slate-500 mt-1 m-0">
                Theo dõi danh sách sinh viên thực tập trong đợt và điều chỉnh cán bộ hướng dẫn theo nhu cầu thực tế.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loading || exporting || !data.students?.length}
              onClick={exportDecision}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>{exporting ? 'Đang xuất…' : 'Xuất danh sách nội bộ (.xlsx)'}</span>
            </button>
            <Link
              to="/khoa/phan-cong"
              className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">assignment_ind</span>
              <span>Vào bàn phân công GVHD</span>
            </Link>
            <button
              type="button"
              disabled={loading}
              onClick={load}
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Tải lại dữ liệu"
            >
              <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Thông báo Thành công / Thất bại */}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
              <span className="font-semibold">{success}</span>
            </div>
            <button onClick={() => setSuccess('')} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600 text-base">error</span>
              <span className="font-semibold">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-800 cursor-pointer">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* Thẻ KPI Thống kê Tiến độ Phân công */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                SV có nơi thực tập
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">groups</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {totalStudents}
              </span>
              <span className="text-sm font-semibold text-slate-400">sinh viên</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Phân bổ nơi thực tập còn hiệu lực trong đợt
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Đã có GVHD
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">how_to_reg</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-emerald-700 tracking-tight">
                {assignedCount}
              </span>
              <span className="text-sm font-semibold text-emerald-600">({percentAssigned}%)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Đã được gán cán bộ hướng dẫn chính thức
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Chưa có GVHD
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">pending_actions</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-amber-700 tracking-tight">
                {unassignedCount}
              </span>
              <span className="text-sm font-semibold text-slate-400">sinh viên</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {unassignedCount > 0 ? 'Cần hoàn tất phân công GVHD' : 'Toàn bộ sinh viên đã có GVHD'}
            </p>
          </div>
        </div>

        {/* Khối Bảng Danh Sách Sinh Viên & Điều Chỉnh GVHD */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header Bảng & Bộ lọc */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 m-0">
                <span className="material-symbols-outlined text-indigo-600 text-lg">
                  assignment_turned_in
                </span>
                <span>Danh bạ Sinh viên & Cán bộ hướng dẫn</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 m-0">
                Đợt: <strong className="text-slate-800">{selectedDot?.tenDot || 'Chưa chọn đợt'}</strong>
                {selectedDot?.namHoc ? ` · ${selectedDot.namHoc}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Bộ lọc trạng thái */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStatus('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    status === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({totalStudents})
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('assigned')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    status === 'assigned'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đã có GV ({assignedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('unassigned')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    status === 'unassigned'
                      ? 'bg-white text-amber-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chưa có GV ({unassignedCount})
                </button>
              </div>

              {/* Ô tìm kiếm */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm MSSV, họ tên, công ty..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 w-56 text-slate-900 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Bảng dữ liệu */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">STT</th>
                  <th className="py-3 px-3 w-24 font-mono text-center">Mã SV</th>
                  <th className="py-3 px-4 w-52">Sinh viên & Lớp</th>
                  <th className="py-3 px-4 w-40">Chuyên ngành</th>
                  <th className="py-3 px-4">Đơn vị thực tập tiếp nhận</th>
                  <th className="py-3 px-4 w-64">Cán bộ hướng dẫn (GVHD)</th>
                  <th className="py-3 px-3 w-28 text-center">Tải GV</th>
                  <th className="py-3 px-4 w-36 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center text-slate-400">
                      <span className="material-symbols-outlined animate-spin text-2xl text-indigo-600">
                        sync
                      </span>
                      <div className="text-xs mt-1">Đang tải danh sách phân công...</div>
                    </td>
                  </tr>
                ) : pagination.items.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center text-slate-400">
                      <span className="material-symbols-outlined text-3xl text-slate-300">
                        person_off
                      </span>
                      <div className="text-xs font-medium mt-1">
                        Không tìm thấy sinh viên nào phù hợp.
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagination.items.map((s, idx) => {
                    const currentChosenGV = choices[s.maSV] ?? s.maGiangVien ?? ''
                    const isChanged = choices[s.maSV] && choices[s.maSV] !== s.maGiangVien
                    const lecturerObj = data.lecturers.find((x) => x.maGV === currentChosenGV)

                    return (
                      <tr key={s.maSV} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {pagination.start + idx}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                          {s.maSV}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{s.hoTen}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {s.lop || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {s.chuyenNganh || 'Công nghệ thông tin'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="material-symbols-outlined text-slate-400 text-sm">
                              apartment
                            </span>
                            <span className="font-medium">
                              {s.congTy || 'Chưa được duyệt nơi thực tập'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            disabled={!!saving || loading || !canEditRound}
                            value={currentChosenGV}
                            onChange={(e) =>
                              setChoices({ ...choices, [s.maSV]: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs disabled:bg-slate-100"
                          >
                            <option value="">— Chọn giảng viên hướng dẫn —</option>
                            {data.lecturers.map((g) => (
                              <option
                                key={g.maGV}
                                value={g.maGV}
                                disabled={g.assignedCount >= g.chiTieu && g.maGV !== s.maGiangVien}
                              >
                                {g.hoTen} ({g.assignedCount}/{g.chiTieu})
                              </option>
                            ))}
                          </select>
                          {isChanged ? (
                            <div className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">arrow_forward</span>
                              <span>Đang chọn: {lecturerObj?.hoTen}</span>
                            </div>
                          ) : s.giangVien ? (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Hiện tại: {s.giangVien}
                            </div>
                          ) : (
                            <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                              Chưa phân công GVHD
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {lecturerObj ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                                lecturerObj.assignedCount >= lecturerObj.chiTieu
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {lecturerObj.assignedCount} / {lecturerObj.chiTieu}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            disabled={!isChanged || !!saving || loading || !canEditRound}
                            onClick={() => assign(s)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                              isChanged
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            }`}
                          >
                            {saving === s.maSV
                              ? 'Đang lưu…'
                              : s.maGiangVien
                              ? 'Lưu đổi GVHD'
                              : 'Lưu phân công'}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="p-4 border-t border-slate-100">
            <Pagination pagination={pagination} label="sinh viên" />
          </div>
        </div>
      </div>
    </Layout>
  )
}
