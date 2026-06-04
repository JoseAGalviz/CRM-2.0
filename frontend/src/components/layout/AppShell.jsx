import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useTaskNotifications } from '../../hooks/useTaskNotifications'
import { useAuth } from '../../context/AuthContext'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isDemo } = useAuth()
  useTaskNotifications()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {isDemo && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800 font-medium shrink-0">
            Modo Demo — solo lectura. Los cambios no están disponibles.
          </div>
        )}
        <TopBar onMenuOpen={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
