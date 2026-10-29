import { useState, useEffect } from 'react'
import ModalOverlay from '../../components/common/ModalOverlay.jsx'
import { useIdentity } from '../../hooks/useIdentity'
import NoLinkedAccount from '../../components/common/NoLinkedAccount'
import hoSoNangLucService from '../../services/hoSoNangLucService.js'
import { xepLoaiGpa } from '../../utils/trangThai'

export default function HoSoNangLucPage() {
  const { user, maSV: currentMaSV } = useIdentity()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Form state cho modal chỉnh sửa
  const [formData, setFormData] = useState({
    hoTen: '',
    lop: '',
    khoaHoc: '',
    gpa: '',
    chuyenNganh: '',
    kyNang: '',
    congNghe: '',
    duAnDaThucHien: '',
    ndHoSo: '',
    fileCV: '',
  })

  useEffect(() => {
    if (currentMaSV) {
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [currentMaSV])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const data = await hoSoNangLucService.getBySinhVien(currentMaSV)
      setProfile(data)
    } catch (err) {
      setError('Không thể tải hồ sơ sinh viên. Vui lòng thử lại sau.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Mở form luôn từ dữ liệu đã lưu (bấm Hủy thì bỏ các chỉnh sửa chưa lưu)
  const moFormChinhSua = () => {
    setFormData({
      hoTen: profile.hoTen || '',
      lop: profile.lop || '',
      khoaHoc: profile.khoaHoc || '',
      gpa: profile.gpa != null ? profile.gpa : '',
      chuyenNganh: profile.chuyenNganh || '',
      kyNang: profile.kyNang || '',
      congNghe: profile.congNghe || '',
      duAnDaThucHien: profile.duAnDaThucHien || '',
      ndHoSo: profile.ndHoSo || '',
      fileCV: profile.fileCV || '',
    })
    setIsEditModalOpen(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      // Chỉ gửi phần hồ sơ năng lực; dữ liệu học vụ do Khoa quản lý
      const payload = {
        kyNang: formData.kyNang,
        congNghe: formData.congNghe,
        duAnDaThucHien: formData.duAnDaThucHien,
        ndHoSo: formData.ndHoSo,
        fileCV: formData.fileCV,
      }
      const res = await hoSoNangLucService.update(currentMaSV, payload)
      setProfile(res.data || { ...profile, ...payload })
      setIsEditModalOpen(false)
      setSaveSuccessMsg('Hồ sơ năng lực đã được cập nhật thành công!')
      setTimeout(() => setSaveSuccessMsg(''), 4000)
    } catch (err) {
      alert('Lỗi cập nhật hồ sơ: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  if (!currentMaSV) {
    return <NoLinkedAccount type="sinh viên" />
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <span className="material-symbols-outlined text-4xl animate-spin text-blue-600 mb-2">
          progress_activity
        </span>
        <p className="text-sm">Đang tải hồ sơ năng lực sinh viên...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
        <p className="font-semibold">{error || 'Không tìm thấy hồ sơ'}</p>
        <button
          onClick={fetchProfile}
          className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700"
        >
          Tải lại
        </button>
      </div>
    )
  }

  const skillList = profile.kyNang ? profile.kyNang.split(',').map((s) => s.trim()) : []
  const techList = profile.congNghe ? profile.congNghe.split(',').map((s) => s.trim()) : []

  return (
    <div className="flex flex-col w-full gap-6 max-w-7xl mx-auto">
      {/* Toast thông báo thành công */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span className="text-sm font-medium">{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Banner Tiêu đề & Thao tác */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-blue-700">
            <span className="material-symbols-outlined text-[20px]">badge</span>
            <span className="text-xs uppercase tracking-wider font-bold">Cổng thực tập sinh viên</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Hồ sơ năng lực &amp; Hồ sơ thực tập sinh
          </h1>
          <p className="text-sm text-slate-500">
            Dữ liệu kết xuất chuẩn hóa Khoa CNTT phục vụ thẩm định và gợi ý doanh nghiệp tiếp nhận
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={!profile?.fileCV || !/^https?:\/\//i.test(profile.fileCV)}
            onClick={() => {
              if (profile?.fileCV && /^https?:\/\//i.test(profile.fileCV)) {
                window.open(profile.fileCV, '_blank')
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium text-sm transition-colors ${
              profile?.fileCV && /^https?:\/\//i.test(profile.fileCV)
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            <span>Xem trước CV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            <span>Xuất bản hồ sơ (PDF)</span>
          </button>
          <button
            type="button"
            onClick={moFormChinhSua}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 font-medium text-sm transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            <span>Chỉnh sửa hồ sơ</span>
          </button>
        </div>
      </div>

      {/* Grid nội dung 2 cột */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái: Card thông tin cá nhân & CV */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Card Sinh viên */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600"></div>

            {/* Avatar */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-md bg-white mt-6 p-1 border-2 border-white">
              <div className="w-full h-full rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-2xl">
                {profile.hoTen?.charAt(0) || 'S'}
              </div>
            </div>

            <div className="mt-3 flex flex-col items-center">
              <h2 className="text-xl font-bold text-slate-900">{profile.hoTen}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono">
                  MSSV: {profile.maSinhVien}
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                  Lớp: {profile.lop}
                </span>
              </div>
            </div>

            {/* Trạng thái học vụ */}
            <div className="w-full mt-5 bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-start gap-3 text-left">
              <span className="material-symbols-outlined text-emerald-600 text-[22px] mt-0.5">
                verified
              </span>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-semibold uppercase">Thông tin học vụ</span>
                <span className="text-sm font-semibold text-slate-800">Khóa {profile.khoaHoc || '—'} • {profile.chuyenNganh || 'Chưa cập nhật chuyên ngành'}</span>
                <span className="text-xs text-slate-500 mt-0.5">Do Khoa quản lý</span>
              </div>
            </div>

            {/* GPA và Xếp loại */}
            <div className="w-full grid grid-cols-2 gap-3 mt-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex flex-col items-center">
                <span className="text-xs text-slate-500 font-medium">GPA Tích Lũy</span>
                <span className="text-2xl font-bold text-blue-700 mt-1">{profile.gpa != null ? Number(profile.gpa).toFixed(2) : '—'}</span>
                <span className="text-[11px] text-slate-400">Thang điểm 4.0</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex flex-col items-center">
                <span className="text-xs text-slate-500 font-medium">Xếp Loại</span>
                <span className="text-lg font-bold text-slate-800 mt-1.5">
                  {xepLoaiGpa(profile.gpa) || '—'}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Theo GPA thang 4</span>
              </div>
            </div>

            {/* Quản lý File CV */}
            <div className="w-full mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 uppercase">CV Đính kèm</span>
                <span className="text-[11px] text-slate-400">
                  Cập nhật: {profile.ngayCapNhat ? new Date(profile.ngayCapNhat).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>

              {profile.fileCV && /^https?:\/\//i.test(profile.fileCV) ? (
                <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="material-symbols-outlined text-rose-600 text-[20px]">
                      picture_as_pdf
                    </span>
                    <a
                      href={profile.fileCV}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-800 font-medium truncate hover:underline"
                    >
                      {profile.fileCV.split('/').pop() || 'Curriculum_Vitae.pdf'}
                    </a>
                  </div>
                  <a
                    href={profile.fileCV}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 hover:text-blue-900"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </a>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[18px]">info</span>
                  <span>
                    {profile.fileCV
                      ? 'Link CV không hợp lệ (phải bắt đầu bằng http:// hoặc https://).'
                      : 'Chưa có link CV. Hãy bấm "Chỉnh sửa hồ sơ" để đính kèm.'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải: Kỹ năng, Công nghệ, Tóm tắt & Dự án */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Card Mục tiêu & Tóm tắt hồ sơ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">psychology</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Định hướng &amp; Tóm tắt năng lực</h3>
                  <p className="text-xs text-slate-500">Chuyên ngành: {profile.chuyenNganh || 'Công nghệ thông tin'}</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {profile.ndHoSo ||
                'Chưa cập nhật nội dung tóm tắt mục tiêu nghề nghiệp và năng lực cá nhân.'}
            </p>
          </div>

          {/* Card Kỹ năng & Công nghệ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">code</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Kỹ năng chuyên môn &amp; Công nghệ</h3>
                <p className="text-xs text-slate-500">Bộ tiêu chí dùng để tính điểm gợi ý công ty AI</p>
              </div>
            </div>

            {/* Kỹ năng */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Kỹ năng chuyên ngành
              </span>
              <div className="flex flex-wrap gap-2">
                {skillList.length > 0 ? (
                  skillList.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Chưa khai báo kỹ năng</span>
                )}
              </div>
            </div>

            {/* Công nghệ */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Công nghệ &amp; Framework thành thạo
              </span>
              <div className="flex flex-wrap gap-2">
                {techList.length > 0 ? (
                  techList.map((tech, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      {tech}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Chưa khai báo công nghệ</span>
                )}
              </div>
            </div>
          </div>

          {/* Card Dự án thực hiện */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">terminal</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Dự án &amp; Sản phẩm tiêu biểu</h3>
                <p className="text-xs text-slate-500">Minh chứng năng lực thực tế gửi tới doanh nghiệp</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900">
                  {profile.duAnDaThucHien ? 'Dự án đã thực hiện' : 'Chưa cập nhật'}
                </span>
                {profile.duAnDaThucHien && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                    Minh chứng
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {profile.duAnDaThucHien || 'Sinh viên chưa cập nhật thông tin dự án hoặc sản phẩm đã thực hiện.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Chỉnh Sửa Hồ Sơ */}
      {isEditModalOpen && (
        <ModalOverlay onClose={() => setIsEditModalOpen(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-700">edit_note</span>
                <h3 className="font-bold text-lg text-slate-900">Chỉnh sửa hồ sơ năng lực</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="flex flex-col gap-4 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-slate-500 shrink-0">lock</span>
                <span>
                  Họ tên, lớp, khóa, chuyên ngành và GPA ({formData.hoTen} • {formData.lop || '—'} • GPA {formData.gpa || '—'})
                  là dữ liệu học vụ do Khoa quản lý, doanh nghiệp dùng để xét tuyển nên sinh viên không tự chỉnh sửa.
                  Nếu thông tin chưa đúng, vui lòng liên hệ Văn phòng Khoa.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kỹ năng (cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  name="kyNang"
                  placeholder="Lập trình Web, RESTful API, Database Design..."
                  value={formData.kyNang}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Công nghệ &amp; Framework (cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  name="congNghe"
                  placeholder="React, ASP.NET Core, Node.js, SQL Server..."
                  value={formData.congNghe}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dự án đã thực hiện
                </label>
                <textarea
                  rows="3"
                  name="duAnDaThucHien"
                  maxLength={1000}
                  placeholder="Mỗi dự án một dòng: tên dự án – vai trò – công nghệ sử dụng..."
                  value={formData.duAnDaThucHien}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link file CV (Google Drive / PDF online)
                </label>
                <input
                  type="url"
                  name="fileCV"
                  placeholder="https://drive.google.com/... hoặc https://fit-portal.edu.vn/cv.pdf"
                  value={formData.fileCV}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tóm tắt mục tiêu nghề nghiệp &amp; năng lực (Dùng cho AI Matching)
                </label>
                <textarea
                  rows="3"
                  name="ndHoSo"
                  value={formData.ndHoSo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
                  placeholder="Mô tả tóm tắt kinh nghiệm, định hướng thực tập..."
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
