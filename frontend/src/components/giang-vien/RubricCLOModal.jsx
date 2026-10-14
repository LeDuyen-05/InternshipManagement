export default function RubricCLOModal({ isOpen, onClose, criteria = [] }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                CHUẨN ĐÁNH GIÁ THỰC TẬP
              </span>
              <span>•</span>
              <span>KHOA CÔNG NGHỆ THÔNG TIN</span>
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">menu_book</span>
              Hướng Dẫn Tiêu Chí Đánh Giá (Rubric)
            </h3>
            <p className="text-xs text-blue-100 mt-1">
              Quy định thang điểm và tiêu chí đánh giá kết quả thực tập tốt nghiệp
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase">
                  <th className="py-3 px-4 w-28">Mã tiêu chí</th>
                  <th className="py-3 px-4">Tên tiêu chí đánh giá</th>
                  <th className="py-3 px-4 w-32 text-center">Điểm tối đa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {criteria.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">
                      Chưa có danh mục tiêu chí đánh giá.
                    </td>
                  </tr>
                ) : (
                  criteria.map((c) => (
                    <tr key={c.maTieuChi} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-blue-700">{c.maTieuChi}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{c.tenTieuChi}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                        {c.diemToiDa} đ
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1.5 text-xs">
            <p className="font-semibold text-slate-800">Quy tắc chấm điểm:</p>
            <p>• Điểm mỗi tiêu chí không được vượt quá điểm tối đa quy định.</p>
            <p>• Tổng điểm của toàn bộ các tiêu chí tối đa là 10.0 điểm theo thang điểm hệ thống.</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
