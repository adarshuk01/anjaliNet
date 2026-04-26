import { useState, useEffect } from 'react'
import { MdAdd, MdEdit, MdDelete, MdPerson } from 'react-icons/md'
import api from '../utils/api'
import { formatDate } from '../utils/helpers'
import { Modal, Toast, ConfirmDialog, PageHeader, EmptyState, Spinner } from '../components/ui'

function UserForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent', isActive: true, ...initial })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
          <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
          <input type="email" className="input" required value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
      </div>
      {!initial && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
          <input type="password" className="input" required value={form.password} onChange={e => set('password', e.target.value)} minLength={6} />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
        <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
          <option value="admin">Admin — Full access</option>
          <option value="agent">Agent — Can record payments</option>
          <option value="viewer">Viewer — Read only</option>
        </select>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 rounded" />
        <span className="text-sm text-gray-700">Active account</span>
      </label>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving...' : initial ? 'Update User' : 'Add User'}
        </button>
      </div>
    </form>
  )
}

const ROLE_COLORS = { admin: 'bg-purple-100 text-purple-700', agent: 'bg-blue-100 text-blue-700', viewer: 'bg-gray-100 text-gray-600' }

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try { const { data } = await api.get('/users'); setUsers(data) }
    catch { setToast({ message: 'Failed to load users', type: 'error' }) }
    finally { setLoading(false) }
  }

  const handleSave = async (data) => {
    try {
      if (editUser) await api.put(`/users/${editUser._id}`, data)
      else await api.post('/users', data)
      setToast({ message: editUser ? 'User updated' : 'User created', type: 'success' })
      setShowForm(false); setEditUser(null); fetchUsers()
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Error saving user', type: 'error' })
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteTarget._id}`)
      setToast({ message: 'User deactivated', type: 'success' })
      setDeleteTarget(null); fetchUsers()
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed', type: 'error' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage system access"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => { setEditUser(null); setShowForm(true) }}>
            <MdAdd size={18} /> Add User
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64"><Spinner size={10} /></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['User','Role','Status','Last Login','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr><td colSpan={5}><EmptyState icon={MdPerson} title="No users" /></td></tr>
              ) : users.map(u => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-800 text-white flex items-center justify-center text-sm font-bold">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.isActive ? 'badge-active' : 'badge-inactive'}>{u.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-brand-700"
                        onClick={() => { setEditUser(u); setShowForm(true) }}>
                        <MdEdit size={15} />
                      </button>
                      <button className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600"
                        onClick={() => setDeleteTarget(u)}>
                        <MdDelete size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editUser ? 'Edit User' : 'Add User'} onClose={() => { setShowForm(false); setEditUser(null) }}>
          <UserForm initial={editUser} onSave={handleSave} onCancel={() => { setShowForm(false); setEditUser(null) }} />
        </Modal>
      )}
      {deleteTarget && (
        <ConfirmDialog title="Deactivate User"
          message={`Deactivate "${deleteTarget.name}"? They will lose access to the system.`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} confirmLabel="Deactivate" />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
