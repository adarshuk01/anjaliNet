import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import QuickPay from '../ui/Quickpay'
import { useAuth } from '../../context/AuthContext'
import { QuickPayProvider, useQuickPay } from '../../context/QuickPayContext'
import { MdPayments } from 'react-icons/md'

function LayoutInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAgent } = useAuth()
  const { quickPayCustomer, openQuickPay, closeQuickPay } = useQuickPay()

  const isOpen = quickPayCustomer !== null
  const initialCustomer = isOpen && quickPayCustomer !== 'search' ? quickPayCustomer : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Quick Pay FAB — visible on every page for agents */}
      {isAgent && (
        <button
          onClick={() => openQuickPay()}
          className="fixed bottom-16 right-6 z-40 flex items-center gap-2 bg-brand-800 hover:bg-brand-700 active:scale-95 text-white px-5 py-3.5 rounded-full shadow-lg text-sm font-semibold transition-all"
        >
          <MdPayments size={20} />
          <span className="hidden sm:inline">Quick Pay</span>
        </button>
      )}

      {isOpen && (
        <QuickPay
          initialCustomer={initialCustomer}
          onClose={closeQuickPay}
          onDone={closeQuickPay}
        />
      )}
    </div>
  )
}

export default function Layout() {
  return (
    <QuickPayProvider>
      <LayoutInner />
    </QuickPayProvider>
  )
}
