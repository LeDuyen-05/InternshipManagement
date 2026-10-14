import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import doanhNghiepService from '../../services/doanhNghiepService.js'

export default function EnterpriseHeader({ activeCompany, onSelectCompany }) {
  const [companies, setCompanies] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    async function loadCompanies() {
      try {
        const data = await doanhNghiepService.getDanhSachDoanhNghiep()
        setCompanies(data || [])
      } catch (err) {
        console.error('Lỗi tải danh sách doanh nghiệp:', err)
      }
    }
    loadCompanies()
  }, [])

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 z-40 px-6 flex items-center justify-between shadow-xs">
      {/* Left section: Breadcrumb & Company Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center text-slate-500 text-sm">
          <span className="material-symbols-outlined text-[18px] text-indigo-700 mr-1.5">corporate_fare</span>
          <span className="font-semibold text-indigo-950">FIT Portal</span>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-800 font-medium">Cổng Doanh Nghiệp</span>
        </div>

        {/* Company Switcher Dropdown */}
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
                Chọn Doanh nghiệp làm việc
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
      </div>

      {/* Right section: Switch to Student Portal & Profile */}
      <div className="flex items-center gap-3">
        {/* Switch Portal Button */}
        <Link
          to="/sinh-vien"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-all shadow-2xs"
        >
          <span className="material-symbols-outlined text-[16px]">school</span>
          <span>Cổng Sinh viên</span>
        </Link>

        {/* Semester Tag */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>HK2 (2026 - 2027)</span>
        </div>

        {/* Representative Avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            {activeCompany?.tenCongTy?.charAt(0) || 'D'}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {activeCompany?.daiDienChinh?.hoTen || 'Đại diện Doanh nghiệp'}
            </span>
            <span className="text-[10px] text-slate-500">
              {activeCompany?.daiDienChinh?.chucVu || 'HR / Tuyển dụng'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
