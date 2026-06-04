import { useState, useEffect, useCallback } from 'react'
import { usersAPI } from '../api/index'
import { formatDate } from '../utils/formatters'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Spinner from '../components/ui/Spinner'
import Avatar from '../components/ui/Avatar'

const initForm = { name: '', email: '', password: '', role: 'user' }

export default function UsersPage() {
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (me?.role !== 'admin') navigate('/dashboard', { replace: true })
  }, [me, navigate])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await usersAPI.list()
      setUsers(res.data.data)
    } catch { toast.error('Error cargando usuarios') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(initForm); setEditing(null); setModal('form') }
  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role })
    setEditing(u)
    setModal('form')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (editing && !payload.password) delete payload.password
      if (editing) {
        await usersAPI.update(editing.id, payload)
        toast.success('Usuario actualizado')
      } else {
        await usersAPI.create(payload)
        toast.success('Usuario creado')
      }
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando')
    } finally { setSaving(false) }
  }

  const handleToggleStatus = async (u) => {
    try {
      await usersAPI.toggleStatus(u.id)
      toast.success(u.is_active ? 'Usuario inhabilitado' : 'Usuario habilitado')
      load()
    } catch { toast.error('Error actualizando estado') }
  }

  const handleDelete = async () => {
    try {
      await usersAPI.delete(deleteId)
      toast.success('Usuario eliminado')
      setDeleteId(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error eliminando')
    }
  }

  const h = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500">{users.length} usuario{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead><tr>
                  <th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Creado</th><th></th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size="sm" />
                          <span className="font-medium text-gray-900">{u.name}</span>
                          {u.id === me?.id && <span className="badge badge-gray text-xs">Tú</span>}
                        </div>
                      </td>
                      <td className="text-gray-600">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-gray'}`}>
                          {u.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-gray-500 text-xs">{formatDate(u.created_at)}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(u)} className="btn-ghost btn-sm">Editar</button>
                          {u.id !== me?.id && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`btn-ghost btn-sm ${u.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                              >
                                {u.is_active ? 'Inhabilitar' : 'Habilitar'}
                              </button>
                              <button onClick={() => setDeleteId(u.id)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50">
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-4">
                  <Avatar name={u.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      {u.id === me?.id && <span className="badge badge-gray text-xs">Tú</span>}
                    </div>
                    <p className="text-sm text-gray-500">{u.email}</p>
                    <div className="flex gap-1 mt-1">
                      <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-gray'}`}>
                        {u.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                      <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => openEdit(u)} className="btn-ghost btn-sm text-xs">Editar</button>
                    {u.id !== me?.id && (
                      <>
                        <button onClick={() => handleToggleStatus(u)} className="btn-ghost btn-sm text-xs">
                          {u.is_active ? 'Inhabilitar' : 'Habilitar'}
                        </button>
                        <button onClick={() => setDeleteId(u.id)} className="btn-ghost btn-sm text-xs text-red-500">
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={editing ? 'Editar usuario' : 'Nuevo usuario'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input name="name" value={form.name} onChange={h} required className="input" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input name="email" type="email" value={form.email} onChange={h} required className="input" />
          </div>
          <div>
            <label className="label">{editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={h}
              required={!editing}
              minLength={8}
              className="input"
              placeholder={editing ? '••••••••' : ''}
            />
          </div>
          <div>
            <label className="label">Rol</label>
            <select name="role" value={form.role} onChange={h} className="input">
              <option value="user">Usuario</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2 justify-end">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Spinner size="sm" /> : (editing ? 'Guardar cambios' : 'Crear usuario')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        message="¿Estás seguro? Esta acción no se puede deshacer."
      />
    </div>
  )
}
