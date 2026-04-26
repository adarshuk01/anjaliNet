import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('anjali_user')
    return u ? JSON.parse(u) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('anjali_token')
    if (token) {
      api.get('/auth/me')
        .then(r => { setUser(r.data); localStorage.setItem('anjali_user', JSON.stringify(r.data)) })
        .catch(() => { localStorage.removeItem('anjali_token'); localStorage.removeItem('anjali_user'); setUser(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('anjali_token', data.token)
    localStorage.setItem('anjali_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('anjali_token')
    localStorage.removeItem('anjali_user')
    setUser(null)
  }

  const isAdmin = user?.role === 'admin'
  const isAgent = user?.role === 'agent' || user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isAgent }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
