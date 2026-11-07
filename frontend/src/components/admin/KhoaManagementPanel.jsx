import { useState } from 'react'
import apiClient from '../../services/api'
import { toast } from '../../contexts/ToastContext.jsx'
import LoaiThucTapPanel from './LoaiThucTapPanel'

const EMPTY = { maKhoa: '', tenKhoa: '' }

// Danh mục khoa: mỗi khoa tự quản lý đợt, sinh viên, giảng viên, bộ tiêu chí và thông báo của mình.
export default function KhoaManagementPanel({ khoaList, onChanged }) {
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null) // { maKhoa, tenKhoa }
  const [saving, setSaving] = useState(false)

  const create = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await apiClient.post('/admin/khoa', { maKhoa: form.maKhoa.trim().toUpperCase(), tenKhoa: form.tenKhoa.trim(), hoatDong: true })
      toast.success(`Đã tạo ${data.tenKhoa}. Khoa có sẵn 2 bộ tiêu chí nháp (TTNN, TTKS) để rà soát và ban hành.`)
      setForm(EMPTY)
      onChanged()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không tạo được khoa.')
    } finally {
      setSaving(false)
    }
  }

  const save = async (khoa, changes) => {
    setSaving(true)
    try {
      await apiClient.put(`/admin/khoa/${khoa.maKhoa}`, { maKhoa: khoa.maKhoa, tenKhoa: khoa.tenKhoa, hoatDong: khoa.hoatDong, ...changes })
      toast.success('Đã cập nhật khoa.')
      setEditing(null)
      onChanged()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không cập nhật được khoa.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all'

  return (
    <div className="space-y-6">
      <section className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Thêm khoa sử dụng hệ thống</h2>
          <p className="text-xs text-slate-500 mt-1">
            Cán bộ, giảng viên và sinh viên của mỗi khoa chỉ thấy dữ liệu của khoa mình. Doanh nghiệp đối tác dùng chung toàn trường.
            Sau khi thêm khoa, tạo tài khoản vai trò <strong>Khoa (VT02)</strong> và chọn khoa này ở tab Tài khoản.
          </p>
        </div>
        <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-3 items-end">
          <label className="block text-xs font-semibold text-slate-700 space-y-1">
            <span>Mã khoa <strong className="text-rose-500">*</strong></span>
            <input required maxLength={10} pattern="[A-Za-z0-9_]{2,10}" title="2–10 ký tự chữ, số hoặc dấu gạch dưới" placeholder="VD: QTKD"
              value={form.maKhoa} onChange={(e) => setForm({ ...form, maKhoa: e.target.value.toUpperCase() })} className={`${inputCls} font-mono uppercase`} />
          </label>
          <label className="block text-xs font-semibold text-slate-700 space-y-1">
            <span>Tên khoa <strong className="text-rose-500">*</strong></span>
            <input required minLength={3} maxLength={200} placeholder="VD: Khoa Quản trị kinh doanh"
              value={form.tenKhoa} onChange={(e) => setForm({ ...form, tenKhoa: e.target.value })} className={inputCls} />
          </label>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50">
            Thêm khoa
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-left">
                <th className="py-3 px-4 w-24">Mã khoa</th>
                <th className="py-3 px-4">Tên khoa</th>
                <th className="py-3 px-4 text-right">Cán bộ</th>
                <th className="py-3 px-4 text-right">Giảng viên</th>
                <th className="py-3 px-4 text-right">Sinh viên</th>
                <th className="py-3 px-4 text-right">Đợt</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right w-40">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {khoaList.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400 italic">Chưa có khoa nào.</td></tr>
              ) : khoaList.map((k) => (
                <tr key={k.maKhoa} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{k.maKhoa}</td>
                  <td className="py-3 px-4">
                    {editing?.maKhoa === k.maKhoa ? (
                      <input autoFocus value={editing.tenKhoa} onChange={(e) => setEditing({ ...editing, tenKhoa: e.target.value })} className={inputCls} />
                    ) : (
                      <span className="font-semibold text-slate-900">{k.tenKhoa}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">{k.soCanBo}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{k.soGiangVien}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{k.soSinhVien}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{k.soDot}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${k.hoatDong
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {k.hoatDong ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                    {editing?.maKhoa === k.maKhoa ? (
                      <>
                        <button type="button" disabled={saving} onClick={() => save(k, { tenKhoa: editing.tenKhoa.trim() })}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold cursor-pointer disabled:opacity-50">Lưu</button>
                        <button type="button" onClick={() => setEditing(null)} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold cursor-pointer">Hủy</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setEditing({ maKhoa: k.maKhoa, tenKhoa: k.tenKhoa })}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer">Đổi tên</button>
                        <button type="button" disabled={saving} onClick={() => save(k, { hoatDong: !k.hoatDong })}
                          className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50 ${k.hoatDong ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                          {k.hoatDong ? 'Ngừng' : 'Mở lại'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <LoaiThucTapPanel />
    </div>
  )
}
