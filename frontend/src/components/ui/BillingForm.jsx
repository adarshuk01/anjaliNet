import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { getCurrentMonth, openWhatsApp, formatCurrency } from '../../utils/helpers'
import MonthPicker from './MonthPicker'

const PAYMENT_TYPES = ['Cash', 'SBI', 'Online', 'Mini', 'Vishnu', 'Premji', 'Bill', 'S', 'Other']

const WaIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-green-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

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
  const [customerPhone, setCustomerPhone] = useState(null)

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
      if (initial.customerId) setCustomerPhone({ whatsapp: initial.customerId.whatsapp, mobile: initial.customerId.mobile })
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
    setCustomerPhone({ whatsapp: c.whatsapp, mobile: c.mobile })
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

  const numField = (label, key, req = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {label}{req && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type="number"
        inputMode="decimal"
        className="input"
        value={form[key]}
        onChange={e => set(key, Number(e.target.value))}
        min="0"
        required={req}
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Customer selector (only if not prefilled) */}
      {!customerId && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Customer <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              className="input"
              placeholder="Search by name or ID..."
              value={customerSearch}
              onChange={e => handleCustomerSearch(e.target.value)}
              required
              autoComplete="off"
            />
            {customerResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-52 overflow-y-auto">
                {customerResults.map(c => (
                  <button key={c._id} type="button"
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 text-sm"
                    onClick={() => selectCustomer(c)}>
                    <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{c.name[0]}</div>
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="text-gray-400 text-xs mono ml-auto flex-shrink-0">{c.userId}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Month + Billing Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Month <span className="text-red-500">*</span></label>
          <MonthPicker value={form.month} onChange={v => set('month', v)} showNav={false} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Bill Generated Date</label>
          <input type="date" className="input" value={form.billingDate} onChange={e => set('billingDate', e.target.value)} />
        </div>
      </div>

      {/* Plan + Payment Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Plan</label>
          <select className="input" value={form.plan} onChange={e => handlePlanChange(e.target.value)}>
            <option value="">Select plan...</option>
            {plans.map(p => <option key={p._id} value={p.planCode}>{p.planCode} — ₹{p.basePrice}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Payment Type</label>
          {/* Scrollable chip row on mobile, select on very small screens */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:hidden">
            {PAYMENT_TYPES.map(t => (
              <button
                key={t} type="button"
                onClick={() => set('paymentType', t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.paymentType === t
                    ? 'bg-brand-800 text-white border-brand-800'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >{t}</button>
            ))}
          </div>
          <select className="input hidden sm:block" value={form.paymentType} onChange={e => set('paymentType', e.target.value)}>
            {PAYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Amount fields — 2-col on mobile, 4-col on md+ */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Amounts (₹)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {numField('Cable Rent', 'cableRent')}
          {numField('Amount Billed', 'amountBilled', true)}
          {numField('Old Balance', 'oldBalance')}
          {numField('Amount Paid', 'amountPaid')}
        </div>
      </div>

      {/* Calculated balance strip */}
      <div className={`rounded-xl px-4 py-3 flex items-center justify-between border ${form.balance > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
        <span className="text-sm font-medium text-gray-600">Remaining Balance</span>
        <span className={`text-xl font-bold mono ${form.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
          ₹{form.balance.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Paid Date + Bill Number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Paid Date</label>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Bill Number</label>
          <input type="text" className="input mono" placeholder="Auto-generated" value={form.billNumber} onChange={e => set('billNumber', e.target.value)} />
        </div>
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Remarks</label>
        <textarea
          className="input resize-none"
          rows={2}
          value={form.remarks}
          onChange={e => set('remarks', e.target.value)}
          placeholder="Optional notes..."
        />
      </div>

      {/* Footer — stacked on mobile */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-1">
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onCancel}>Cancel</button>

        {(customerPhone?.whatsapp || customerPhone?.mobile) && (
          <button
            type="button"
            className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
            onClick={() => {
              const phone = customerPhone.whatsapp || customerPhone.mobile
              const msg = `Dear customer, your bill for ${form.month} is ₹${form.amountBilled}. Amount paid: ₹${form.amountPaid}. Balance due: ₹${form.balance}. Thank you.`
              openWhatsApp(phone, msg)
            }}
            title="Send WhatsApp message to customer"
          >
            <WaIcon /> WhatsApp
          </button>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving...' : initial ? 'Update Record' : 'Save Record'}
        </button>
      </div>

    </form>
  )
}