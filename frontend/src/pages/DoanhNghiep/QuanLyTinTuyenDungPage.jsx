import { useState, useEffect, useMemo } from 'react'
import { useEnterprise } from '../../components/layout/EnterpriseLayout.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'
import ModalOverlay from '../../components/common/ModalOverlay.jsx'
import { recruitmentStatusLabel } from '../../utils/recruitmentStatus'

// Danh mục mẫu JD chuẩn hóa theo chuyên ngành CNTT giúp DN chọn nhanh
const SAMPLE_JDS = [
  {
    title: 'Lập trình viên Web Frontend ReactJS',
    skills: 'ReactJS, JavaScript ES6+, HTML5/CSS3, TailwindCSS, Redux Toolkit, RESTful API, Git',
    jd: 'Tham gia phát triển giao diện người dùng (UI/UX) cho các ứng dụng web thực tế của công ty.\nThành thạo ReactJS, HTML5/CSS3, TailwindCSS và hiểu biết về RESTful API.\nCó tư duy thẩm mỹ tốt, kỹ năng làm việc nhóm và tinh thần trách nhiệm.',
  },
  {
    title: 'Lập trình viên Backend .NET / C#',
    skills: 'C#, ASP.NET Core, Entity Framework, SQL Server, Web API, OOP, Microservices, Git',
    jd: 'Tham gia xây dựng và bảo trì các dịch vụ backend, Web API bằng ASP.NET Core.\nNắm chắc kiến thức C#, lập trình hướng đối tượng, SQL Server và Entity Framework.\nHiểu biết về bảo mật API (JWT, OAuth) và tối ưu hóa truy vấn cơ sở dữ liệu.',
  },
  {
    title: 'Lập trình viên Backend Java Spring Boot',
    skills: 'Java Core, Spring Boot, Spring Data JPA, Hibernate, MySQL/PostgreSQL, REST API, Git',
    jd: 'Tham gia phát triển các module dịch vụ backend bằng Java Spring Boot.\nNắm vững Java Core, OOP, cấu trúc dữ liệu và giải thuật, Spring Data JPA.\nCó khả năng đọc hiểu tài liệu tiếng Anh kỹ thuật và ham học hỏi công nghệ mới.',
  },
  {
    title: 'Lập trình viên Di động Flutter / Mobile App',
    skills: 'Dart, Flutter, Android/iOS, State Management (Bloc/Provider), Firebase, REST API, Git',
    jd: 'Phát triển các tính năng ứng dụng di động đa nền tảng bằng Flutter (Android & iOS).\nNắm vững ngôn ngữ Dart, các pattern quản lý state (Bloc/Provider/GetX) và kết nối REST API.\nChủ động nghiên cứu và cập nhật các thư viện mới trong hệ sinh thái Mobile.',
  },
  {
    title: 'Kỹ sư Kiểm thử Phần mềm (QA/QC Manual & Automation)',
    skills: 'Test Cases, Test Plan, Black-box Testing, Postman, SQL, Selenium/Cypress, Jira',
    jd: 'Tham gia phân tích tài liệu yêu cầu, thiết kế kịch bản kiểm thử (Test Cases, Test Plan).\nThực hiện kiểm thử chức năng, giao diện, hiệu năng và kiểm thử API bằng Postman.\nTheo dõi và quản lý lỗi trên hệ thống Jira, phối hợp chặt chẽ với đội ngũ lập trình viên.',
  },
  {
    title: 'Chuyên viên Phân tích Dữ liệu & AI (Data Analyst / AI Engineer)',
    skills: 'Python, SQL, Pandas, NumPy, Machine Learning, Power BI / Tableau, Scikit-learn',
    jd: 'Tham gia thu thập, xử lý và trực quan hóa dữ liệu phục vụ các báo cáo kinh doanh.\nSử dụng thành thạo Python, SQL để khai phá dữ liệu và xây dựng các mô hình Machine Learning.\nKỹ năng tư duy logic tốt, khả năng trình bày và phân tích insight từ dữ liệu.',
  },
]

