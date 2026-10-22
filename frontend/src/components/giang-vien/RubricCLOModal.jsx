export default function RubricCLOModal({ isOpen, onClose, criteria = [] }) {
  if (!isOpen) return null
  const total = criteria.reduce((sum, c) => sum + Number(c.diemToiDa || 0), 0)
  const clo4 = criteria.filter((c) => c.maCLO === 'CLO4.1' || c.maCLO === 'CLO4.2')
  const otherCriteria = criteria.filter((c) => c.maCLO !== 'CLO4.1' && c.maCLO !== 'CLO4.2')

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <header className="p-5 bg-blue-700 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-bold text-lg">Rubric đánh giá thực tập CNTT</h2>
            <p className="text-xs text-blue-100 mt-0.5">Tổng điểm tối đa: {total.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none hover:opacity-80 transition-opacity">×</button>
        </header>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* CLO1–CLO3 */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">CLO1 – CLO3: Giảng viên chấm trực tiếp (5.00 điểm)</h3>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left">CLO</th>
                  <th className="p-2 text-left">Tiêu chí đánh giá</th>
                  <th className="p-2 text-right">Tối đa</th>
                </tr>
              </thead>
              <tbody>
                {otherCriteria.map((c) => (
                  <tr key={c.maTieuChi} className="border-t">
                    <td className="p-2 font-bold text-blue-700">{c.maCLO || c.maTieuChi}</td>
                    <td className="p-2">{c.tenTieuChi}</td>
                    <td className="p-2 text-right font-semibold">{Number(c.diemToiDa).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CLO4 */}
          {clo4.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wide">CLO4: Từ Phiếu nhận xét Doanh nghiệp (5.00 điểm)</h3>
                <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Quy đổi: (Điểm DN / 10) × Tối đa
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-amber-50">
                  <tr>
                    <th className="p-2 text-left">CLO</th>
                    <th className="p-2 text-left">Tiêu chí trên Phiếu nhận xét DN</th>
                    <th className="p-2 text-right">Tối đa</th>
                    <th className="p-2 text-right">Công thức</th>
                  </tr>
                </thead>
                <tbody>
                  {clo4.map((c) => (
                    <tr key={c.maTieuChi} className="border-t">
                      <td className="p-2 font-bold text-amber-700">{c.maCLO}</td>
                      <td className="p-2">
                        <span className="font-medium text-slate-800">
                          {c.maCLO === 'CLO4.1'
                            ? 'Điểm chuyên cần, phong cách'
                            : c.maCLO === 'CLO4.2'
                            ? 'Điểm chuyên môn'
                            : c.tenTieuChi}
                        </span>
                        <span className="text-xs text-slate-500 block">
                          {c.maCLO === 'CLO4.1'
                            ? '(Ý thức, trách nhiệm, kỷ luật)'
                            : c.maCLO === 'CLO4.2'
                            ? '(Khả năng vận dụng kiến thức vào thực tế)'
                            : ''}
                        </span>
                      </td>
                      <td className="p-2 text-right font-semibold">{Number(c.diemToiDa).toFixed(2)}</td>
                      <td className="p-2 text-right text-xs text-slate-500">(DN / 10) × {Number(c.diemToiDa).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="p-4 border-t text-right shrink-0 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">Mức DN: Tốt (9–10) | Khá (7–8) | TB (5–6) | Yếu (&lt; 5)</span>
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 transition-colors">
            Đóng
          </button>
        </footer>
      </div>
    </div>
  )
}
