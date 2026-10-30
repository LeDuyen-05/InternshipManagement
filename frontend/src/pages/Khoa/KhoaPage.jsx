import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../../services/api'
import Layout from '../../components/Layout'
import { xuatMultiSheetHuitExcel } from '../../utils/exportHuitExcel'
import { loadOverviewWorkbook } from '../../utils/overviewExcel'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import { useRoundLock } from '../../hooks/useRoundLock'
import KhoaOverviewPanel from '../../components/khoa/KhoaOverviewPanel'

const tabs = [
  ['overview', 'Tổng quan'],
  ['dot', 'Đợt thực tập'],
  ['sv', 'Sinh viên'],
  ['gv', 'Giảng viên'],
  ['ct', 'Công ty & xét duyệt'],
]

const formatDateVN = (val) => {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val).slice(0, 10)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function KhoaPage({ initialTab = 'overview' }) {
  const { selectedDot } = useDotThucTap()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [noticeError, setNoticeError] = useState('')
  const [noticeLoading, setNoticeLoading] = useState(false)
  const requestVersion = useRef(0)
  const exportRound = useRef(selectedDot?.maDot)
  exportRound.current = selectedDot?.maDot
  const [tab, setTab] = useState(initialTab)
  const [data, setData] = useState({ sv: [], gv: [], ct: [], dot: [] })
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const [editItem, setEditItem] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [showNotice, setShowNotice] = useState(false)
  const [notice, setNotice] = useState({ tieuDe: '', noiDung: '' })
  const [sending, setSending] = useState(false)

  const overviewRound = tab === 'overview' ? selectedDot?.maDot : null

  const load = useCallback(async () => {
    const version = ++requestVersion.current
    setLoading(true)
    setError('')
    setNoticeError('')
    try {
      if (tab === 'overview') {
        setNoticeLoading(true)
        apiClient
          .get('/thong-bao', { timeout: 10000 })
          .then((response) => {
            if (version === requestVersion.current) setNotifications(response.data || [])
          })
          .catch(() => {
            if (version === requestVersion.current)
              setNoticeError('Không tải được thông báo. Bấm Làm mới để thử lại.')
          })
          .finally(() => {
            if (version === requestVersion.current) setNoticeLoading(false)
          })

        const summary = await apiClient.get('/khoa/tong-quan', {
          params: { maDot: overviewRound },
          timeout: 15000,
        })
        if (version !== requestVersion.current) return
        if (
          typeof summary.data?.allocatedStudents !== 'number' ||
          typeof summary.data?.approvedCompanies !== 'number'
        ) {
          throw new Error('API tổng quan đang dùng phiên bản cũ. Hãy khởi động lại backend để cập nhật.')
        }
        setOverview(summary.data)
      } else {
        const endpoint = {
          sv: '/khoa/sinh-vien',
          gv: '/khoa/giang-vien',
          ct: '/khoa/cong-ty',
          dot: '/khoa/dot-thuc-tap',
        }[tab]
        const response = await apiClient.get(endpoint)
        if (version !== requestVersion.current) return
        setData((current) => ({ ...current, [tab]: response.data || [] }))
      }
    } catch (e) {
      if (version === requestVersion.current) {
        if (tab === 'overview') setOverview(null)
        setError(e.response?.data?.message || e.message || 'Không tải được dữ liệu.')
      }
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [tab, overviewRound])

  useEffect(() => {
    setTab(initialTab)
    setEditItem(null)
  }, [initialTab])

  useEffect(() => {
    const versionRef = requestVersion
    setOverview(null)
    load()
    return () => {
      versionRef.current++
    }
  }, [load])

  const approve = async (id, status) => {
    try {
      await apiClient.put(`/khoa/cong-ty/${id}/duyet`, { TrangThai: status })
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể cập nhật công ty')
    }
  }

  const updateRound = async (item, nextStatus) => {
    if (!nextStatus || nextStatus === item.trangThai) return
    try {
      await apiClient.put(`/khoa/dot-thuc-tap/${encodeURIComponent(item.maSo)}`, {
        tenDot: item.tenDot,
        namHoc: item.namHoc,
        thoiGianBD: item.thoiGianBD,
        thoiGianKT: item.thoiGianKT,
        trangThai: nextStatus,
      })
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Không cập nhật được đợt thực tập')
    }
  }

  const exportExcel = async () => {
    if (
      !overview ||
      loading ||
      exporting ||
      !selectedDot?.maDot ||
      overview.activeRound?.maSo !== selectedDot.maDot
    )
      return
    setExporting(true)
    try {
      const round = { ...selectedDot }
      const workbook = await loadOverviewWorkbook(apiClient, round)
      if (exportRound.current !== round.maDot) return
      await xuatMultiSheetHuitExcel(workbook)
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Không xuất được báo cáo.')
    } finally {
      setExporting(false)}
  }

  const sendNotice = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      await apiClient.post('/thong-bao', notice)
      setNotice({ tieuDe: '', noiDung: '' })
      setShowNotice(false)
      setNotifications((await apiClient.get('/thong-bao')).data || [])
    } catch (e) {
      setError(e.response?.data?.message || 'Không gửi được thông báo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Bento Top Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
              <span className="material-symbols-outlined text-[13px]">dashboard</span>
              HỆ THỐNG GIÁM SÁT HỌC VỤ THỰC TẬP
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {tab === 'overview'
                ? 'Tổng quan điều hành thực tập tốt nghiệp'
                : tab === 'dot'
                ? 'Cấu hình đợt thực tập'
                : tabs.find((x) => x[0] === tab)?.[1]}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {tab === 'dot'
                ? 'Quản lý danh mục các đợt thực tập tốt nghiệp, niên khóa và khung thời gian thực tập của Khoa.'
                : overview?.activeRound
                ? [overview.activeRound.tenDot, overview.activeRound.namHoc].filter(Boolean).join(' · ')
                : selectedDot?.tenDot || 'Theo dõi sinh viên, doanh nghiệp và đợt thực tập.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {tab === 'overview' && (
              <>
                <button
                  type="button"
                  disabled={loading || exporting || !overview}
                  onClick={exportExcel}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  {exporting ? 'Đang xuất…' : 'Xuất tổng hợp & danh sách (.xlsx)'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotice(true)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  Gửi thông báo toàn khoa
                </button>
              </>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={load}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              {loading ? 'Đang tải…' : 'Làm mới'}
            </button>
          </div>
        </div>

        {/* Thông báo lỗi & nút Thử lại ngay */}
        {error && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-rose-600 text-xl shrink-0">error</span>
              <span className="text-xs font-medium">{error}</span>
            </div>
            <button
              type="button"
              onClick={load}
              className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 shrink-0 shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Thử lại ngay</span>
            </button>
          </div>
        )}

        {/* Skeleton Loading Bento Grid */}
        {loading && (
          <div className="space-y-6">
            <div role="status" aria-live="polite" className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
              <span className="material-symbols-outlined text-indigo-600 text-xl animate-spin shrink-0">sync</span>
              <p className="text-xs text-slate-600 font-medium">
                Đang tải dữ liệu {tab === 'overview' ? 'tổng quan' : 'danh mục'}…
              </p>
            </div>

            {tab === 'overview' && (
              <div className="space-y-4 animate-pulse">
                {/* Skeleton KPI row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-28 bg-slate-100 rounded-2xl border border-slate-200/60 p-4 flex flex-col justify-between">
                      <div className="flex justify-between items-center">
                        <div className="h-3 w-24 bg-slate-200 rounded" />
                        <div className="w-8 h-8 rounded-xl bg-slate-200" />
                      </div>
                      <div className="h-7 w-16 bg-slate-200 rounded" />
                      <div className="h-2.5 w-32 bg-slate-200 rounded" />
                    </div>
                  ))}
                </div>

                {/* Skeleton Progress bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-32 bg-slate-100 rounded-2xl border border-slate-200/60 p-5 space-y-3">
                    <div className="h-4 w-40 bg-slate-200 rounded" />
                    <div className="h-3 w-full bg-slate-200 rounded-full" />
                    <div className="h-3 w-32 bg-slate-200 rounded" />
                  </div>
                  <div className="h-32 bg-slate-100 rounded-2xl border border-slate-200/60 p-5 space-y-3">
                    <div className="h-4 w-40 bg-slate-200 rounded" />
                    <div className="h-3 w-full bg-slate-200 rounded-full" />
                    <div className="h-3 w-32 bg-slate-200 rounded" />
                  </div>
                </div>

                {/* Skeleton Actions */}
                <div className="h-48 bg-slate-100 rounded-2xl border border-slate-200/60 p-5" />
              </div>
            )}
          </div>
        )}

        {/* Trạng thái chưa tải được số liệu tổng quan */}
        {tab === 'overview' && !loading && !overview && (
          <section className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">sync_problem</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">Chưa tải được số liệu tổng quan</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Kiểm tra thông báo lỗi phía trên và bấm Làm mới để thử lại.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={load}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Thử lại ngay</span>
              </button>
            </div>
          </section>
        )}

        {/* Modal Popup Gửi thông báo toàn khoa */}
        {showNotice && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">campaign</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Thông báo đến toàn bộ người dùng</h2>
                    <p className="text-xs text-slate-400">Gửi thông báo đến sinh viên, giảng viên và doanh nghiệp</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotice(false)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={sendNotice} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tiêu đề thông báo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    maxLength="200"
                    placeholder="Tiêu đề thông báo..."
                    value={notice.tieuDe}
                    onChange={(e) => setNotice({ ...notice, tieuDe: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nội dung thông báo <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    placeholder="Nội dung thông báo chi tiết..."
                    rows="4"
                    value={notice.noiDung}
                    onChange={(e) => setNotice({ ...notice, noiDung: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden transition-all resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowNotice(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {sending && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                    <span>{sending ? 'Đang gửi…' : 'Gửi thông báo'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Nội dung Tab Tổng quan */}
        {tab === 'overview' && overview && !loading && (
          <KhoaOverviewPanel
            overview={overview}
            notifications={notifications}
            noticeError={noticeError}
            noticeLoading={noticeLoading}
          />
        )}

        {/* Nội dung các Tab danh mục khác (SV, GV, Công ty, Đợt) */}
        {tab !== 'overview' && (
          <div className="space-y-6">
            {initialTab !== 'dot' && (
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl w-fit">
                {tabs
                  .slice(1)
                  .filter((x) => x[0] !== 'ct' || tab === 'ct')
                  .map((x) => (
                    <button
                      key={x[0]}
                      type="button"
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        tab === x[0]
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      onClick={() => {
                        setTab(x[0])
                        setEditItem(null)
                      }}
                    >
                      {x[1]}
                    </button>
                  ))}
              </div>
            )}

            <CreateForm tab={tab} reload={load} editItem={editItem} onCancel={() => setEditItem(null)} />

            {['sv', 'gv', 'ct'].includes(tab) && <CatalogImportPanel kind={tab} onImported={load} />}

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              {tab === 'sv' && (
                <EditableTable
                  title="Sinh viên"
                  headers={['Mã SV', 'Họ tên', 'Lớp', 'Chuyên ngành', 'GPA']}
                  rows={data.sv.map((x) => [x.maSV, x.hoTen, x.lop, x.chuyenNganh, x.gpa])}
                  items={data.sv}
                  onEdit={setEditItem}
                />
              )}
              {tab === 'gv' && (
                <EditableTable
                  title="Giảng viên"
                  headers={['Mã GV', 'Họ tên', 'Chuyên môn', 'Đang hướng dẫn', 'Chỉ tiêu']}
                  rows={data.gv.map((x) => [
                    x.maGV,
                    x.hoTen,
                    x.chuyenMon,
                    x.soLuongHienTai ?? x.soLuongSVHD ?? 0,
                    x.chiTieuHD ?? x.chiTieu ?? 10,
                  ])}
                  items={data.gv}
                  onEdit={setEditItem}
                />
              )}
              {tab === 'ct' && <CompanyTable rows={data.ct} approve={approve} onEdit={setEditItem} />}
              {tab === 'dot' && <RoundTable rows={data.dot} onStatus={updateRound} onEdit={setEditItem} />}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

function CatalogImportPanel({ kind, onImported }) {
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState([])
  const label = { sv: 'sinh viên', gv: 'giảng viên', ct: 'công ty' }[kind]
  const route = { sv: 'sv', gv: 'gv', ct: 'cong-ty' }[kind]

  const download = async () => {
    try {
      const response = await apiClient.get(`/khoa/danh-muc/${route}/mau-csv`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `mau-${route}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setMessage(e.response?.data?.message || 'Không tải được file mẫu.')
    }
  }

  const exportList = async () => {
    try {
      const response = await apiClient.get(`/khoa/danh-muc/${route}/export-csv`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `danh-sach-${route}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setMessage(e.response?.data?.message || 'Không xuất được danh sách CSV.')
    }
  }

  const upload = async (e) => {
    e.preventDefault()
    if (!file) return
    const form = e.currentTarget
    setBusy(true)
    setMessage('')
    setErrors([])
    const body = new FormData()
    body.append('file', file)
    try {
      const { data } = await apiClient.post(`/khoa/danh-muc/${route}/import`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMessage(`Đã nhập ${data.soLuongNhap} ${label}.`)
      setFile(null)
      form.reset()
      onImported()
    } catch (err) {
      const data = err.response?.data
      setMessage(data?.message || 'File có lỗi, chưa ghi dòng nào.')
      setErrors(data?.loi || [])
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Nhập danh sách {label} bằng CSV</h3>
          <p className="text-xs text-slate-500">
            Tải đúng mẫu UTF-8. Tối đa 1.000 dòng và 5 MB; nếu có dòng lỗi, toàn bộ file sẽ không được nhập.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
            type="button"
            onClick={exportList}
          >
            Xuất danh sách CSV
          </button>
          <button
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
            type="button"
            onClick={download}
          >
            Tải mẫu CSV
          </button>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-3" onSubmit={upload}>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
        />
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
          disabled={!file || busy}
        >
          {busy ? 'Đang kiểm tra…' : 'Kiểm tra và nhập'}
        </button>
      </form>

      {message && (
        <div role="status" className={`p-3 rounded-xl text-xs font-medium ${errors.length ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
          {message}
        </div>
      )}

      {errors.length > 0 && (
        <ul className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
          {errors.slice(0, 30).map((x, i) => (
            <li key={`${x.dong}-${i}`}>
              {x.dong ? `Dòng ${x.dong}: ` : ''}
              {x.loi}
            </li>
          ))}
          {errors.length > 30 && <li>Còn {errors.length - 30} lỗi khác.</li>}
        </ul>
      )}
    </section>
  )
}

function Table({ title, headers, rows }) {
  return (
    <>
      <h3 className="text-sm font-bold text-slate-800 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
            <tr>
              {headers.map((h) => (
                <th key={h} className="p-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                {r.map((v, j) => (
                  <td key={j} className="p-2.5">
                    {String(v ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function EditableTable({ title, headers, rows, items, onEdit }) {
  const pagination = usePagination(rows, title)
  return (
    <>
      <h3 className="text-sm font-bold text-slate-800 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
            <tr>
              {headers.map((h) => (
                <th key={h} className="p-2.5">
                  {h}
                </th>
              ))}
              <th className="p-2.5">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagination.items.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                {r.map((v, j) => (
                  <td key={j} className="p-2.5">
                    {String(v ?? '')}
                  </td>
                ))}
                <td className="p-2.5">
                  <button
                    className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => onEdit(items[i + pagination.start - 1])}
                  >
                    Sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} label={title} />
    </>
  )
}

function CompanyTable({ rows, approve, onEdit }) {
  const pagination = usePagination(rows, 'companies')
  return (
    <>
      <h3 className="text-sm font-bold text-slate-800 mb-3">Công ty & xét duyệt</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
            <tr>
              <th className="p-2.5">Mã</th>
              <th className="p-2.5">Công ty</th>
              <th className="p-2.5">Vị trí</th>
              <th className="p-2.5">Yêu cầu</th>
              <th className="p-2.5">Trạng thái</th>
              <th className="p-2.5">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagination.items.map((x) => (
              <tr key={x.maCongTy} className="hover:bg-slate-50/50">
                <td className="p-2.5 font-mono">{x.maCongTy}</td>
                <td className="p-2.5 font-medium text-slate-900">{x.tenCongTy}</td>
                <td className="p-2.5">{x.viTriTuyen}</td>
                <td className="p-2.5 text-slate-500">{x.yeuCau}</td>
                <td className="p-2.5">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      x.trangThai === 'DaDuyet'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : x.trangThai === 'TuChoi'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {x.trangThai}
                  </span>
                </td>
                <td className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      className="px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                      onClick={() => onEdit(x)}
                    >
                      Sửa
                    </button>
                    {x.trangThai === 'ChoDuyet' ? (
                      <>
                        <button
                          className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
                          onClick={() => approve(x.maCongTy, 'DaDuyet')}
                        >
                          Duyệt
                        </button>
                        <button
                          className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                          onClick={() => approve(x.maCongTy, 'TuChoi')}
                        >
                          Từ chối
                        </button>
                      </>
                    ) : x.trangThai === 'DaDuyet' ? (
                      <button
                        className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg cursor-pointer"
                        onClick={() => approve(x.maCongTy, 'DongBang')}
                      >
                        Tạm dừng
                      </button>
                    ) : x.trangThai === 'DongBang' ? (
                      <button
                        className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
                        onClick={() => approve(x.maCongTy, 'DaDuyet')}
                      >
                        Mở lại
                      </button>
                    ) : (
                      <button
                        className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        onClick={() => approve(x.maCongTy, 'ChoDuyet')}
                      >
                        Xét lại
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} label="doanh nghiệp liên kết" />
    </>
  )
}

function RoundTable({ rows, onStatus, onEdit }) {
  const pagination = usePagination(rows, 'rounds')
  return (
    <>
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-600 text-base">list_alt</span>
          Danh mục đợt thực tập tốt nghiệp
        </h3>
        <span className="text-xs text-slate-500 font-medium">Tổng số: {rows.length} đợt</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200/70">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
            <tr>
              <th className="p-3">Mã đợt</th>
              <th className="p-3">Tên đợt thực tập</th>
              <th className="p-3">Năm học</th>
              <th className="p-3">Bắt đầu</th>
              <th className="p-3">Kết thúc</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagination.items.map((x) => (
              <RoundRow key={x.maSo} row={x} onStatus={onStatus} onEdit={onEdit} />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} label="đợt thực tập" />
    </>
  )
}

function RoundRow({ row: x, onStatus, onEdit }) {
  const lock = useRoundLock(x.maSo)
  const statusStyles = {
    DangDienRa: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
    ChuaBatDau: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
    DaKetThuc: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  return (
    <tr className="hover:bg-slate-50/50">
      <td className="p-3 font-mono font-bold text-slate-900">{x.maSo}</td>
      <td className="p-3 font-semibold text-slate-900">{x.tenDot}</td>
      <td className="p-3 text-slate-600">{x.namHoc}</td>
      <td className="p-3 font-mono text-slate-700">{formatDateVN(x.thoiGianBD)}</td>
      <td className="p-3 font-mono text-slate-700">{formatDateVN(x.thoiGianKT)}</td>
      <td className="p-3">
        <select
          disabled={lock.structureBlocked}
          value={x.trangThai}
          onChange={(e) => onStatus(x, e.target.value)}
          className={`px-2.5 py-1 border rounded-lg text-xs ${statusStyles[x.trangThai] || 'bg-slate-50 border-slate-200'}`}
        >
          <option value="ChuaBatDau">Chưa bắt đầu</option>
          <option value="DangDienRa">Đang diễn ra</option>
          <option value="DaKetThuc">Đã kết thúc</option>
        </select>
        {lock.status && lock.status !== 'ChuaChot' && (
          <small className="block text-slate-400 mt-0.5">
            Đợt đã chốt; điều chỉnh điểm/báo cáo tại Báo cáo thống kê CLO.
          </small>
        )}
      </td>
      <td className="p-3">
        <button
          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
          disabled={lock.structureBlocked}
          onClick={() => onEdit(x)}
        >
          Sửa
        </button>
      </td>
    </tr>
  )
}

function CreateForm({ tab, reload, editItem, onCancel }) {
  const { refreshRounds } = useDotThucTap()
  const lock = useRoundLock(tab === 'dot' ? editItem?.maSo : null)
  const isLocked = tab === 'dot' && !!editItem && lock.structureBlocked
  const [f, setF] = useState({})
  const [msg, setMsg] = useState('')
  const fields =
    tab === 'sv'
      ? [
          ['MaSV', 'Mã SV'],
          ['HoTen', 'Họ tên'],
          ['Lop', 'Lớp'],
          ['KhoaHoc', 'Khóa học'],
          ['Gpa', 'GPA'],
          ['ChuyenNganh', 'Chuyên ngành'],
          ['KyNang', 'Kỹ năng'],
          ['CongNghe', 'Công nghệ'],
          ['DuAnDaThucHien', 'Dự án'],
        ]
      : tab === 'gv'
      ? [
          ['MaGV', 'Mã GV'],
          ['HoTen', 'Họ tên'],
          ['ChuyenMon', 'Chuyên môn'],
          ['ChiTieuHD', 'Chỉ tiêu HD'],
        ]
      : tab === 'ct'
      ? [
          ['MaCongTy', 'Mã công ty'],
          ['TenCongTy', 'Tên công ty'],
          ['ViTriTuyen', 'Vị trí tuyển'],
          ['ThoiGian', 'Thời gian'],
          ['SoLuongNhan', 'Số lượng nhận'],
          ['YeuCau', 'Yêu cầu'],
        ]
      : [
          ['MaSo', 'Mã đợt'],
          ['TenDot', 'Tên đợt'],
          ['NamHoc', 'Năm học'],
          ['ThoiGianBD', 'Bắt đầu'],
          ['ThoiGianKT', 'Kết thúc'],
          ['TrangThai', 'Trạng thái'],
        ]

  useEffect(() => {
    if (editItem) {
      setF(
        Object.fromEntries(
          fields.map(([key]) => {
            const value = editItem[key[0].toLowerCase() + key.slice(1)] ?? ''
            return [key, key.startsWith('ThoiGian') && value ? String(value).slice(0, 10) : value]
          })
        )
      )
      setMsg('')
    } else setF({})
  }, [tab, editItem])

  const submit = async (e) => {
    e.preventDefault()
    if (isLocked) return
    setMsg('')
    const form = e.currentTarget
    try {
      const id =
        tab === 'sv'
          ? editItem?.maSV
          : tab === 'gv'
          ? editItem?.maGV
          : tab === 'ct'
          ? editItem?.maCongTy
          : editItem?.maSo
      const values = new FormData(form)
      let payload = {
        ...f,
        ...Object.fromEntries(
          fields.map(([key]) => [key, values.get(key)]).filter(([, value]) => value !== null)
        ),
      }
      if (tab === 'sv') payload = { ...payload, Gpa: payload.Gpa === '' ? null : Number(payload.Gpa) }
      if (tab === 'gv') payload = { ...payload, ChiTieuHD: Number(payload.ChiTieuHD || 10) }
      if (tab === 'ct') payload = { ...payload, SoLuongNhan: Number(payload.SoLuongNhan || 0) }
      if (tab === 'dot') {
        for (const key of ['ThoiGianBD', 'ThoiGianKT']) {
          const value = payload[key],
            date = new Date(`${value}T00:00:00Z`)
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
            Number.isNaN(date.getTime()) ||
            date.toISOString().slice(0, 10) !== value
          )
            throw new Error('Nhập ngày bắt đầu/kết thúc hợp lệ.')
        }
        if (payload.ThoiGianKT < payload.ThoiGianBD)
          throw new Error('Ngày kết thúc phải từ ngày bắt đầu trở đi.')
      }
      const base =
        tab === 'sv'
          ? '/khoa/sinh-vien'
          : tab === 'gv'
          ? '/khoa/giang-vien'
          : tab === 'ct'
          ? '/khoa/cong-ty'
          : '/khoa/dot-thuc-tap'
      if (editItem) await apiClient.put(`${base}/${encodeURIComponent(id)}`, payload)
      else await apiClient.post(base, payload)
      form.reset?.()
      setF({})
      setMsg(editItem ? 'Đã cập nhật.' : 'Đã thêm dữ liệu.')
      onCancel()
      reload()
      if (tab === 'dot') refreshRounds?.()
    } catch (e) {
      setMsg(e.response?.data?.message || e.message || 'Không thể lưu dữ liệu.')
    }
  }

  if (tab === 'dot') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600">
              {editItem ? 'edit_calendar' : 'add_circle'}
            </span>
            <h3 className="text-sm font-bold text-slate-800">
              {editItem ? 'Điều chỉnh thông tin đợt thực tập' : 'Thêm đợt thực tập mới'}
            </h3>
          </div>
          {editItem && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Đang chỉnh sửa: {editItem.maSo}
            </span>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã đợt <span className="text-rose-500">*</span>
              </label>
              <input
                name="MaSo"
                required
                maxLength="20"
                placeholder="VD: DOT03"
                value={f['MaSo'] ?? ''}
                onChange={(e) => setF({ ...f, MaSo: e.target.value })}
                disabled={Boolean(editItem)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên đợt thực tập <span className="text-rose-500">*</span>
              </label>
              <input
                name="TenDot"
                required
                maxLength="200"
                placeholder="VD: Thực tập tốt nghiệp đợt 1 năm 2027"
                value={f['TenDot'] ?? ''}
                onChange={(e) => setF({ ...f, TenDot: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Năm học <span className="text-rose-500">*</span>
              </label>
              <input
                name="NamHoc"
                required
                maxLength="20"
                placeholder="VD: 2026-2027"
                value={f['NamHoc'] ?? ''}
                onChange={(e) => setF({ ...f, NamHoc: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày bắt đầu thực tập <span className="text-rose-500">*</span>
              </label>
              <input
                name="ThoiGianBD"
                type="date"
                required
                value={f['ThoiGianBD'] ?? ''}
                onChange={(e) => setF({ ...f, ThoiGianBD: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {f['ThoiGianBD'] ? `Bắt đầu: ${formatDateVN(f['ThoiGianBD'])}` : 'Chưa thiết lập'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày kết thúc thực tập <span className="text-rose-500">*</span>
              </label>
              <input
                name="ThoiGianKT"
                type="date"
                required
                value={f['ThoiGianKT'] ?? ''}
                onChange={(e) => setF({ ...f, ThoiGianKT: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {f['ThoiGianKT'] ? `Kết thúc: ${formatDateVN(f['ThoiGianKT'])}` : 'Chưa thiết lập'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trạng thái đợt <span className="text-rose-500">*</span>
              </label>
              <select
                name="TrangThai"
                value={f['TrangThai'] || 'ChuaBatDau'}
                onChange={(e) => setF({ ...f, TrangThai: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="ChuaBatDau">Chưa bắt đầu</option>
                <option value="DangDienRa">Đang diễn ra</option>
                <option value="DaKetThuc">Đã kết thúc</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isLocked}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {editItem ? 'Lưu thay đổi đợt' : 'Thêm đợt thực tập'}
            </button>
            {editItem && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
            )}
          </div>
        </form>
        {msg && <div className="text-xs text-indigo-600 font-medium">{msg}</div>}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
      <h3 className="text-sm font-bold text-slate-800">
        {editItem ? 'Sửa' : 'Thêm'} {tabs.find((x) => x[0] === tab)?.[1]}
      </h3>
      <form className="flex flex-wrap items-center gap-2.5" onSubmit={submit}>
        {fields.map(([key, label]) =>
          key === 'TrangThai' ? (
            <select
              key={key}
              name={key}
              value={f[key] || 'ChuaBatDau'}
              onChange={(e) => setF({ ...f, [key]: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="ChuaBatDau">Chưa bắt đầu</option>
              <option value="DangDienRa">Đang diễn ra</option>
              <option value="DaKetThuc">Đã kết thúc</option>
            </select>
          ) : (
            <input
              key={`${key}/${
                editItem?.maSo || editItem?.maSV || editItem?.maGV || editItem?.maCongTy || 'new'
              }`}
              name={key}
              type={
                key.startsWith('ThoiGian')
                  ? 'date'
                  : key === 'Gpa' || key === 'SoLuongNhan' || key === 'ChiTieuHD'
                  ? 'number'
                  : 'text'
              }
              min={key === 'Gpa' ? '0' : key === 'SoLuongNhan' || key === 'ChiTieuHD' ? '0' : undefined}
              max={key === 'Gpa' ? '4' : key === 'ChiTieuHD' ? '50' : undefined}
              step={key === 'Gpa' ? '0.01' : undefined}
              placeholder={label}
              value={key.startsWith('ThoiGian') ? undefined : f[key] ?? ''}
              defaultValue={
                key.startsWith('ThoiGian')
                  ? String(editItem?.[key[0].toLowerCase() + key.slice(1)] || '').slice(0, 10)
                  : undefined
              }
              onChange={(e) => {
                if (!key.startsWith('ThoiGian')) setF({ ...f, [key]: e.target.value })
              }}
              disabled={editItem && ['MaSV', 'MaGV', 'MaCongTy', 'MaSo'].includes(key)}
              required={!['KyNang', 'CongNghe', 'DuAnDaThucHien', 'Gpa', 'YeuCau'].includes(key)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden"
            />
          )
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
          disabled={isLocked}
        >
          {editItem ? 'Lưu thay đổi' : 'Thêm'}
        </button>
        {editItem && (
          <button
            type="button"
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
            onClick={onCancel}
          >
            Hủy
          </button>
        )}
      </form>
      {msg && <div className="text-xs text-indigo-600 font-medium">{msg}</div>}
    </div>
  )
}
