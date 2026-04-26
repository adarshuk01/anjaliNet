import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { MdBarChart, MdRefresh } from 'react-icons/md'
import api from '../utils/api'
import { formatCurrency, getCurrentMonth, getMonthOptions, getPaymentBadgeClass } from '../utils/helpers'
import { PageHeader, Spinner } from '../components/ui'

const COLORS = ['#1A3C6E','#00B4D8','#3b82f6','#8b5cf6','#ec4899','#f97316','#14b8a6']

export default function Reports() {
  const [month, setMonth] = useState(getCurrentMonth())
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [breakdown, setBreakdown] = useState([])
  const [unpaid, setUnpaid] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchData() }, [month])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [s, t, b, u] = await Promise.all([
        api.get(`/dashboard/summary?month=${month}`),
        api.get('/dashboard/monthly-trend'),
        api.get(`/dashboard/payment-breakdown?month=${month}`),
        api.get(`/dashboard/unpaid?month=${month}`),
      ])
      setSummary(s.data)
      setTrend(t.data.map(d => ({ month: d._id, paid: d.totalPaid, billed: d.totalBilled })))
      setBreakdown(b.data)
      setUnpaid(u.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow p-3 text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map(p => <p key={p.name} style={{ color: p.fill }}>{p.name}: {formatCurrency(p.value)}</p>)}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Business performance overview"
        actions={
          <div className="flex gap-2">
            <select className="input w-36" value={month} onChange={e => setMonth(e.target.value)}>
              {getMonthOptions().map(m => <option key={m}>{m}</option>)}
            </select>
            <button onClick={fetchData} className="btn-secondary p-2"><MdRefresh size={18} /></button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64"><Spinner size={10} /></div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Billed', value: formatCurrency(summary.totalBilled), color: 'border-t-2 border-t-brand-800' },
                { label: 'Amount Collected', value: formatCurrency(summary.totalPaid), color: 'border-t-2 border-t-green-500' },
                { label: 'Outstanding Balance', value: formatCurrency(summary.totalBalance), color: 'border-t-2 border-t-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`card ${color}`}>
                  <p className="text-2xl font-bold mono text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500 mt-1">{label} — {month}</p>
                </div>
              ))}
            </div>
          )}

          {/* Monthly trend chart */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue Trend (Last 12 Months)</h3>
            {trend.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trend} barGap={2}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="billed" name="Billed" fill="#1A3C6E" radius={[3,3,0,0]} />
                  <Bar dataKey="paid" name="Paid" fill="#00B4D8" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Payment method breakdown */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Collection by Payment Method — {month}</h3>
              {breakdown.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No payment data</p>
              ) : (
                <div className="space-y-3">
                  {breakdown.map((item, i) => {
                    const maxTotal = Math.max(...breakdown.map(b => b.total))
                    const pct = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0
                    return (
                      <div key={item._id} className="flex items-center gap-3">
                        <div className="w-24 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${getPaymentBadgeClass(item._id)}`}>{item._id || 'Unknown'}</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                          </div>
                        </div>
                        <div className="text-right w-24 flex-shrink-0">
                          <p className="text-xs font-semibold mono text-gray-900">{formatCurrency(item.total)}</p>
                          <p className="text-xs text-gray-400">{item.count} txns</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Unpaid customers */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Unpaid Customers — {month}</h3>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{unpaid.length} pending</span>
              </div>
              {unpaid.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">🎉 All customers paid this month!</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {unpaid.map(r => (
                    <div key={r._id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {r.customerId?.name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.customerId?.name}</p>
                        <p className="text-xs text-gray-400 mono">{r.customerId?.mobile}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600 mono">{formatCurrency(r.balance)}</p>
                        <p className="text-xs text-gray-400">{r.plan || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats summary cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Customers', value: summary.totalCustomers },
                { label: 'Paid This Month', value: summary.paidCount },
                { label: 'Unpaid This Month', value: summary.unpaidCount },
                { label: 'Collection Rate', value: summary.totalBilled > 0 ? `${((summary.totalPaid / summary.totalBilled) * 100).toFixed(1)}%` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="card text-center">
                  <p className="text-2xl font-bold mono text-brand-800">{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
