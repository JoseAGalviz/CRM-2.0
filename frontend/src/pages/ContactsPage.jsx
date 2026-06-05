import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { contactsAPI, companiesAPI, usersAPI } from '../api/index'
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
import CsvImportModal from '../components/ui/CsvImportModal'

const IMPORT_HEADERS = ['first_name', 'last_name', 'email', 'phone', 'job_title']

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
  const [importModal, setImportModal] = useState(false)
  const [users, setUsers] = useState([])
  const [filters, setFilters] = useState({ status: '', source: '', company_id: '', owner_id: '', tag: '' })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const [selected, setSelected] = useState(new Set())
  const [bulkOwner, setBulkOwner] = useState('')
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [dupsModal, setDupsModal] = useState(false)
  const [dups, setDups] = useState([])
  const [dupsLoading, setDupsLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20, search, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }
      const res = await contactsAPI.list(params)
      setContacts(res.data.data.contacts)
      setTotal(res.data.data.total)
      setTotalPages(res.data.data.totalPages)
    } catch { toast.error('Error cargando contactos') }
    finally { setLoading(false) }
  }, [page, search, filters])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    companiesAPI.list({ limit: 200 }).then(r => setCompanies(r.data.data.companies))
    usersAPI.directory().then(r => setUsers(r.data.data))
  }, [])
  useEffect(() => { setPage(1) }, [search, filters])

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

  const openDuplicates = async () => {
    setDupsModal(true); setDupsLoading(true)
    try { const r = await contactsAPI.findDuplicates(); setDups(r.data.data) }
    catch { toast.error('Error buscando duplicados') }
    finally { setDupsLoading(false) }
  }

  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(s => s.size === contacts.length ? new Set() : new Set(contacts.map(c => c.id)))
  const clearSelected = () => setSelected(new Set())

  const handleBulkDelete = async () => {
    try {
      await contactsAPI.bulkDelete([...selected])
      toast.success(`${selected.size} contactos eliminados`)
      clearSelected(); setBulkConfirm(false); load()
    } catch { toast.error('Error eliminando') }
  }

  const handleBulkAssign = async () => {
    if (!bulkOwner) return toast.error('Selecciona un responsable')
    try {
      await contactsAPI.bulkAssign([...selected], Number(bulkOwner))
      toast.success(`${selected.size} contactos reasignados`)
      clearSelected(); setBulkOwner(''); load()
    } catch { toast.error('Error asignando') }
  }

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
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className={`btn-secondary flex-shrink-0 text-sm relative ${activeFilterCount > 0 ? 'border-primary-400 text-primary-600' : ''}`}
        >
          Filtros {activeFilterCount > 0 && <span className="ml-1 inline-flex items-center justify-center w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full">{activeFilterCount}</span>}
        </button>
        <button onClick={openDuplicates} className="btn-secondary flex-shrink-0 text-sm">
          Duplicados
        </button>
        <button onClick={() => exportToCSV(contacts, 'contactos', CONTACT_COLUMNS)} className="btn-secondary flex-shrink-0 text-sm">
          ↓ CSV
        </button>
        <button onClick={() => setImportModal(true)} className="btn-secondary flex-shrink-0 text-sm">
          ↑ Importar
        </button>
        <button onClick={openCreate} className="btn-primary flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo contacto
        </button>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="card p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="label">Estado</label>
              <select className="input" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="">Todos</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
            <div>
              <label className="label">Origen</label>
              <select className="input" value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}>
                <option value="">Todos</option>
                {CONTACT_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Empresa</label>
              <select className="input" value={filters.company_id} onChange={e => setFilters(f => ({ ...f, company_id: e.target.value }))}>
                <option value="">Todas</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Responsable</label>
              <select className="input" value={filters.owner_id} onChange={e => setFilters(f => ({ ...f, owner_id: e.target.value }))}>
                <option value="">Todos</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tag</label>
              <input className="input" placeholder="Buscar por tag..." value={filters.tag} onChange={e => setFilters(f => ({ ...f, tag: e.target.value }))} />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => setFilters({ status: '', source: '', company_id: '', owner_id: '', tag: '' })} className="mt-3 text-xs text-red-500 hover:text-red-700">
              × Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="card p-3 flex flex-wrap items-center gap-3 bg-primary-50 border border-primary-200">
          <span className="text-sm font-medium text-primary-800">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <select value={bulkOwner} onChange={e => setBulkOwner(e.target.value)} className="input text-sm h-8 py-1">
              <option value="">Asignar a...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button onClick={handleBulkAssign} disabled={!bulkOwner} className="btn-secondary btn-sm text-sm">Asignar</button>
            <button onClick={() => setBulkConfirm(true)} className="btn-sm text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg px-3 py-1.5">Eliminar {selected.size}</button>
            <button onClick={clearSelected} className="btn-ghost btn-sm text-sm">Cancelar</button>
          </div>
        </div>
      )}

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
                  <th className="w-8">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600"
                      checked={contacts.length > 0 && selected.size === contacts.length}
                      onChange={toggleAll} />
                  </th>
                  <th>Nombre</th><th>Empresa</th><th>Email</th><th>Cargo</th><th>Estado</th><th>Creado</th><th></th>
                </tr></thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id} className={`cursor-pointer ${selected.has(c.id) ? 'bg-primary-50' : ''}`} onClick={() => navigate(`/contacts/${c.id}`)}>
                      <td onClick={e => { e.stopPropagation(); toggleSelect(c.id) }}>
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600"
                          checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                      </td>
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
                <div key={c.id} className={`flex items-center gap-3 p-4 hover:bg-gray-50 ${selected.has(c.id) ? 'bg-primary-50' : ''}`}>
                  <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-primary-600 flex-shrink-0"
                    checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} onClick={e => e.stopPropagation()} />
                  <Link to={`/contacts/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar name={`${c.first_name} ${c.last_name}`} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                      <p className="text-sm text-gray-500">{c.job_title || '—'} · {c.company_name || '—'}</p>
                      <p className="text-xs text-gray-400">{c.email || c.phone || '—'}</p>
                    </div>
                    <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-gray'} flex-shrink-0`}>{c.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                  </Link>
                </div>
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

      <ConfirmDialog isOpen={bulkConfirm} onClose={() => setBulkConfirm(false)} onConfirm={handleBulkDelete}
        title={`Eliminar ${selected.size} contactos`} message={`¿Estás seguro? Se eliminarán ${selected.size} contactos permanentemente.`} />

      <CsvImportModal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        onImport={contactsAPI.import}
        entityLabel="contactos"
        templateHeaders={IMPORT_HEADERS}
        onSuccess={load}
      />

      {/* Duplicates modal */}
      <Modal isOpen={dupsModal} onClose={() => setDupsModal(false)} title="Contactos duplicados" size="lg">
        {dupsLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : dups.length === 0 ? (
          <div className="text-center py-10">
            <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium text-gray-700">Sin duplicados detectados</p>
            <p className="text-sm text-gray-500 mt-1">No se encontraron contactos con email o nombre idéntico</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-gray-500">{dups.length} par{dups.length !== 1 ? 'es' : ''} detectado{dups.length !== 1 ? 's' : ''}</p>
            {dups.map((d, i) => (
              <div key={i} className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-900">{d.name1}</p>
                    <p className="text-gray-500 text-xs">{d.email1 || '—'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{d.name2}</p>
                    <p className="text-gray-500 text-xs">{d.email2 || '—'}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link to={`/contacts/${d.id1}`} onClick={() => setDupsModal(false)} className="btn-secondary btn-sm text-xs">Ver {d.name1.split(' ')[0]}</Link>
                  <Link to={`/contacts/${d.id2}`} onClick={() => setDupsModal(false)} className="btn-secondary btn-sm text-xs">Ver {d.name2.split(' ')[0]}</Link>
                  <span className="text-xs text-gray-400 self-center ml-auto">Usa "Fusionar con..." desde el perfil del contacto</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
