import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MdArrowBack, MdEdit, MdPhone, MdWhatsapp, MdCalendarToday, MdWifi, MdLocationOn, MdReceipt, MdAdd } from 'react-icons/md'
import api from '../utils/api'
import { formatCurrency, formatDate, getRowClass, getPaymentBadgeClass } from '../utils/helpers'
import { Modal, Toast, Spinner, PageHeader } from '../components/ui'
import CustomerForm from '../components/ui/CustomerForm'
import BillingForm from '../components/ui/BillingForm'

export default function CustomerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [billing, setBilling] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchData() }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [c, b] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/customers/${id}/billing`)
      ])
      setCustomer(c.data)
      setBilling(b.data.records)
      setStats(b.data.stats)
    } catch {
      setToast({ message: 'Failed to load customer', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleEditSave = async (data) => {
    try {
      await api.put(`/customers/${id}`, data)
      setToast({ message: 'Customer updated', type: 'success' })
      setShowEdit(false); fetchData()
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Update failed', type: 'error' })
    }
  }

  const handlePaymentSave = async (data) => {
    try {
      await api.post('/billing', { ...data, customerId: id, customerUserId: customer.userId })
      setToast({ message: 'Payment recorded', type: 'success' })
      setShowPayment(false); fetchData()
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to save', type: 'error' })
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={10} /></div>
  if (!customer) return <div className="text-center py-16 text-gray-500">Customer not found</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/customers')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <MdArrowBack size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{customer.name}</h1>
          <p className="text-sm text-gray-500 mono">{customer.userId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Info */}
        <div className="space-y-4">
          {/* Customer card */}
          <div className="card">
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-brand-800 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                {customer.name[0]}
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{customer.name}</h2>
                <p className="text-sm mono text-gray-500">{customer.userId}</p>
                <span className={customer.isActive ? 'badge-active mt-1' : 'badge-inactive mt-1'}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <MdPhone size={16} className="text-gray-400 flex-shrink-0" />
                <span className="mono">{customer.mobile}</span>
              </div>
              {customer.whatsapp && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MdWhatsapp size={16} className="text-green-500 flex-shrink-0" />
                  <span className="mono">{customer.whatsapp}</span>
                </div>
              )}
              {customer.crfNumber && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MdReceipt size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="mono">{customer.crfNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-gray-600">
                <MdCalendarToday size={16} className="text-gray-400 flex-shrink-0" />
                <span>Registered {formatDate(customer.registrationDate)}</span>
              </div>
              {customer.currentPlan && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MdWifi size={16} className="text-brand-600 flex-shrink-0" />
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{customer.currentPlan}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-3 text-gray-600">
                  <MdLocationOn size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">{customer.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Lifetime Paid', value: formatCurrency(stats.totalPaid), color: 'text-green-600' },
              { label: 'Outstanding', value: formatCurrency(stats.totalOutstanding), color: stats.totalOutstanding > 0 ? 'text-red-600' : 'text-green-600' },
              { label: 'Avg Monthly', value: formatCurrency(stats.avgMonthly), color: 'text-gray-900' },
              { label: 'Months Active', value: stats.monthsActive, color: 'text-gray-900' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card py-3 px-4">
                <p className={`text-lg font-bold mono ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="card space-y-2">
            <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={() => setShowPayment(true)}>
              <MdAdd size={18} /> Record Payment
            </button>
            <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={() => setShowEdit(true)}>
              <MdEdit size={18} /> Edit Customer
            </button>
          </div>
        </div>

        {/* Right: Billing history */}
        <div className="xl:col-span-2">
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm">Payment History ({billing.length} records)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Month','Plan','Billed','Paid','Balance','Pay Type','Bill No.','Status'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billing.length === 0 ? (
                    <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-sm">No billing records yet</td></tr>
                  ) : billing.map(r => (
                    <tr key={r._id} className={getRowClass(r.balance, r.amountPaid)}>
                      <td className="px-3 py-2.5 mono font-medium text-xs">{r.month}</td>
                      <td className="px-3 py-2.5 text-xs">{r.plan ? <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">{r.plan}</span> : '—'}</td>
                      <td className="px-3 py-2.5 mono text-gray-900">{formatCurrency(r.amountBilled)}</td>
                      <td className="px-3 py-2.5 mono text-green-700">{formatCurrency(r.amountPaid)}</td>
                      <td className="px-3 py-2.5 mono font-medium"
                        style={{ color: r.balance > 0 ? '#EF4444' : '#22C55E' }}>
                        {formatCurrency(r.balance)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getPaymentBadgeClass(r.paymentType)}`}>{r.paymentType}</span>
                      </td>
                      <td className="px-3 py-2.5 mono text-xs text-gray-500">{r.billNumber || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={r.balance === 0 ? 'badge-paid' : r.amountPaid > 0 ? 'badge-partial' : 'badge-unpaid'}>
                          {r.balance === 0 ? 'Paid' : r.amountPaid > 0 ? 'Partial' : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <Modal title="Edit Customer" onClose={() => setShowEdit(false)} size="lg">
          <CustomerForm initial={customer} onSave={handleEditSave} onCancel={() => setShowEdit(false)} />
        </Modal>
      )}

      {showPayment && (
        <Modal title="Record Payment" onClose={() => setShowPayment(false)} size="lg">
          <BillingForm customerId={id} customerName={customer.name} onSave={handlePaymentSave} onCancel={() => setShowPayment(false)} />
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
