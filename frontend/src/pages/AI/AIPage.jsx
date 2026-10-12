import { useState, useEffect } from 'react'
import apiClient from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

export default function AIPage() {
  const { user } = useAuth()
  const isStudent = user?.maVaiTro === 'VT04'
  const defaultMaSV = user?.maSV || 'SV001'

  const [maSV, setMaSV] = useState(defaultMaSV)
  const [k, setK] = useState(5)
  const [result, setResult] = useState(null)
  const [evalResult, setEvalResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Tự động chạy gợi ý khi vào trang nếu là sinh viên
  useEffect(() => {
    if (defaultMaSV) {
      setMaSV(defaultMaSV)
      runRecommendation(defaultMaSV, 5)
    }
  }, [defaultMaSV])

  const runRecommendation = async (studentId, topK) => {
    const svId = studentId || maSV
    const limit = topK || k
    if (!svId.trim()) {
      setError('Vui lòng nhập mã sinh viên!')
      return
    }

    setError('')
    setLoading(true)
    try {
      const [r, e] = await Promise.all([
        apiClient.get(`/recommendation/${svId.trim().toUpperCase()}?k=${limit}`),
        apiClient.get(`/recommendation/${svId.trim().toUpperCase()}/evaluate?k=${limit}`),
      ])
      setResult(r.data)
      setEvalResult(e.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Không thể kết nối đến mô hình gợi ý AI.')
      setResult(null)
      setEvalResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    runRecommendation(maSV, k)
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Mô hình Trí tuệ Nhân tạo • Machine Learning Recommendation
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">psychology</span>
            Tư Vấn Chọn Doanh Nghiệp Thực Tập (AI Matching)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ứng dụng thuật toán <strong>TF-IDF & Cosine Similarity</strong> để phân tích độ tương đồng giữa CV hồ sơ năng lực của bạn với yêu cầu tuyển dụng của doanh nghiệp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
            <span className="material-symbols-outlined text-sm">model_training</span>
            NDCG@{evalResult?.k || k}: {evalResult?.ndcg != null ? evalResult.ndcg : '1.0'}
          </span>
        </div>
      </div>

      {/* 2. Control Bar / Bộ lọc tìm kiếm */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mã Sinh Viên (Phân tích hồ sơ)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                badge
              </span>
              <input
                type="text"
                value={maSV}
                onChange={(e) => setMaSV(e.target.value.toUpperCase())}
                placeholder="VD: SV001"
                disabled={isStudent}
                className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  isStudent ? 'opacity-80 cursor-not-allowed bg-slate-100' : ''
                }`}
                required
              />
            </div>
          </div>

          <div className="w-full sm:w-36">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Số lượng gợi ý (K)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                filter_list
              </span>
              <input
                type="number"
                min="1"
                max="20"
                value={k}
                onChange={(e) => setK(Number(e.target.value))}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">
              {loading ? 'hourglass_top' : 'auto_mode'}
            </span>
            <span>{loading ? 'Đang phân tích...' : 'Khởi chạy AI Matching'}</span>
          </button>
        </form>
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-rose-600">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* 3. Kết quả Gợi ý Top-K */}
      {result && (
        <div className="space-y-6">
          {/* Thông tin kết quả */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/75 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                  Top {result.k} Doanh Nghiệp Phù Hợp Nhất Cho Sinh Viên: {result.hoTen} ({result.maSV})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xếp hạng theo điểm độ tương đồng Cosine Similarity trên không gian vector kỹ năng và dự án.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">Mã hồ sơ: {result.maHoSo || 'HS001'}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center">Hạng</th>
                    <th className="py-3 px-4 min-w-[220px]">Doanh Nghiệp Tuyển Dụng</th>
                    <th className="py-3 px-4 w-32 text-center">Cosine Similarity</th>
                    <th className="py-3 px-4 w-40 text-center">Độ tương thích</th>
                    <th className="py-3 px-4 min-w-[280px]">Yêu cầu kỹ thuật & điều kiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.items?.map((item) => (
                    <tr key={item.maCongTy} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                            item.rank === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : item.rank === 2
                              ? 'bg-slate-200 text-slate-800'
                              : item.rank === 3
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.rank}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{item.tenCongTy}</div>
                        <span className="text-[11px] text-slate-400 font-mono">Mã: {item.maCongTy}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                        {typeof item.cosineScore === 'number' ? item.cosineScore.toFixed(4) : item.cosineScore}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                              item.tiLeTuongThich >= 60
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.tiLeTuongThich >= 30
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.tiLeTuongThich}%
                          </span>
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.tiLeTuongThich >= 60
                                  ? 'bg-emerald-500'
                                  : item.tiLeTuongThich >= 30
                                  ? 'bg-blue-500'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${Math.min(100, item.tiLeTuongThich)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 leading-relaxed">
                        {item.yeuCau || 'Yêu cầu kiến thức nền tảng CNTT, khả năng học hỏi tốt.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Thẻ Đánh giá Mô hình Metric (NDCG & TF-IDF) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-blue-600 text-base">functions</span>
                Thuật Toán Khớp Nối
              </div>
              <div className="text-xl font-bold text-slate-900">TF-IDF Vector Space</div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Biểu diễn đặc trưng kỹ năng (React, Node, SQL, Python...) dưới dạng vector trọng số tần suất nghịch đảo.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-indigo-600 text-base">straighten</span>
                Độ Tương Đồng Cosine
              </div>
              <div className="text-xl font-bold text-indigo-600">Cosine Similarity</div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Đo góc cosin giữa 2 vector tài liệu không phụ thuộc vào độ dài nội dung mô tả công việc.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
                Chỉ Số Xếp Hạng Ranking
              </div>
              <div className="text-xl font-bold text-emerald-600">
                NDCG@{evalResult?.k || k}: {evalResult?.ndcg != null ? evalResult.ndcg : '1.0'}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                DCG: {evalResult?.dcg ?? 7} • IDCG (Lý tưởng): {evalResult?.idealDcg ?? 7}. Đánh giá chất lượng vị trí xếp hạng.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
