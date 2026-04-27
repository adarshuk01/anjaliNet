import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdAdd, MdSearch, MdEdit, MdDelete, MdPeople, MdClose, MdUploadFile } from 'react-icons/md'
import api from '../utils/api'
import { formatDate } from '../utils/helpers'
import { Modal, Toast, ConfirmDialog, PageHeader, EmptyState, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import CustomerForm from '../components/ui/CustomerForm'
import ImportModal from '../components/ui/ImportModal'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [toast, setToast] = useState(null)
  const { isAdmin, isAgent } = useAuth()
  const navigate = useNavigate()

  const debounceRef = useRef(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 25 })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const { data } = await api.get(`/customers?${params}`)
      setCustomers(data.customers)
      setTotal(data.total)
      setPages(data.pages)
    } catch {
      setToast({ message: 'Failed to load customers', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

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
      if (editCustomer) {
        await api.put(`/customers/${editCustomer._id}`, data)
        setToast({ message: 'Customer updated', type: 'success' })
      } else {
        await api.post('/customers', data)
        setToast({ message: 'Customer added', type: 'success' })
      }
      setShowForm(false); setEditCustomer(null); fetchCustomers()
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Error saving customer', type: 'error' })
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/customers/${deleteTarget._id}`)
      setToast({ message: 'Customer deactivated', type: 'success' })
      setDeleteTarget(null); fetchCustomers()
    } catch {
      setToast({ message: 'Failed to deactivate', type: 'error' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${total} total customers`}
        actions={
          isAgent && (
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary flex items-center gap-2 text-sm"
                onClick={() => setShowImport(true)}
              >
                <MdUploadFile size={16} /> Import Excel
              </button>
              <button className="btn-primary flex items-center gap-2" onClick={() => { setEditCustomer(null); setShowForm(true) }}>
                <MdAdd size={18} /> Add Customer
              </button>
            </div>
          )
        }
      />

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input className="input pl-9" placeholder="Search name, ID, mobile, CRF..."
              value={inputValue} onChange={handleSearch} />
          </div>
          <div className="flex gap-2">
            <select className="input w-36" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {(inputValue || statusFilter) && (
              <button className="btn-secondary flex items-center gap-1" onClick={() => { setSearch(''); setInputValue(''); setStatusFilter(''); setPage(1) }}>
                <MdClose size={16} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Mobile</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">CRF No.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Reg. Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center"><div className="flex justify-center"><Spinner /></div></td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={MdPeople} title="No customers found" description="Try adjusting your search filters" /></td></tr>
              ) : (
                customers.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/customers/${c._id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {c.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400 mono">{c.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><span className="mono text-gray-600">{c.mobile}</span></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><span className="mono text-gray-500 text-xs">{c.crfNumber || '—'}</span></td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500">{formatDate(c.registrationDate)}</td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {c.currentPlan ? (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{c.currentPlan}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={c.isActive ? 'badge-active' : 'badge-inactive'}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {isAgent && (
                          <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-brand-700"
                            onClick={() => { setEditCustomer(c); setShowForm(true) }}>
                            <MdEdit size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <button className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600"
                            onClick={() => setDeleteTarget(c)}>
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

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}</span>
            <div className="flex gap-1">
              {[...Array(Math.min(pages, 7))].map((_, i) => {
                const p = i + 1
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded text-xs ${page === p ? 'bg-brand-800 text-white' : 'hover:bg-gray-100'}`}>
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editCustomer ? 'Edit Customer' : 'Add Customer'} onClose={() => { setShowForm(false); setEditCustomer(null) }} size="lg">
          <CustomerForm initial={editCustomer} onSave={handleSave} onCancel={() => { setShowForm(false); setEditCustomer(null) }} />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Deactivate Customer"
          message={`Deactivate "${deleteTarget.name}" (${deleteTarget.userId})? Their billing records will be preserved.`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} confirmLabel="Deactivate" />
      )}

      {showImport && (
        <ImportModal
          mode="customers"
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); fetchCustomers(); setToast({ message: 'Customers imported successfully!', type: 'success' }) }}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
