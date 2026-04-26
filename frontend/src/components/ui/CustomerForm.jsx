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
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}{req && ' *'}</label>
      <input type={type} className={`input ${errors[key] ? 'border-red-400' : ''}`}
        value={form[key]} onChange={e => set(key, e.target.value)} />
      {errors[key] && <p className="text-xs text-red-500 mt-0.5">{errors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {field('User ID', 'userId', 'text', true)}
        {field('Full Name', 'name', 'text', true)}
        {field('Mobile', 'mobile', 'tel', true)}
        {field('WhatsApp', 'whatsapp', 'tel')}
        {field('CRF Number', 'crfNumber')}
        {field('Registration Date', 'registrationDate', 'date')}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Current Plan</label>
        <select className="input" value={form.currentPlan} onChange={e => set('currentPlan', e.target.value)}>
          <option value="">Select plan...</option>
          {plans.map(p => <option key={p._id} value={p.planCode}>{p.planCode} — {p.planName} (₹{p.basePrice})</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
        <textarea className="input" rows={2} value={form.address} onChange={e => set('address', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Cable Rent (₹)</label>
          <input type="number" className="input" value={form.cableRent} onChange={e => set('cableRent', Number(e.target.value))} />
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)}
              className="w-4 h-4 rounded text-brand-800" />
            <span className="text-sm font-medium text-gray-700">Active customer</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving...' : initial ? 'Update Customer' : 'Add Customer'}
        </button>
      </div>
    </form>
  )
}
