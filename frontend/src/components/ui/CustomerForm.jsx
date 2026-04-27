import { useState, useEffect } from 'react'
import api from '../../utils/api'

export default function CustomerForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    userId: '', name: '', mobile: '', whatsapp: '',
    crfNumber: '', address: '', currentPlan: '',
    cableRent: 0, notes: '', isActive: true,
    registrationDate: new Date().toISOString().split('T')[0],
  })
  const [plans, setPlans] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    api.get('/plans').then(r => setPlans(r.data)).catch(() => {})
    if (initial) {
      setForm({
        userId: initial.userId || '',
        name: initial.name || '',
        mobile: initial.mobile || '',
        whatsapp: initial.whatsapp || '',
        crfNumber: initial.crfNumber || '',
        address: initial.address || '',
        currentPlan: initial.currentPlan || '',
        cableRent: initial.cableRent || 0,
        notes: initial.notes || '',
        isActive: initial.isActive !== false,
        registrationDate: initial.registrationDate ? initial.registrationDate.split('T')[0] : new Date().toISOString().split('T')[0],
      })
    }
  }, [initial])

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.userId.trim()) e.userId = 'User ID required'
    if (!form.name.trim()) e.name = 'Name required'
    if (!form.mobile.trim()) e.mobile = 'Mobile required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const field = (label, key, type = 'text', req = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}{req && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type}
        inputMode={type === 'tel' ? 'numeric' : type === 'number' ? 'decimal' : undefined}
        className={`input ${errors[key] ? 'border-red-400 focus:ring-red-400' : ''}`}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        autoComplete={type === 'tel' ? 'off' : undefined}
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Identity — stacks to 1 col on mobile */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Identity</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('User ID', 'userId', 'text', true)}
          {field('Full Name', 'name', 'text', true)}
        </div>
      </div>

      {/* Contact */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('Mobile', 'mobile', 'tel', true)}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">WhatsApp <span className="text-gray-400 font-normal">(if different)</span></label>
            <input
              type="tel"
              inputMode="numeric"
              className="input"
              value={form.whatsapp}
              onChange={e => set('whatsapp', e.target.value)}
              autoComplete="off"
              placeholder="Leave blank to use mobile"
            />
          </div>
        </div>
      </div>

      {/* Plan & billing */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Plan & Billing</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Current Plan</label>
            <select className="input" value={form.currentPlan} onChange={e => set('currentPlan', e.target.value)}>
              <option value="">Select plan...</option>
              {plans.map(p => <option key={p._id} value={p.planCode}>{p.planCode} — {p.planName} (₹{p.basePrice})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Cable Rent (₹)</label>
            <input
              type="number"
              inputMode="decimal"
              className="input"
              value={form.cableRent}
              onChange={e => set('cableRent', Number(e.target.value))}
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Registration & CRF */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('CRF Number', 'crfNumber')}
        {field('Registration Date', 'registrationDate', 'date')}
      </div>

      {/* Address */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Address</label>
        <textarea
          className="input resize-none"
          rows={2}
          value={form.address}
          onChange={e => set('address', e.target.value)}
          placeholder="House / Street / Area"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes</label>
        <textarea
          className="input resize-none"
          rows={2}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Optional internal notes..."
        />
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3 py-1">
        <button
          type="button"
          role="switch"
          aria-checked={form.isActive}
          onClick={() => set('isActive', !form.isActive)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${form.isActive ? 'bg-brand-800' : 'bg-gray-200'}`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {form.isActive ? 'Active customer' : 'Inactive customer'}
        </span>
      </div>

      {/* Footer actions — full width on mobile */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-1">
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving...' : initial ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>

    </form>
  )
}