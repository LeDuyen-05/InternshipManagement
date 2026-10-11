import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 pt-16 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
