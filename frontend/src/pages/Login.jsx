import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdWifi, MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [seeding, setSeeding] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await api.post('/auth/seed')
      setForm({ email: 'admin@anjalicomm.in', password: 'admin123' })
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Seed failed')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-3/5 bg-brand-800 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{ width: `${(i+1)*120}px`, height: `${(i+1)*120}px`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MdWifi className="text-white text-4xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Anjali Communications</h1>
          <p className="text-accent text-lg mb-10">Broadband Billing Management</p>
          <div className="space-y-3 text-left max-w-xs">
            {['Manage 1,200+ customers in one place', 'Real-time payment tracking', 'Instant billing reports & exports'].map(f => (
              <div key={f} className="flex items-center gap-3 text-blue-100">
                <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                </div>
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-brand-800 rounded-xl flex items-center justify-center">
              <MdWifi className="text-white text-xl" />
            </div>
            <span className="text-xl font-bold text-brand-800">AnjaliNet</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-6">Sign in to your account</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <div className="relative">
                <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="email" className="input pl-10" placeholder="admin@anjalicomm.in"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type={showPwd ? 'text' : 'password'} className="input pl-10 pr-10"
                  placeholder="Enter your password"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">First time setup? Create the admin account:</p>
            <button onClick={handleSeed} disabled={seeding}
              className="w-full text-center text-sm text-brand-700 hover:text-brand-900 font-medium py-2 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors disabled:opacity-50">
              {seeding ? 'Creating...' : 'Initialize Admin Account'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">Default: admin@anjalicomm.in / admin123</p>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">AnjaliNet v1.0.0 · Anjali Communications</p>
        </div>
      </div>
    </div>
  )
}
