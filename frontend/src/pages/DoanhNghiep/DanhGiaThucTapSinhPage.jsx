import { useState, useEffect } from 'react'
import { useEnterprise } from '../../components/layout/EnterpriseLayout.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'
import ModalOverlay from '../../components/common/ModalOverlay.jsx'
import phieuChamDiemService from '../../services/phieuChamDiemService.js'
import { PHAN_BO } from '../../utils/trangThai'

// Phiếu nhận xét của đơn vị thực tập theo file chấm điểm của Khoa:
// CLO4.1 – ý thức, trách nhiệm, kỷ luật (tối đa 2đ); CLO4.2 – vận dụng kiến thức vào thực tiễn (tối đa 3đ).
export default function DanhGiaThucTapSinhPage() {
  const { activeCompany } = useEnterprise()
  const [interns, setInterns] = useState([])
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIntern, setSelectedIntern] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [scores, setScores] = useState({})
  const [nhanXet, setNhanXet] = useState('')

  useEffect(() => {
    phieuChamDiemService
      .getDanhSachTieuChi('DN')
      .then((res) => setCriteria(res.data?.data || []))
      .catch(() => setCriteria([]))
  }, [])

  const fetchInterns = async (maCongTy) => {
    if (!maCongTy) return
    try {
      setLoading(true)
      const res = await doanhNghiepService.getThucTapSinh(maCongTy)
      setInterns(res || [])
    } catch (err) {
      console.error('Lỗi lấy danh sách thực tập sinh:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInterns(activeCompany?.maCongTy)
  }, [activeCompany?.maCongTy])

  const handleOpenEvalModal = (intern) => {
    setSelectedIntern(intern)
    const loaded = {}
    for (const c of intern.chiTietDiemDN || []) loaded[c.maTieuChi] = Number(c.diemCham)
    setScores(loaded)
    setNhanXet(intern.danhGia || '')
  }

  const handleScoreChange = (c, value) => {
    if (value === '') {
      setScores((prev) => ({ ...prev, [c.maTieuChi]: '' }))
      return
    }
    const num = Math.min(Number(c.diemToiDa), Math.max(0, parseFloat(value) || 0))
    setScores((prev) => ({ ...prev, [c.maTieuChi]: num }))
  }

  const tongDiemDN = criteria.reduce((sum, c) => sum + (Number(scores[c.maTieuChi]) || 0), 0)
  const diemToiDaDN = criteria.reduce((sum, c) => sum + Number(c.diemToiDa), 0)
  const chamDu = criteria.length > 0 && criteria.every((c) => scores[c.maTieuChi] !== undefined && scores[c.maTieuChi] !== '')

  const handleSaveEvaluation = async (e) => {
    e.preventDefault()
    if (!selectedIntern || !chamDu) return

    try {
      setSubmitting(true)
      const res = await doanhNghiepService.danhGiaThucTapSinh({
        maPhanBo: selectedIntern.maPhanBo,
        chiTiets: criteria.map((c) => ({ maTieuChi: c.maTieuChi, diemCham: Number(scores[c.maTieuChi]) })),
        nhanXet,
      })
      setToast({
        type: 'success',
        message: `Đã lưu Phiếu nhận xét cho ${selectedIntern.hoTenSV} (điểm đơn vị thực tập: ${Number(res.diemDN).toFixed(2)}/${diemToiDaDN.toFixed(1)}).`,
      })
      setSelectedIntern(null)
      await fetchInterns(activeCompany?.maCongTy)
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Không thể lưu đánh giá. Vui lòng thử lại.' })
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(null), 5000)
    }
  }

  const gradedInterns = interns.filter((i) => i.daDanhGia)
  const stats = {
    total: interns.length,
    hoanThanh: gradedInterns.length,
    dangThucTap: interns.length - gradedInterns.length,
    diemTB:
      gradedInterns.length > 0
        ? (gradedInterns.reduce((sum, i) => sum + Number(i.diemDN || 0), 0) / gradedInterns.length).toFixed(2)
        : '—',
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
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Điểm Phiếu nhận xét TB</div>
          <div className="text-2xl font-black text-indigo-700 mt-2">{stats.diemTB} <span className="text-xs font-normal text-slate-500">/ {diemToiDaDN ? diemToiDaDN.toFixed(1) : '5.0'}</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Chất lượng thực tập sinh</div>
        </div>
      </div>

      {/* Interns Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Danh sách sinh viên đang thực tập chính thức
          </h2>
          <span className="text-xs text-slate-500">{loading ? 'Đang tải...' : `${interns.length} sinh viên`}</span>
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
                            MSSV: {item.maSinhVien} • Lớp: {item.lopSV || '—'} • GPA: {item.gpaSV != null ? item.gpaSV : '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Position */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-800 text-xs">{item.viTriThucTap || '—'}</div>
                      <div className="text-[11px] text-slate-400">{item.tenDot || item.thoiGianThucTap || '—'}</div>
                    </td>

                    {/* Mentors */}
                    <td className="py-3.5 px-3">
                      <div>Mentor: <strong className="text-slate-800">{item.tenMentor || '—'}</strong></div>
                      <div className="text-[11px] text-slate-400">GVHD: {item.tenGVHD || '—'}</div>
                    </td>

                    {/* Evaluation review */}
                    <td className="py-3.5 px-3">
                      {item.daDanhGia && (
                        <div className="text-[11px] text-slate-700">
                          {(item.chiTietDiemDN || []).map((c) => (
                            <span key={c.maTieuChi} className="mr-2 font-semibold">{c.maTieuChi}: {Number(c.diemCham).toFixed(2)}</span>
                          ))}
                          <div className="font-bold text-indigo-700">Tổng: {Number(item.diemDN).toFixed(2)} / {diemToiDaDN.toFixed(1)}</div>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500 max-w-xs truncate" title={item.danhGia || 'Chưa có đánh giá'}>
                        {item.danhGia || (item.daDanhGia ? '' : 'Chưa có đánh giá')}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.daDanhGia
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.daDanhGia ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'
                        }`}></span>
                        {item.daDanhGia ? 'Đã đánh giá' : PHAN_BO[item.trangThai] || item.trangThai}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEvalModal(item)}
                        disabled={item.trangThai === 'ChuaNhanViec'}
                        title={item.trangThai === 'ChuaNhanViec' ? 'Sinh viên chưa xác nhận nhận việc' : undefined}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[11px] transition-colors shadow-2xs flex items-center gap-1 ml-auto disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[15px]">rate_review</span>
                        <span>{item.daDanhGia ? 'Sửa đánh giá' : 'Chấm điểm'}</span>
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
        <ModalOverlay onClose={() => setSelectedIntern(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Phiếu Nhận Xét Của Đơn Vị Thực Tập</h3>
                <div className="text-[11px] text-slate-500">
                  {selectedIntern.hoTenSV} ({selectedIntern.maSinhVien}) • {selectedIntern.lopSV || '—'}
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
              <p className="text-[11px] text-slate-500">
                Phiếu nhận xét của đơn vị thực tập chiếm {diemToiDaDN.toFixed(1)}/10 điểm học phần; phần còn lại do giảng viên hướng dẫn chấm.
              </p>
              {criteria.length === 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                  Chưa tải được tiêu chí Phiếu nhận xét từ hệ thống.
                </div>
              )}
              {criteria.map((c) => (
                <div key={c.maTieuChi} className="flex items-start justify-between gap-3">
                  <label className="font-semibold text-slate-700" htmlFor={`dn-${c.maTieuChi}`}>
                    <span className="text-indigo-700 font-mono mr-1">{c.maTieuChi}</span>
                    {c.tenTieuChi}
                  </label>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      id={`dn-${c.maTieuChi}`}
                      type="number"
                      min="0"
                      max={c.diemToiDa}
                      step="0.1"
                      required
                      value={scores[c.maTieuChi] ?? ''}
                      onChange={(e) => handleScoreChange(c, e.target.value)}
                      className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-center font-bold focus:outline-none focus:border-indigo-600"
                    />
                    <span className="text-slate-400">/ {Number(c.diemToiDa).toFixed(1)}</span>
                  </div>
                </div>
              ))}

              {/* Summary Score Callout */}
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                <span className="font-bold text-indigo-900">Điểm đơn vị thực tập:</span>
                <span className="text-base font-black text-indigo-700">{tongDiemDN.toFixed(2)} / {diemToiDaDN.toFixed(1)}</span>
              </div>

              {/* Detailed Feedback */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nhận xét của Mentor / Đơn vị thực tập *</label>
                <textarea
                  rows={3}
                  required
                  value={nhanXet}
                  onChange={(e) => setNhanXet(e.target.value)}
                  placeholder="Nhận xét về ý thức, trách nhiệm, kỷ luật và khả năng vận dụng kiến thức của sinh viên..."
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
                  disabled={submitting || !chamDu}
                  className="px-5 py-2 rounded-xl disabled:opacity-50 bg-indigo-700 hover:bg-indigo-800 text-white font-bold transition-all flex items-center gap-1.5"
                >
                  {submitting ? 'Đang lưu...' : 'Ghi nhận đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
