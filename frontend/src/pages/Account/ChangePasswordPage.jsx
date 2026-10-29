import { useState } from 'react'
import apiClient from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

export default function ChangePasswordPage() {
  const { user } = useAuth()
  const [f, setF] = useState({
    MatKhauCu: '',
    MatKhauMoi: '',
    XacNhanMatKhau: '',
  })

  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setMsg('')

    if (!f.MatKhauCu || !f.MatKhauMoi || !f.XacNhanMatKhau) {
      setErr('Vui lòng điền đầy đủ tất cả các trường.')
      return
    }

    if (f.MatKhauMoi.length < 6) {
      setErr('Mật khẩu mới phải có tối thiểu 6 ký tự.')
      return
    }

    if (f.MatKhauMoi !== f.XacNhanMatKhau) {
      setErr('Mật khẩu xác nhận không trùng khớp với mật khẩu mới.')
      return
    }

    try {
      setSubmitting(true)
      const r = await apiClient.post('/auth/change-password', {
        MatKhauCu: f.MatKhauCu,
        MatKhauMoi: f.MatKhauMoi,
      })

      setMsg(r.data?.message || 'Đổi mật khẩu thành công!')
      setF({
        MatKhauCu: '',
        MatKhauMoi: '',
        XacNhanMatKhau: '',
      })
    } catch (e) {
      setErr(
        e.response?.data?.message ||
          e.message ||
          'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
            <span className="material-symbols-outlined text-2xl">lock_reset</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Thay Đổi Mật Khẩu</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật mật khẩu để bảo vệ tài khoản của bạn ({user?.tenDangNhap || user?.maSV || user?.maGV || 'Tài khoản'})
            </p>
          </div>
        </div>
      </div>

      {/* Card Form */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        {err && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{err}</span>
          </div>
        )}

        {msg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{msg}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {/* Mật khẩu hiện tại */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Mật khẩu hiện tại
            </label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={f.MatKhauCu}
                onChange={(e) => setF({ ...f, MatKhauCu: e.target.value })}
                placeholder="Nhập mật khẩu hiện tại"
                required
                className="w-full h-11 px-3.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">
                  {showOld ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Mật khẩu mới */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={f.MatKhauMoi}
                onChange={(e) => setF({ ...f, MatKhauMoi: e.target.value })}
                placeholder="Tối thiểu 6 ký tự"
                required
                className="w-full h-11 px-3.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">
                  {showNew ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              value={f.XacNhanMatKhau}
              onChange={(e) => setF({ ...f, XacNhanMatKhau: e.target.value })}
              placeholder="Nhập lại mật khẩu mới"
              required
              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">sync</span>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">check</span>
                  <span>Cập nhật mật khẩu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}