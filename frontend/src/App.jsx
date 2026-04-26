import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerProfile from './pages/CustomerProfile'
import Billing from './pages/Billing'
import Reports from './pages/Reports'
import Plans from './pages/Plans'
import Users from './pages/Users'
import Settings from './pages/Settings'
import QuickPay from './components/ui/Quickpay'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerProfile />} />
            <Route path="billing" element={<Billing />} />
            <Route path="reports" element={<Reports />} />
            <Route path="plans" element={<Plans />} />

            <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
            <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
