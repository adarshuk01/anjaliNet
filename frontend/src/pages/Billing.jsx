import { useState, useEffect, useCallback } from 'react'
import { MdAdd, MdEdit, MdDelete, MdSearch, MdCheckCircle, MdReceiptLong, MdClose, MdUploadFile } from 'react-icons/md'
import api from '../utils/api'
import { formatCurrency, formatDate, getCurrentMonth, getRowClass, getPaymentBadgeClass } from '../utils/helpers'
import { Modal, Toast, ConfirmDialog, PageHeader, EmptyState, Spinner } from '../components/ui'
import BillingForm from '../components/ui/BillingForm'
import MonthPicker from '../components/ui/MonthPicker'
import ImportModal from '../components/ui/ImportModal'
import { useAuth } from '../context/AuthContext'

export default function Billing() {
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState({})
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(getCurrentMonth())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [payTypeFilter, setPayTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [toast, setToast] = useState(null)
  const { isAgent, isAdmin } = useAuth()

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month, page, limit: 50 })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
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
              <button
                className="btn-secondary flex items-center gap-2 text-sm"
                onClick={() => setShowImport(true)}
              >
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

      {/* Month nav + filters */}
      <div className="card mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Month picker — dynamic month + year selects */}
          <MonthPicker value={month} onChange={(m) => { setMonth(m); setPage(1) }} />

          <div className="flex flex-1 flex-wrap gap-2">
            <div className="relative flex-1 min-w-40">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input className="input pl-8 text-sm" placeholder="Search customer..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
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
            {(search || statusFilter || payTypeFilter) && (
              <button className="btn-secondary text-sm py-1 px-3 flex items-center gap-1"
                onClick={() => { setSearch(''); setStatusFilter(''); setPayTypeFilter(''); setPage(1) }}>
                <MdClose size={14} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary strip */}
      {summary.count > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Records', value: total, mono: true },
            { label: 'Total Billed', value: formatCurrency(summary.totalBilled), color: 'text-gray-900' },
            { label: 'Collected', value: formatCurrency(summary.totalPaid), color: 'text-green-600' },
            { label: 'Outstanding', value: formatCurrency(summary.totalBalance), color: summary.totalBalance > 0 ? 'text-red-600' : 'text-green-600' },
          ].map(({ label, value, color, mono }) => (
            <div key={label} className="card py-3 px-4">
              <p className={`text-base font-bold ${mono ? 'mono' : ''} ${color || 'text-gray-900'}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Date','Customer','Plan','Type','Cable','Billed','Old Bal','Paid','Balance','Bill No.','Status','Actions'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={12} className="py-16 text-center"><div className="flex justify-center"><Spinner /></div></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={12}><EmptyState icon={MdReceiptLong} title="No billing records" description={`No records for ${month}`} /></td></tr>
              ) : (
                records.map(r => (
                  <tr key={r._id} className={`${getRowClass(r.balance, r.amountPaid)} hover:brightness-95`}>
                    <td className="px-3 py-2 mono whitespace-nowrap">{formatDate(r.billingDate)}</td>
                    <td className="px-3 py-2">
                      <div>
                        <p className="font-medium text-gray-900 whitespace-nowrap">{r.customerId?.name || '—'}</p>
                        <p className="text-gray-400 mono">{r.customerId?.userId || r.customerUserId}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {r.plan ? <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs whitespace-nowrap">{r.plan}</span> : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getPaymentBadgeClass(r.paymentType)}`}>{r.paymentType}</span>
                    </td>
                    <td className="px-3 py-2 mono text-right">{r.cableRent > 0 ? formatCurrency(r.cableRent) : '—'}</td>
                    <td className="px-3 py-2 mono font-medium text-right">{formatCurrency(r.amountBilled)}</td>
                    <td className="px-3 py-2 mono text-right" style={{ color: r.oldBalance > 0 ? '#F59E0B' : '#9CA3AF' }}>{formatCurrency(r.oldBalance)}</td>
                    <td className="px-3 py-2 mono text-right text-green-700">{formatCurrency(r.amountPaid)}</td>
                    <td className="px-3 py-2 mono font-bold text-right" style={{ color: r.balance > 0 ? '#EF4444' : '#22C55E' }}>{formatCurrency(r.balance)}</td>
                    <td className="px-3 py-2 mono text-gray-500">{r.billNumber || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={r.balance === 0 ? 'badge-paid' : r.amountPaid > 0 ? 'badge-partial' : 'badge-unpaid'}>
                        {r.balance === 0 ? 'Paid' : r.amountPaid > 0 ? 'Partial' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {isAgent && r.balance > 0 && (
                          <button title="Mark Paid" onClick={() => handleMarkPaid(r)}
                            className="p-1 hover:bg-green-50 rounded text-gray-400 hover:text-green-600">
                            <MdCheckCircle size={16} />
                          </button>
                        )}
                        {isAgent && (
                          <button title="Edit" onClick={() => { setEditRecord(r); setShowForm(true) }}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-brand-700">
                            <MdEdit size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <button title="Delete" onClick={() => setDeleteTarget(r)}
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600">
                            <MdDelete size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40">Prev</button>
              {[...Array(Math.min(pages, 5))].map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`w-7 h-7 rounded text-xs ${page === i + 1 ? 'bg-brand-800 text-white' : 'hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editRecord ? 'Edit Billing Record' : 'New Billing Record'} onClose={() => { setShowForm(false); setEditRecord(null) }} size="lg">
          <BillingForm initial={editRecord} onSave={handleSave} onCancel={() => { setShowForm(false); setEditRecord(null) }} />
        </Modal>
      )}
      {deleteTarget && (
        <ConfirmDialog title="Delete Record" message={`Delete billing record for "${deleteTarget.customerId?.name}"? This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
      {showImport && (
        <ImportModal
          mode="billing"
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); fetchRecords(); setToast({ message: 'Billing records imported!', type: 'success' }) }}
        />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}}
    </div>
  )
}