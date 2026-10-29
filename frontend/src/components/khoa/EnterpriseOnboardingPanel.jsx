import { useCallback, useEffect, useState } from 'react'
import apiClient from '../../services/api'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../common/Pagination'

export default function EnterpriseOnboardingPanel({ onSelect, onChanged, refreshKey = 0 }) {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ hoTen: '', chucVu: '', email: '', daXacMinh: false })
  const [accountModal, setAccountModal] = useState(null)
  const [accountForm, setAccountForm] = useState({ maTaiKhoan: '', tenDangNhap: '', matKhau: '' })
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [accountSuccess, setAccountSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get('/admin/enterprise-onboarding')
      if (!Array.isArray(response.data)) throw new Error('invalid response')
      setItems(response.data)
    } catch (e) {
      setError(e.response?.data?.message || 'Không tải được danh sách DN và đại diện.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const filtered = items.filter((item) =>
    `${item.maCongTy} ${item.tenCongTy} ${item.daiDiens
      .map((d) => `${d.maDaiDien} ${d.hoTen} ${d.email || ''}`)
      .join(' ')}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  )

  const pagination = usePagination(filtered, search)

  const saveRepresentative = async (event) => {
    event.preventDefault()
    if (saving || loading || !selected || !form.daXacMinh) return
    setSaving(true)
    setError('')
    try {
      const isEditing = Boolean(selected.rep)
      let createdRepresentative = null
      if (isEditing) {
        await apiClient.put(`/admin/enterprise-representatives/${selected.rep.maDaiDien}`, {
          hoTen: form.hoTen,
          chucVu: form.chucVu,
          email: form.email,
          daXacMinh: form.daXacMinh,
        })
        setAccountSuccess(`Đã cập nhật thông tin người đại diện ${form.hoTen} thành công.`)
      } else {
        const { data } = await apiClient.post('/admin/enterprise-representatives', {
          ...form,
          maCongTy: selected.maCongTy,
        })
        createdRepresentative = { ...data, maDaiDien: data.maSo }
        setAccountSuccess(`Đã thiết lập người đại diện ${form.hoTen} cho ${selected.tenCongTy}.`)
      }
      setSelected(null)
      setForm({ hoTen: '', chucVu: '', email: '', daXacMinh: false })
      setTimeout(() => setAccountSuccess(''), 4000)
      await load()
      await onChanged?.()
      if (createdRepresentative && typeof onSelect === 'function') onSelect(createdRepresentative, selected)
    } catch (e) {
      setError(
        e.response?.data?.message || 'Không tạo được đại diện; thông tin nhập được giữ để thử lại.'
      )
    } finally {
      setSaving(false)
    }
  }

  const openAccountModal = (rep, company) => {
    const rawUsername = rep.email ? rep.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : `dn_${rep.maDaiDien.toLowerCase()}`
    setAccountModal({ rep, company })
    setAccountForm({
      maTaiKhoan: `TK_${rep.maDaiDien}`,
      tenDangNhap: rawUsername || `rep_${rep.maDaiDien.toLowerCase()}`,
      matKhau: '',
    })
    setError('')
  }

  const handleCreateAccountInModal = async (e) => {
    e.preventDefault()
    if (!accountModal || creatingAccount) return
    setCreatingAccount(true)
    setError('')
    try {
      await apiClient.post('/admin/accounts', {
        MaTaiKhoan: accountForm.maTaiKhoan.trim(),
        TenDangNhap: accountForm.tenDangNhap.trim(),
        MatKhau: accountForm.matKhau,
        MaVaiTro: 'VT05',
        MaDaiDien: accountModal.rep.maDaiDien,
      })
      setAccountSuccess(`Đã cấp tài khoản thành công cho ${accountModal.rep.hoTen} (${accountForm.tenDangNhap}).`)
      setAccountModal(null)
      setTimeout(() => setAccountSuccess(''), 4000)
      await load()
      await onChanged?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cấp tài khoản cho đại diện này.')
    } finally {
      setCreatingAccount(false)
    }
  }

  const getRepStatusBadge = (rep) => {
    if (rep.taiKhoanHoatDong > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Có tài khoản hoạt động
        </span>
      )
    }
    if (rep.soTaiKhoan > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Có tài khoản, cần kiểm tra/mở khóa
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
        Chưa có tài khoản
      </span>
    )
  }

  return (
    <section
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 mb-6 transition-all"
      aria-label="Cấp tài khoản đại diện doanh nghiệp"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">
              Đại diện doanh nghiệp & Cấp tài khoản
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Mỗi doanh nghiệp liên kết có <strong>01 người đại diện duy nhất</strong> được ủy quyền để quản lý tin tuyển dụng, tiếp nhận sinh viên và đánh giá kết quả. Cấp tài khoản Cổng Doanh nghiệp (VT05) gắn đúng mã đại diện đã xác minh.
            </p>
          </div>
        </div>
      </div>

      {/* Thông báo lỗi */}
      {error && (
        <div
          role="alert"
          className="my-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Thông báo thành công */}
      {accountSuccess && (
        <div role="status" className="my-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{accountSuccess}</span>
        </div>
      )}

      {/* Thanh tìm kiếm & Làm mới */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-4">
        <div className="relative flex-1 max-w-md">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            aria-label="Tìm DN và đại diện"
            placeholder="Mã/tên công ty, đại diện hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={loading || saving}
          onClick={load}
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Làm mới đại diện
        </button>
      </div>

      {/* Trạng thái tải & Bảng dữ liệu */}
      {loading ? (
        <div className="text-center py-10 text-slate-400 text-xs flex items-center justify-center gap-2">
          <span>Đang tải đại diện…</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-left">
                  <th className="py-3 px-4 w-1/3">Doanh nghiệp</th>
                  <th className="py-3 px-4 w-1/2">Người đại diện & Tài khoản</th>
                  <th className="py-3 px-4 text-right w-1/6">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pagination.items.flatMap((item) => {
                  const representatives = item.daiDiens?.length ? item.daiDiens : [null]
                  return representatives.map((rep) => {
                  const hasOtherActiveAccount = item.daiDiens?.some((other) => other.maDaiDien !== rep?.maDaiDien && other.taiKhoanHoatDong > 0)
                  return (
                    <tr key={`${item.maCongTy}-${rep?.maDaiDien || 'none'}`} className="hover:bg-slate-50/60 transition-colors align-top">
                      {/* Cột Doanh nghiệp */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{item.tenCongTy}</div>
                        {item.daiDiens?.length > 1 && (
                          <p className="mt-2 text-amber-800 leading-relaxed">
                            Dữ liệu cũ có {item.daiDiens.length} đại diện. QTV cần xác minh và chỉ giữ một tài khoản hoạt động tại tab Tài khoản; giữ các bản ghi lịch sử.
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                            {item.maCongTy}
                          </span>
                          {item.chiTiepNhanTuTim && (
                            <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                              DN tiếp nhận bên ngoài
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cột Người đại diện và tài khoản */}
                      <td className="py-3 px-4">
                        {!rep ? (
                          <div className="space-y-1.5 py-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Chưa thiết lập đại diện
                            </span>
                            {item.lienHeHoSo && item.lienHeHoSo.length > 0 && (
                              <div className="text-[11px] text-slate-500">
                                Đầu mối hồ sơ:{' '}
                                <span className="font-medium text-slate-700">
                                  {item.lienHeHoSo.map((c) => `${c.nguoiLienHe} (${c.lienHe})`).join('; ')}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-100/60 transition-colors">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{rep.hoTen}</span>
                                <span className="font-mono text-[11px] text-slate-500">
                                  ({rep.maDaiDien})
                                </span>
                                {rep.chucVu && (
                                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium">
                                    {rep.chucVu}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-600 font-mono">
                                {rep.email || <span className="italic text-slate-400 font-sans">Chưa có email</span>}
                              </div>
                              <div className="pt-0.5">{getRepStatusBadge(rep)}</div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={saving || rep.soTaiKhoan > 0 || hasOtherActiveAccount}
                                onClick={() => {
                                  if (onSelect) {
                                    onSelect(rep, item)
                                  } else {
                                    openAccountModal(rep, item)
                                  }
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                  rep.soTaiKhoan > 0 || hasOtherActiveAccount
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                    : 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600'
                                }`}
                              >
                                Dùng đại diện này
                              </button>
                              {rep.soTaiKhoan === 0 && (
                                <button
                                  type="button"
                                  disabled={saving || hasOtherActiveAccount}
                                  onClick={() => openAccountModal(rep, item)}
                                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-2xs"
                                  title="Cấp tài khoản trực tiếp ngay tại đây"
                                >
                                  Cấp TK tại chỗ
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Cột Thao tác */}
                      <td className="py-3 px-4 text-right">
                        {!rep ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              setSelected(item)
                              setForm({
                                hoTen: item.lienHeHoSo?.[0]?.nguoiLienHe || '',
                                chucVu: '',
                                email: item.lienHeHoSo?.[0]?.lienHe || '',
                                daXacMinh: false,
                              })
                            }}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-all cursor-pointer shadow-2xs"
                          >
                            Thêm đại diện
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              setSelected({ ...item, rep })
                              setForm({
                                hoTen: rep.hoTen,
                                chucVu: rep.chucVu || '',
                                email: rep.email || '',
                                daXacMinh: true,
                              })
                            }}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                            title="Cập nhật thông tin người đại diện"
                          >
                            Sửa đại diện
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                  })
                })}

                {!filtered.length && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-slate-400 italic bg-slate-50/40">
                      Không có DN phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} label="doanh nghiệp" />
        </div>
      )}

      {/* Form Thiết lập / Cập nhật Đại diện duy nhất */}
      {selected && (
        <form
          onSubmit={saveRepresentative}
          className="mt-6 p-5 rounded-2xl bg-teal-50/40 border border-teal-200/80 shadow-xs animate-in fade-in duration-200"
        >
          <fieldset disabled={saving || loading} className="border-0 p-0 m-0 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-teal-200/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-slate-900 m-0">
                  {selected.rep
                    ? `Cập nhật thông tin đại diện — ${selected.tenCongTy} (${selected.rep.maDaiDien})`
                    : `Thiết lập người đại diện — ${selected.tenCongTy} (${selected.maCongTy})`}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1 rounded-lg hover:bg-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-teal-50/80 border border-teal-200/70 text-xs text-teal-950 leading-relaxed space-y-1">
              <div>
                <strong>Quy định nghiệp vụ:</strong> Mỗi doanh nghiệp chỉ có <strong>01 người đại diện duy nhất</strong> làm đầu mối liên hệ và cấp tài khoản Cổng Doanh nghiệp.
              </div>
              {selected.lienHeHoSo && selected.lienHeHoSo.length > 0 && (
                <div className="text-slate-600">
                  <span className="font-semibold text-slate-700">Đầu mối từ hồ sơ SV đã công nhận (đối chiếu):</span>{' '}
                  {selected.lienHeHoSo.map((c) => `${c.nguoiLienHe}: ${c.lienHe}`).join('; ')}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <label className="block text-xs font-semibold text-slate-700 space-y-1">
                <span>Họ tên <strong className="text-rose-500">*</strong></span>
                <input
                  aria-label="Họ tên đại diện"
                  required
                  maxLength={100}
                  placeholder="VD: Nguyễn Văn A"
                  value={form.hoTen}
                  onChange={(e) => setForm({ ...form, hoTen: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-normal"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-700 space-y-1">
                <span>Chức vụ</span>
                <input
                  maxLength={100}
                  placeholder="VD: Trưởng phòng HR, Tech Lead..."
                  value={form.chucVu}
                  onChange={(e) => setForm({ ...form, chucVu: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-normal"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-700 space-y-1">
                <span>Email <strong className="text-rose-500">*</strong></span>
                <input
                  aria-label="Email đại diện"
                  type="email"
                  required
                  maxLength={200}
                  placeholder="VD: hr@congty.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-normal"
                />
              </label>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/90 border border-teal-200/60 text-xs text-slate-700 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.daXacMinh}
                onChange={(e) => setForm({ ...form, daXacMinh: e.target.checked })}
                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
              />
              <span>
                Đã phối hợp Khoa/DN xác minh đây là người được DN ủy quyền truy cập dữ liệu công ty và chấm CLO
              </span>
            </label>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={
                  saving ||
                  loading ||
                  !form.hoTen.trim() ||
                  !form.email.trim() ||
                  !form.daXacMinh
                }
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-xs shadow-teal-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Đang lưu…' : selected.rep ? 'Lưu thay đổi' : 'Tạo và chọn đại diện'}
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {/* Modal Cấp tài khoản trực tiếp ngay tại danh bạ DN */}
      {accountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">Cấp tài khoản doanh nghiệp</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tạo tài khoản truy cập Cổng Doanh nghiệp (VT05)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="my-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div>Đại diện: <strong className="text-slate-900">{accountModal.rep.hoTen}</strong> <span className="font-mono text-slate-500">({accountModal.rep.maDaiDien})</span></div>
              <div>Đơn vị: <strong className="text-slate-900">{accountModal.company.tenCongTy}</strong></div>
              {accountModal.rep.email && <div>Email: <span className="text-slate-600">{accountModal.rep.email}</span></div>}
            </div>

            <form onSubmit={handleCreateAccountInModal} className="space-y-3.5">
              <label className="block text-xs font-semibold text-slate-700 space-y-1">
                <span>Mã tài khoản <strong className="text-rose-500">*</strong></span>
                <input
                  required
                  value={accountForm.maTaiKhoan}
                  onChange={(e) => setAccountForm({ ...accountForm, maTaiKhoan: e.target.value })}
                  placeholder="VD: TK_DD001"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-700 space-y-1">
                <span>Tên đăng nhập <strong className="text-rose-500">*</strong></span>
                <input
                  required
                  value={accountForm.tenDangNhap}
                  onChange={(e) => setAccountForm({ ...accountForm, tenDangNhap: e.target.value })}
                  placeholder="Tên đăng nhập cho đại diện"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-700 space-y-1">
                <span>Mật khẩu khởi tạo <strong className="text-rose-500">*</strong></span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={accountForm.matKhau}
                  onChange={(e) => setAccountForm({ ...accountForm, matKhau: e.target.value })}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAccountModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={creatingAccount}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {creatingAccount ? 'Đang tạo...' : 'Xác nhận cấp tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
