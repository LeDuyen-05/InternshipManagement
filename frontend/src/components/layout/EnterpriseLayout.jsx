import { useState, useEffect, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import EnterpriseHeader from './EnterpriseHeader.jsx'
import EnterpriseSidebar from './EnterpriseSidebar.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'

export const EnterpriseContext = createContext(null)

export function useEnterprise() {
  return useContext(EnterpriseContext)
}

export default function EnterpriseLayout() {
  const { user } = useAuth()
  const [activeCompany, setActiveCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  const handleSelectCompany = async (company) => {
    if (user?.maVaiTro === 'VT05') return // Tài khoản đại diện doanh nghiệp gắn chặt với công ty của mình
    try {
      setLoading(true)
      const res = await doanhNghiepService.getTongQuan(company.maCongTy)
      setActiveCompany({
        ...company,
        ...(res?.congTy || {}),
        daiDiens: res?.daiDiens || [],
        daiDienChinh: res?.daiDiens?.[0] || company.daiDienChinh,
      })
      localStorage.setItem('active_company_id', company.maCongTy)
    } catch (err) {
      console.error('Lỗi chọn doanh nghiệp:', err)
      setActiveCompany(company)
      localStorage.setItem('active_company_id', company.maCongTy)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function initCompany() {
      try {
        setLoading(true)
        // 1. Nếu là tài khoản đại diện DN (VT05) có mã đại diện, tìm công ty theo đại diện
        if (user?.maDaiDien) {
          const repData = await doanhNghiepService.getByDaiDien(user.maDaiDien)
          if (repData?.congTy) {
            const overview = await doanhNghiepService.getTongQuan(repData.congTy.maCongTy)
            setActiveCompany({
              ...repData.congTy,
              daiDiens: overview?.daiDiens || [],
              daiDienChinh: repData,
            })
            return
          }
        }

        // 2. Tải danh sách công ty từ database, lấy công ty đã lưu hoặc công ty đầu tiên
        const companies = await doanhNghiepService.getDanhSachDoanhNghiep()
        if (companies && companies.length > 0) {
          const savedId = localStorage.getItem('active_company_id')
          const found = companies.find((c) => c.maCongTy === savedId) || companies[0]
          const overview = await doanhNghiepService.getTongQuan(found.maCongTy)
          setActiveCompany({
            ...found,
            daiDiens: overview?.daiDiens || [],
            daiDienChinh: overview?.daiDiens?.[0] || found.daiDienChinh,
          })
        }
      } catch (err) {
        console.error('Lỗi khởi tạo doanh nghiệp từ DB:', err)
      } finally {
        setLoading(false)
      }
    }

    initCompany()
  }, [user?.maDaiDien])

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
