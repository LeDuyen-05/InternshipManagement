import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { gvHuongDanService } from '../../services/gvHuongDanService'
import { useIdentity } from '../../hooks/useIdentity'

export default function HoSoChuyenMonPage() {
  const [searchParams] = useSearchParams()
  const { maGV: identityMaGV, role } = useIdentity() || {}
  const isStaff = role === 'VT01' || role === 'VT02'
  const currentMaGV = isStaff && searchParams.get('gv') ? searchParams.get('gv') : (identityMaGV || 'GV001')

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Form states
  const [chuyenMon, setChuyenMon] = useState('')
  const [email, setEmail] = useState('')
  const [soDienThoai, setSoDienThoai] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [currentMaGV])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await gvHuongDanService.getProfile(currentMaGV)
      const data = res.data?.data || res.data
      if (data) {
        setProfile(data)
        setChuyenMon(data.chuyenMon || '')
        const defaultEmail = currentMaGV === 'GV001' ? 'an.nv@huit.edu.vn' : `${currentMaGV.toLowerCase()}@huit.edu.vn`
        setEmail(data.email && !data.email.startsWith('gv') ? data.email : defaultEmail)
        setSoDienThoai(data.soDienThoai || '028.3816.1673')
      }
    } catch (err) {
      console.error('Lỗi tải hồ sơ giảng viên:', err)
      setError('Không thể tải thông tin hồ sơ: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  // Chuẩn hóa chỉ tiêu định mức và tỷ lệ tải thực tế của Khoa (tối thiểu 10 SV/GV)
  const quota = Math.max(10, Number(profile?.soLuongSVHD) || 10)
  const currentCount = profile?.soLuongDangHuongDan || 0
  const percent = Math.min(100, Math.round((currentCount / quota) * 100))
  const slotsLeft = Math.max(0, quota - currentCount)

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      await gvHuongDanService.updateProfile(currentMaGV, {
        chuyenMon,
        email,
        soDienThoai,
      })
      setToastMessage('Đã cập nhật thông tin hồ sơ chuyên môn thành công!')
      setTimeout(() => setToastMessage(''), 4000)
      await fetchProfile()
    } catch (err) {
      alert('Không thể cập nhật hồ sơ: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white text-xs font-semibold rounded-2xl shadow-xl transition">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header trang */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Khoa Công nghệ thông tin</span>
            <span>•</span>
            <span className="text-blue-600 font-bold">Hồ sơ giảng viên</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Hồ Sơ Chuyên Môn & Năng Lực Hướng Dẫn
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Thông tin lý lịch khoa học, lĩnh vực nghiên cứu và tải thực tế phục vụ phân công sinh viên thực tập tốt nghiệp.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Đang tải thông tin hồ sơ...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 bg-white rounded-2xl border border-red-200 text-sm">
          {error}
        </div>
      ) : profile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái: Thẻ tóm tắt thông tin */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-24 h-24 rounded-3xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl mx-auto shadow-sm border border-blue-200">
                  {profile.hoTen?.split(' ').pop() || 'GV'}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-4">{profile.hoTen}</h2>
                <p className="text-xs font-semibold text-blue-600 mt-0.5">
                  {profile.hocVi || 'ThS.'} • Mã GV: <span className="font-mono">{profile.maGV}</span>
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Tài khoản HUIT SSO đã xác thực</span>
                </div>
              </div>

              {/* Thông số phân công & Thanh tải công việc */}
              <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Bộ môn</span>
                  <span className="font-semibold text-slate-800">{profile.boMon || 'Công nghệ phần mềm'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Chỉ tiêu Khoa cấp</span>
                  <span className="font-bold text-slate-800">{quota} sinh viên</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Đang hướng dẫn</span>
                  <span className="font-bold text-blue-600">{currentCount} sinh viên</span>
                </div>
                <div className="py-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-slate-500">Tải hướng dẫn hiện hành</span>
                    <span className={`font-bold ${percent >= 100 ? 'text-rose-600' : percent >= 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {currentCount}/{quota} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percent >= 100 ? 'bg-rose-500' : percent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {slotsLeft > 0 ? `Còn nhận được tối đa ${slotsLeft} sinh viên` : 'Đã đạt hạn mức chỉ tiêu'}
                  </p>
                </div>
              </div>

              {/* Thông tin văn phòng & Đơn vị */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-slate-400">apartment</span>
                  <span>Phòng B.304 - Cơ sở chính (140 Lê Trọng Tấn)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-slate-400">school</span>
                  <span>Khoa Công nghệ Thông tin - HUIT</span>
                </div>
              </div>
            </div>

            <Link
              to={`/giang-vien/sinh-vien?gv=${profile.maGV}`}
              className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-blue-200 shadow-2xs mt-2"
            >
              <span className="material-symbols-outlined text-sm">group</span>
              <span>Xem danh sách sinh viên ({currentCount} SV)</span>
            </Link>
          </div>

          {/* Cột phải: Form cập nhật thông tin */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
              Chỉnh Sửa Thông Tin Chuyên Môn & Liên Lạc
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã Giảng viên</label>
                  <input
                    type="text"
                    disabled
                    value={profile.maGV}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    disabled
                    value={profile.hoTen}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email công vụ HUIT</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={soDienThoai}
                    onChange={(e) => setSoDienThoai(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hướng nghiên cứu & Lĩnh vực chuyên môn
                </label>
                <textarea
                  rows={4}
                  value={chuyenMon}
                  onChange={(e) => setChuyenMon(e.target.value)}
                  placeholder="Ví dụ: Kỹ thuật phần mềm, Phát triển Web Full-Stack, Trí tuệ nhân tạo, Điện toán đám mây..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none font-sans"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Thông tin này giúp Cán bộ Khoa phân công sinh viên đúng chuyên ngành và lĩnh vực nghiên cứu.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                  <span>Lưu thông tin hồ sơ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
