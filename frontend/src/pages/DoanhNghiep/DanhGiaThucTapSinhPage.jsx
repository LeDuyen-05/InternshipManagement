import { useState, useEffect } from 'react'
import { useEnterprise } from '../../components/layout/EnterpriseLayout.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'

export default function DanhGiaThucTapSinhPage() {
  const { activeCompany } = useEnterprise()
  const [interns, setInterns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIntern, setSelectedIntern] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  // Form evaluation
  const [evalForm, setEvalForm] = useState({
    diemKyLuat: 9.0,
    diemChuyenMon: 8.5,
    diemLamViecNhom: 9.0,
    nhanXet: 'Sinh viên hoàn thành xuất sắc các mục tiêu đề ra, chủ động học hỏi và hòa nhập tốt với nhóm dự án.',
  })

  useEffect(() => {
    async function fetchInterns() {
      if (!activeCompany?.maCongTy) return
      try {
        setLoading(true)
        const res = await doanhNghiepService.getThucTapSinh(activeCompany.maCongTy)
        setInterns(res || [])
      } catch (err) {
        console.error('Lỗi lấy danh sách thực tập sinh:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchInterns()
  }, [activeCompany?.maCongTy])

  const handleOpenEvalModal = (intern) => {
    setSelectedIntern(intern)
    setEvalForm({
      diemKyLuat: 9.0,
      diemChuyenMon: 8.5,
      diemLamViecNhom: 9.0,
      nhanXet: intern.danhGia?.includes('Nhận xét:')
        ? intern.danhGia.split('Nhận xét:')[1]?.trim() || ''
        : intern.danhGia || 'Sinh viên có thái độ học tập và làm việc nghiêm túc, hoàn thành tốt nhiệm vụ được giao.',
    })
  }

  const handleSaveEvaluation = async (e) => {
    e.preventDefault()
    if (!selectedIntern) return

    try {
      setSubmitting(true)
      const res = await doanhNghiepService.danhGiaThucTapSinh({
        maPhanBo: selectedIntern.maPhanBo,
        diemKyLuat: parseFloat(evalForm.diemKyLuat),
        diemChuyenMon: parseFloat(evalForm.diemChuyenMon),
        diemLamViecNhom: parseFloat(evalForm.diemLamViecNhom),
        nhanXet: evalForm.nhanXet,
      })

      setInterns((prev) =>
        prev.map((item) =>
          item.maPhanBo === selectedIntern.maPhanBo
            ? {
                ...item,
                danhGia: res.danhGia,
                daDanhGia: true,
                trangThai: 'HoanThanh',
              }
            : item
        )
      )

      setToast({
        type: 'success',
        message: `Đã lưu đánh giá thực tập sinh ${selectedIntern.hoTenSV} thành công! (Điểm DN: ${res.diemTongKet}/10)`,
      })
      setSelectedIntern(null)
    } catch (err) {
      console.error('Lỗi lưu đánh giá:', err)
      setToast({ type: 'error', message: 'Không thể lưu đánh giá. Vui lòng thử lại.' })
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const diemTongKetTamTinh = Math.round(
    (evalForm.diemKyLuat * 0.3 + evalForm.diemChuyenMon * 0.5 + evalForm.diemLamViecNhom * 0.2) * 10
  ) / 10

  const stats = {
    total: interns.length,
    hoanThanh: interns.filter((i) => i.trangThai === 'HoanThanh' || i.daDanhGia).length,
    dangThucTap: interns.filter((i) => i.trangThai !== 'HoanThanh' && !i.daDanhGia).length,
    diemTB: '8.8',
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between border shadow-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản Lý Thực Tập Sinh & Đánh Giá Kết Quả
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi sinh viên thực tập chính thức tại doanh nghiệp, nhận xét quá trình làm việc và ghi nhận điểm số chuyên môn
          </p>
        </div>
      </div>

      {/* 4 Bento Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng thực tập sinh</div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.total} <span className="text-xs font-normal text-slate-500">sinh viên</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Chính thức phân bổ tại DN</div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã hoàn thành đánh giá</div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{stats.hoanThanh} <span className="text-xs font-normal text-slate-500">sinh viên</span></div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Đã có phiếu điểm doanh nghiệp</div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang thực tập (Chờ chấm)</div>
          <div className="text-2xl font-black text-amber-600 mt-2">{stats.dangThucTap} <span className="text-xs font-normal text-slate-500">sinh viên</span></div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">Chưa hoàn tất đánh giá cuối kỳ</div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Điểm đánh giá TB DN</div>
          <div className="text-2xl font-black text-indigo-700 mt-2">{stats.diemTB} <span className="text-xs font-normal text-slate-500">/ 10</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Chất lượng thực tập sinh</div>
        </div>
      </div>

      {/* Interns Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Danh sách sinh viên đang thực tập chính thức
          </h2>
          <span className="text-xs text-slate-500">Đợt thực tập HK2 (2026 - 2027)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Thực tập sinh</th>
                <th className="py-3.5 px-3">Vị trí thực tập</th>
                <th className="py-3.5 px-3">Người hướng dẫn</th>
                <th className="py-3.5 px-3">Đánh giá của Doanh nghiệp</th>
                <th className="py-3.5 px-3">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {interns.length > 0 ? (
                interns.map((item) => (
                  <tr key={item.maPhanBo} className="hover:bg-indigo-50/30 transition-colors">
                    {/* Student */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                          {item.hoTenSV?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{item.hoTenSV}</div>
                          <div className="text-[11px] text-slate-400">
                            MSSV: {item.maSinhVien} • Lớp: {item.lopSV} • GPA: {item.gpaSV}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Position */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-800 text-xs">{item.viTriThucTap}</div>
                      <div className="text-[11px] text-slate-400">{item.thoiGianThucTap}</div>
                    </td>

                    {/* Mentors */}
                    <td className="py-3.5 px-3">
                      <div>Mentor: <strong className="text-slate-800">{item.tenMentor}</strong></div>
                      <div className="text-[11px] text-slate-400">GVHD: {item.tenGVHD}</div>
                    </td>

                    {/* Evaluation review */}
                    <td className="py-3.5 px-3">
                      <p className="text-[11px] text-slate-600 max-w-xs truncate" title={item.danhGia}>
                        {item.danhGia}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.trangThai === 'HoanThanh' || item.daDanhGia
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.trangThai === 'HoanThanh' || item.daDanhGia ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'
                        }`}></span>
                        {item.trangThai === 'HoanThanh' || item.daDanhGia ? 'Đã đánh giá' : 'Đang thực tập'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEvalModal(item)}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[11px] transition-colors shadow-2xs flex items-center gap-1 ml-auto"
                      >
                        <span className="material-symbols-outlined text-[15px]">rate_review</span>
                        <span>{item.trangThai === 'HoanThanh' || item.daDanhGia ? 'Sửa đánh giá' : 'Chấm điểm'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-xs text-slate-400">
                    Chưa có sinh viên nào được phân bổ thực tập tại công ty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Chấm điểm & Đánh giá thực tập sinh */}
      {selectedIntern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Phiếu Đánh Giá Thực Tập Sinh</h3>
                <div className="text-[11px] text-slate-500">
                  {selectedIntern.hoTenSV} ({selectedIntern.maSinhVien}) • {selectedIntern.lopSV}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIntern(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEvaluation} className="p-6 space-y-4 text-xs">
              {/* Score Criterion 1 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">1. Ý thức kỷ luật, chuyên cần & tác phong (30%)</label>
                  <span className="font-bold text-indigo-700 text-sm">{evalForm.diemKyLuat} / 10</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="10"
                  step="0.5"
                  value={evalForm.diemKyLuat}
                  onChange={(e) => setEvalForm({ ...evalForm, diemKyLuat: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Score Criterion 2 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">2. Năng lực chuyên môn & Khả năng giải quyết vấn đề (50%)</label>
                  <span className="font-bold text-indigo-700 text-sm">{evalForm.diemChuyenMon} / 10</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="10"
                  step="0.5"
                  value={evalForm.diemChuyenMon}
                  onChange={(e) => setEvalForm({ ...evalForm, diemChuyenMon: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Score Criterion 3 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">3. Kỹ năng làm việc nhóm & Tinh thần trách nhiệm (20%)</label>
                  <span className="font-bold text-indigo-700 text-sm">{evalForm.diemLamViecNhom} / 10</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="10"
                  step="0.5"
                  value={evalForm.diemLamViecNhom}
                  onChange={(e) => setEvalForm({ ...evalForm, diemLamViecNhom: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Summary Score Callout */}
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                <span className="font-bold text-indigo-900">Điểm tổng kết doanh nghiệp:</span>
                <span className="text-base font-black text-indigo-700">{diemTongKetTamTinh} / 10.0</span>
              </div>

              {/* Detailed Feedback */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nhận xét chi tiết của Mentor / Doanh nghiệp *</label>
                <textarea
                  rows={3}
                  required
                  value={evalForm.nhanXet}
                  onChange={(e) => setEvalForm({ ...evalForm, nhanXet: e.target.value })}
                  placeholder="Nhận xét ưu điểm, mặt cần cải thiện và thái độ làm việc của sinh viên..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-xs"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedIntern(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold transition-all flex items-center gap-1.5"
                >
                  {submitting ? 'Đang lưu...' : 'Ghi nhận đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
