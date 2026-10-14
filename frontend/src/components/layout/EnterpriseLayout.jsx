import { useState, useEffect, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import EnterpriseHeader from './EnterpriseHeader.jsx'
import EnterpriseSidebar from './EnterpriseSidebar.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'

export const EnterpriseContext = createContext(null)

export function useEnterprise() {
  return useContext(EnterpriseContext)
}

export default function EnterpriseLayout() {
  const [activeCompany, setActiveCompany] = useState(() => {
    const saved = localStorage.getItem('active_company_id')
    return { maCongTy: saved || 'CT001', tenCongTy: 'Công ty TNHH FPT Software' }
  })
  const [loading, setLoading] = useState(false)

  const handleSelectCompany = (company) => {
    setActiveCompany(company)
    localStorage.setItem('active_company_id', company.maCongTy)
  }

  useEffect(() => {
    async function fetchCompanyDetails() {
      if (!activeCompany?.maCongTy) return
      try {
        setLoading(true)
        const res = await doanhNghiepService.getTongQuan(activeCompany.maCongTy)
        if (res?.congTy) {
          setActiveCompany((prev) => ({
            ...prev,
            ...res.congTy,
            daiDiens: res.daiDiens,
            daiDienChinh: res.daiDiens?.[0] || prev.daiDienChinh,
          }))
        }
      } catch (err) {
        console.error('Lỗi tải chi tiết doanh nghiệp:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCompanyDetails()
  }, [activeCompany.maCongTy])

  return (
    <EnterpriseContext.Provider value={{ activeCompany, setActiveCompany: handleSelectCompany, loading }}>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <EnterpriseSidebar />
        <div className="pl-64 flex flex-col min-h-screen">
          <EnterpriseHeader activeCompany={activeCompany} onSelectCompany={handleSelectCompany} />
          <main className="flex-1 pt-16 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </EnterpriseContext.Provider>
  )
}
