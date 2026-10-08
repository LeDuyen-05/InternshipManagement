export default function PhieuDiemPdfModal({
  isOpen,
  onClose,
  currentStudent,
  selectedDot,
  scores,
  comments,
  finalScore,
  gradeInfo,
  generalReview,
}) {
  if (!isOpen || !currentStudent) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Toolbar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-400">picture_as_pdf</span>
            <span className="font-bold text-sm">Xem Trước Phiếu Điểm BM-KD-08/FIT - {currentStudent.hoTen}</span>
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

        {/* Document Content Container (Mô phỏng tờ A4 chính thức) */}
        <div className="p-8 overflow-y-auto bg-slate-100 flex justify-center">
          <div className="bg-white w-full p-8 shadow-md rounded-lg border border-slate-200 text-slate-900 space-y-6 font-serif">
            {/* Quốc hiệu & Tên trường */}
            <div className="flex justify-between items-start border-b pb-4 text-xs">
              <div className="text-center font-sans">
                <p className="font-bold text-slate-800 uppercase">TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM (HUIT)</p>
                <p className="font-semibold text-blue-700 uppercase">KHOA CÔNG NGHỆ THÔNG TIN</p>
                <p className="text-[10px] text-slate-500">Mã biểu mẫu: BM-KD-08/FIT - Thực tập 12 tuần</p>
              </div>
              <div className="text-center font-sans">
                <p className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-[11px] underline">Độc lập - Tự do - Hạnh phúc</p>
              </div>
            </div>

            {/* Tiêu đề biểu mẫu */}
            <div className="text-center">
              <h2 className="text-base font-bold uppercase tracking-wide">
                PHIẾU ĐÁNH GIÁ KẾT QUẢ THỰC TẬP TỐT NGHIỆP
              </h2>
              <p className="text-xs italic text-slate-600 mt-1">
                (Dành cho Giảng viên hướng dẫn đánh giá theo chuẩn CLO - {selectedDot?.tenDot || 'Học kỳ 1'})
              </p>
            </div>

            {/* Thông tin sinh viên */}
            <div className="grid grid-cols-2 gap-2 text-xs font-sans p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p>• Họ và tên: <strong>{currentStudent.hoTen}</strong></p>
              <p>• Mã số sinh viên: <strong>{currentStudent.maSV}</strong></p>
              <p>• Lớp sinh hoạt: <strong>{currentStudent.lop}</strong></p>
              <p>• Đơn vị thực tập: <strong>{currentStudent.tenCongTy}</strong></p>
              <p>• Giảng viên hướng dẫn: <strong>ThS. Nguyễn Văn An (GV001)</strong></p>
              <p>• Tiến độ báo cáo: <strong className="text-emerald-700">{currentStudent.tienDo}</strong></p>
            </div>

            {/* Bảng điểm chi tiết */}
            <div className="font-sans">
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-center font-bold">
                    <th className="p-2 border-r border-slate-300 w-16">Mã CLO</th>
                    <th className="p-2 border-r border-slate-300">Nội dung đánh giá</th>
                    <th className="p-2 border-r border-slate-300 w-16">Trọng số</th>
                    <th className="p-2 border-r border-slate-300 w-20">Điểm (0-10)</th>
                    <th className="p-2 border-r border-slate-300 w-20">Quy đổi</th>
                    <th className="p-2">Nhận xét chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">CLO 1</td>
                    <td className="p-2 border-r border-slate-200">Kiến thức chuyên môn & giải quyết vấn đề</td>
                    <td className="p-2 border-r border-slate-200 text-center">30%</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">{scores.clo1}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-blue-700">
                      {((scores.clo1 || 0) * 0.3).toFixed(2)}
                    </td>
                    <td className="p-2 text-[11px]">{comments.clo1}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">CLO 2</td>
                    <td className="p-2 border-r border-slate-200">Kỹ năng kỹ thuật, công cụ & công nghệ</td>
                    <td className="p-2 border-r border-slate-200 text-center">35%</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">{scores.clo2}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-blue-700">
                      {((scores.clo2 || 0) * 0.35).toFixed(2)}
                    </td>
                    <td className="p-2 text-[11px]">{comments.clo2}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">CLO 3</td>
                    <td className="p-2 border-r border-slate-200">Thái độ làm việc & đạo đức nghề nghiệp</td>
                    <td className="p-2 border-r border-slate-200 text-center">20%</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">{scores.clo3}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-blue-700">
                      {((scores.clo3 || 0) * 0.2).toFixed(2)}
                    </td>
                    <td className="p-2 text-[11px]">{comments.clo3}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">CLO 4</td>
                    <td className="p-2 border-r border-slate-200">Báo cáo tổng kết & tư duy phản biện</td>
                    <td className="p-2 border-r border-slate-200 text-center">15%</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">{scores.clo4}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-blue-700">
                      {((scores.clo4 || 0) * 0.15).toFixed(2)}
                    </td>
                    <td className="p-2 text-[11px]">{comments.clo4}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50/70 border-t border-slate-300 font-bold">
                    <td colSpan={4} className="p-2 text-right border-r border-slate-300">
                      TỔNG ĐIỂM CLO GIẢNG VIÊN (Thang 10):
                    </td>
                    <td className="p-2 text-center text-blue-800 text-sm font-mono border-r border-slate-300">
                      {finalScore}
                    </td>
                    <td className="p-2 text-center">
                      Xếp loại: <strong>{gradeInfo.letter} ({gradeInfo.rank})</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Nhận xét chung */}
            <div className="font-sans text-xs p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="block text-slate-800 mb-1">Nhận xét chung của Giảng viên hướng dẫn:</strong>
              <p className="italic text-slate-700 leading-relaxed">{generalReview}</p>
            </div>

            {/* Chữ ký xác nhận */}
            <div className="flex justify-between items-end pt-8 text-xs font-sans">
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
                <p className="text-[10px] italic text-slate-400 mt-0.5">(Ký điện tử xác nhận)</p>
                <div className="h-10 flex items-center justify-center font-serif italic text-blue-800 font-bold text-sm">
                  ThS. Nguyễn Văn An
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  Đã ký số xác thực
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
