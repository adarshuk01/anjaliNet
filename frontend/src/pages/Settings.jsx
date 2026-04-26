import { useState } from 'react'
import { MdSettings, MdLock, MdCheckCircle } from 'react-icons/md'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Toast, PageHeader } from '../components/ui'

export default function Settings() {
  const { user } = useAuth()
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('account')

  const handlePwChange = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) {
      setToast({ message: 'Passwords do not match', type: 'error' }); return
    }
    if (pwForm.newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' }); return
    }
    setPwLoading(true)
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setToast({ message: 'Password changed successfully', type: 'success' })
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to change password', type: 'error' })
    } finally {
      setPwLoading(false)
    }
  }

  const tabs = [
    { id: 'account', label: 'Account', icon: MdSettings },
    { id: 'security', label: 'Security', icon: MdLock },
  ]

  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="card p-2">
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                  ${activeTab === id ? 'bg-brand-50 text-brand-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'account' && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Account Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                  <div className="w-16 h-16 rounded-full bg-brand-800 text-white flex items-center justify-center text-2xl font-bold">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{user?.name}</h3>
                    <p className="text-gray-500 text-sm">{user?.email}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium capitalize mt-1 inline-block">{user?.role}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Full Name</p>
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Email Address</p>
                    <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Role</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{user?.role}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">System</p>
                    <p className="text-sm font-medium text-gray-900">AnjaliNet v1.0.0</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <MdCheckCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Anjali Communications — Broadband Billing System</p>
                      <p className="text-xs text-blue-600 mt-0.5">Kozhikode, Kerala · All rights reserved</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Change Password</h2>
              <form onSubmit={handlePwChange} className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Password *</label>
                  <input type="password" className="input" required value={pwForm.currentPassword}
                    onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">New Password *</label>
                  <input type="password" className="input" required value={pwForm.newPassword}
                    onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} minLength={6} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password *</label>
                  <input type="password" className="input" required value={pwForm.confirm}
                    onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} minLength={6} />
                </div>
                <button type="submit" disabled={pwLoading} className="btn-primary flex items-center gap-2">
                  {pwLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {pwLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
