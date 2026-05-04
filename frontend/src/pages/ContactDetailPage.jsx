import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { contactsAPI, notesAPI } from '../api/index'
import { formatDate, formatDateRelative } from '../utils/formatters'
import { DEAL_STAGES, ACTIVITY_TYPES, TASK_STATUSES } from '../utils/constants'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import { MailIcon, PhoneIcon, LinkIcon, ActivityTypeIcon } from '../components/ui/icons'

export default function ContactDetailPage() {
  const { id } = useParams()
  const [contact, setContact] = useState(null)
  const [deals, setDeals] = useState([])
  const [activities, setActivities] = useState([])
  const [tasks, setTasks] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [noteModal, setNoteModal] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [editNote, setEditNote] = useState(null)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    Promise.all([
      contactsAPI.get(id),
      contactsAPI.deals(id),
      contactsAPI.activities(id),
      contactsAPI.tasks(id),
      contactsAPI.notes(id),
    ]).then(([c, d, a, t, n]) => {
      setContact(c.data.data)
      setDeals(d.data.data)
      setActivities(a.data.data)
      setTasks(t.data.data)
      setNotes(n.data.data)
    }).catch(() => toast.error('Error cargando contacto'))
    .finally(() => setLoading(false))
  }, [id])

  const saveNote = async () => {
    if (!noteText.trim()) return
    try {
      if (editNote) {
        const r = await notesAPI.update(editNote.id, { content: noteText })
        setNotes(ns => ns.map(n => n.id === editNote.id ? r.data.data : n))
      } else {
        const r = await notesAPI.create({ content: noteText, contact_id: parseInt(id) })
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
  if (!contact) return <div className="text-center py-20 text-gray-500">Contacto no encontrado</div>

  const stageBadge = (stage) => {
    const s = DEAL_STAGES.find(d => d.value === stage)
    return <span className={`badge ${s?.color || 'badge-gray'}`}>{s?.label || stage}</span>
  }

  const tabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'deals', label: `Negocios (${deals.length})` },
    { id: 'activities', label: `Actividades (${activities.length})` },
    { id: 'tasks', label: `Tareas (${tasks.length})` },
    { id: 'notes', label: `Notas (${notes.length})` },
  ]

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link to="/contacts" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        ← Volver a contactos
      </Link>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <Avatar name={`${contact.first_name} ${contact.last_name}`} size="lg" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{contact.first_name} {contact.last_name}</h1>
            <p className="text-gray-500">{contact.job_title || '—'} {contact.company_name ? `· ${contact.company_name}` : ''}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline">
                  <MailIcon className="w-3.5 h-3.5" />{contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline">
                  <PhoneIcon className="w-3.5 h-3.5" />{contact.phone}
                </a>
              )}
              {contact.linkedin_url && (
                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline">
                  <LinkIcon className="w-3.5 h-3.5" />LinkedIn
                </a>
              )}
            </div>
          </div>
          <span className={`badge ${contact.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{contact.status === 'active' ? 'Activo' : 'Inactivo'}</span>
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

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">Información</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Empresa', contact.company_name],
                ['Departamento', contact.department],
                ['Móvil', contact.mobile],
                ['Origen', contact.source],
                ['Ciudad', contact.city],
                ['País', contact.country],
                ['Creado', formatDate(contact.created_at)],
                ['Actualizado', formatDateRelative(contact.updated_at)],
              ].map(([k, v]) => v ? (
                <div key={k} className="flex gap-2"><span className="text-gray-500 w-28 flex-shrink-0">{k}:</span><span className="text-gray-900">{v}</span></div>
              ) : null)}
            </div>
          </div>
          {contact.notes && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Notas rápidas</h3>
              <p className="text-sm text-gray-600">{contact.notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'deals' && (
        <div className="space-y-3">
          {deals.length === 0 ? <p className="text-center text-gray-400 py-10">Sin negocios asociados</p> :
            deals.map(d => (
              <Link key={d.id} to="/deals" className="card p-4 flex items-center gap-3 hover:shadow-sm block">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{d.title}</p>
                  <p className="text-sm text-gray-500">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: d.currency || 'USD' }).format(d.value)}</p>
                </div>
                {stageBadge(d.stage)}
              </Link>
            ))
          }
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
            tasks.map(t => (
              <div key={t.id} className="card p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-500">Vence: {formatDate(t.due_date)}</p>
                </div>
                <span className={`badge ${TASK_STATUSES.find(s => s.value === t.status)?.color || 'badge-gray'}`}>{t.status}</span>
              </div>
            ))
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

      {/* Note modal */}
      <Modal isOpen={noteModal} onClose={() => setNoteModal(false)} title={editNote ? 'Editar nota' : 'Nueva nota'} size="sm">
        <textarea className="input h-32 resize-none" placeholder="Escribe tu nota..." value={noteText} onChange={e => setNoteText(e.target.value)} />
        <div className="flex gap-3 mt-4 justify-end">
          <button onClick={() => setNoteModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={saveNote} className="btn-primary">Guardar</button>
        </div>
      </Modal>
    </div>
  )
}
