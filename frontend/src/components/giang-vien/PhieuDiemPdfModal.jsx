export default function PhieuDiemPdfModal({
  isOpen,
  onClose,
  currentStudent,
  selectedDot,
  criteria = [],
  scores = {},
  totalScore = '0.00',
  gradeInfo = { letter: '-', rank: 'Chưa chấm' },
  generalReview = '',
  lecturerName = '',
}) {
  if (!isOpen || !currentStudent) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Toolbar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-400">picture_as_pdf</span>
            <span className="font-bold text-sm">Xem Trước Phiếu Điểm - {currentStudent.hoTen}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              In phiếu điểm
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* Document Content Container (A4) */}
        <div className="p-8 overflow-y-auto bg-slate-100 flex justify-center">
          <div
            className="bg-white w-full p-8 shadow-md rounded-lg border border-slate-200 text-slate-900 space-y-6"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* Quốc hiệu & Tên trường */}
            <div className="flex justify-between items-start border-b pb-4 text-xs">
              <div className="text-center">
                <p className="font-bold text-slate-800 uppercase">TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM (HUIT)</p>
                <p className="font-semibold text-blue-700 uppercase">KHOA CÔNG NGHỆ THÔNG TIN</p>
                <p className="text-[11px] text-slate-500">Thực tập tốt nghiệp</p>
              </div>
              <div className="text-center">
                <p className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-[12px] font-semibold underline underline-offset-2">Độc lập - Tự do - Hạnh phúc</p>
              </div>
            </div>

            {/* Tiêu đề biểu mẫu */}
            <div className="text-center">
              <h2 className="text-lg font-bold uppercase text-slate-900">
                PHIẾU ĐÁNH GIÁ KẾT QUẢ THỰC TẬP TỐT NGHIỆP
              </h2>
              <p className="text-xs italic text-slate-600 mt-1">
                (Dành cho Giảng viên hướng dẫn đánh giá - {(selectedDot?.tenDot || 'Đợt thực tập').normalize('NFC')})
              </p>
            </div>

            {/* Thông tin sinh viên */}
            <div className="grid grid-cols-2 gap-2.5 text-xs p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <p>• Họ và tên: <strong>{currentStudent?.hoTen || '—'}</strong></p>
              <p>• Mã số sinh viên: <strong>{currentStudent?.maSV || '—'}</strong></p>
              <p>• Lớp sinh hoạt: <strong>{currentStudent?.lop || '—'}</strong></p>
              <p>• Đơn vị thực tập: <strong>{currentStudent?.tenCongTy || '—'}</strong></p>
              <p>• Giảng viên hướng dẫn: <strong>{lecturerName || '—'}</strong></p>
            </div>

            {/* Bảng điểm chi tiết */}
            <div>
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-center font-bold">
                    <th className="p-2 border-r border-slate-300 w-20">Mã tiêu chí</th>
                    <th className="p-2 border-r border-slate-300">Nội dung đánh giá</th>
                    <th className="p-2 border-r border-slate-300 w-24">Điểm tối đa</th>
                    <th className="p-2 w-24">Điểm chấm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {criteria.map((c) => (
                    <tr key={c.maTieuChi}>
                      <td className="p-2 border-r border-slate-200 text-center font-bold">{c.maTieuChi}</td>
                      <td className="p-2 border-r border-slate-200">{c.tenTieuChi}</td>
                      <td className="p-2 border-r border-slate-200 text-center">{c.diemToiDa} đ</td>
                      <td className="p-2 text-center font-bold text-blue-700">
                        {scores[c.maTieuChi] ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                    <td colSpan={2} className="p-2.5 text-right uppercase border-r border-slate-300">
                      Tổng điểm kết luận:
                    </td>
                    <td className="p-2.5 text-center font-bold font-mono text-blue-800 border-r border-slate-300">
                      {totalScore} / 10.0
                    </td>
                    <td className="p-2 text-center">
                      Xếp loại: <strong>{gradeInfo.letter} ({gradeInfo.rank})</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Nhận xét chung */}
            {generalReview && (
              <div className="text-xs p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <strong className="block text-slate-800 mb-1">Ghi chú của Giảng viên hướng dẫn:</strong>
                <p className="italic text-slate-700 leading-relaxed">{generalReview}</p>
              </div>
            )}

            {/* Chữ ký xác nhận */}
            <div className="flex justify-between items-end pt-8 text-xs">
              <div className="text-center w-48">
                <p className="font-semibold text-slate-600">Trưởng Bộ Môn Duyệt</p>
                <p className="text-[10px] italic text-slate-400 mt-0.5">(Ký và ghi rõ họ tên)</p>
                <div className="h-16"></div>
              </div>
              <div className="text-center w-56">
                <p className="italic text-slate-500 mb-1">
                  TP. Hồ Chí Minh, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </p>
                <p className="font-semibold text-slate-900">Giảng viên hướng dẫn</p>
                <p className="text-[10px] italic text-slate-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
                <div className="h-12 flex items-center justify-center italic text-slate-800 font-bold text-sm">
                  {lecturerName || ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
