import { hasScore, summarizeGrade } from '../../utils/diemGiangVien'

export default function PhieuDiemPdfModal({
  isOpen,
  onClose,
  currentStudent,
  selectedDot,
  criteria = [],
  scores = {},
  total = 0,
  generalReview,
  enterpriseNote,
  dnChuyenCan = '',
  dnChuyenMon = '',
  lecturerName = '',
}) {
  if (!isOpen || !currentStudent) return null

  const clo1to3 = criteria.filter((c) => c.maCLO !== 'CLO4.1' && c.maCLO !== 'CLO4.2')
  const clo41 = criteria.find((c) => c.maCLO === 'CLO4.1')
  const clo42 = criteria.find((c) => c.maCLO === 'CLO4.2')

  const subTotalGV = clo1to3.reduce((sum, c) => sum + Number(scores[c.maTieuChi] || 0), 0)
  const score41 = clo41 ? Number(scores[clo41.maTieuChi] || 0) : 0
  const score42 = clo42 ? Number(scores[clo42.maTieuChi] || 0) : 0
  const subTotalDN = score41 + score42

  const summary = summarizeGrade(criteria, scores)
  const { xepLoai, diemHe4, ketQua } = summary

  const currentDate = new Date()

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 p-4 flex items-center justify-center print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[94vh] overflow-auto shadow-2xl print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
        {/* Modal Header (ẩn khi in) */}
        <header className="p-4 bg-slate-900 text-white flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">description</span>
            <b className="text-sm">Bản in Phiếu đánh giá thực tập tốt nghiệp (Rubric CLO)</b>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>In / Xuất PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-lg text-slate-300 hover:text-white cursor-pointer"
            >
              ×
            </button>
          </div>
        </header>

        {/* Nội dung Phiếu đánh giá chuẩn */}
        <article className="p-8 sm:p-10 text-slate-900 text-xs leading-normal font-sans print:p-6 print:text-[11px]">
          {/* Header Quốc hiệu & Tên trường */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-300">
            <div className="text-center space-y-0.5">
              <p className="font-semibold uppercase text-[11px] tracking-wide">TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM</p>
              <p className="font-bold uppercase text-[12px] text-blue-900">KHOA CÔNG NGHỆ THÔNG TIN</p>
              <p className="text-[10px] text-slate-500 italic">Bộ môn Công nghệ phần mềm &amp; Hệ thống thông tin</p>
            </div>
            <div className="text-center space-y-0.5">
              <p className="font-bold uppercase text-[11px]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p className="font-semibold text-[11px] underline underline-offset-4">Độc lập - Tự do - Hạnh phúc</p>
              <p className="text-[10px] text-slate-500 italic mt-1">
                TP. Hồ Chí Minh, ngày {currentDate.getDate()} tháng {currentDate.getMonth() + 1} năm {currentDate.getFullYear()}
              </p>
            </div>
          </div>

          {/* Tiêu đề phiếu */}
          <div className="text-center my-6 space-y-1">
            <p className="font-bold text-amber-800">BẢN XEM TRƯỚC — CHƯA PHẢI QUYẾT ĐỊNH CHỐT ĐIỂM{!summary.complete ? ' — CHƯA ĐỦ ĐIỂM' : ''}</p>
            <h1 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wide">
              PHIẾU ĐÁNH GIÁ KẾT QUẢ THỰC TẬP TỐT NGHIỆP
            </h1>
            <p className="font-semibold text-blue-800 text-xs">
              {selectedDot?.tenDot || 'Đợt thực tập tốt nghiệp'} • Năm học: {selectedDot?.namHoc || '2026 - 2027'}
            </p>
            <p className="text-[11px] text-slate-500 italic">
              (Áp dụng chuẩn đầu ra CLO - Khung đánh giá kết hợp Giảng viên hướng dẫn &amp; Doanh nghiệp)
            </p>
          </div>

          {/* Thông tin sinh viên & Cơ quan thực tập */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 mb-6 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-slate-500">Họ và tên sinh viên: </span>
              <strong className="text-slate-900 text-sm">{currentStudent.hoTen}</strong>
            </div>
            <div>
              <span className="text-slate-500">Mã số sinh viên (MSSV): </span>
              <strong className="text-slate-900 font-mono text-sm">{currentStudent.maSV}</strong>
            </div>
            <div>
              <span className="text-slate-500">Lớp sinh hoạt: </span>
              <strong className="text-slate-900">{currentStudent.lop || '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500">Ngành đào tạo: </span>
              <strong className="text-slate-900">{currentStudent.chuyenNganh || 'Công nghệ thông tin'}</strong>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-slate-500">Đơn vị tiếp nhận thực tập: </span>
                <strong className="text-slate-900">{currentStudent.tenCongTy || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Nguồn điểm DN: </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold">
                  Doanh nghiệp cập nhật trên hệ thống
                </span>
              </div>
            </div>
          </div>

          {/* Bảng điểm chi tiết CLO */}
          <table className="w-full border-collapse border border-slate-300 text-xs mb-6">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold">
                <th className="border border-slate-300 p-2 text-center w-12">STT</th>
                <th className="border border-slate-300 p-2 text-center w-20">Mã CLO</th>
                <th className="border border-slate-300 p-2 text-left">Nội dung tiêu chí đánh giá chuẩn đầu ra (CLO)</th>
                <th className="border border-slate-300 p-2 text-center w-24">Tối đa</th>
                <th className="border border-slate-300 p-2 text-center w-28">Điểm đạt</th>
              </tr>
            </thead>
            <tbody>
              {/* PHẦN 1: GIẢNG VIÊN HƯỚNG DẪN */}
              <tr className="bg-blue-50/60 font-bold text-blue-900">
                <td colSpan={5} className="border border-slate-300 p-2">
                  PHẦN I. GIẢNG VIÊN HƯỚNG DẪN ĐÁNH GIÁ (Báo cáo, quyển thực tập &amp; phản biện)
                </td>
              </tr>
              {clo1to3.map((c, idx) => (
                <tr key={c.maTieuChi} className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center text-slate-500">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">{c.maCLO || c.maTieuChi}</td>
                  <td className="border border-slate-300 p-2">{c.tenTieuChi}</td>
                  <td className="border border-slate-300 p-2 text-center">{Number(c.diemToiDa).toFixed(2)}</td>
                  <td className="border border-slate-300 p-2 text-center font-semibold">{hasScore(scores[c.maTieuChi]) ? Number(scores[c.maTieuChi]).toFixed(2) : '—'}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold text-slate-800">
                <td colSpan={3} className="border border-slate-300 p-2 text-right">
                  Cộng điểm Phần I (Giảng viên hướng dẫn):
                </td>
                <td className="border border-slate-300 p-2 text-center">5.00</td>
                <td className="border border-slate-300 p-2 text-center font-bold text-blue-800">{subTotalGV.toFixed(2)}</td>
              </tr>

              {/* PHẦN 2: DOANH NGHIỆP ĐÁNH GIÁ */}
              <tr className="bg-amber-50/70 font-bold text-amber-900">
                <td colSpan={5} className="border border-slate-300 p-2">
                  PHẦN II. ĐƠN VỊ THỰC TẬP ĐÁNH GIÁ (Theo Phiếu nhận xét thang điểm 10 quy đổi)
                </td>
              </tr>
              {clo41 && (
                <tr className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center text-slate-500">{clo1to3.length + 1}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-amber-700">{clo41.maCLO}</td>
                  <td className="border border-slate-300 p-2">
                    <div>{clo41.tenTieuChi}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      • Điểm chuyên cần &amp; phong cách từ phiếu DN: <strong>{dnChuyenCan !== '' ? `${dnChuyenCan}/10` : '—'}</strong>
                      {dnChuyenCan !== '' && ` → Quy đổi: (${dnChuyenCan}/10) × 2.0 = ${score41.toFixed(2)}`}
                    </div>
                  </td>
                  <td className="border border-slate-300 p-2 text-center">2.00</td>
                  <td className="border border-slate-300 p-2 text-center font-semibold">{hasScore(scores[clo41.maTieuChi]) ? score41.toFixed(2) : '—'}</td>
                </tr>
              )}
              {clo42 && (
                <tr className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center text-slate-500">{clo1to3.length + (clo41 ? 2 : 1)}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-amber-700">{clo42.maCLO}</td>
                  <td className="border border-slate-300 p-2">
                    <div>{clo42.tenTieuChi}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      • Điểm chuyên môn từ phiếu DN: <strong>{dnChuyenMon !== '' ? `${dnChuyenMon}/10` : '—'}</strong>
                      {dnChuyenMon !== '' && ` → Quy đổi: (${dnChuyenMon}/10) × 3.0 = ${score42.toFixed(2)}`}
                    </div>
                  </td>
                  <td className="border border-slate-300 p-2 text-center">3.00</td>
                  <td className="border border-slate-300 p-2 text-center font-semibold">{hasScore(scores[clo42.maTieuChi]) ? score42.toFixed(2) : '—'}</td>
                </tr>
              )}
              <tr className="bg-slate-50 font-semibold text-slate-800">
                <td colSpan={3} className="border border-slate-300 p-2 text-right">
                  Cộng điểm Phần II (Doanh nghiệp tiếp nhận):
                </td>
                <td className="border border-slate-300 p-2 text-center">5.00</td>
                <td className="border border-slate-300 p-2 text-center font-bold text-amber-800">{subTotalDN.toFixed(2)}</td>
              </tr>
            </tbody>

            {/* TỔNG KẾT */}
            <tfoot>
              <tr className="bg-indigo-50 border-t-2 border-slate-400 text-slate-900 font-extrabold text-sm">
                <td colSpan={3} className="border border-slate-300 p-2.5 text-right uppercase tracking-wide">
                  {summary.complete ? 'TỔNG ĐIỂM (Thang 10):' : 'ĐIỂM TẠM TÍNH — CHƯA ĐỦ THÀNH PHẦN:'}
                </td>
                <td className="border border-slate-300 p-2.5 text-center text-slate-600">10.00</td>
                <td className="border border-slate-300 p-2.5 text-center text-blue-900 text-base">{total.toFixed(2)}</td>
              </tr>
              <tr className="bg-white font-semibold">
                <td colSpan={5} className="border border-slate-300 p-2 text-center text-xs">
                  <span>Kết luận: </span>
                  <strong className={`mr-4 ${ketQua === 'Đạt' ? 'text-emerald-700' : 'text-rose-700'}`}>{ketQua}</strong>
                  <span>• Thang điểm 4: </span>
                  <strong className="text-indigo-900 mr-4 font-mono">{diemHe4}</strong>
                  <span>• Xếp loại: </span>
                  <strong className="text-blue-900">{xepLoai}</strong>
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Nhận xét & Ghi chú đối chiếu */}
          <div className="space-y-3 mb-8">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-slate-800 block mb-1">Nhận xét chi tiết của Giảng viên hướng dẫn:</strong>
              <p className="text-slate-700 italic whitespace-pre-wrap">{generalReview?.trim() || 'Chưa có nhận xét của giảng viên hướng dẫn.'}</p>
            </div>

            {enterpriseNote && (
              <div className="text-[11px] text-slate-600 italic">
                * Ghi chú văn bản đối chiếu từ Doanh nghiệp: {enterpriseNote}
              </div>
            )}
          </div>

          {/* Chữ ký 2 bên */}
          <div className="grid grid-cols-2 gap-6 pt-4 text-center">
            <div className="space-y-1">
              <p className="font-bold uppercase text-[11px] text-slate-700">TRƯỞNG BỘ MÔN / TRƯỞNG KHOA</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên và đóng dấu)</p>
              <div className="h-20"></div>
              <p className="font-semibold text-slate-400 italic text-[11px]">(Ký và ghi rõ họ tên)</p>
            </div>

            <div className="space-y-1">
              <p className="font-bold uppercase text-[11px] text-slate-700">GIẢNG VIÊN HƯỚNG DẪN</p>
              <p className="text-[10px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
              <div className="h-20"></div>
              <p className="font-semibold text-slate-800">{lecturerName || 'Giảng viên hướng dẫn'}</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
