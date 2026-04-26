import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { getCurrentMonth } from '../../utils/helpers'
import MonthPicker from './MonthPicker'

const PAYMENT_TYPES = ['Cash', 'SBI', 'Online', 'Mini', 'Vishnu', 'Premji', 'Bill', 'S', 'Other']

export default function BillingForm({ initial, customerId, customerName, onSave, onCancel }) {
  const [form, setForm] = useState({
    customerId: customerId || '',
    month: getCurrentMonth(),
    billingDate: new Date().toISOString().split('T')[0],
    plan: '',
    paymentType: 'Cash',
    cableRent: 0,
    amountBilled: 0,
    oldBalance: 0,
    amountPaid: 0,
    balance: 0,
    paidDate: new Date().toISOString().split('T')[0],
    billNumber: '',
    remarks: '',
  })
  const [plans, setPlans] = useState([])
  const [customerSearch, setCustomerSearch] = useState(customerName || '')
  const [customerResults, setCustomerResults] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchTimer, setSearchTimer] = useState(null)

  useEffect(() => {
    api.get('/plans').then(r => setPlans(r.data)).catch(() => {})
    if (initial) {
      setForm({
        customerId: initial.customerId?._id || initial.customerId || '',
        month: initial.month || getCurrentMonth(),
        billingDate: initial.billingDate ? initial.billingDate.split('T')[0] : new Date().toISOString().split('T')[0],
        plan: initial.plan || '',
        paymentType: initial.paymentType || 'Cash',
        cableRent: initial.cableRent || 0,
        amountBilled: initial.amountBilled || 0,
        oldBalance: initial.oldBalance || 0,
        amountPaid: initial.amountPaid || 0,
        balance: initial.balance || 0,
        paidDate: initial.paidDate ? initial.paidDate.split('T')[0] : new Date().toISOString().split('T')[0],
        billNumber: initial.billNumber || '',
        remarks: initial.remarks || '',
      })
      if (initial.customerId?.name) setCustomerSearch(initial.customerId.name)
    }
  }, [initial])

  // Auto-calculate balance
  useEffect(() => {
    const bal = Number(form.oldBalance) + Number(form.amountBilled) - Number(form.amountPaid)
    setForm(p => ({ ...p, balance: Math.max(0, bal) }))
  }, [form.oldBalance, form.amountBilled, form.amountPaid])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleCustomerSearch = (val) => {
    setCustomerSearch(val)
    clearTimeout(searchTimer)
    if (val.length < 2) { setCustomerResults([]); return }
    setSearchTimer(setTimeout(async () => {
      const { data } = await api.get(`/customers/search?q=${encodeURIComponent(val)}`)
      setCustomerResults(data)
    }, 300))
  }

  const selectCustomer = (c) => {
    setSelectedCustomer(c)
    setCustomerSearch(c.name)
    setCustomerResults([])
    set('customerId', c._id)
    if (c.cableRent) set('cableRent', c.cableRent)
    if (c.currentPlan) set('plan', c.currentPlan)
  }

  const handlePlanChange = (planCode) => {
    set('plan', planCode)
    const p = plans.find(pl => pl.planCode === planCode)
    if (p) set('amountBilled', p.basePrice)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Customer selector (only if not prefilled) */}
      {!customerId && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Customer *</label>
          <div className="relative">
            <input className="input" placeholder="Search customer name or ID..."
              value={customerSearch} onChange={e => handleCustomerSearch(e.target.value)} required />
            {customerResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {customerResults.map(c => (
                  <button key={c._id} type="button"
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                    onClick={() => selectCustomer(c)}>
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{c.name[0]}</div>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-400 text-xs mono ml-auto">{c.userId}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Month *</label>
          <MonthPicker value={form.month} onChange={v => set('month', v)} showNav={false} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Billing Date</label>
          <input type="date" className="input" value={form.billingDate} onChange={e => set('billingDate', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Plan</label>
          <select className="input" value={form.plan} onChange={e => handlePlanChange(e.target.value)}>
            <option value="">Select plan...</option>
            {plans.map(p => <option key={p._id} value={p.planCode}>{p.planCode} — ₹{p.basePrice}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Payment Type</label>
          <select className="input" value={form.paymentType} onChange={e => set('paymentType', e.target.value)}>
            {PAYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Amount fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Cable Rent (₹)</label>
          <input type="number" className="input" value={form.cableRent} onChange={e => set('cableRent', Number(e.target.value))} min="0" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Amount Billed (₹) *</label>
          <input type="number" className="input" value={form.amountBilled} onChange={e => set('amountBilled', Number(e.target.value))} required min="0" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Old Balance (₹)</label>
          <input type="number" className="input" value={form.oldBalance} onChange={e => set('oldBalance', Number(e.target.value))} min="0" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
          <input type="number" className="input" value={form.amountPaid} onChange={e => set('amountPaid', Number(e.target.value))} min="0" />
        </div>
      </div>

      {/* Calculated balance */}
      <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Remaining Balance:</span>
        <span className={`text-lg font-bold mono ${form.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
          ₹{form.balance.toLocaleString('en-IN')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Paid Date</label>
          <input type="date" className="input" value={form.paidDate} onChange={e => set('paidDate', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Bill Number</label>
          <input type="text" className="input mono" placeholder="Auto-generated" value={form.billNumber} onChange={e => set('billNumber', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
        <textarea className="input" rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional notes..." />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving...' : initial ? 'Update Record' : 'Save Record'}
        </button>
      </div>
    </form>
  )
}
