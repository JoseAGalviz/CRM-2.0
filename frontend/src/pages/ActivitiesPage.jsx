import { useState, useEffect, useCallback, useMemo } from 'react'
import { activitiesAPI, contactsAPI, dealsAPI } from '../api/index'
import { formatDateTime, formatDate } from '../utils/formatters'
import { ACTIVITY_TYPES } from '../utils/constants'
import toast from 'react-hot-toast'
import { CalendarIcon, ActivityTypeIcon } from '../components/ui/icons'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Pagination from '../components/ui/Pagination'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'

const initForm = { type: 'call', subject: '', description: '', outcome: '', duration_min: '', occurred_at: '', contact_id: '', company_id: '', deal_id: '' }
const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)

const TYPE_COLORS = { call: 'bg-blue-500', email: 'bg-violet-500', meeting: 'bg-emerald-500', demo: 'bg-amber-500', follow_up: 'bg-orange-500', other: 'bg-gray-400' }

function CalendarView({ activities, onEdit, onDelete, onOpenCreate, calDate, onMonthChange }) {
  const [selectedDay, setSelectedDay] = useState(null)

  const year  = calDate.getFullYear()
  const month = calDate.getMonth()

  const firstDay  = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay + 6) % 7 // Mon=0

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  // Group activities by date string YYYY-MM-DD
  const byDay = useMemo(() => {
    const map = {}
    activities.forEach(a => {
      const key = a.occurred_at?.slice(0, 10)
      if (!key) return
      if (!map[key]) map[key] = []
      map[key].push(a)
    })
    return map
  }, [activities])

  const todayStr = new Date().toISOString().slice(0, 10)

  const days = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const pad = (n) => String(n).padStart(2, '0')
  const dayKey = (d) => `${year}-${pad(month + 1)}-${pad(d)}`

  const prev = () => { onMonthChange(new Date(year, month - 1, 1)); setSelectedDay(null) }
  const next = () => { onMonthChange(new Date(year, month + 1, 1)); setSelectedDay(null) }
  const goToday = () => { const n = new Date(); n.setDate(1); onMonthChange(n); setSelectedDay(null) }

  const selectedActivities = selectedDay ? (byDay[dayKey(selectedDay)] || []) : []

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-base font-semibold text-gray-900 w-40 text-center">{monthNames[month]} {year}</h2>
            <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <button onClick={goToday} className="btn-secondary btn-sm text-xs">Hoy</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
          {days.map((day, i) => {
            if (!day) return <div key={`e-${i}`} className="bg-white h-16 sm:h-20" />
            const key = dayKey(day)
            const acts = byDay[key] || []
            const isToday = key === todayStr
            const isSelected = selectedDay === day
            return (
              <div key={key}
                className={`bg-white h-16 sm:h-20 p-1 cursor-pointer hover:bg-primary-50 transition-colors ${isSelected ? 'ring-2 ring-inset ring-primary-400' : ''}`}
                onClick={() => setSelectedDay(isSelected ? null : day)}
              >
                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${isToday ? 'bg-primary-600 text-white' : 'text-gray-700'}`}>
                  {day}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {acts.slice(0, 2).map(a => (
                    <div key={a.id} className={`text-white text-[9px] font-medium rounded px-1 py-0.5 truncate ${TYPE_COLORS[a.type] || 'bg-gray-400'}`}>
                      {a.subject}
                    </div>
                  ))}
                  {acts.length > 2 && (
                    <div className="text-[9px] text-gray-400 pl-1">+{acts.length - 2} más</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day activities */}
      {selectedDay !== null && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{formatDate(dayKey(selectedDay))}</h3>
            <span className="text-sm text-gray-500">{selectedActivities.length} actividad{selectedActivities.length !== 1 ? 'es' : ''}</span>
          </div>
          {selectedActivities.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-400 text-sm mb-3">Sin actividades este día</p>
              <button onClick={() => onOpenCreate(dayKey(selectedDay))} className="btn-primary btn-sm">Registrar actividad</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {selectedActivities.map(a => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${TYPE_COLORS[a.type] || 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{a.subject}</p>
                    <p className="text-xs text-gray-500">{a.contact_name || a.deal_title || '—'} · {formatDateTime(a.occurred_at)}</p>
                    {a.outcome && <p className="text-xs text-green-600 mt-0.5">{a.outcome}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => onEdit(a)} className="btn-ghost btn-sm text-xs">Editar</button>
                    <button onClick={() => onDelete(a.id)} className="btn-ghost btn-sm text-xs text-red-500">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {ACTIVITY_TYPES.map(t => (
          <span key={t.value} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${TYPE_COLORS[t.value]}`} />{t.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function ActivitiesPage() {
  const [view, setView]             = useState('list')
  const [activities, setActivities] = useState([])
  const [allActivities, setAllActivities] = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading]       = useState(true)
  const [contacts, setContacts]     = useState([])
  const [deals, setDeals]           = useState([])
  const [modal, setModal]           = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(initForm)
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState(null)
  const [calDate, setCalDate]       = useState(() => { const n = new Date(); n.setDate(1); return n })

  const loadList = useCallback(async () => {
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

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const y = calDate.getFullYear(), m = calDate.getMonth()
      const from = `${y}-${String(m + 1).padStart(2, '0')}-01`
      const to   = new Date(y, m + 1, 0).toISOString().slice(0, 10)
      const res  = await activitiesAPI.list({ limit: 500, from, to })
      setAllActivities(res.data.data.activities)
    } catch { toast.error('Error cargando actividades') }
    finally { setLoading(false) }
  }, [calDate])

  useEffect(() => {
    if (view === 'list') loadList()
    else loadCalendar()
  }, [view, loadList, loadCalendar])

  useEffect(() => { setPage(1) }, [typeFilter])

  useEffect(() => {
    contactsAPI.list({ limit: 200 }).then(r => setContacts(r.data.data.contacts))
    dealsAPI.list({ limit: 200 }).then(r => setDeals(r.data.data.deals))
  }, [])

  const openCreate = (dateStr = null) => {
    const occurred_at = dateStr
      ? `${dateStr}T09:00`
      : nowLocal()
    setForm({ ...initForm, occurred_at }); setEditing(null); setModal(true)
  }

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
      setModal(false)
      view === 'list' ? loadList() : loadCalendar()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await activitiesAPI.delete(deleteId); toast.success('Actividad eliminada') }
    catch { toast.error('Error eliminando') }
    finally {
      setDeleteId(null)
      view === 'list' ? loadList() : loadCalendar()
    }
  }

  const h = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const typeInfo = (t) => ACTIVITY_TYPES.find(x => x.value === t)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center">
        {view === 'list' && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input w-auto">
            <option value="">Todos los tipos</option>
            {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden ml-0 sm:ml-auto">
          <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Lista
          </button>
          <button onClick={() => setView('calendar')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Calendario
          </button>
        </div>
        <button onClick={() => openCreate()} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Registrar actividad
        </button>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

      {/* ── LIST VIEW ── */}
      {!loading && view === 'list' && (
        <div className="card overflow-hidden">
          {activities.length === 0 ? (
            <EmptyState icon={<CalendarIcon className="w-7 h-7" />} title="Sin actividades" description="Registra tu primera actividad"
              action={<button onClick={() => openCreate()} className="btn-primary">Registrar actividad</button>} />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Actividad</th><th>Contacto/Negocio</th><th>Resultado</th><th>Duración</th><th>Fecha</th><th></th></tr></thead>
                  <tbody>
                    {activities.map(a => (
                      <tr key={a.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TYPE_COLORS[a.type] || 'bg-gray-400'}`} />
                            <ActivityTypeIcon type={a.type} className="w-4 h-4 text-gray-400" />
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
              <div className="md:hidden divide-y divide-gray-100">
                {activities.map(a => (
                  <div key={a.id} className="p-4 flex gap-3">
                    <ActivityTypeIcon type={a.type} className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
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
      )}

      {/* ── CALENDAR VIEW ── */}
      {!loading && view === 'calendar' && (
        <CalendarView
          activities={allActivities}
          onEdit={openEdit}
          onDelete={setDeleteId}
          onOpenCreate={openCreate}
          calDate={calDate}
          onMonthChange={setCalDate}
        />
      )}

      {/* Form Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Editar actividad' : 'Registrar actividad'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tipo *</label>
            <select name="type" value={form.type} onChange={h} className="input">
              {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
