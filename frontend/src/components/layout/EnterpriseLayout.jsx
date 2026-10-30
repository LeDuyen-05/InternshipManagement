import { Suspense, useState, useEffect, useCallback, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import EnterpriseHeader from './EnterpriseHeader.jsx'
import EnterpriseSidebar from './EnterpriseSidebar.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'
import ResponsiveNavigation from './ResponsiveNavigation.jsx'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'

export const EnterpriseContext = createContext(null)

export function useEnterprise() {
  return useContext(EnterpriseContext)
}

export default function EnterpriseLayout() {
  const { user } = useAuth()
  const { selectedDot, loading: roundLoading } = useDotThucTap()
  const maDot = selectedDot?.maDot
  const [activeCompany, setActiveCompany] = useState(null)
  const [companyId, setCompanyId] = useState(() => localStorage.getItem('active_company_id'))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const contextKey = JSON.stringify([user?.maTaiKhoan, user?.maDaiDien, maDot, companyId])
  const [loadedKey, setLoadedKey] = useState(null)
  const ready = loadedKey === contextKey && !roundLoading
  const company = ready ? activeCompany : null

  const handleSelectCompany = (nextCompany) => {
    if (user?.maVaiTro === 'VT05') return
    setCompanyId(nextCompany.maCongTy)
    localStorage.setItem('active_company_id', nextCompany.maCongTy)
  }
  const updateChiTieu = useCallback((quota) => {
    if (quota?.maDot !== maDot) return
    setActiveCompany(previous => previous?.chiTieu?.maDot === maDot ? { ...previous, chiTieu: quota } : previous)
  }, [maDot])

  useEffect(() => {
    let active = true
    setActiveCompany(null); setError(''); setLoading(true)
    async function initCompany() {
      try {
        if (!maDot || roundLoading) return
        let found, representative
        if (user?.maVaiTro === 'VT05') {
          if (!user.maDaiDien) throw new Error('Tài khoản chưa được gắn với đại diện doanh nghiệp.')
          representative = await doanhNghiepService.getByDaiDien(user.maDaiDien)
          found = representative?.congTy
        } else {
          const companies = await doanhNghiepService.getDanhSachDoanhNghiep()
          found = companies?.find(c => c.maCongTy === companyId) || companies?.[0]
        }
        if (!found) throw new Error('Chưa tìm thấy doanh nghiệp được cấp quyền.')
        const overview = await doanhNghiepService.getTongQuan(found.maCongTy, maDot)
        if (!active) return
        if (overview?.chiTieu?.maDot !== maDot) throw new Error('Phản hồi không thuộc đợt đang chọn.')
        setActiveCompany({ ...found, ...(overview.congTy || {}),
          daiDiens: overview.daiDiens || [], daiDienChinh: representative || overview.daiDiens?.[0],
          chiTieu: overview.chiTieu })
      } catch (err) {
        if (active) setError(err.response?.data?.message || err.message || 'Không tải được doanh nghiệp trong đợt đang chọn.')
      } finally {
        if (active) { setLoading(false); setLoadedKey(contextKey) }
      }
    }
    initCompany()
    return () => { active = false }
  }, [user?.maVaiTro, user?.maDaiDien, maDot, roundLoading, companyId, contextKey])

  return (
    <EnterpriseContext.Provider value={{ activeCompany: company, setActiveCompany: handleSelectCompany, updateChiTieu, maDot, loading: loading || !ready }}>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <ResponsiveNavigation><EnterpriseSidebar activeCompany={company} /></ResponsiveNavigation>
        <div className="lg:pl-64 flex flex-col min-h-screen">
          <EnterpriseHeader activeCompany={company} onSelectCompany={handleSelectCompany} />
          <main className="flex-1 pt-20 px-4 pb-4 sm:px-6 sm:pb-6 min-w-0">
            <Suspense fallback={<div role="status" aria-live="polite" className="p-6 text-slate-600">Đang tải trang…</div>}>
              {loading || !ready ? <p role="status">Đang tải doanh nghiệp theo đợt…</p>
                : error ? <p role="alert" className="text-rose-700">{error}</p>
                : <Outlet key={contextKey} />}
            </Suspense>
          </main>
        </div>
      </div>
    </EnterpriseContext.Provider>
  )
}
