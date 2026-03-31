import { useState, useEffect, useCallback } from 'react'
import { tasksAPI, contactsAPI, dealsAPI } from '../api/index'
import { formatDate, isOverdue } from '../utils/formatters'
import { TASK_STATUSES, TASK_PRIORITIES } from '../utils/constants'
import toast from 'react-hot-toast'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Pagination from '../components/ui/Pagination'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'

const initForm = { title: '', description: '', status: 'pending', priority: 'medium', due_date: '', contact_id: '', deal_id: '' }

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
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
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      const res = await tasksAPI.list(params)
      setTasks(res.data.data.tasks)
      setTotal(res.data.data.total)
      setTotalPages(res.data.data.totalPages)
    } catch { toast.error('Error cargando tareas') }
    finally { setLoading(false) }
  }, [page, statusFilter, priorityFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [statusFilter, priorityFilter])
  useEffect(() => {
    contactsAPI.list({ limit: 200 }).then(r => setContacts(r.data.data.contacts))
    dealsAPI.list({ limit: 200 }).then(r => setDeals(r.data.data.deals))
  }, [])

  const toggleStatus = async (task) => {
    const nextStatus = task.status === 'done' ? 'pending' : 'done'
    try {
      await tasksAPI.updateStatus(task.id, nextStatus)
      setTasks(t => t.map(x => x.id === task.id ? { ...x, status: nextStatus } : x))
    } catch { toast.error('Error actualizando tarea') }
  }

  const openCreate = () => { setForm(initForm); setEditing(null); setModal(true) }
  const openEdit = (t) => { setForm({ ...initForm, ...t, due_date: t.due_date?.slice(0, 10) || '', contact_id: t.contact_id || '', deal_id: t.deal_id || '' }); setEditing(t); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await tasksAPI.update(editing.id, form); toast.success('Tarea actualizada') }
      else { await tasksAPI.create(form); toast.success('Tarea creada') }
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await tasksAPI.delete(deleteId); toast.success('Tarea eliminada'); load() }
    catch { toast.error('Error eliminando') }
  }

  const h = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const statusInfo = (s) => TASK_STATUSES.find(x => x.value === s)
  const priorityInfo = (p) => TASK_PRIORITIES.find(x => x.value === p)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">Todos los estados</option>
          {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="input w-auto">
          <option value="">Todas las prioridades</option>
          {TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <button onClick={openCreate} className="btn-primary ml-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva tarea
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : tasks.length === 0 ? (
          <EmptyState icon="✅" title="Sin tareas" description="Crea tu primera tarea"
            action={<button onClick={openCreate} className="btn-primary">Crear tarea</button>} />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead><tr><th>Tarea</th><th>Relacionado</th><th>Prioridad</th><th>Estado</th><th>Vence</th><th></th></tr></thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id} className={t.status === 'done' ? 'opacity-60' : ''}>
                      <td>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={t.status === 'done'} onChange={() => toggleStatus(t)}
                            className="h-4 w-4 text-primary-600 rounded border-gray-300 cursor-pointer" />
                          <div>
                            <p className={`font-medium text-gray-900 ${t.status === 'done' ? 'line-through text-gray-400' : ''}`}>{t.title}</p>
                            {t.description && <p className="text-xs text-gray-500 truncate max-w-xs">{t.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-500 text-xs">{t.contact_name || t.deal_title || '—'}</td>
                      <td><span className={`badge ${priorityInfo(t.priority)?.color || 'badge-gray'}`}>{priorityInfo(t.priority)?.label}</span></td>
                      <td><span className={`badge ${statusInfo(t.status)?.color || 'badge-gray'}`}>{statusInfo(t.status)?.label}</span></td>
                      <td className={`text-sm ${isOverdue(t.due_date) && t.status !== 'done' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{formatDate(t.due_date)}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(t)} className="btn-ghost btn-sm">Editar</button>
                          <button onClick={() => setDeleteId(t.id)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {tasks.map(t => (
                <div key={t.id} className="flex items-start gap-3 p-4">
                  <input type="checkbox" checked={t.status === 'done'} onChange={() => toggleStatus(t)}
                    className="h-5 w-5 mt-0.5 text-primary-600 rounded border-gray-300 cursor-pointer flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-gray-900 ${t.status === 'done' ? 'line-through text-gray-400' : ''}`}>{t.title}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className={`badge ${priorityInfo(t.priority)?.color}`}>{priorityInfo(t.priority)?.label}</span>
                      <span className={`badge ${statusInfo(t.status)?.color}`}>{statusInfo(t.status)?.label}</span>
                    </div>
                    <p className={`text-xs mt-1 ${isOverdue(t.due_date) && t.status !== 'done' ? 'text-red-600' : 'text-gray-400'}`}>{formatDate(t.due_date)}</p>
                  </div>
                  <button onClick={() => openEdit(t)} className="btn-ghost btn-sm text-xs">Editar</button>
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} limit={20} />
          </>
        )}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Editar tarea' : 'Nueva tarea'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Título *</label><input name="title" value={form.title} onChange={h} required className="input" /></div>
          <div><label className="label">Descripción</label><textarea name="description" value={form.description} onChange={h} rows={2} className="input resize-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Estado</label>
              <select name="status" value={form.status} onChange={h} className="input">
                {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Prioridad</label>
              <select name="priority" value={form.priority} onChange={h} className="input">
                {TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Fecha límite</label><input name="due_date" type="date" value={form.due_date} onChange={h} className="input" /></div>
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
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner size="sm" /> : (editing ? 'Guardar' : 'Crear tarea')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar tarea" message="¿Estás seguro de eliminar esta tarea?" />
    </div>
  )
}
