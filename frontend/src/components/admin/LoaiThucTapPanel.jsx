import { useCallback, useEffect, useState } from 'react'
import apiClient from '../../services/api'
import { toast } from '../../contexts/ToastContext.jsx'

const EMPTY = { maLoai: '', tenLoai: '' }

// Danh mục loại thực tập dùng chung toàn trường; khoa chọn loại khi tạo bộ tiêu chí và đợt thực tập.
export default function LoaiThucTapPanel() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    apiClient.get('/loai-thuc-tap')
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Không tải được danh mục loại thực tập.'))
  }, [])
  useEffect(() => { load() }, [load])

  const create = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await apiClient.post('/loai-thuc-tap', { maLoai: form.maLoai.trim().toUpperCase(), tenLoai: form.tenLoai.trim(), hoatDong: true })
      toast.success('Đã thêm loại thực tập. Các khoa tạo bộ tiêu chí cho loại này rồi mới mở đợt.')
      setForm(EMPTY)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thêm được loại thực tập.')
    } finally {
      setSaving(false)
    }
  }

  const save = async (item, changes) => {
    setSaving(true)
    try {
      await apiClient.put(`/loai-thuc-tap/${item.maLoai}`, { maLoai: item.maLoai, tenLoai: item.tenLoai, hoatDong: item.hoatDong, ...changes })
      toast.success('Đã cập nhật loại thực tập.')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không cập nhật được loại thực tập.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all'

  return (
    <section className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Loại thực tập dùng chung</h2>
        <p className="text-xs text-slate-500 mt-1">
          Mỗi khoa chọn loại phù hợp với chương trình đào tạo của mình (VD: thực tập tốt nghiệp, thực tập cuối khóa).
          Loại đã dùng không xóa được; muốn ngừng thì tắt sử dụng.
        </p>
      </div>
      <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-3 items-end">
        <label className="block text-xs font-semibold text-slate-700 space-y-1">
          <span>Mã loại <strong className="text-rose-500">*</strong></span>
          <input required maxLength={20} pattern="[A-Za-z0-9_]{2,20}" title="2–20 ký tự chữ, số hoặc dấu gạch dưới" placeholder="VD: TTTN"
            value={form.maLoai} onChange={(e) => setForm({ ...form, maLoai: e.target.value.toUpperCase() })} className={`${inputCls} font-mono uppercase`} />
        </label>
        <label className="block text-xs font-semibold text-slate-700 space-y-1">
          <span>Tên loại thực tập <strong className="text-rose-500">*</strong></span>
          <input required minLength={3} maxLength={100} placeholder="VD: Thực tập tốt nghiệp"
            value={form.tenLoai} onChange={(e) => setForm({ ...form, tenLoai: e.target.value })} className={inputCls} />
        </label>
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50">
          Thêm loại
        </button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-left">
              <th className="py-2.5 px-4 w-28">Mã loại</th>
              <th className="py-2.5 px-4">Tên loại thực tập</th>
              <th className="py-2.5 px-4">Trạng thái</th>
              <th className="py-2.5 px-4 text-right w-40">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((x) => (
              <tr key={x.maLoai} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{x.maLoai}</td>
                <td className="py-2.5 px-4">
                  {editing?.maLoai === x.maLoai
                    ? <input autoFocus value={editing.tenLoai} onChange={(e) => setEditing({ ...editing, tenLoai: e.target.value })} className={inputCls} />
                    : <span className="font-semibold text-slate-900">{x.tenLoai}</span>}
                </td>
                <td className="py-2.5 px-4">
                  <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${x.hoatDong
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {x.hoatDong ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right whitespace-nowrap space-x-1.5">
                  {editing?.maLoai === x.maLoai ? (
                    <>
                      <button type="button" disabled={saving} onClick={() => save(x, { tenLoai: editing.tenLoai.trim() })}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold cursor-pointer disabled:opacity-50">Lưu</button>
                      <button type="button" onClick={() => setEditing(null)} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold cursor-pointer">Hủy</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => setEditing({ maLoai: x.maLoai, tenLoai: x.tenLoai })}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer">Đổi tên</button>
                      <button type="button" disabled={saving} onClick={() => save(x, { hoatDong: !x.hoatDong })}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50 ${x.hoatDong ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                        {x.hoatDong ? 'Ngừng' : 'Dùng lại'}
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
  )
}