export default function QuanLyTinTuyenDungPage() {
  const { activeCompany, maDot, updateChiTieu } = useEnterprise()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // State Modal Vị trí tuyển dụng (Thêm / Sửa)
  const [positionModal, setPositionModal] = useState({ open: false, isEdit: false, position: null })
  const [posForm, setPosForm] = useState({ tenViTri: '', yeuCau: '', soLuongNhan: 1, hoatDong: true })
  const [posSubmitting, setPosSubmitting] = useState(false)

  // State Modal Thông tin chung DN
  const [showGeneralModal, setShowGeneralModal] = useState(false)
  const [generalForm, setGeneralForm] = useState({ thoiGian: '', soLuongNhan: 0 })
  const [generalSubmitting, setGeneralSubmitting] = useState(false)

  const fetchJobPosting = async () => {
    if (!activeCompany?.maCongTy) return
    try {
      setLoading(true)
      const res = await doanhNghiepService.getTinTuyenDung(activeCompany.maCongTy, maDot)
      updateChiTieu(res?.chiTieu)
      setData(res)
    } catch (err) {
      console.error('Lỗi lấy tin tuyển dụng:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobPosting()
  }, [activeCompany?.maCongTy, maDot])

  const chiTieu = data?.chiTieu
  const trangThaiTuyen = chiTieu?.trangThaiTuyen
  const dangMo = trangThaiTuyen === 'DangTuyen'
  const nhanTrangThai = loading ? 'Đang kiểm tra...' : recruitmentStatusLabel(trangThaiTuyen)

  // Danh sách các vị trí tuyển dụng
  const viTris = useMemo(() => {
    if (data?.viTris && data.viTris.length > 0) {
      return data.viTris
    }
    // Fallback: nếu chưa có bản ghi trong ViTriTheoDot thì hiển thị từ thông tin chung công ty
    if (data?.viTriTuyen) {
      return [
        {
          maViTri: 'DEFAULT',
          tenViTri: data.viTriTuyen,
          soLuongNhan: chiTieu?.soLuongNhan ?? data.soLuongNhan ?? 0,
          soDaTiepNhan: chiTieu?.daTiepNhan ?? data.soDaTiepNhan ?? 0,
          soUngVien: data.soUngVienDaNop ?? 0,
          yeuCau: data.yeuCau || '',
          hoatDong: true,
          isDefault: true,
        },
      ]
    }
    return []
  }, [data, chiTieu])

  // Mở modal Thêm vị trí mới
  const moModalThemViTri = () => {
    setPosForm({
      tenViTri: '',
      yeuCau: '',
      soLuongNhan: 2,
      hoatDong: true,
    })
    setPositionModal({ open: true, isEdit: false, position: null })
  }

  // Mở modal Sửa vị trí
  const moModalSuaViTri = (pos) => {
    setPosForm({
      tenViTri: pos.tenViTri || '',
      yeuCau: pos.yeuCau || '',
      soLuongNhan: pos.soLuongNhan || 1,
      hoatDong: pos.hoatDong ?? true,
    })
    setPositionModal({ open: true, isEdit: true, position: pos })
  }

  // Áp dụng mẫu JD nhanh
  const apDungMauJD = (sample) => {
    setPosForm((prev) => ({
      ...prev,
      tenViTri: prev.tenViTri ? prev.tenViTri : sample.title,
      yeuCau: prev.yeuCau ? `${prev.yeuCau}\n\n${sample.jd}` : sample.jd,
    }))
  }

  // Lưu vị trí (Thêm hoặc Sửa)
  const handleSavePosition = async (e) => {
    e.preventDefault()
    if (!posForm.tenViTri.trim()) {
      alert('Vui lòng nhập tên vị trí tuyển dụng.')
      return
    }
    if (posForm.soLuongNhan <= 0) {
      alert('Chỉ tiêu tiếp nhận của vị trí phải lớn hơn 0.')
      return
    }

    setPosSubmitting(true)
    try {
      if (positionModal.isEdit && !positionModal.position?.isDefault) {
        // Cập nhật vị trí đã có
        await doanhNghiepService.capNhatViTri({
          maViTri: positionModal.position.maViTri,
          tenViTri: posForm.tenViTri.trim(),
          yeuCau: posForm.yeuCau.trim(),
          soLuongNhan: parseInt(posForm.soLuongNhan, 10),
          hoatDong: posForm.hoatDong,
        })
        setToast({ type: 'success', message: 'Cập nhật thông tin vị trí tuyển dụng thành công!' })
      } else {
        // Thêm vị trí mới
        await doanhNghiepService.themViTri({
          maCongTy: activeCompany.maCongTy,
          maDot,
          tenViTri: posForm.tenViTri.trim(),
          yeuCau: posForm.yeuCau.trim(),
          soLuongNhan: parseInt(posForm.soLuongNhan, 10),
        })
        setToast({ type: 'success', message: 'Thêm vị trí tuyển dụng mới thành công!' })
      }
      setPositionModal({ open: false, isEdit: false, position: null })
      await fetchJobPosting()
    } catch (err) {
      console.error('Lỗi lưu vị trí:', err)
      alert(err.response?.data?.message || err.message || 'Không thể lưu vị trí tuyển dụng.')
    } finally {
      setPosSubmitting(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  // Bật/Tắt nhận hồ sơ cho vị trí
  const handleTogglePosition = async (pos) => {
    if (pos.isDefault) {
      alert('Vui lòng tạo vị trí chính thức trong đợt để quản lý bật/tắt nhận đơn.')
      return
    }
    try {
      await doanhNghiepService.toggleViTri(pos.maViTri)
      await fetchJobPosting()
      setToast({
        type: 'success',
        message: pos.hoatDong ? 'Đã tạm dừng nhận hồ sơ cho vị trí này.' : 'Đã mở lại nhận hồ sơ cho vị trí này.',
      })
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Không thể thay đổi trạng thái vị trí.')
    } finally {
      setTimeout(() => setToast(null), 4000)
    }
  }

  // Xóa vị trí
  const handleDeletePosition = async (pos) => {
    if (pos.isDefault) {
      alert('Không thể xóa vị trí mặc định ban đầu.')
      return
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vị trí "${pos.tenViTri}"?`)) {
      return
    }
    try {
      const res = await doanhNghiepService.xoaViTri(pos.maViTri)
      await fetchJobPosting()
      setToast({ type: 'success', message: res?.message || 'Đã xóa vị trí tuyển dụng thành công.' })
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Không thể xóa vị trí tuyển dụng.')
    } finally {
      setTimeout(() => setToast(null), 4000)
    }
  }

  // Lưu thông tin chung
  const handleSaveGeneral = async (e) => {
    e.preventDefault()
    try {
      setGeneralSubmitting(true)
      await doanhNghiepService.luuTinTuyenDung({
        maCongTy: activeCompany.maCongTy,
        thoiGian: generalForm.thoiGian,
        soLuongNhan: parseInt(generalForm.soLuongNhan, 10),
      })
      await fetchJobPosting()
      setToast({ type: 'success', message: 'Cập nhật thông tin chung thành công!' })
      setShowGeneralModal(false)
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Không thể lưu thông tin chung.')
    } finally {
      setGeneralSubmitting(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const moModalThongTinChung = () => {
    setGeneralForm({
      thoiGian: data?.thoiGian || '',
      soLuongNhan: chiTieu?.soLuongNhan ?? data?.soLuongNhan ?? 0,
    })
    setShowGeneralModal(true)
  }

  const fillPercent = chiTieu?.soLuongNhan > 0
    ? Math.min(100, Math.round(((chiTieu?.daTiepNhan || 0) / chiTieu.soLuongNhan) * 100))
    : 0

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between border shadow-sm animate-in fade-in ${
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

      {/* Header Bento Trang Tin Tuyển Dụng */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 lg:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
              <span className="material-symbols-outlined text-[16px] text-indigo-600">campaign</span>
              <span>Cổng Doanh nghiệp</span>
              <span>/</span>
              <span className="text-slate-800 font-semibold">Tin & Vị trí tuyển dụng</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                Vị trí tuyển dụng thực tập
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                {activeCompany?.tenCongTy || 'Doanh nghiệp'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                {chiTieu?.tenDot || 'Đợt thực tập hiện tại'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
              Doanh nghiệp có thể đăng và quản lý <strong>nhiều vị trí tuyển dụng</strong> trong cùng một đợt thực tập. Sinh viên sẽ nộp hồ sơ trực tuyến theo đúng vị trí và yêu cầu kỹ năng (JD) tương ứng.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={moModalThongTinChung}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-500">settings</span>
              <span>Kế hoạch chung</span>
            </button>

            <button
              type="button"
              onClick={moModalThemViTri}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Thêm vị trí mới</span>
            </button>
          </div>
        </div>

        {/* 4 Thẻ Bento KPI thông tin đợt */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Tổng chỉ tiêu đợt</span>
              <span className="material-symbols-outlined text-[18px] text-indigo-600">group_add</span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {chiTieu?.soLuongNhan ?? data?.soLuongNhan ?? 0} <span className="text-xs font-normal text-slate-500">sinh viên</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              {chiTieu?.tenDot || 'Theo chỉ tiêu phân bổ đợt'}
            </div>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-200/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-indigo-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Vị trí tuyển dụng</span>
              <span className="material-symbols-outlined text-[18px] text-indigo-600">work</span>
            </div>
            <div className="text-2xl font-black text-indigo-950">
              {viTris.length} <span className="text-xs font-normal text-indigo-700">vị trí</span>
            </div>
            <div className="text-[10px] text-indigo-700 mt-0.5">
              {viTris.filter((v) => v.hoatDong).length} vị trí đang nhận hồ sơ
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Đã tiếp nhận</span>
              <span className="material-symbols-outlined text-[18px] text-emerald-600">how_to_reg</span>
            </div>
            <div className="text-2xl font-black text-emerald-900">
              {chiTieu?.daTiepNhan ?? data?.soDaTiepNhan ?? 0} <span className="text-xs font-normal text-emerald-700">sinh viên</span>
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">
              Đạt {fillPercent}% chỉ tiêu phân bổ
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-200/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-blue-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Hồ sơ ứng viên</span>
              <span className="material-symbols-outlined text-[18px] text-blue-600">assignment_ind</span>
            </div>
            <div className="text-2xl font-black text-blue-900">
              {data?.soUngVienDaNop || 0} <span className="text-xs font-normal text-blue-700">hồ sơ</span>
            </div>
            <div className="text-[10px] text-blue-700 mt-0.5">
              Đang chờ duyệt & phỏng vấn
            </div>
          </div>
        </div>
      </div>

      {/* Banner Nguyên tắc Phối hợp Học vụ */}
      <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/60 rounded-2xl border border-indigo-100 p-4 lg:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <span className="material-symbols-outlined text-[20px]">handshake</span>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              Cơ chế tiếp nhận Đa vị trí giữa Doanh nghiệp và Khoa CNTT
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Doanh nghiệp có thể thiết lập nhiều vị trí công việc với các yêu cầu kỹ năng (JD) khác nhau. Sinh viên khi nộp đơn sẽ lựa chọn vị trí chuyên môn phù hợp nhất để tham gia phỏng vấn và thực tập.
            </p>
          </div>
        </div>
      </div>

      {/* DANH SÁCH CÁC VỊ TRÍ TUYỂN DỤNG (MULTI-POSITIONS BENTO GRID) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-indigo-600">domain_verification</span>
            <span>Danh sách vị trí tuyển dụng thực tập ({viTris.length})</span>
          </h2>

          <button
            type="button"
            onClick={moModalThemViTri}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Thêm vị trí</span>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="text-xs text-slate-500 font-medium">Đang tải danh sách vị trí tuyển dụng…</p>
          </div>
        ) : viTris.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
            <span className="material-symbols-outlined text-[42px] text-slate-300">work_off</span>
            <p className="text-sm font-bold text-slate-700">Chưa có vị trí tuyển dụng nào trong đợt này</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy nhấn nút "Thêm vị trí mới" để đăng các vị trí thực tập (React, .NET, Mobile, QA...) cho sinh viên nộp hồ sơ.
            </p>
            <button
              type="button"
              onClick={moModalThemViTri}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Tạo vị trí tuyển dụng đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {viTris.map((pos) => {
              const isFull = pos.soLuongNhan > 0 && pos.soDaTiepNhan >= pos.soLuongNhan
              const isInactive = !pos.hoatDong
              const posPercent = pos.soLuongNhan > 0
                ? Math.min(100, Math.round(((pos.soDaTiepNhan || 0) / pos.soLuongNhan) * 100))
                : 0

              const skillTags = pos.yeuCau
                ? pos.yeuCau.split(/[,;\n]+|\.(?=\s|$)/).map((s) => s.trim()).filter((s) => s.length > 1)
                : []

              return (
                <div
                  key={pos.maViTri}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                    isInactive
                      ? 'border-slate-200 bg-slate-50/50 opacity-80'
                      : 'border-slate-200/90 hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Card Vị trí */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold font-mono">
                            {pos.maViTri}
                          </span>
                          {isInactive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                              Tạm dừng nhận mới
                            </span>
                          ) : isFull ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Đã đủ chỉ tiêu
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Đang nhận hồ sơ
                            </span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                          {pos.tenViTri}
                        </h3>
                      </div>

                      {/* Dropdown / Nút toggle */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moModalSuaViTri(pos)}
                          className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa vị trí này"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePosition(pos)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            pos.hoatDong
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={pos.hoatDong ? 'Tạm dừng nhận đơn vị trí này' : 'Mở lại nhận đơn'}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {pos.hoatDong ? 'pause_circle' : 'play_circle'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePosition(pos)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa vị trí này"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Tiến độ chỉ tiêu & Ứng viên */}
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Chỉ tiêu vị trí:</span>
                        <span className="font-extrabold text-slate-900">
                          Đã nhận <strong className="text-emerald-700">{pos.soDaTiepNhan || 0}</strong> / {pos.soLuongNhan} SV
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isFull ? 'bg-rose-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${posPercent}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>Hồ sơ đã nộp: <strong className="text-blue-700 font-bold">{pos.soUngVien || 0}</strong> hồ sơ</span>
                        <span>Đạt {posPercent}%</span>
                      </div>
                    </div>

                    {/* Yêu cầu JD tóm tắt */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Yêu cầu kỹ năng (JD):
                      </span>
                      <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-200/50">
                        {pos.yeuCau || 'Chưa cập nhật chi tiết yêu cầu công việc.'}
                      </p>
                    </div>

                    {/* Tags kỹ năng */}
                    {skillTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {skillTags.slice(0, 5).map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-100"
                          >
                            {tag}
                          </span>
                        ))}
                        {skillTags.length > 5 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{skillTags.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      Thời gian: {data?.thoiGian || 'Theo đợt'}
                    </span>
                    <button
                      type="button"
                      onClick={() => moModalSuaViTri(pos)}
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      <span>Sửa chi tiết</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL THÊM / CHỈNH SỬA VỊ TRÍ TUYỂN DỤNG */}
      {positionModal.open && (
        <ModalOverlay onClose={() => setPositionModal({ open: false, isEdit: false, position: null })}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs">
                  <span className="material-symbols-outlined text-[20px]">
                    {positionModal.isEdit ? 'edit_note' : 'add_circle'}
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {positionModal.isEdit ? 'Chỉnh sửa Vị trí tuyển dụng' : 'Thêm Vị trí tuyển dụng mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeCompany?.tenCongTy} — {chiTieu?.tenDot || 'Đợt thực tập'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPositionModal({ open: false, isEdit: false, position: null })}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSavePosition} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Tên vị trí tuyển dụng */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center gap-1">
                  <span>Tên vị trí công việc:</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lập trình viên Web Fullstack React/Node.js, Mobile App Flutter..."
                  value={posForm.tenViTri}
                  onChange={(e) => setPosForm({ ...posForm, tenViTri: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              {/* Chỉ tiêu & Trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1">
                    <span>Chỉ tiêu tiếp nhận vị trí này (SV):</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={posForm.soLuongNhan}
                    onChange={(e) => setPosForm({ ...posForm, soLuongNhan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-500">
                    Số lượng sinh viên công ty dự kiến tiếp nhận cho riêng vị trí này.
                  </p>
                </div>

                {positionModal.isEdit && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">Trạng thái nhận hồ sơ:</label>
                    <select
                      value={posForm.hoatDong ? 'true' : 'false'}
                      onChange={(e) => setPosForm({ ...posForm, hoatDong: e.target.value === 'true' })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    >
                      <option value="true">Đang nhận đăng ký (Mở tuyển)</option>
                      <option value="false">Tạm dừng nhận mới (Đóng nhận đơn)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Chọn nhanh JD mẫu */}
              <div className="space-y-1.5 pt-1">
                <div className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Gợi ý mẫu yêu cầu (JD) nhanh theo chuyên ngành:</span>
                  <span className="text-[10px] text-indigo-600 font-normal">Nhấn để điền tự động</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SAMPLE_JDS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => apDungMauJD(sample)}
                      className="text-left p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-800 transition-all text-[11px] font-semibold text-slate-700 cursor-pointer"
                    >
                      <div className="truncate font-bold text-slate-800">{sample.title}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{sample.skills}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Yêu cầu & Kỹ năng JD */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center gap-1">
                  <span>Tiêu chuẩn & Yêu cầu kỹ năng năng lực (JD chi tiết):</span>
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Mô tả công việc thực tập, các công nghệ cần nắm vững, kỹ năng làm việc nhóm, thái độ..."
                  value={posForm.yeuCau}
                  onChange={(e) => setPosForm({ ...posForm, yeuCau: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs leading-relaxed"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPositionModal({ open: false, isEdit: false, position: null })}
                  disabled={posSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={posSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {posSubmitting ? 'sync' : 'save'}
                  </span>
                  <span>{posSubmitting ? 'Đang lưu…' : positionModal.isEdit ? 'Lưu thay đổi' : 'Thêm vị trí'}</span>
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* MODAL CẬP NHẬT KẾ HOẠCH CHUNG DOANH NGHIỆP */}
      {showGeneralModal && (
        <ModalOverlay onClose={() => setShowGeneralModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Kế hoạch chung doanh nghiệp</h3>
                <p className="text-[11px] text-slate-500">Khung thời gian & Tổng chỉ tiêu đề xuất</p>
              </div>
            </div>

            <form onSubmit={handleSaveGeneral} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Thời gian thực tập dự kiến:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 14/08/2026 - 25/12/2026"
                  value={generalForm.thoiGian}
                  onChange={(e) => setGeneralForm({ ...generalForm, thoiGian: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Tổng chỉ tiêu công ty (SV):</label>
                <input
                  type="number"
                  min="1"
                  value={generalForm.soLuongNhan}
                  onChange={(e) => setGeneralForm({ ...generalForm, soLuongNhan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold"
                />
                <p className="text-[10px] text-slate-500">
                  Tổng trần tiếp nhận của toàn bộ các vị trí trong công ty.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGeneralModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={generalSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {generalSubmitting ? 'Đang lưu…' : 'Lưu thông tin'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
