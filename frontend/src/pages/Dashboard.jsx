import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { MdPeople, MdCheckCircle, MdError, MdAccountBalance, MdTrendingUp, MdReceipt, MdRefresh } from 'react-icons/md'
import api from '../utils/api'
import { formatCurrency, formatDate, getPaymentBadgeClass } from '../utils/helpers'
import { Spinner, PageHeader } from '../components/ui'

const COLORS = ['#22C55E', '#00B4D8', '#3b82f6', '#EF4444', '#F59E0B']

// Convert YYYY-MM (input value) → APR-26 (API format)
const toApiMonth = (ym) => {
  if (!ym) return ''
  const [year, mon] = ym.split('-')
  const labels = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  return `${labels[parseInt(mon, 10) - 1]}-${year.slice(2)}`
}

// Convert APR-26 → 2026-04 (input value)
const toInputMonth = (apiMonth) => {
  if (!apiMonth) return ''
  const labels = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const [mon, yr] = apiMonth.split('-')
  const idx = labels.indexOf(mon)
  if (idx === -1) return ''
  const fullYear = parseInt(yr, 10) + 2000
  return `${fullYear}-${String(idx + 1).padStart(2, '0')}`
}

// Get current month as YYYY-MM for the input default
const getCurrentInputMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [breakdown, setBreakdown] = useState([])
  const [unpaid, setUnpaid] = useState([])
  const [loading, setLoading] = useState(true)
  const [inputMonth, setInputMonth] = useState(getCurrentInputMonth()) // YYYY-MM
  const navigate = useNavigate()

  const apiMonth = toApiMonth(inputMonth) // APR-26

  useEffect(() => { fetchAll() }, [inputMonth])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const m = toApiMonth(inputMonth)
      const [s, t, b, u] = await Promise.all([
        api.get(`/dashboard/summary?month=${m}`),
        api.get('/dashboard/monthly-trend'),
        api.get(`/dashboard/payment-breakdown?month=${m}`),
        api.get(`/dashboard/unpaid?month=${m}`),
      ])
      setSummary(s.data)
      setTrend(t.data.map(d => ({ month: d._id, billed: d.totalBilled, paid: d.totalPaid })))
      setBreakdown(b.data.map(d => ({ name: d._id || 'Unknown', value: d.count, amount: d.total })))
      setUnpaid(u.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const kpis = summary ? [
    { label: 'Total Customers', value: summary.totalCustomers, icon: MdPeople, color: 'bg-blue-50 text-blue-600' },
    { label: 'Paid This Month', value: summary.paidCount, icon: MdCheckCircle, color: 'bg-green-50 text-green-600' },
    { label: 'Unpaid This Month', value: summary.unpaidCount, icon: MdError, color: 'bg-red-50 text-red-600' },
    { label: 'Total Billed', value: formatCurrency(summary.totalBilled), icon: MdReceipt, color: 'bg-purple-50 text-purple-600' },
    { label: 'Amount Collected', value: formatCurrency(summary.totalPaid), icon: MdAccountBalance, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Outstanding', value: formatCurrency(summary.totalBalance), icon: MdTrendingUp, color: 'bg-amber-50 text-amber-600' },
  ] : []

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow p-3 text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>)}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Overview for ${apiMonth}`}
        actions={
          <div className="flex items-center gap-2">
            <input
              type="month"
              className="input w-40 text-sm"
              value={inputMonth}
              max={getCurrentInputMonth()}
              onChange={e => setInputMonth(e.target.value)}
            />
            <button onClick={fetchAll} className="btn-secondary p-2">
              <MdRefresh size={18} />
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64"><Spinner size={10} /></div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpis.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card">
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
                  <Icon size={20} />
                </div>
                <p className="text-xl font-bold text-gray-900 mono">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Trend chart */}
            <div className="card xl:col-span-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
              {trend.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trend}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="billed" name="Billed" fill="#1A3C6E" radius={[3,3,0,0]} />
                    <Bar dataKey="paid" name="Paid" fill="#00B4D8" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie chart */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment Breakdown</h3>
              {breakdown.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={breakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      {breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, n, p) => [v, p.payload.name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Recent payments */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Payments</h3>
              {summary?.recentPayments?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No payments recorded</p>
              ) : (
                <div className="space-y-2">
                  {(summary?.recentPayments || []).slice(0, 6).map(p => (
                    <Link
  to={`/customers/${p.customerId?._id}`}
  key={p._id}
  className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-1 transition-colors"
>
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {p.customerId?.name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.customerId?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400 mono">{p.customerUserId} · {p.month}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.amountPaid)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getPaymentBadgeClass(p.paymentType)}`}>{p.paymentType}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Unpaid customers */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Unpaid Customers</h3>
                <button onClick={() => navigate('/billing?status=unpaid')} className="text-xs text-brand-700 hover:underline">View all</button>
              </div>
              {unpaid.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">All customers are paid!</p>
              ) : (
                <div className="space-y-2">
                  {unpaid.slice(0, 6).map(r => (
<Link
  to={`/customers/${r.customerId?._id}`}
  key={r._id}
  className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-1 transition-colors"
>                      <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {r.customerId?.name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.customerId?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400 mono">{r.customerId?.mobile}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-600">{formatCurrency(r.balance)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}