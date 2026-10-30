import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'

export default function EnterpriseHeader({ activeCompany, onSelectCompany }) {
  const [companies, setCompanies] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { selectedDot, danhSachNamHoc, changeDot } = useDotThucTap()

  const isManagerOrAdmin = user?.maVaiTro === 'VT01' || user?.maVaiTro === 'VT02'

  useEffect(() => {
    async function loadCompanies() {
      if (!isManagerOrAdmin) return
      try {
        const data = await doanhNghiepService.getDanhSachDoanhNghiep()
        setCompanies(data || [])
      } catch (err) {
        console.error('Lỗi tải danh sách doanh nghiệp:', err)
      }
    }
    loadCompanies()
  }, [isManagerOrAdmin])

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white border-b border-slate-200 z-40 pl-16 pr-3 lg:px-6 flex items-center justify-between gap-2 shadow-xs">
      <label className="text-xs min-w-0 max-w-[280px] sm:max-w-[340px]">
        <span className="sr-only">Đợt thực tập doanh nghiệp</span>
        <select aria-label="Đợt thực tập doanh nghiệp" value={selectedDot?.maDot || ''}
          onChange={e => {
            const round = danhSachNamHoc.flatMap(year => year.dots).find(item => item.maDot === e.target.value)
            if (round) changeDot(round)
          }} className="border rounded-lg p-2 w-full bg-white">
          {danhSachNamHoc.flatMap(year => year.dots).map(round => <option key={round.maDot} value={round.maDot}>{round.tenDot} ({round.maDot})</option>)}
        </select>
      </label>
      {/* Left section: Breadcrumb & Company Info */}
      <div className="flex items-center gap-4">
        <div className="hidden xl:flex items-center text-slate-500 text-sm">
          <span className="material-symbols-outlined text-[18px] text-indigo-700 mr-1.5">corporate_fare</span>
          <span className="hidden xl:inline font-semibold text-indigo-950">FIT Portal</span>
          <span className="hidden sm:inline mx-2 text-slate-300">/</span>
          <span className="hidden sm:inline text-slate-800 font-medium">Cổng Doanh nghiệp</span>
        </div>

        {/* Company Badge / Switcher (Chỉ Admin/Khoa mới được switch, tài khoản DN hiển thị cố định) */}
        {isManagerOrAdmin ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-semibold transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-indigo-600">domain</span>
              <span>{activeCompany?.tenCongTy || 'Đang chọn doanh nghiệp...'}</span>
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </button>

            {showDropdown && (
              <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 text-xs">
                <div className="px-2 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Chọn Doanh nghiệp (Quyền Quản trị)
                </div>
                <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                  {companies.map((c) => (
                    <button
                      key={c.maCongTy}
                      type="button"
                      onClick={() => {
                        if (onSelectCompany) onSelectCompany(c)
                        setShowDropdown(false)
                      }}
                      className={`text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                        activeCompany?.maCongTy === c.maCongTy
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{c.tenCongTy}</div>
                        <div className={`text-[10px] ${activeCompany?.maCongTy === c.maCongTy ? 'text-indigo-200' : 'text-slate-400'}`}>
                          Mã: {c.maCongTy} • {c.viTriTuyen || 'Chưa cập nhật'}
                        </div>
                      </div>
                      {activeCompany?.maCongTy === c.maCongTy && (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs font-bold shadow-2xs">
            <span className="material-symbols-outlined text-[16px] text-indigo-600">domain</span>
            <span>{activeCompany?.tenCongTy || 'Doanh Nghiệp'}</span>
          </div>
        )}
      </div>

      {/* Right section: Switch to Student Portal, Profile & Logout */}
      <div className="flex items-center gap-3">
        {/* Khoa / Quản trị quay về cổng quản lý của mình */}
        {isManagerOrAdmin && (
          <Link
            to={user?.maVaiTro === 'VT01' ? '/admin' : '/khoa'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>{user?.maVaiTro === 'VT01' ? 'Cổng Quản trị' : 'Cổng Khoa'}</span>
          </Link>
        )}

        {/* Đợt thực tập đang tuyển (lấy từ hệ thống) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-700">
          <span className={`w-2 h-2 rounded-full ${activeCompany?.chiTieu?.maDot ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
          <span>{activeCompany?.chiTieu?.tenDot || 'Chưa có đợt đang diễn ra'}</span>
        </div>

        {/* Representative Avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            {(user?.tenDangNhap?.charAt(0) || activeCompany?.tenCongTy?.charAt(0) || 'D').toUpperCase()}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {user?.hoTen || user?.tenDangNhap || 'Đại diện Doanh nghiệp'}
            </span>
            <span className="text-[10px] text-slate-500">
              {user?.tenVaiTro || (user?.maVaiTro === 'VT02' ? 'Khoa' : user?.maVaiTro === 'VT01' ? 'Quản trị viên' : 'Đại diện Doanh nghiệp')}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          title="Đăng xuất"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 text-xs font-medium transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  )
}
