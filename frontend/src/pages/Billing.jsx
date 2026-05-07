import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate ,useLocation } from 'react-router-dom'
import { MdAdd, MdEdit, MdDelete, MdSearch, MdCheckCircle, MdReceiptLong, MdClose, MdUploadFile } from 'react-icons/md'
import api from '../utils/api'
import { formatCurrency, formatDate, getCurrentMonth, getPaymentBadgeClass } from '../utils/helpers'
import { Modal, Toast, ConfirmDialog, PageHeader, EmptyState, Spinner } from '../components/ui'
import BillingForm from '../components/ui/BillingForm'
import MonthPicker from '../components/ui/MonthPicker'
import ImportModal from '../components/ui/ImportModal'
import { useAuth } from '../context/AuthContext'

// ─── Status helpers ───────────────────────────────────────────────────────────

function getStatus(r) {
  const balance = Math.round((r.balance    || 0) * 100) / 100
  const paid    = Math.round((r.amountPaid || 0) * 100) / 100
  if (balance <= 0) return 'paid'
  if (paid > 0)     return 'partial'
  return 'unpaid'
}

const ACCENT_STYLE = {
  paid:    { width: 4, minWidth: 4, padding: 0, background: '#4ade80' },
  partial: { width: 4, minWidth: 4, padding: 0, background: '#fb923c' },
  unpaid:  { width: 4, minWidth: 4, padding: 0, background: '#f87171' },
}

const ROW_BG = {
  paid:    'rgba(220,252,231,0.45)',
  partial: 'rgba(255,237,213,0.45)',
  unpaid:  'rgba(254,226,226,0.40)',
}

const BADGE = {
  paid:    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100  text-green-700',
  partial: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700',
  unpaid:  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100    text-red-700',
}

