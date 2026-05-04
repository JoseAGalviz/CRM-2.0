import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { contactsAPI, companiesAPI } from '../api/index'
import { formatDate } from '../utils/formatters'
import { exportToCSV, CONTACT_COLUMNS } from '../utils/export'
import { CONTACT_SOURCES } from '../utils/constants'
import toast from 'react-hot-toast'
import { UsersIcon } from '../components/ui/icons'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Pagination from '../components/ui/Pagination'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import Avatar from '../components/ui/Avatar'

const initForm = { first_name: '', last_name: '', email: '', phone: '', mobile: '', job_title: '', department: '', company_id: '', source: '', status: 'active', address: '', city: '', country: '', linkedin_url: '', notes: '', tags: [] }

export default function ContactsPage() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState([])
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await contactsAPI.list({ page, limit: 20, search })
      setContacts(res.data.data.contacts)
      setTotal(res.data.data.total)
      setTotalPages(res.data.data.totalPages)
    } catch { toast.error('Error cargando contactos') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { companiesAPI.list({ limit: 200 }).then(r => setCompanies(r.data.data.companies)) }, [])
  useEffect(() => { setPage(1) }, [search])

  const openCreate = () => { setForm(initForm); setEditing(null); setModal('create') }
  const openEdit = (c) => {
    setForm({ ...initForm, ...c, tags: Array.isArray(c.tags) ? c.tags : [], company_id: c.company_id || '' })
    setEditing(c)
    setModal('edit')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await contactsAPI.update(editing.id, form)
        toast.success('Contacto actualizado')
      } else {
        await contactsAPI.create(form)
        toast.success('Contacto creado')
      }
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error guardando')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await contactsAPI.delete(deleteId)
      toast.success('Contacto eliminado')
      load()
    } catch { toast.error('Error eliminando') }
  }

  const h = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input className="input pl-9" placeholder="Buscar contactos..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <button onClick={() => exportToCSV(contacts, 'contactos', CONTACT_COLUMNS)} className="btn-secondary flex-shrink-0 text-sm">
          ↓ CSV
        </button>
        <button onClick={openCreate} className="btn-primary flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo contacto
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : contacts.length === 0 ? (
          <EmptyState icon={<UsersIcon className="w-7 h-7" />} title="Sin contactos" description="Agrega tu primer contacto para empezar"
            action={<button onClick={openCreate} className="btn-primary">Agregar contacto</button>} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead><tr>
                  <th>Nombre</th><th>Empresa</th><th>Email</th><th>Cargo</th><th>Estado</th><th>Creado</th><th></th>
                </tr></thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/contacts/${c.id}`)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                            {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-600">{c.company_name || '—'}</td>
                      <td className="text-gray-600">{c.email || '—'}</td>
                      <td className="text-gray-600">{c.job_title || '—'}</td>
                      <td><span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{c.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                      <td className="text-gray-500 text-xs">{formatDate(c.created_at)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Link to={`/contacts/${c.id}`} className="btn-ghost btn-sm">Ver</Link>
                          <button onClick={() => openEdit(c)} className="btn-ghost btn-sm">Editar</button>
                          <button onClick={() => setDeleteId(c.id)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {contacts.map(c => (
                <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                  <Avatar name={`${c.first_name} ${c.last_name}`} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                    <p className="text-sm text-gray-500">{c.job_title || '—'} · {c.company_name || '—'}</p>
                    <p className="text-xs text-gray-400">{c.email || c.phone || '—'}</p>
                  </div>
                  <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{c.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                </Link>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} limit={20} />
          </>
        )}
      </div>

      {/* Form Modal */}
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={editing ? 'Editar contacto' : 'Nuevo contacto'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Nombre *</label><input name="first_name" value={form.first_name} onChange={h} required className="input" /></div>
            <div><label className="label">Apellido *</label><input name="last_name" value={form.last_name} onChange={h} required className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Email</label><input name="email" type="email" value={form.email} onChange={h} className="input" /></div>
            <div><label className="label">Teléfono</label><input name="phone" value={form.phone} onChange={h} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Cargo</label><input name="job_title" value={form.job_title} onChange={h} className="input" /></div>
            <div><label className="label">Departamento</label><input name="department" value={form.department} onChange={h} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Empresa</label>
              <select name="company_id" value={form.company_id} onChange={h} className="input">
                <option value="">Sin empresa</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Origen</label>
              <select name="source" value={form.source} onChange={h} className="input">
                <option value="">Seleccionar</option>
                {CONTACT_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Ciudad</label><input name="city" value={form.city} onChange={h} className="input" /></div>
            <div><label className="label">País</label><input name="country" value={form.country} onChange={h} className="input" /></div>
          </div>
          <div>
            <label className="label">LinkedIn URL</label>
            <input name="linkedin_url" type="url" value={form.linkedin_url} onChange={h} className="input" placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <label className="label">Estado</label>
            <select name="status" value={form.status} onChange={h} className="input">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2 justify-end">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner size="sm" /> : (editing ? 'Guardar cambios' : 'Crear contacto')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar contacto" message="¿Estás seguro? Esta acción no se puede deshacer." />
    </div>
  )
}
