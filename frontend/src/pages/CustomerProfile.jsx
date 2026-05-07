import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { MdArrowBack, MdEdit, MdPhone, MdWhatsapp, MdCalendarToday, MdWifi, MdLocationOn, MdReceipt, MdAdd, MdPayments } from 'react-icons/md'
import api from '../utils/api'
import { formatCurrency, formatDate, getRowClass, getPaymentBadgeClass, openWhatsApp } from '../utils/helpers'
import { Modal, Toast, Spinner, PageHeader } from '../components/ui'
import CustomerForm from '../components/ui/CustomerForm'
import BillingForm from '../components/ui/BillingForm'
import { useQuickPay } from '../context/QuickPayContext'

const WaIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

export default function CustomerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { openQuickPay } = useQuickPay()
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

  const customerPhone = customer.whatsapp || customer.mobile

  const sendWa = (r) => {
    if (!customerPhone) return
    const isPaid = r.balance === 0
    const msg = isPaid
      ? `Dear ${customer.name}, thank you for your payment of ${formatCurrency(r.amountPaid)} for ${r.month}. Your account is clear. Thank you!`
      : `Dear ${customer.name}, your bill for ${r.month} has an outstanding balance of ${formatCurrency(r.balance)} (billed: ${formatCurrency(r.amountBilled)}${r.amountPaid > 0 ? `, paid: ${formatCurrency(r.amountPaid)}` : ''}). Please pay at the earliest. Thank you.`
    openWhatsApp(customerPhone, msg)
  }

  const unpaidBills = billing.filter(r => r.balance > 0)
  const totalOutstandingDue = unpaidBills.reduce((s, r) => s + r.balance, 0)

  const sendBulkDueNotice = () => {
    if (!customerPhone || unpaidBills.length === 0) return
    const lines = unpaidBills.map(r => `  • ${r.month}: ${formatCurrency(r.balance)}`).join('\n')
    const msg = `Dear ${customer.name}, you have ${unpaidBills.length} outstanding bill${unpaidBills.length > 1 ? 's' : ''}:\n${lines}\n\nTotal due: ${formatCurrency(totalOutstandingDue)}\n\nPlease pay at the earliest. Thank you.`
    openWhatsApp(customerPhone, msg)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(location.state?.from || '/customers')}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
        >
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
            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={() => openQuickPay(customer)}
            >
              <MdPayments size={18} /> Quick Pay
            </button>
            <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={() => setShowPayment(true)}>
              <MdAdd size={18} /> Record Payment
            </button>
            <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={() => setShowEdit(true)}>
              <MdEdit size={18} /> Edit Customer
            </button>
            {customerPhone && unpaidBills.length > 0 && (
              <button
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 text-sm font-medium transition-colors"
                onClick={sendBulkDueNotice}
              >
                <WaIcon /> Send Due Notice ({unpaidBills.length} bill{unpaidBills.length > 1 ? 's' : ''} · {formatCurrency(totalOutstandingDue)})
              </button>
            )}
          </div>
        </div>

        {/* Right: Billing history */}
        <div className="xl:col-span-2">
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-900 text-sm">Payment History ({billing.length} records)</h3>
              {!customerPhone && (
                <span className="text-xs text-gray-400 italic">No phone — WhatsApp unavailable</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Month','Bill Date','Paid Date','Plan','Cable ','Billed','Paid','Balance','Pay Type','Bill No.','Status', ''].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billing.length === 0 ? (
                    <tr><td colSpan={12} className="py-10 text-center text-gray-400 text-sm">No billing records yet</td></tr>
                  ) : billing.map(r => (
                    <tr key={r._id} className={getRowClass(r.balance, r.amountPaid)}>
                      <td className="px-3 py-2.5 mono font-medium text-xs">{r.month}</td>
                      <td className="px-3 py-2.5 mono text-xs text-gray-600">{r.billingDate ? formatDate(r.billingDate) : '—'}</td>
                      <td className="px-3 py-2.5 mono text-xs" style={{ color: r.paidDate ? '#15803d' : '#9CA3AF' }}>
                        {r.paidDate ? formatDate(r.paidDate) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{r.plan ? <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">{r.plan}</span> : '—'}</td>
                      <td className="px-3 py-2.5 mono font-medium text-xs">{formatCurrency(r.cableRent)}</td>

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
                      <td className="px-3 py-2.5">
                        {customerPhone && (
                          <button
                            onClick={() => sendWa(r)}
                            title={r.balance === 0 ? 'Send receipt via WhatsApp' : 'Send due notice via WhatsApp'}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 hover:text-green-700 transition-colors"
                          >
                            <WaIcon />
                          </button>
                        )}
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