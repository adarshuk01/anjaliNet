import { useState, useEffect } from 'react'
import { MdAdd, MdEdit, MdDelete, MdWifi } from 'react-icons/md'
import api from '../utils/api'
import { formatCurrency } from '../utils/helpers'
import { Modal, Toast, ConfirmDialog, PageHeader, EmptyState, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'

function PlanForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    planCode: '', planName: '', speed: '', dataLimit: '', basePrice: 0, gstRate: 18, isActive: true,
    ...initial
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const totalPrice = form.basePrice * (1 + form.gstRate / 100)

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Plan Code *</label>
          <input className="input mono" required value={form.planCode} onChange={e => set('planCode', e.target.value)} placeholder="FUP50M2000G" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Plan Name *</label>
          <input className="input" required value={form.planName} onChange={e => set('planName', e.target.value)} placeholder="50 Mbps FUP" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Speed</label>
          <input className="input" value={form.speed} onChange={e => set('speed', e.target.value)} placeholder="50 Mbps" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Data Limit</label>
          <input className="input" value={form.dataLimit} onChange={e => set('dataLimit', e.target.value)} placeholder="2000 GB" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Base Price (₹) *</label>
          <input type="number" className="input" required value={form.basePrice} onChange={e => set('basePrice', Number(e.target.value))} min="0" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">GST Rate (%)</label>
          <input type="number" className="input" value={form.gstRate} onChange={e => set('gstRate', Number(e.target.value))} min="0" max="100" />
        </div>
      </div>
      <div className="bg-blue-50 rounded-lg px-4 py-3 flex justify-between">
        <span className="text-sm text-gray-600">Total Price (with GST):</span>
        <span className="text-sm font-bold text-brand-800 mono">{formatCurrency(totalPrice)}</span>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 rounded" />
        <span className="text-sm text-gray-700">Active plan</span>
      </label>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving...' : initial ? 'Update Plan' : 'Add Plan'}
        </button>
      </div>
    </form>
  )
}

export default function Plans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [seeding, setSeeding] = useState(false)
  const { isAdmin } = useAuth()

  useEffect(() => { fetchPlans() }, [])

  const fetchPlans = async () => {
    setLoading(true)
    try { const { data } = await api.get('/plans'); setPlans(data) }
    catch { setToast({ message: 'Failed to load plans', type: 'error' }) }
    finally { setLoading(false) }
  }

  const handleSave = async (data) => {
    try {
      if (editPlan) await api.put(`/plans/${editPlan._id}`, data)
      else await api.post('/plans', data)
      setToast({ message: editPlan ? 'Plan updated' : 'Plan added', type: 'success' })
      setShowForm(false); setEditPlan(null); fetchPlans()
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Error saving plan', type: 'error' })
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/plans/${deleteTarget._id}`)
      setToast({ message: 'Plan deactivated', type: 'success' })
      setDeleteTarget(null); fetchPlans()
    } catch { setToast({ message: 'Failed to deactivate', type: 'error' }) }
  }

  const handleSeed = async () => {
    setSeeding(true)
    try { await api.post('/plans/seed'); setToast({ message: 'Default plans loaded', type: 'success' }); fetchPlans() }
    catch { setToast({ message: 'Some plans already exist', type: 'warning' }); fetchPlans() }
    finally { setSeeding(false) }
  }

  return (
    <div>
      <PageHeader
        title="Broadband Plans"
        subtitle={`${plans.length} active plans`}
        actions={
          isAdmin && (
            <div className="flex gap-2">
              <button className="btn-secondary text-sm" onClick={handleSeed} disabled={seeding}>
                {seeding ? 'Loading...' : 'Load Defaults'}
              </button>
              <button className="btn-primary flex items-center gap-2" onClick={() => { setEditPlan(null); setShowForm(true) }}>
                <MdAdd size={18} /> Add Plan
              </button>
            </div>
          )
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64"><Spinner size={10} /></div>
      ) : plans.length === 0 ? (
        <div className="card">
          <EmptyState icon={MdWifi} title="No plans yet" description="Add broadband plans or load the defaults"
            action={isAdmin && <button className="btn-primary mt-2" onClick={handleSeed}>Load Default Plans</button>} />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Plan Code','Plan Name','Speed','Data','Base Price','GST','Total Price','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-brand-800 text-xs">{p.planCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.planName}</td>
                    <td className="px-4 py-3 text-gray-600">{p.speed || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.dataLimit || '—'}</td>
                    <td className="px-4 py-3 mono font-medium">{formatCurrency(p.basePrice)}</td>
                    <td className="px-4 py-3 text-gray-500">{p.gstRate}%</td>
                    <td className="px-4 py-3 mono font-bold text-gray-900">{formatCurrency(p.basePrice * (1 + p.gstRate / 100))}</td>
                    <td className="px-4 py-3">
                      <span className={p.isActive ? 'badge-active' : 'badge-inactive'}>{p.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-brand-700"
                            onClick={() => { setEditPlan(p); setShowForm(true) }}>
                            <MdEdit size={15} />
                          </button>
                          <button className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600"
                            onClick={() => setDeleteTarget(p)}>
                            <MdDelete size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title={editPlan ? 'Edit Plan' : 'Add Plan'} onClose={() => { setShowForm(false); setEditPlan(null) }}>
          <PlanForm initial={editPlan} onSave={handleSave} onCancel={() => { setShowForm(false); setEditPlan(null) }} />
        </Modal>
      )}
      {deleteTarget && (
        <ConfirmDialog title="Deactivate Plan" message={`Deactivate "${deleteTarget.planName}"?`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} confirmLabel="Deactivate" />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
