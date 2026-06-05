import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { dealsAPI, notesAPI, contactsAPI, companiesAPI } from '../api/index'
import { formatCurrency, formatDate, formatDateRelative } from '../utils/formatters'
import { ACTIVITY_TYPES, TASK_STATUSES, TASK_PRIORITIES } from '../utils/constants'
import { usePipelineStages } from '../hooks/usePipelineStages'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'
import Modal from '../components/ui/Modal'
import { BriefcaseIcon, UserIcon, BuildingIcon, CalendarIcon, ActivityTypeIcon } from '../components/ui/icons'
import AuditLogPanel from '../components/ui/AuditLogPanel'

const initEditForm = { title: '', value: '', currency: 'USD', stage: 'lead', probability: '', expected_close: '', contact_id: '', company_id: '', description: '', tags: [] }

export default function DealDetailPage() {
  const { id } = useParams()
  const [deal, setDeal] = useState(null)
  const [activities, setActivities] = useState([])
  const [tasks, setTasks] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [noteModal, setNoteModal] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [editNote, setEditNote] = useState(null)
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState(initEditForm)
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState([])
  const [companies, setCompanies] = useState([])
  const { stages: DEAL_STAGES } = usePipelineStages()

  useEffect(() => {
    Promise.all([
      dealsAPI.get(id),
      dealsAPI.activities(id),
      dealsAPI.tasks(id),
      dealsAPI.notes(id),
    ]).then(([d, a, t, n]) => {
      setDeal(d.data.data)
      setActivities(a.data.data)
      setTasks(t.data.data)
      setNotes(n.data.data)
    }).catch(() => toast.error('Error cargando negocio'))
    .finally(() => setLoading(false))

    contactsAPI.list({ limit: 200 }).then(r => setContacts(r.data.data.contacts))
    companiesAPI.list({ limit: 200 }).then(r => setCompanies(r.data.data.companies))
  }, [id])

  const openEdit = () => {
    setEditForm({
      title: deal.title, value: deal.value || '', currency: deal.currency || 'USD',
      stage: deal.stage, probability: deal.probability || '', tags: Array.isArray(deal.tags) ? deal.tags : [],
      expected_close: deal.expected_close ? deal.expected_close.slice(0, 10) : '',
      contact_id: deal.contact_id || '', company_id: deal.company_id || '', description: deal.description || '',
    })
    setEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await dealsAPI.update(id, editForm)
      setDeal(res.data.data)
      setEditModal(false)
      toast.success('Negocio actualizado')
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const hf = (e) => setEditForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const saveNote = async () => {
    if (!noteText.trim()) return
    try {
      if (editNote) {
        const r = await notesAPI.update(editNote.id, { content: noteText })
        setNotes(ns => ns.map(n => n.id === editNote.id ? r.data.data : n))
      } else {
        const r = await notesAPI.create({ content: noteText, deal_id: parseInt(id) })
        setNotes(ns => [r.data.data, ...ns])
      }
      setNoteModal(false); setNoteText(''); setEditNote(null)
      toast.success('Nota guardada')
    } catch { toast.error('Error guardando nota') }
  }

  const deleteNote = async (nid) => {
    try {
      await notesAPI.delete(nid)
      setNotes(ns => ns.filter(n => n.id !== nid))
      toast.success('Nota eliminada')
    } catch { toast.error('Error eliminando') }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!deal) return <div className="text-center py-20 text-gray-500">Negocio no encontrado</div>

  const stage = DEAL_STAGES.find(s => s.value === deal.stage)

  const tabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'activities', label: `Actividades (${activities.length})` },
    { id: 'tasks', label: `Tareas (${tasks.length})` },
    { id: 'notes', label: `Notas (${notes.length})` },
    { id: 'historial', label: 'Historial' },
  ]

  return (
    <div className="space-y-5">
      <Link to="/deals" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        ← Volver a negocios
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-600">
            <BriefcaseIcon className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
              <span className={`badge ${stage?.color || 'badge-gray'}`}>{stage?.label || deal.stage}</span>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
              {deal.contact_name && (
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" />
                  {deal.contact_id
                    ? <Link to={`/contacts/${deal.contact_id}`} className="text-primary-600 hover:underline">{deal.contact_name}</Link>
                    : deal.contact_name}
                </span>
              )}
              {deal.company_name && (
                <span className="inline-flex items-center gap-1.5">
                  <BuildingIcon className="w-3.5 h-3.5" />
                  {deal.company_id
                    ? <Link to={`/companies/${deal.company_id}`} className="text-primary-600 hover:underline">{deal.company_name}</Link>
                    : deal.company_name}
                </span>
              )}
              {deal.expected_close && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5" />Cierre: {formatDate(deal.expected_close)}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <p className="text-3xl font-bold text-primary-600">{formatCurrency(deal.value, deal.currency)}</p>
            <p className="text-sm text-gray-400">{deal.probability}% probabilidad</p>
            <button onClick={openEdit} className="btn-secondary btn-sm text-xs">Editar negocio</button>
          </div>
        </div>

        {Array.isArray(deal.tags) && deal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {deal.tags.map(tag => (
              <span key={tag} className="text-xs bg-violet-100 text-violet-700 rounded-full px-2.5 py-1">{tag}</span>
            ))}
          </div>
        )}

        {/* Probability bar */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${deal.probability}%` }} />
            </div>
            <span className="text-xs text-gray-500 w-10 text-right">{deal.probability}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">Detalles</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Dueño', deal.owner_name],
                ['Moneda', deal.currency],
                ['Etapa', stage?.label || deal.stage],
                ['Cierre esperado', formatDate(deal.expected_close)],
                ['Cierre real', formatDate(deal.actual_close)],
                ['Razón de pérdida', deal.lost_reason],
                ['Creado', formatDate(deal.created_at)],
                ['Actualizado', formatDateRelative(deal.updated_at)],
              ].map(([k, v]) => v ? (
                <div key={k} className="flex gap-2">
                  <span className="text-gray-500 w-36 flex-shrink-0">{k}:</span>
                  <span className="text-gray-900">{v}</span>
                </div>
              ) : null)}
            </div>
          </div>
          <div className="space-y-5">
            {deal.description && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-2">Descripción</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{deal.description}</p>
              </div>
            )}
            {Array.isArray(deal.tags) && deal.tags.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {deal.tags.map(tag => (
                    <span key={tag} className="text-sm bg-violet-100 text-violet-700 rounded-full px-3 py-1">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'activities' && (
        <div className="space-y-2">
          {activities.length === 0 ? <p className="text-center text-gray-400 py-10">Sin actividades</p> :
            activities.map(a => (
              <div key={a.id} className="card p-4 flex gap-3">
                <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">
                  <ActivityTypeIcon type={a.type} className="w-4 h-4" />
                </span>
                <div>
                  <p className="font-medium text-gray-900">{a.subject}</p>
                  {a.description && <p className="text-sm text-gray-500 mt-1">{a.description}</p>}
                  {a.outcome && <p className="text-xs text-green-600 mt-1">Resultado: {a.outcome}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDateRelative(a.occurred_at)} · {a.owner_name}</p>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'tasks' && (
        <div className="space-y-2">
          {tasks.length === 0 ? <p className="text-center text-gray-400 py-10">Sin tareas</p> :
            tasks.map(t => {
              const status = TASK_STATUSES.find(s => s.value === t.status)
              const priority = TASK_PRIORITIES.find(p => p.value === t.priority)
              return (
                <div key={t.id} className="card p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{t.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Vence: {formatDate(t.due_date)}</p>
                  </div>
                  <span className={`badge ${priority?.color || 'badge-gray'} text-xs`}>{priority?.label || t.priority}</span>
                  <span className={`badge ${status?.color || 'badge-gray'} text-xs`}>{status?.label || t.status}</span>
                </div>
              )
            })
          }
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => { setNoteText(''); setEditNote(null); setNoteModal(true) }} className="btn-primary btn-sm">+ Nueva nota</button>
          </div>
          {notes.length === 0 ? <p className="text-center text-gray-400 py-10">Sin notas</p> :
            notes.map(n => (
              <div key={n.id} className="card p-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.content}</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-400">{n.owner_name} · {formatDateRelative(n.created_at)}</p>
                  <div className="flex gap-1">
                    <button onClick={() => { setNoteText(n.content); setEditNote(n); setNoteModal(true) }} className="btn-ghost btn-sm text-xs">Editar</button>
                    <button onClick={() => deleteNote(n.id)} className="btn-ghost btn-sm text-xs text-red-500 hover:bg-red-50">Eliminar</button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'historial' && <AuditLogPanel entityType="deal" entityId={id} />}

      <Modal isOpen={noteModal} onClose={() => setNoteModal(false)} title={editNote ? 'Editar nota' : 'Nueva nota'} size="sm">
        <textarea className="input h-32 resize-none" placeholder="Escribe tu nota..." value={noteText} onChange={e => setNoteText(e.target.value)} />
        <div className="flex gap-3 mt-4 justify-end">
          <button onClick={() => setNoteModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={saveNote} className="btn-primary">Guardar</button>
        </div>
      </Modal>

      {/* Edit deal modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Editar negocio" size="lg">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div><label className="label">Título *</label><input name="title" value={editForm.title} onChange={hf} required className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Valor</label><input name="value" type="number" min="0" step="0.01" value={editForm.value} onChange={hf} className="input" /></div>
            <div><label className="label">Probabilidad (%)</label><input name="probability" type="number" min="0" max="100" value={editForm.probability} onChange={hf} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Etapa</label>
              <select name="stage" value={editForm.stage} onChange={hf} className="input">
                {DEAL_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div><label className="label">Cierre esperado</label><input name="expected_close" type="date" value={editForm.expected_close} onChange={hf} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contacto</label>
              <select name="contact_id" value={editForm.contact_id} onChange={hf} className="input">
                <option value="">Sin contacto</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Empresa</label>
              <select name="company_id" value={editForm.company_id} onChange={hf} className="input">
                <option value="">Sin empresa</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Descripción</label><textarea name="description" value={editForm.description} onChange={hf} rows={3} className="input resize-none" /></div>
          <div>
            <label className="label">Tags (separados por coma)</label>
            <input className="input" placeholder="tag1, tag2" value={Array.isArray(editForm.tags) ? editForm.tags.join(', ') : ''}
              onChange={e => setEditForm(f => ({ ...f, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setEditModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner size="sm" /> : 'Guardar cambios'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
