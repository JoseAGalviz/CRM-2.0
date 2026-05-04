import { useState, useEffect, useCallback } from 'react'
import { activitiesAPI, contactsAPI, dealsAPI } from '../api/index'
import { formatDateTime } from '../utils/formatters'
import { ACTIVITY_TYPES } from '../utils/constants'
import toast from 'react-hot-toast'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Pagination from '../components/ui/Pagination'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'

const initForm = { type: 'call', subject: '', description: '', outcome: '', duration_min: '', occurred_at: '', contact_id: '', company_id: '', deal_id: '' }
const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState([])
  const [deals, setDeals] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (typeFilter) params.type = typeFilter
      const res = await activitiesAPI.list(params)
      setActivities(res.data.data.activities)
      setTotal(res.data.data.total)
      setTotalPages(res.data.data.totalPages)
    } catch { toast.error('Error cargando actividades') }
    finally { setLoading(false) }
  }, [page, typeFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [typeFilter])
  useEffect(() => {
    contactsAPI.list({ limit: 200 }).then(r => setContacts(r.data.data.contacts))
    dealsAPI.list({ limit: 200 }).then(r => setDeals(r.data.data.deals))
  }, [])

  const openCreate = () => { setForm({ ...initForm, occurred_at: nowLocal() }); setEditing(null); setModal(true) }
  const openEdit = (a) => {
    setForm({ ...initForm, ...a, occurred_at: a.occurred_at?.slice(0, 16) || '', duration_min: a.duration_min || '', contact_id: a.contact_id || '', deal_id: a.deal_id || '' })
    setEditing(a); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const data = { ...form, duration_min: form.duration_min ? parseInt(form.duration_min) : null }
      if (editing) { await activitiesAPI.update(editing.id, data); toast.success('Actividad actualizada') }
      else { await activitiesAPI.create(data); toast.success('Actividad registrada') }
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await activitiesAPI.delete(deleteId); toast.success('Actividad eliminada'); load() }
    catch { toast.error('Error eliminando') }
  }

  const h = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const typeInfo = (t) => ACTIVITY_TYPES.find(x => x.value === t)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input w-auto">
          <option value="">Todos los tipos</option>
          {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>
        <button onClick={openCreate} className="btn-primary ml-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Registrar actividad
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : activities.length === 0 ? (
          <EmptyState icon="📅" title="Sin actividades" description="Registra tu primera actividad"
            action={<button onClick={openCreate} className="btn-primary">Registrar actividad</button>} />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead><tr><th>Actividad</th><th>Contacto/Negocio</th><th>Resultado</th><th>Duración</th><th>Fecha</th><th></th></tr></thead>
                <tbody>
                  {activities.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{typeInfo(a.type)?.icon}</span>
                          <div>
                            <p className="font-medium text-gray-900">{a.subject}</p>
                            {a.description && <p className="text-xs text-gray-500 truncate max-w-xs">{a.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-500 text-sm">{a.contact_name || a.deal_title || a.company_name || '—'}</td>
                      <td className="text-gray-500 text-sm">{a.outcome ? <span className="text-green-600">{a.outcome}</span> : '—'}</td>
                      <td className="text-gray-500 text-sm">{a.duration_min ? `${a.duration_min} min` : '—'}</td>
                      <td className="text-gray-500 text-sm">{formatDateTime(a.occurred_at)}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(a)} className="btn-ghost btn-sm">Editar</button>
                          <button onClick={() => setDeleteId(a.id)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {activities.map(a => (
                <div key={a.id} className="p-4 flex gap-3">
                  <span className="text-2xl">{typeInfo(a.type)?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{a.subject}</p>
                    {a.outcome && <p className="text-xs text-green-600 mt-0.5">{a.outcome}</p>}
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(a.occurred_at)} {a.duration_min ? `· ${a.duration_min} min` : ''}</p>
                  </div>
                  <button onClick={() => openEdit(a)} className="btn-ghost btn-sm text-xs self-start">Editar</button>
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} limit={20} />
          </>
        )}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Editar actividad' : 'Registrar actividad'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tipo *</label>
            <select name="type" value={form.type} onChange={h} className="input">
              {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div><label className="label">Asunto *</label><input name="subject" value={form.subject} onChange={h} required className="input" /></div>
          <div><label className="label">Descripción</label><textarea name="description" value={form.description} onChange={h} rows={2} className="input resize-none" /></div>
          <div><label className="label">Resultado</label><input name="outcome" value={form.outcome} onChange={h} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Duración (min)</label><input name="duration_min" type="number" min="0" value={form.duration_min} onChange={h} className="input" /></div>
            <div><label className="label">Fecha/hora *</label><input name="occurred_at" type="datetime-local" value={form.occurred_at} onChange={h} required className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contacto</label>
              <select name="contact_id" value={form.contact_id} onChange={h} className="input">
                <option value="">Sin contacto</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Negocio</label>
              <select name="deal_id" value={form.deal_id} onChange={h} className="input">
                <option value="">Sin negocio</option>
                {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner size="sm" /> : (editing ? 'Guardar' : 'Registrar')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar actividad" message="¿Estás seguro de eliminar esta actividad?" />
    </div>
  )
}
