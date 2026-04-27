import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  MdDashboard, MdPeople, MdReceiptLong, MdBarChart,
  MdWifi, MdPerson, MdSettings, MdLogout, MdClose
} from 'react-icons/md'

const navItems = [
  { to: '/', icon: MdDashboard, label: 'Dashboard', exact: true },
  { to: '/customers', icon: MdPeople, label: 'Customers' },
  { to: '/billing', icon: MdReceiptLong, label: 'Billing' },
  { to: '/reports', icon: MdBarChart, label: 'Reports' },
  { to: '/plans', icon: MdWifi, label: 'Plans' },
]

const adminItems = [
  { to: '/users', icon: MdPerson, label: 'Users' },
  { to: '/settings', icon: MdSettings, label: 'Settings' },
]

// Desktop sidebar — hidden on mobile
export default function Sidebar({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-white/15 text-white border-l-2 border-accent'
        : 'text-blue-100 hover:bg-white/10 hover:text-white'
    }`

  return (
    <>
      {/* Overlay — mobile only when drawer open */}
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 h-full w-64 bg-brand-800 flex flex-col z-30 transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <MdWifi className="text-white text-lg" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">AnjaliNet</p>
              <p className="text-blue-200 text-xs">Billing System</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-blue-200 hover:text-white">
            <MdClose size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} className={linkClass} onClick={onClose}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1 px-4">
                <p className="text-blue-300 text-xs uppercase tracking-wider font-medium">Admin</p>
              </div>
              {adminItems.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} className={linkClass} onClick={onClose}>
                  <Icon size={20} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-blue-300 text-xs capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-blue-200 hover:text-white transition-colors" title="Logout">
              <MdLogout size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

// Mobile bottom navigation bar
export function MobileBottomBar({ onClose }) {
  const { isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const allItems = [
    ...navItems,
    ...(isAdmin ? adminItems : []),
  ]

  // Show at most 5 items on bottom bar; rest are accessible via desktop sidebar
  const visibleItems = allItems.slice(0, 5)

  const linkClass = ({ isActive }) =>
    `flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-0 flex-1 transition-all ${
      isActive ? 'text-brand-800' : 'text-gray-400'
    }`

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex items-stretch h-16">
        {visibleItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={linkClass}
            onClick={onClose}
          >
            {({ isActive }) => (
              <>
                <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-brand-50' : ''}`}>
                  <Icon size={22} className={isActive ? 'text-brand-800' : 'text-gray-400'} />
                </div>
                <span className={`text-[10px] font-medium leading-tight truncate w-full text-center ${isActive ? 'text-brand-800' : 'text-gray-400'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
