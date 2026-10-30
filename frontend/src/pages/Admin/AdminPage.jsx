import { useEffect, useState, useMemo, useRef } from 'react'
import apiClient from '../../services/api'
import Layout from '../../components/Layout'
import EnterpriseOnboardingPanel from '../../components/khoa/EnterpriseOnboardingPanel'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('accounts') // 'accounts' | 'enterprises'
  const [accounts, setAccounts] = useState([])
  const [roles, setRoles] = useState([])
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [enterpriseList, setEnterpriseList] = useState([])
  const [enterpriseOwner, setEnterpriseOwner] = useState(null)
  const [enterpriseRefresh, setEnterpriseRefresh] = useState(0)

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
  const [customPassword, setCustomPassword] = useState('')

  const formRef = useRef(null)

  const load = async () => {
    try {
      setLoading(true)
      const [a, r, eo] = await Promise.all([
        apiClient.get('/admin/accounts'),
        apiClient.get('/admin/roles'),
        apiClient.get('/admin/enterprise-onboarding').catch(() => ({ data: [] })),
      ])
      setAccounts(Array.isArray(a.data) ? a.data : [])
      setRoles(Array.isArray(r.data) ? r.data : [])
      setEnterpriseList(Array.isArray(eo.data) ? eo.data : [])
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
      setEnterpriseOwner(null)
      setEnterpriseRefresh((value) => value + 1)
      setTimeout(() => setSuccessMsg(''), 4000)
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Không tạo được tài khoản.')
    }
  }

  const handleAccountStatus = async (x, targetStatus) => {
    try {
      const nextStatus = targetStatus || (x.trangThai === 'HoatDong' ? 'BiKhoa' : 'HoatDong')
      await apiClient.put(`/admin/accounts/${x.maTaiKhoan}`, {
        TrangThai: nextStatus,
        MaVaiTro: x.maVaiTro,
        MaSV: x.maSV,
        MaGV: x.maGV,
        MaDaiDien: x.maDaiDien,
      })
      const actionText = nextStatus === 'HoatDong' ? (x.trangThai === 'ChuaKichHoat' ? 'kích hoạt' : 'mở khóa') : 'khóa'
      setSuccessMsg(`Đã ${actionText} tài khoản "${x.tenDangNhap}" thành công.`)
      setTimeout(() => setSuccessMsg(''), 4000)
      setEnterpriseRefresh((value) => value + 1)
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
      const payload = customPassword.trim() ? { matKhauMoi: customPassword.trim() } : {}
      const { data } = await apiClient.post(
        `/admin/accounts/${confirmResetAccount.maTaiKhoan}/reset-password`,
        payload
      )
      setSuccessMsg(
        `Đã đặt lại mật khẩu cho "${confirmResetAccount.tenDangNhap}". Mật khẩu mới: ${data.matKhauMoi}. Hãy gửi riêng và yêu cầu đổi ngay.`
      )
      setConfirmResetAccount(null)
      setCustomPassword('')
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể đặt lại mật khẩu cho tài khoản này.')
      setConfirmResetAccount(null)
      setCustomPassword('')
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
  const pendingCount = accounts.filter((a) => a.trangThai === 'ChuaKichHoat').length
  const lockedCount = accounts.filter((a) => a.trangThai === 'BiKhoa').length

  const availableEnterpriseReps = useMemo(() => {
    const list = []
    enterpriseList.forEach((company) => {
      company.daiDiens?.forEach((rep) => {
        list.push({
          maDaiDien: rep.maDaiDien,
          hoTen: rep.hoTen,
          chucVu: rep.chucVu,
          email: rep.email,
          maCongTy: company.maCongTy,
          tenCongTy: company.tenCongTy,
          soTaiKhoan: rep.soTaiKhoan,
        })
      })
    })
    return list
  }, [enterpriseList])

  const existingOwnerAccount = useMemo(() => {
    const owner = form.OwnerId.trim().toLowerCase()
    if (!owner || !['VT03', 'VT04', 'VT05'].includes(form.MaVaiTro)) return null
    return accounts.find((a) => {
      if (form.MaVaiTro === 'VT04') return a.maSV?.toLowerCase() === owner
      if (form.MaVaiTro === 'VT03') return a.maGV?.toLowerCase() === owner
      if (form.MaVaiTro === 'VT05') return a.maDaiDien?.toLowerCase() === owner
      return false
    })
  }, [form.OwnerId, form.MaVaiTro, accounts])

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

  const getRoleIcon = (maVaiTro) => {
    switch (maVaiTro) {
      case 'VT01':
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        )
      case 'VT02':
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )
      case 'VT03':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
        )
      case 'VT04':
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )
      case 'VT05':
        return (
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  const handleSelectEnterpriseRep = (rep, company) => {
    // Include a newly created representative before rendering the controlled select.
    setEnterpriseList((previous) => {
      const existing = previous.find((item) => item.maCongTy === company.maCongTy)
      const representatives = existing?.daiDiens || company.daiDiens || []
      const selectedRep = { soTaiKhoan: 0, taiKhoanHoatDong: 0, ...rep }
      const updated = {
        ...company,
        ...existing,
        daiDiens: [...representatives.filter((item) => item.maDaiDien !== rep.maDaiDien), selectedRep],
      }
      return existing
        ? previous.map((item) => item.maCongTy === company.maCongTy ? updated : item)
        : [...previous, updated]
    })
    setForm((previous) => ({ ...previous, MaVaiTro: 'VT05', OwnerId: rep.maDaiDien }))
    setEnterpriseOwner(
      `${rep.hoTen} (${rep.maDaiDien}) — ${company.tenCongTy} (${company.maCongTy})`
    )
    setActiveTab('accounts')
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <Layout>
      {/* Header trang Admin */}
      <div className="page-head">
        <div>
          <span className="eyebrow">KHOA CÔNG NGHỆ THÔNG TIN • HỆ THỐNG QUẢN LÝ THỰC TẬP</span>
          <h2>Quản trị tài khoản & người dùng</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Quản lý danh sách tài khoản, phân quyền truy cập và cấp tài khoản đại diện doanh nghiệp.
          </p>
        </div>
      </div>

      {/* Thông báo toàn cục */}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs điều hướng các phân hệ Admin */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Tài khoản người dùng</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'accounts' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enterprises')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'enterprises'
              ? 'bg-teal-600 text-white shadow-xs shadow-teal-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>Danh bạ doanh nghiệp</span>
        </button>

        
      </div>

      {/* ===================== TAB 1: TÀI KHOẢN & PHÂN QUYỀN ===================== */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          {/* KPI Thống kê nhanh */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tổng tài khoản
                </span>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {totalCount}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Đang hoạt động
                </span>
                <span className="text-xl font-extrabold text-emerald-700 tracking-tight">
                  {activeCount}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Chờ kích hoạt
                </span>
                <span className="text-xl font-extrabold text-amber-700 tracking-tight">
                  {pendingCount}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Đã bị khóa
                </span>
                <span className="text-xl font-extrabold text-rose-700 tracking-tight">
                  {lockedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Form Tạo Tài Khoản Mới */}
          <section
            ref={formRef}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 transition-all"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">Tạo tài khoản mới</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Khởi tạo thông tin đăng nhập và gán vai trò truy cập trong hệ thống.
                </p>
              </div>
            </div>

            <form onSubmit={create} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <label className="block text-xs font-semibold text-slate-700 space-y-1">
                  <span>Mã tài khoản <strong className="text-rose-500">*</strong></span>
                  <input
                    placeholder="VD: TK099"
                    value={form.MaTaiKhoan}
                    onChange={(e) => setForm({ ...form, MaTaiKhoan: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700 space-y-1">
                  <span>Tên đăng nhập <strong className="text-rose-500">*</strong></span>
                  <input
                    placeholder="VD: admin_fit, 2001215..."
                    value={form.TenDangNhap}
                    onChange={(e) => setForm({ ...form, TenDangNhap: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700 space-y-1">
                  <span>Mật khẩu khởi tạo <strong className="text-rose-500">*</strong></span>
                  <input
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={form.MatKhau}
                    onChange={(e) => setForm({ ...form, MatKhau: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700 space-y-1">
                  <span>Vai trò hệ thống <strong className="text-rose-500">*</strong></span>
                  <select
                    value={form.MaVaiTro}
                    onChange={(e) => {
                      setForm({ ...form, MaVaiTro: e.target.value, OwnerId: '' })
                      setEnterpriseOwner(null)
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-800 transition-all cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.maVaiTro} value={r.maVaiTro}>
                        {r.maVaiTro} - {r.tenVaiTro}
                      </option>
                    ))}
                  </select>
                </label>

                {form.MaVaiTro === 'VT05' ? (
                  <div className="space-y-1 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Đại diện doanh nghiệp liên kết <strong className="text-rose-500">*</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('enterprises')}
                        className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
                      >
                        + Xem danh bạ / Thêm đại diện
                      </button>
                    </div>
                    <select
                      required
                      value={form.OwnerId}
                      onChange={(e) => {
                        const val = e.target.value
                        setForm({ ...form, OwnerId: val })
                        const rep = availableEnterpriseReps.find((r) => r.maDaiDien === val)
                        setEnterpriseOwner(rep ? `${rep.hoTen} (${rep.maDaiDien}) — ${rep.tenCongTy}` : null)
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 transition-all cursor-pointer"
                    >
                      <option value="">-- Chọn người đại diện doanh nghiệp --</option>
                      {availableEnterpriseReps.map((rep) => (
                        <option key={rep.maDaiDien} value={rep.maDaiDien}>
                          {rep.hoTen} ({rep.maDaiDien}) — {rep.tenCongTy} {rep.soTaiKhoan > 0 ? '✓ (Đã có TK)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <label className="block text-xs font-semibold text-slate-700 space-y-1 sm:col-span-2">
                    <span>
                      {form.MaVaiTro === 'VT04'
                        ? 'Mã số sinh viên (MSSV)'
                        : form.MaVaiTro === 'VT03'
                        ? 'Mã cán bộ / Giảng viên'
                        : 'Hồ sơ liên kết'}{' '}
                      {['VT03', 'VT04'].includes(form.MaVaiTro) && (
                        <strong className="text-rose-500">*</strong>
                      )}
                    </span>
                    <input
                      placeholder={
                        form.MaVaiTro === 'VT04'
                          ? 'Nhập MSSV (VD: 2001215...)'
                          : form.MaVaiTro === 'VT03'
                          ? 'Nhập Mã Giảng viên (VD: GV001)'
                          : 'Tài khoản quản trị hệ thống (không liên kết hồ sơ cá nhân)'
                      }
                      readOnly={['VT01', 'VT02'].includes(form.MaVaiTro)}
                      required={['VT03', 'VT04'].includes(form.MaVaiTro)}
                      value={form.OwnerId}
                      onChange={(e) => setForm({ ...form, OwnerId: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs transition-all font-mono ${
                        ['VT01', 'VT02'].includes(form.MaVaiTro)
                          ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                          : 'bg-slate-50/70 border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium'
                      }`}
                    />
                  </label>
                )}
              </div>

              {/* Callout trợ giúp khi chọn vai trò Doanh nghiệp VT05 */}
              {form.MaVaiTro === 'VT05' && (
                <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 text-xs text-teal-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {enterpriseOwner ? (
                        <>
                          Đại diện đã chọn: <strong className="font-semibold text-teal-950">{enterpriseOwner}</strong>
                        </>
                      ) : (
                        'Chọn đại diện đúng DN ở danh sách đại diện trước khi tạo tài khoản.'
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('enterprises')}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
                  >
                    {enterpriseOwner ? 'Đổi đại diện khác →' : 'Mở danh sách đại diện DN →'}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end pt-2">
                <button
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={form.MaVaiTro === 'VT05' && !enterpriseOwner}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Tạo tài khoản</span>
                </button>
              </div>
            </form>
          </section>

          {/* Danh Sách Tài Khoản Hệ Thống */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
              <div>
                <h3 className="m-0 text-base font-bold text-slate-900">Danh sách tài khoản hệ thống</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tra cứu danh sách tài khoản, thông tin chủ sở hữu, trạng thái và bảo mật mật khẩu.
                </p>
              </div>

              {/* Thanh Filter & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Ô tìm kiếm */}
                <div className="relative">
                  <svg
                    className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Tìm mã TK, tên đăng nhập, mã SV/GV..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-8 pr-7 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 font-medium transition-all"
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
                  className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50/70 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
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
                  className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50/70 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="HoatDong">Đang hoạt động</option>
                  <option value="ChuaKichHoat">Chờ kích hoạt</option>
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
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Đặt lại
                  </button>
                )}
              </div>
            </div>

            {/* Bảng dữ liệu */}
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-left">
                      <th className="py-3 px-4 w-28">Mã TK</th>
                      <th className="py-3 px-4">Tên đăng nhập</th>
                      <th className="py-3 px-4">Chủ sở hữu / Đơn vị</th>
                      <th className="py-3 px-4">Vai trò</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right w-44">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400">
                          <div className="inline-flex items-center gap-2">
                            <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Đang tải danh sách tài khoản...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400 italic bg-slate-50/40">
                          Không tìm thấy tài khoản nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      paginatedAccounts.map((x) => {
                        const owner = x.maSV || x.maGV || x.maDaiDien || null
                        const isLocked = x.trangThai !== 'HoatDong'
                        return (
                          <tr key={x.maTaiKhoan} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono text-xs font-bold text-slate-800">
                              {x.maTaiKhoan}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              {x.tenDangNhap}
                            </td>
                            <td className="py-3 px-4">
                              {owner ? (
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-bold">
                                      {owner}
                                    </span>
                                    {x.tenChuSoHuu && (
                                      <span className="font-semibold text-slate-900 text-xs">
                                        {x.tenChuSoHuu}
                                      </span>
                                    )}
                                  </div>
                                  {x.tenDonVi && (
                                    <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs font-normal">
                                      {x.tenDonVi}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">— Hệ thống</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(
                                  x.maVaiTro
                                )}`}
                              >
                                {x.tenVaiTro || x.vaiTro?.tenVaiTro || x.maVaiTro}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {x.trangThai === 'HoatDong' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Đang hoạt động
                                </span>
                              )}
                              {x.trangThai === 'ChuaKichHoat' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Chờ kích hoạt
                                </span>
                              )}
                              {x.trangThai === 'BiKhoa' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Bị khóa
                                </span>
                              )}
                              {x.trangThai !== 'HoatDong' && x.trangThai !== 'ChuaKichHoat' && x.trangThai !== 'BiKhoa' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                                  {x.trangThai}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <button
                                  type="button"
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer shadow-2xs"
                                  onClick={() => {
                                    setConfirmResetAccount(x)
                                    setCustomPassword('')
                                  }}
                                  title="Đặt lại mật khẩu tạm thời"
                                >
                                  Reset MK
                                </button>
                                {x.trangThai === 'HoatDong' && (
                                  <button
                                    type="button"
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg border text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 transition-colors cursor-pointer shadow-2xs"
                                    onClick={() => handleAccountStatus(x, 'BiKhoa')}
                                  >
                                    Khóa TK
                                  </button>
                                )}
                                {x.trangThai === 'ChuaKichHoat' && (
                                  <button
                                    type="button"
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg border text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                                    onClick={() => handleAccountStatus(x, 'HoatDong')}
                                  >
                                    Kích hoạt
                                  </button>
                                )}
                                {x.trangThai === 'BiKhoa' && (
                                  <button
                                    type="button"
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg border text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 transition-colors cursor-pointer shadow-2xs"
                                    onClick={() => handleAccountStatus(x, 'HoatDong')}
                                  >
                                    Mở khóa
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Thanh Điều Hướng Phân Trang */}
              {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 text-xs bg-slate-50/50">
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
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
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
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
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
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
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
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
                      title="Trang cuối"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="13 17 18 12 13 7" />
                        <polyline points="6 17 11 12 6 7" />
                      </svg>
                    </button>

                    {/* Nhập số trang trực tiếp */}
                    <form
                      onSubmit={handleGoToPage}
                      className="flex items-center gap-1.5 ml-2 pl-2.5 border-l border-slate-200 text-slate-500"
                    >
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
                        className="h-8 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs cursor-pointer"
                      >
                        Đi
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Danh Mục Vai Trò & Quyền Hạn Chuẩn */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 transition-all">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Danh mục vai trò & phân quyền chuẩn
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quy định các vai trò hệ thống và phạm vi trách nhiệm tương ứng trong Cổng thực tập.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
              {roles.map((x) => (
                <div
                  key={x.maVaiTro}
                  className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-all flex items-start gap-3.5"
                >
                  {getRoleIcon(x.maVaiTro)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {x.maVaiTro}
                      </span>
                      <strong className="text-sm font-bold text-slate-900 truncate">
                        {x.tenVaiTro}
                      </strong>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{x.moTa}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ===================== TAB 2: ĐẠI DIỆN DOANH NGHIỆP ===================== */}
      {activeTab === 'enterprises' && (
        <EnterpriseOnboardingPanel
          refreshKey={enterpriseRefresh}
          onSelect={handleSelectEnterpriseRep}
          onChanged={load}
        />
      )}

      {/* Modal Xác nhận Đặt lại Mật khẩu */}
      {confirmResetAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Xác nhận đặt lại mật khẩu</h3>
                <p className="text-xs text-slate-500">Thao tác này sẽ áp dụng ngay lập tức</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                Bạn có chắc muốn đặt lại mật khẩu cho tài khoản{' '}
                <strong className="text-slate-900 font-semibold font-mono">
                  {confirmResetAccount.tenDangNhap}
                </strong>
                ?
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hệ thống sẽ sinh mật khẩu tạm thời ngẫu nhiên an toàn (hoặc quản trị viên có thể nhập mật khẩu chỉ định bên dưới). Mật khẩu mới sẽ hiển thị sau khi hoàn tất để bạn bàn giao cho người dùng.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 space-y-1">
                  <span>Mật khẩu mới (tùy chọn, tối thiểu 6 ký tự):</span>
                  <input
                    type="password"
                    placeholder="Để trống để tự động sinh mật khẩu ngẫu nhiên an toàn"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                  />
                </label>
              </div>
            </div>

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
