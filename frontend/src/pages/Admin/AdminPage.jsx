import { useEffect, useState, useMemo } from 'react'
import apiClient from '../../services/api'
import Layout from '../../components/Layout'

export default function AdminPage() {
  const [accounts, setAccounts] = useState([])
  const [roles, setRoles] = useState([])
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Form tạo tài khoản
  const [form, setForm] = useState({
    MaTaiKhoan: '',
    TenDangNhap: '',
    MatKhau: '',
    MaVaiTro: 'VT04',
    OwnerId: '',
  })

  // State bộ lọc (Filter & Search)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  // State Phân trang (Pagination)
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('')

  // State Modal Reset Mật khẩu
  const [confirmResetAccount, setConfirmResetAccount] = useState(null)
  const [resetting, setResetting] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const [a, r] = await Promise.all([
        apiClient.get('/admin/accounts'),
        apiClient.get('/admin/roles'),
      ])
      setAccounts(Array.isArray(a.data) ? a.data : [])
      setRoles(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setError(e.response?.data?.message || 'Không tải được dữ liệu người dùng & vai trò.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const create = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    const owner = form.OwnerId.trim() || null
    const payload = {
      MaTaiKhoan: form.MaTaiKhoan.trim(),
      TenDangNhap: form.TenDangNhap.trim(),
      MatKhau: form.MatKhau,
      MaVaiTro: form.MaVaiTro,
      MaSV: form.MaVaiTro === 'VT04' ? owner : null,
      MaGV: form.MaVaiTro === 'VT03' ? owner : null,
      MaDaiDien: form.MaVaiTro === 'VT05' ? owner : null,
    }
    try {
      await apiClient.post('/admin/accounts', payload)
      setSuccessMsg(`Đã tạo thành công tài khoản "${payload.TenDangNhap}"!`)
      setForm({ MaTaiKhoan: '', TenDangNhap: '', MatKhau: '', MaVaiTro: 'VT04', OwnerId: '' })
      setTimeout(() => setSuccessMsg(''), 4000)
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Không tạo được tài khoản.')
    }
  }

  const toggleStatus = async (x) => {
    try {
      const nextStatus = x.trangThai === 'HoatDong' ? 'BiKhoa' : 'HoatDong'
      await apiClient.put(`/admin/accounts/${x.maTaiKhoan}`, {
        TrangThai: nextStatus,
        MaVaiTro: x.maVaiTro,
        MaSV: x.maSV,
        MaGV: x.maGV,
        MaDaiDien: x.maDaiDien,
      })
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Không cập nhật được trạng thái tài khoản.')
    }
  }

  const executeResetPassword = async () => {
    if (!confirmResetAccount) return
    try {
      setResetting(true)
      setError('')
      await apiClient.post(`/admin/accounts/${confirmResetAccount.maTaiKhoan}/reset-password`, {
        MatKhauMoi: '123456',
      })
      setSuccessMsg(
        `Đã đặt lại mật khẩu cho tài khoản "${confirmResetAccount.tenDangNhap}" về mặc định (123456) thành công!`
      )
      setConfirmResetAccount(null)
      setTimeout(() => setSuccessMsg(''), 5000)
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể đặt lại mật khẩu cho tài khoản này.')
      setConfirmResetAccount(null)
    } finally {
      setResetting(false)
    }
  }

  // Lọc tài khoản theo Search Keyword, Vai trò, Trạng thái
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // 1. Lọc theo từ khóa (Mã TK, Tên đăng nhập, Mã SV/GV/ĐD)
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase()
        const matchTk = acc.maTaiKhoan?.toLowerCase().includes(kw)
        const matchUser = acc.tenDangNhap?.toLowerCase().includes(kw)
        const matchOwner =
          acc.maSV?.toLowerCase().includes(kw) ||
          acc.maGV?.toLowerCase().includes(kw) ||
          acc.maDaiDien?.toLowerCase().includes(kw)
        if (!matchTk && !matchUser && !matchOwner) return false
      }

      // 2. Lọc theo Vai trò
      if (selectedRole !== 'ALL' && acc.maVaiTro !== selectedRole) {
        return false
      }

      // 3. Lọc theo Trạng thái
      if (selectedStatus !== 'ALL' && acc.trangThai !== selectedStatus) {
        return false
      }

      return true
    })
  }, [accounts, searchKeyword, selectedRole, selectedStatus])

  // Reset về trang 1 khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1)
  }, [searchKeyword, selectedRole, selectedStatus, pageSize])

  // Tính toán số liệu phân trang
  const totalItems = filteredAccounts.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  const paginatedAccounts = useMemo(() => {
    return filteredAccounts.slice(startIndex, endIndex)
  }, [filteredAccounts, startIndex, endIndex])

  // Tạo danh sách nút phân trang thông minh (kèm dấu ...)
  const getPaginationButtons = () => {
    const pages = []
    const delta = 1
    const left = Math.max(1, safeCurrentPage - delta)
    const right = Math.min(totalPages, safeCurrentPage + delta)

    if (left > 1) {
      pages.push(1)
      if (left > 2) pages.push('...')
    }

    for (let i = left; i <= right; i++) {
      pages.push(i)
    }

    if (right < totalPages) {
      if (right < totalPages - 1) pages.push('...')
      pages.push(totalPages)
    }

    return pages
  }

  const handleGoToPage = (e) => {
    if (e) e.preventDefault()
    const p = parseInt(pageInput, 10)
    if (!isNaN(p)) {
      const clamped = Math.max(1, Math.min(totalPages, p))
      setCurrentPage(clamped)
      setPageInput('')
    }
  }

  // Thống kê nhanh KPI
  const totalCount = accounts.length
  const activeCount = accounts.filter((a) => a.trangThai === 'HoatDong').length
  const lockedCount = accounts.filter((a) => a.trangThai === 'BiKhoa').length

  const getRoleBadgeStyle = (maVaiTro) => {
    switch (maVaiTro) {
      case 'VT01':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'VT02':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'VT03':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'VT04':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'VT05':
        return 'bg-teal-50 text-teal-700 border-teal-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <Layout>
      <div className="page-head">
        <div>
          <span className="eyebrow">ADMIN</span>
          <h2>Quản trị người dùng & phân quyền</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tập trung toàn bộ danh sách tài khoản, vai trò và trạng thái truy cập hệ thống.
          </p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {successMsg && (
        <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {/* 1. Form Tạo Tài Khoản */}
      <div className="info-card">
        <h3>Tạo tài khoản mới</h3>
        <form className="inline-form" onSubmit={create}>
          <input
            placeholder="Mã tài khoản (VD: TK099)"
            value={form.MaTaiKhoan}
            onChange={(e) => setForm({ ...form, MaTaiKhoan: e.target.value })}
            required
          />
          <input
            placeholder="Tên đăng nhập"
            value={form.TenDangNhap}
            onChange={(e) => setForm({ ...form, TenDangNhap: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Mật khẩu khởi tạo"
            value={form.MatKhau}
            onChange={(e) => setForm({ ...form, MatKhau: e.target.value })}
            required
          />
          <select
            value={form.MaVaiTro}
            onChange={(e) => setForm({ ...form, MaVaiTro: e.target.value })}
          >
            {roles.map((r) => (
              <option key={r.maVaiTro} value={r.maVaiTro}>
                {r.maVaiTro} - {r.tenVaiTro}
              </option>
            ))}
          </select>
          <input
            placeholder="Mã liên kết SV/GV/ĐD (Tùy chọn)"
            value={form.OwnerId}
            onChange={(e) => setForm({ ...form, OwnerId: e.target.value })}
          />
          <button className="primary" type="submit">
            Tạo tài khoản
          </button>
        </form>
      </div>

      {/* 2. Danh Sách Tài Khoản, Bộ Lọc & Phân Trang */}
      <div className="info-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="m-0 text-base font-bold text-slate-900">Danh sách tài khoản hệ thống</h3>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                Tổng: {totalCount}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                Đang hoạt động: {activeCount}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                Đã khóa: {lockedCount}
              </span>
            </div>
          </div>

          {/* Thanh Filter & Search trực quan */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Ô tìm kiếm từ khóa */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm mã TK, tên đăng nhập, mã SV/GV..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-64 font-medium"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown lọc theo Vai trò */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">Tất cả vai trò</option>
              {roles.map((r) => (
                <option key={r.maVaiTro} value={r.maVaiTro}>
                  {r.tenVaiTro} ({r.maVaiTro})
                </option>
              ))}
            </select>

            {/* Dropdown lọc theo Trạng thái */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="HoatDong">Đang hoạt động</option>
              <option value="BiKhoa">Đã bị khóa</option>
            </select>

            {/* Nút đặt lại bộ lọc */}
            {(searchKeyword || selectedRole !== 'ALL' || selectedStatus !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchKeyword('')
                  setSelectedRole('ALL')
                  setSelectedStatus('ALL')
                }}
                className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* Bảng dữ liệu đã lọc và phân trang */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="w-24">Mã TK</th>
                <th>Tên đăng nhập</th>
                <th>Mã liên kết</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th className="text-right w-44">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">
                    Đang tải danh sách tài khoản...
                  </td>
                </tr>
              ) : paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                    Không tìm thấy tài khoản nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((x) => {
                  const owner = x.maSV || x.maGV || x.maDaiDien || null
                  const isLocked = x.trangThai !== 'HoatDong'
                  return (
                    <tr key={x.maTaiKhoan} className="hover:bg-slate-50/70">
                      <td className="font-mono text-xs font-bold text-slate-800">{x.maTaiKhoan}</td>
                      <td className="font-semibold text-slate-900">{x.tenDangNhap}</td>
                      <td>
                        {owner ? (
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                            {owner}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(
                            x.maVaiTro
                          )}`}
                        >
                          {x.tenVaiTro || x.vaiTro?.tenVaiTro || x.maVaiTro}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${!isLocked ? 'ok' : 'bad'}`}>
                          {!isLocked ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                            onClick={() => setConfirmResetAccount(x)}
                            title="Đặt lại mật khẩu về mặc định (123456)"
                          >
                            Reset MK
                          </button>
                          <button
                            type="button"
                            className={`small font-bold cursor-pointer ${
                              !isLocked
                                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                            onClick={() => toggleStatus(x)}
                          >
                            {!isLocked ? 'Khóa TK' : 'Mở khóa'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh Điều Hướng Phân Trang (Pagination Toolbar) */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs mt-3">
            {/* Thông tin số lượng & Chọn kích thước trang */}
            <div className="flex items-center gap-2.5 text-slate-500">
              <span>
                Hiển thị{' '}
                <strong className="text-slate-800 font-semibold">
                  {startIndex + 1}–{endIndex}
                </strong>{' '}
                trên <strong className="text-slate-800 font-semibold">{totalItems}</strong> tài khoản
              </span>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span>Số dòng:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Cụm nút điều hướng trang */}
            <div className="flex items-center gap-1.5 select-none">
              {/* Về trang đầu */}
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs"
                title="Trang đầu"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              </button>

              {/* Trang trước */}
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs"
                title="Trang trước"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              {/* Danh sách nút số trang */}
              <div className="flex items-center gap-1 mx-0.5">
                {getPaginationButtons().map((p, idx) =>
                  p === '...' ? (
                    <span key={`dots-${idx}`} className="w-6 text-center text-slate-400 font-bold select-none">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                        safeCurrentPage === p
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              {/* Trang tiếp */}
              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs"
                title="Trang tiếp"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* Đến trang cuối */}
              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs"
                title="Trang cuối"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              </button>

              {/* Nhập số trang trực tiếp */}
              <form onSubmit={handleGoToPage} className="flex items-center gap-1.5 ml-2 pl-2.5 border-l border-slate-200 text-slate-500">
                <span>Đến</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder={String(safeCurrentPage)}
                  className="w-12 h-8 text-center text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 shadow-2xs"
                  title={`Nhập trang từ 1 đến ${totalPages}`}
                />
                <span className="text-slate-400">/{totalPages}</span>
                <button
                  type="submit"
                  disabled={!pageInput.trim()}
                  className="h-8 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs"
                >
                  Đi
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* 3. Danh Mục Vai Trò & Quyền Hạn */}
      <div className="info-card">
        <h3>Danh mục vai trò & phân quyền chuẩn</h3>
        <div className="role-grid">
          {roles.map((x) => (
            <div key={x.maVaiTro}>
              <strong>
                {x.maVaiTro} · {x.tenVaiTro}
              </strong>
              <p>{x.moTa}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Xác nhận Đặt lại Mật khẩu */}
      {confirmResetAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Xác nhận đặt lại mật khẩu</h3>
                <p className="text-xs text-slate-500">Thao tác này sẽ áp dụng ngay lập tức</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Bạn có chắc muốn đặt lại mật khẩu cho tài khoản{' '}
              <strong className="text-slate-900 font-semibold font-mono">
                {confirmResetAccount.tenDangNhap}
              </strong>{' '}
              về mặc định (<code className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">123456</code>) không?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setConfirmResetAccount(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={executeResetPassword}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {resetting ? 'Đang xử lý...' : 'Xác nhận đặt lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
