export default function RubricCLOModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                CHUẨN KIỂM ĐỊNH ABET CAC & AUN-QA
              </span>
              <span>•</span>
              <span>MÃ HỌC PHẦN: INT302</span>
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">menu_book</span>
              Hướng Dẫn Rubric Đánh Giá Chuẩn Đầu Ra (CLO)
            </h3>
            <p className="text-xs text-blue-100 mt-1">
              Quy định mức độ năng lực sinh viên theo học phần Thực tập tốt nghiệp Khoa Công nghệ Thông tin
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

        {/* Modal Body: Bảng ma trận Rubric chi tiết */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs">
          {/* Thang điểm & Tỷ trọng */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-[11px] font-bold uppercase text-blue-600 block">1. Điểm Giảng Viên Hướng Dẫn</span>
              <div className="text-xl font-black text-blue-900 mt-1 font-mono">40%</div>
              <p className="text-[11px] text-slate-600 mt-0.5">Dựa trên 4 tiêu chí CLO dưới đây (Thang điểm 10 quy đổi)</p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] font-bold uppercase text-emerald-600 block">2. Điểm Doanh Nghiệp Đánh Giá</span>
              <div className="text-xl font-black text-emerald-900 mt-1 font-mono">40%</div>
              <p className="text-[11px] text-slate-600 mt-0.5">Do Người hướng dẫn doanh nghiệp chấm tại đơn vị</p>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[11px] font-bold uppercase text-amber-600 block">3. Điểm Báo Cáo Hội Đồng</span>
              <div className="text-xl font-black text-amber-900 mt-1 font-mono">20%</div>
              <p className="text-[11px] text-slate-600 mt-0.5">Bảo vệ tổng kết trước Hội đồng phản biện Khoa</p>
            </div>
          </div>

          {/* Bảng Rubric chi tiết từng CLO */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-base">fact_check</span>
              Ma Trận Thang Đo Rubric Theo 4 Mức Năng Lực
            </h4>

            {/* CLO 1 Card */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-blue-50/70 p-3 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-blue-900 text-xs">
                  CLO 1: Kiến thức chuyên môn & Giải quyết vấn đề (Trọng số 30%)
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                  Max 3.0 điểm quy đổi
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-[11px]">
                <div className="p-3 bg-emerald-50/40">
                  <strong className="text-emerald-800 block font-semibold mb-1">Xuất sắc (8.5 - 10.0 đ)</strong>
                  <p className="text-slate-600">Nắm vững và vận dụng xuất sắc các nguyên lý kỹ thuật phần mềm, thuật toán, CSDL. Độc lập đề xuất và giải quyết tốt các bài toán khó của doanh nghiệp.</p>
                </div>
                <div className="p-3 bg-blue-50/30">
                  <strong className="text-blue-800 block font-semibold mb-1">Khá / Giỏi (7.0 - 8.4 đ)</strong>
                  <p className="text-slate-600">Hiểu rõ kiến thức chuyên ngành, đáp ứng tốt yêu cầu xử lý logic bài toán nghiệp vụ thực tế, có khả năng phân tích và cải tiến giải pháp.</p>
                </div>
                <div className="p-3 bg-amber-50/30">
                  <strong className="text-amber-800 block font-semibold mb-1">Trung bình (5.5 - 6.9 đ)</strong>
                  <p className="text-slate-600">Nắm kiến thức ở mức cơ bản, xử lý được các module đơn giản, còn phụ thuộc nhiều vào hướng dẫn của mentor doanh nghiệp.</p>
                </div>
                <div className="p-3 bg-rose-50/30">
                  <strong className="text-rose-800 block font-semibold mb-1">Chưa đạt (&lt; 5.5 đ)</strong>
                  <p className="text-slate-600">Hổng kiến thức nền tảng, không tự giải quyết được bài toán được giao hoặc không hoàn thành sản phẩm yêu cầu.</p>
                </div>
              </div>
            </div>

            {/* CLO 2 Card */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-indigo-50/70 p-3 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-indigo-900 text-xs">
                  CLO 2: Kỹ năng kỹ thuật, công cụ & công nghệ thực tế (Trọng số 35%)
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md">
                  Max 3.5 điểm quy đổi
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-[11px]">
                <div className="p-3 bg-emerald-50/40">
                  <strong className="text-emerald-800 block font-semibold mb-1">Xuất sắc (8.5 - 10.0 đ)</strong>
                  <p className="text-slate-600">Thành thạo công nghệ hiện đại (.NET, React, Docker, CI/CD, Git), viết code sạch, tối ưu hiệu năng và xử lý lỗi hệ thống rất linh hoạt.</p>
                </div>
                <div className="p-3 bg-blue-50/30">
                  <strong className="text-blue-800 block font-semibold mb-1">Khá / Giỏi (7.0 - 8.4 đ)</strong>
                  <p className="text-slate-600">Sử dụng tốt framework của công ty, quy trình git flow chuẩn chỉ, hoàn thành tính năng đúng tiến độ và tiêu chuẩn chất lượng.</p>
                </div>
                <div className="p-3 bg-amber-50/30">
                  <strong className="text-amber-800 block font-semibold mb-1">Trung bình (5.5 - 6.9 đ)</strong>
                  <p className="text-slate-600">Tiếp cận công cụ mới còn chậm, thao tác git hoặc coding convention còn phát sinh lỗi phải nhắc nhở nhiều lần.</p>
                </div>
                <div className="p-3 bg-rose-50/30">
                  <strong className="text-rose-800 block font-semibold mb-1">Chưa đạt (&lt; 5.5 đ)</strong>
                  <p className="text-slate-600">Không thao tác được các công cụ bắt buộc, code chất lượng kém hoặc không tuân thủ quy trình phát triển phần mềm.</p>
                </div>
              </div>
            </div>

            {/* CLO 3 Card */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-cyan-50/70 p-3 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-cyan-900 text-xs">
                  CLO 3: Thái độ làm việc, kỷ luật & đạo đức nghề nghiệp (Trọng số 20%)
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-md">
                  Max 2.0 điểm quy đổi
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-[11px]">
                <div className="p-3 bg-emerald-50/40">
                  <strong className="text-emerald-800 block font-semibold mb-1">Xuất sắc (8.5 - 10.0 đ)</strong>
                  <p className="text-slate-600">Chấp hành nghiêm ngặt nội quy bảo mật dữ liệu và giờ giấc; giao tiếp chuẩn mực; chủ động hỗ trợ đồng nghiệp và gắn kết đội ngũ.</p>
                </div>
                <div className="p-3 bg-blue-50/30">
                  <strong className="text-blue-800 block font-semibold mb-1">Khá / Giỏi (7.0 - 8.4 đ)</strong>
                  <p className="text-slate-600">Chuyên cần, tuân thủ kỷ luật cơ quan, phối hợp làm việc nhóm tốt, có thái độ cầu tiến và lắng nghe phản hồi tích cực.</p>
                </div>
                <div className="p-3 bg-amber-50/30">
                  <strong className="text-amber-800 block font-semibold mb-1">Trung bình (5.5 - 6.9 đ)</strong>
                  <p className="text-slate-600">Còn đi muộn hoặc chậm nộp báo cáo 1-2 lần, ít chủ động giao tiếp nhưng vẫn hoàn thành nhiệm vụ khi được đôn đốc.</p>
                </div>
                <div className="p-3 bg-rose-50/30">
                  <strong className="text-rose-800 block font-semibold mb-1">Chưa đạt (&lt; 5.5 đ)</strong>
                  <p className="text-slate-600">Vi phạm quy chế bảo mật, vắng mặt không lý do hoặc có thái độ bất hợp tác với người hướng dẫn và đồng nghiệp.</p>
                </div>
              </div>
            </div>

            {/* CLO 4 Card */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-emerald-50/70 p-3 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-xs">
                  CLO 4: Báo cáo, thuyết trình & tư duy phản biện (Trọng số 15%)
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                  Max 1.5 điểm quy đổi
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-[11px]">
                <div className="p-3 bg-emerald-50/40">
                  <strong className="text-emerald-800 block font-semibold mb-1">Xuất sắc (8.5 - 10.0 đ)</strong>
                  <p className="text-slate-600">Báo cáo tổng kết viết chuẩn chỉnh BM-KD-08, lập luận sắc bén, hình ảnh minh chứng đầy đủ, trình bày lưu loát và tự tin.</p>
                </div>
                <div className="p-3 bg-blue-50/30">
                  <strong className="text-blue-800 block font-semibold mb-1">Khá / Giỏi (7.0 - 8.4 đ)</strong>
                  <p className="text-slate-600">Báo cáo rõ ràng, mạch lạc, đúng biểu mẫu quy định, giải thích tốt kết quả đạt được và bài học kinh nghiệm.</p>
                </div>
                <div className="p-3 bg-amber-50/30">
                  <strong className="text-amber-800 block font-semibold mb-1">Trung bình (5.5 - 6.9 đ)</strong>
                  <p className="text-slate-600">Báo cáo sơ sài, còn lỗi chính tả hoặc định dạng, cần chỉnh sửa bổ sung trước khi nộp lưu trữ Khoa.</p>
                </div>
                <div className="p-3 bg-rose-50/30">
                  <strong className="text-rose-800 block font-semibold mb-1">Chưa đạt (&lt; 5.5 đ)</strong>
                  <p className="text-slate-600">Không nộp báo cáo đúng hạn hoặc sao chép nội dung báo cáo từ sinh viên khác (đạo văn vi phạm quy chế).</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Lưu ý: Mọi điểm số phải được chốt trước thời hạn quy định của Khoa CNTT.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            Đã hiểu & Quay lại chấm điểm
          </button>
        </div>
      </div>
    </div>
  )
}
