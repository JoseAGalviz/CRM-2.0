import { useState, useEffect, useCallback, useMemo } from 'react'
import { tasksAPI, contactsAPI, dealsAPI } from '../api/index'
import { formatDate, isOverdue } from '../utils/formatters'
import { TASK_STATUSES, TASK_PRIORITIES } from '../utils/constants'
import toast from 'react-hot-toast'
import { CheckCircleIcon } from '../components/ui/icons'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Pagination from '../components/ui/Pagination'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const initForm = { title: '', description: '', status: 'pending', priority: 'medium', due_date: '', contact_id: '', deal_id: '' }

const KANBAN_COLS = [
  { value: 'pending',     label: 'Pendiente',   color: 'bg-yellow-100 border-yellow-300', dot: 'bg-yellow-400' },
  { value: 'in_progress', label: 'En progreso',  color: 'bg-blue-100 border-blue-300',    dot: 'bg-blue-500'   },
  { value: 'done',        label: 'Completado',   color: 'bg-green-100 border-green-300',  dot: 'bg-green-500'  },
  { value: 'cancelled',   label: 'Cancelado',    color: 'bg-gray-100 border-gray-300',    dot: 'bg-gray-400'   },
]

const PRIORITY_COLOR = { urgent: 'badge-red', high: 'badge-yellow', medium: 'badge-blue', low: 'badge-gray' }

function KanbanCard({ task, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const pri = TASK_PRIORITIES.find(p => p.value === task.priority)
  const overdue = isOverdue(task.due_date) && task.status !== 'done'

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      {...attributes} {...listeners}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 flex-1">{task.title}</p>
        <div className="flex gap-1 flex-shrink-0 touch-none" onPointerDown={e => e.stopPropagation()}>
          <button onClick={e => { e.stopPropagation(); onEdit(task) }} className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(task.id) }} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
      {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>}
      {task.contact_name && <p className="text-xs text-gray-400 mt-1.5 truncate">👤 {task.contact_name}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className={`badge ${PRIORITY_COLOR[task.priority] || 'badge-gray'} text-xs`}>{pri?.label}</span>
        {task.due_date && (
          <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            {overdue ? '⚠ ' : ''}{formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [view, setView]             = useState('list')
  const [tasks, setTasks]           = useState([])
  const [allTasks, setAllTasks]     = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter]   = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [loading, setLoading]       = useState(true)
  const [contacts, setContacts]     = useState([])
  const [deals, setDeals]           = useState([])
  const [modal, setModal]           = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(initForm)
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState(null)
  const [activeId, setActiveId]     = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const loadList = useCallback(async () => {
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

  const loadKanban = useCallback(async () => {
    setLoading(true)
    try {
      const res = await tasksAPI.list({ limit: 200 })
      setAllTasks(res.data.data.tasks)
    } catch { toast.error('Error cargando tareas') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (view === 'list') loadList()
    else loadKanban()
  }, [view, loadList, loadKanban])

  useEffect(() => { setPage(1) }, [statusFilter, priorityFilter])

  useEffect(() => {
    contactsAPI.list({ limit: 200 }).then(r => setContacts(r.data.data.contacts))
    dealsAPI.list({ limit: 200 }).then(r => setDeals(r.data.data.deals))
  }, [])

  const tasksByStatus = useMemo(() => {
    return allTasks.reduce((acc, t) => {
      if (!acc[t.status]) acc[t.status] = []
      acc[t.status].push(t)
      return acc
    }, {})
  }, [allTasks])

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const dragged = allTasks.find(t => t.id === active.id)
    const newStatus = over.id
    if (!dragged || dragged.status === newStatus) return
    if (!KANBAN_COLS.find(c => c.value === newStatus)) return

    setAllTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: newStatus } : t))
    try { await tasksAPI.updateStatus(active.id, newStatus) }
    catch { toast.error('Error actualizando'); loadKanban() }
  }

  const toggleStatus = async (task) => {
    const next = task.status === 'done' ? 'pending' : 'done'
    try {
      await tasksAPI.updateStatus(task.id, next)
      setTasks(t => t.map(x => x.id === task.id ? { ...x, status: next } : x))
    } catch { toast.error('Error actualizando tarea') }
  }

  const openCreate = () => { setForm(initForm); setEditing(null); setModal(true) }
  const openEdit = (t) => {
    setForm({ ...initForm, ...t, due_date: t.due_date?.slice(0, 10) || '', contact_id: t.contact_id || '', deal_id: t.deal_id || '' })
    setEditing(t); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await tasksAPI.update(editing.id, form); toast.success('Tarea actualizada') }
      else { await tasksAPI.create(form); toast.success('Tarea creada') }
      setModal(false)
      view === 'list' ? loadList() : loadKanban()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await tasksAPI.delete(deleteId); toast.success('Tarea eliminada')
      view === 'list' ? loadList() : loadKanban()
    } catch { toast.error('Error eliminando') }
  }

  const h = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const statusInfo = (s) => TASK_STATUSES.find(x => x.value === s)
  const priorityInfo = (p) => TASK_PRIORITIES.find(x => x.value === p)
  const activeCard = activeId ? allTasks.find(t => t.id === activeId) : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center">
        {view === 'list' && (
          <>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
              <option value="">Todos los estados</option>
              {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="input w-auto">
              <option value="">Todas las prioridades</option>
              {TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </>
        )}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden ml-0 sm:ml-auto">
          <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Lista
          </button>
          <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'kanban' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Kanban
          </button>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva tarea
        </button>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

      {/* ── LIST VIEW ── */}
      {!loading && view === 'list' && (
        <div className="card overflow-hidden">
          {tasks.length === 0 ? (
            <EmptyState icon={<CheckCircleIcon className="w-7 h-7" />} title="Sin tareas" description="Crea tu primera tarea"
              action={<button onClick={openCreate} className="btn-primary">Crear tarea</button>} />
          ) : (
            <>
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
      )}

      {/* ── KANBAN VIEW ── */}
      {!loading && view === 'kanban' && (
        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLS.map(col => {
              const colTasks = tasksByStatus[col.value] || []
              return (
                <div key={col.value} id={col.value} className="flex-shrink-0 w-64 md:w-72">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                    <span className="badge badge-gray text-xs">{colTasks.length}</span>
                  </div>
                  <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy} id={col.value}>
                    <div className={`min-h-32 rounded-xl p-2 space-y-2 transition-colors ${activeId ? 'bg-gray-100 border-2 border-dashed border-gray-300' : 'bg-gray-50'}`}>
                      {colTasks.map(task => (
                        <KanbanCard key={task.id} task={task} onEdit={openEdit} onDelete={setDeleteId} />
                      ))}
                      {colTasks.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-gray-400 text-xs">Arrastra aquí</div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              )
            })}
          </div>
          <DragOverlay>
            {activeCard && (
              <div className="bg-white rounded-xl border-2 border-primary-400 p-3 shadow-xl opacity-90 w-64">
                <p className="text-sm font-semibold text-gray-900">{activeCard.title}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(activeCard.due_date)}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Form Modal */}
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