// ─── Pagination helper ────────────────────────────────────────────────────────
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  pages.push(1)
  if (current > 4) pages.push('...')
  for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) pages.push(i)
  if (current < total - 3) pages.push('...')
  pages.push(total)
  return pages
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [records, setRecords]             = useState([])
  const [summary, setSummary]             = useState({})
  const [total, setTotal]                 = useState(0)
  const [pages, setPages]                 = useState(1)
  const [page, setPage]                   = useState(1)
  const [loading, setLoading]             = useState(true)
  const [month, setMonth]                 = useState(getCurrentMonth())
  const [search, setSearch]               = useState('')
  const [inputValue, setInputValue]       = useState('')
  const [statusFilter, setStatusFilter]   = useState(() => searchParams.get('status') || '')
  const [payTypeFilter, setPayTypeFilter] = useState('')
  const [showForm, setShowForm]           = useState(false)
  const [editRecord, setEditRecord]       = useState(null)
  const [deleteTarget, setDeleteTarget]   = useState(null)
  const [showImport, setShowImport]       = useState(false)
  const [toast, setToast]                 = useState(null)
  const { isAgent, isAdmin }              = useAuth()

  const debounceRef = useRef(null)

  useEffect(() => {
    const params = {}
    if (statusFilter) params.status = statusFilter
    setSearchParams(params, { replace: true })
  }, [statusFilter])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month, page, limit: 50 })
      if (search)        params.set('search', search)
      if (statusFilter)  params.set('status', statusFilter)
      if (payTypeFilter) params.set('paymentType', payTypeFilter)
      const { data } = await api.get(`/billing?${params}`)
      setRecords(data.records)
      setSummary(data.summary || {})
      setTotal(data.total)
      setPages(data.pages)
    } catch {
      setToast({ message: 'Failed to load billing records', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [month, page, search, statusFilter, payTypeFilter])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleSearch = (e) => {
    const val = e.target.value
    setInputValue(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(val)
      setPage(1)
    }, 300)
  }

  const handleSave = async (data) => {
    try {
      if (editRecord) {
        await api.put(`/billing/${editRecord._id}`, data)
        setToast({ message: 'Record updated', type: 'success' })
      } else {
        await api.post('/billing', data)
        setToast({ message: 'Record saved', type: 'success' })
      }
      setShowForm(false); setEditRecord(null); fetchRecords()
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Error saving record', type: 'error' })
    }
  }

  const handleMarkPaid = async (record) => {
    try {
      await api.post(`/billing/${record._id}/pay`, {
        amountPaid: record.amountBilled + record.oldBalance,
        paidDate: new Date().toISOString().split('T')[0],
      })
      setToast({ message: 'Marked as paid', type: 'success' })
      fetchRecords()
    } catch {
      setToast({ message: 'Failed to update', type: 'error' })
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/billing/${deleteTarget._id}`)
      setToast({ message: 'Record deleted', type: 'success' })
      setDeleteTarget(null); fetchRecords()
    } catch {
      setToast({ message: 'Failed to delete', type: 'error' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Monthly billing records"
        actions={
          <div className="flex items-center gap-2">
            {isAgent && (
              <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => setShowImport(true)}>
                <MdUploadFile size={16} /> Import Excel
              </button>
            )}
            {isAgent && (
              <button className="btn-primary flex items-center gap-2" onClick={() => { setEditRecord(null); setShowForm(true) }}>
                <MdAdd size={18} /> Add Record
              </button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <MonthPicker value={month} onChange={(m) => { setMonth(m); setPage(1) }} />
          <div className="flex flex-1 flex-wrap gap-2">
            <div className="relative flex-1 min-w-40">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                className="input pl-8 text-sm" placeholder="Search customer..."
                value={inputValue} onChange={handleSearch}
              />
            </div>
            <div className='flex gap-2'>
            <select className="input w-32 text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
            </select>
            <select className="input w-32 text-sm" value={payTypeFilter} onChange={e => { setPayTypeFilter(e.target.value); setPage(1) }}>
              <option value="">All Types</option>
              {['Cash','SBI','Online','Mini','Vishnu','Premji','Bill','S','Other'].map(t => <option key={t}>{t}</option>)}
            </select>
            {(inputValue || statusFilter || payTypeFilter) && (
              <button className="btn-secondary text-sm py-1 px-3 flex items-center gap-1"
                onClick={() => { setSearch(''); setInputValue(''); setStatusFilter(''); setPayTypeFilter(''); setPage(1) }}>
                <MdClose size={14} /> 
              </button>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {summary.count > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Records',      value: total,                                mono: true },
            { label: 'Total Billed', value: formatCurrency(summary.totalBilled),  color: 'text-gray-900' },
            { label: 'Collected',    value: formatCurrency(summary.totalPaid),    color: 'text-green-600' },
            { label: 'Outstanding',  value: formatCurrency(summary.totalBalance), color: summary.totalBalance > 0 ? 'text-red-600' : 'text-green-600' },
          ].map(({ label, value, color, mono }) => (
            <div key={label} className="card py-3 px-4">
              <p className={`text-base font-bold ${mono ? 'mono' : ''} ${color || 'text-gray-900'}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded-sm" style={{ width: 10, height: 16, background: '#4ade80' }} />Paid
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded-sm" style={{ width: 10, height: 16, background: '#fb923c' }} />Partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded-sm" style={{ width: 10, height: 16, background: '#f87171' }} />Unpaid
        </span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ width: 4, minWidth: 4, padding: 0, borderBottom: '1px solid #e5e7eb' }} />
                {['Bill Date','Paid Date','Customer','Plan','Type','Cable','Billed','Old Bal','Paid','Balance','Bill No.','Status','Actions'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    style={{ borderBottom: '1px solid #e5e7eb' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center">
                    <div className="flex justify-center"><Spinner /></div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={14}>
                    <EmptyState icon={MdReceiptLong} title="No billing records" description={`No records for ${month}`} />
                  </td>
                </tr>
              ) : records.map((r, idx) => {
                const status  = getStatus(r)
                const rowBg   = ROW_BG[status]
                const accent  = ACCENT_STYLE[status]
                const divider = idx < records.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none'
                const tdStyle = { background: rowBg, borderBottom: divider, verticalAlign: 'middle' }

                return (
                  <tr
                    key={r._id}
                    className="cursor-pointer"
                    style={{ transition: 'filter 0.1s' }}
                    onMouseEnter={e => { for (const td of e.currentTarget.cells) td.style.filter = 'brightness(0.95)' }}
                    onMouseLeave={e => { for (const td of e.currentTarget.cells) td.style.filter = '' }}
                    onClick={() => r.customerId?._id && navigate(`/customers/${r.customerId._id}`, { state: { from: location.pathname + location.search } })}
                  >
                    <td style={{ ...accent, borderBottom: divider }} />

                    <td className="px-3 py-2 mono whitespace-nowrap" style={tdStyle}>{formatDate(r.billingDate)}</td>

                    <td className="px-3 py-2 mono whitespace-nowrap" style={{ ...tdStyle, color: r.paidDate ? '#15803d' : '#9CA3AF' }}>
                      {r.paidDate ? formatDate(r.paidDate) : '—'}
                    </td>

                    <td className="px-3 py-2" style={tdStyle}>
                      <p className="font-medium text-gray-900 whitespace-nowrap">{r.customerId?.name || '—'}</p>
                      <p className="text-gray-400 mono">{r.customerId?.userId || r.customerUserId}</p>
                    </td>

                    <td className="px-3 py-2" style={tdStyle}>
                      {r.plan
                        ? <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs whitespace-nowrap">{r.plan}</span>
                        : '—'}
                    </td>

                    <td className="px-3 py-2" style={tdStyle}>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getPaymentBadgeClass(r.paymentType)}`}>
                        {r.paymentType}
                      </span>
                    </td>

                    <td className="px-3 py-2 mono text-right" style={tdStyle}>
                      {r.cableRent > 0 ? formatCurrency(r.cableRent) : '—'}
                    </td>

                    <td className="px-3 py-2 mono font-medium text-right" style={tdStyle}>
                      {formatCurrency(r.amountBilled)}
                    </td>

                    <td className="px-3 py-2 mono text-right" style={{ ...tdStyle, color: r.oldBalance > 0 ? '#F59E0B' : '#9CA3AF' }}>
                      {formatCurrency(r.oldBalance)}
                    </td>

                    <td className="px-3 py-2 mono text-right" style={{ ...tdStyle, color: '#15803d' }}>
                      {formatCurrency(r.amountPaid)}
                    </td>

                    <td className="px-3 py-2 mono font-bold text-right" style={{ ...tdStyle, color: r.balance > 0 ? '#dc2626' : '#16a34a' }}>
                      {formatCurrency(r.balance)}
                    </td>

                    <td className="px-3 py-2 mono" style={{ ...tdStyle, color: '#9CA3AF' }}>{r.billNumber || '—'}</td>

                    <td className="px-3 py-2" style={tdStyle}>
                      <span className={BADGE[status]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>

                    <td className="px-3 py-2" style={tdStyle} onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {isAgent && r.balance > 0 && (
                          <button title="Mark Paid" onClick={() => handleMarkPaid(r)}
                            className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-100 transition-colors">
                            <MdCheckCircle size={16} />
                          </button>
                        )}
                        {isAgent && (
                          <button title="Edit" onClick={() => { setEditRecord(r); setShowForm(true) }}
                            className="p-1 rounded text-gray-400 hover:text-brand-700 hover:bg-gray-100 transition-colors">
                            <MdEdit size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <button title="Delete" onClick={() => setDeleteTarget(r)}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <MdDelete size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between gap-2 text-xs text-gray-500 flex-wrap">
            <span className="whitespace-nowrap">
              Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40">Prev</button>
              {getPageNumbers(page, pages).map((p, i) =>
                p === '...'
                  ? <span key={`e-${i}`} className="w-7 text-center text-gray-400 select-none">…</span>
                  : <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${page === p ? 'bg-brand-800 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                      {p}
                    </button>
              )}
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editRecord ? 'Edit Billing Record' : 'New Billing Record'}
          onClose={() => { setShowForm(false); setEditRecord(null) }} size="lg">
          <BillingForm initial={editRecord} onSave={handleSave} onCancel={() => { setShowForm(false); setEditRecord(null) }} />
        </Modal>
      )}
      {deleteTarget && (
        <ConfirmDialog title="Delete Record"
          message={`Delete billing record for "${deleteTarget.customerId?.name}"? This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
      {showImport && (
        <ImportModal mode="billing" onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); fetchRecords(); setToast({ message: 'Billing records imported!', type: 'success' }) }} />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}