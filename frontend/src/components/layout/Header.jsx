import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdMenu, MdSearch, MdNotifications, MdLogout, MdPerson } from 'react-icons/md'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const searchRef = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    clearTimeout(timer.current)
    if (search.length < 2) { setResults([]); setShowDropdown(false); return }
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/customers/search?q=${encodeURIComponent(search)}`)
        setResults(data)
        setShowDropdown(true)
      } catch { setResults([]) }
    }, 300)
  }, [search])

  const handleSelect = (id) => {
    setSearch(''); setShowDropdown(false)
    navigate(`/customers/${id}`)
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4 sticky top-0 z-10">
      <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-700">
        <MdMenu size={24} />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md" ref={searchRef}>
        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
          placeholder="Search customers, IDs, mobiles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />
        {showDropdown && results.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto">
            {results.map(c => (
              <button key={c._id} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3"
                onMouseDown={() => handleSelect(c._id)}>
                <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {c.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{c.userId} · {c.mobile}</p>
                </div>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </button>
            ))}
          </div>
        )}
        {showDropdown && results.length === 0 && search.length >= 2 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 z-50 px-4 py-3 text-sm text-gray-500">
            No customers found
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 relative">
          <MdNotifications size={20} />
        </button>

        <div className="relative">
          <button onClick={() => setShowUser(!showUser)}
            className="w-9 h-9 rounded-full bg-brand-800 text-white flex items-center justify-center text-sm font-semibold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </button>
          {showUser && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <MdPerson size={16} /> Profile
              </button>
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                <MdLogout size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
