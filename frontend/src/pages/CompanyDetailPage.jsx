import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { companiesAPI, notesAPI } from '../api/index'
import { formatCurrency, formatDate, formatDateRelative } from '../utils/formatters'
import { COMPANY_SIZES, ACTIVITY_TYPES, TASK_STATUSES } from '../utils/constants'
import { usePipelineStages } from '../hooks/usePipelineStages'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import { BuildingIcon, MailIcon, PhoneIcon, GlobeIcon, ActivityTypeIcon } from '../components/ui/icons'
import AuditLogPanel from '../components/ui/AuditLogPanel'

export default function CompanyDetailPage() {
  const { id } = useParams()
  const [company, setCompany] = useState(null)
  const [contacts, setContacts] = useState([])
  const [deals, setDeals] = useState([])
  const [activities, setActivities] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('contacts')
  const [noteModal, setNoteModal] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [editNote, setEditNote] = useState(null)
  const [mergeModal, setMergeModal] = useState(false)
  const [mergeSearch, setMergeSearch] = useState('')
  const [mergeCandidates, setMergeCandidates] = useState([])
  const [mergeTarget, setMergeTarget] = useState(null)
  const [merging, setMerging] = useState(false)

  useEffect(() => {
    Promise.all([
      companiesAPI.get(id),
      companiesAPI.contacts(id),
      companiesAPI.deals(id),
      companiesAPI.activities(id),
      companiesAPI.notes(id),
    ]).then(([c, ct, d, a, n]) => {
      setCompany(c.data.data)
      setContacts(ct.data.data)
      setDeals(d.data.data)
      setActivities(a.data.data)
      setNotes(n.data.data)
    }).catch(() => toast.error('Error cargando empresa'))
    .finally(() => setLoading(false))
  }, [id])

  const saveNote = async () => {
    if (!noteText.trim()) return
    try {
      if (editNote) {
        const r = await notesAPI.update(editNote.id, { content: noteText })
        setNotes(ns => ns.map(n => n.id === editNote.id ? r.data.data : n))
      } else {
        const r = await notesAPI.create({ content: noteText, company_id: parseInt(id) })
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

  useEffect(() => {
    if (!mergeSearch.trim()) { setMergeCandidates([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await companiesAPI.list({ search: mergeSearch, limit: 10 })
        setMergeCandidates(res.data.data.companies.filter(c => String(c.id) !== id))
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [mergeSearch, id])

  const handleMerge = async () => {
    if (!mergeTarget) return
    setMerging(true)
    try {
      const res = await companiesAPI.merge(parseInt(id), mergeTarget.id)
      toast.success(`Fusionado con ${mergeTarget.name}`)
      setMergeModal(false); setMergeTarget(null); setMergeSearch('')
      setCompany(res.data.data)
    } catch (err) { toast.error(err.response?.data?.message || 'Error fusionando') }
    finally { setMerging(false) }
  }

  const { stages: DEAL_STAGES } = usePipelineStages()

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!company) return <div className="text-center py-20 text-gray-500">Empresa no encontrada</div>

  const stageBadge = (stage) => {
    const s = DEAL_STAGES.find(d => d.value === stage)
    return <span className={`badge ${s?.color || 'badge-gray'}`}>{s?.label || stage}</span>
  }

  return (
    <div className="space-y-5">
      <Link to="/companies" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">← Volver a empresas</Link>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 text-purple-500">
            <BuildingIcon className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <p className="text-gray-500">{company.industry} · {COMPANY_SIZES.find(s => s.value === company.size)?.label || company.size || '—'}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              {company.email && (
                <a href={`mailto:${company.email}`} className="inline-flex items-center gap-1.5 text-primary-600 hover:underline">
                  <MailIcon className="w-3.5 h-3.5" />{company.email}
                </a>
              )}
              {company.phone && (
                <span className="inline-flex items-center gap-1.5 text-gray-600">
                  <PhoneIcon className="w-3.5 h-3.5" />{company.phone}
                </span>
              )}
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary-600 hover:underline">
                  <GlobeIcon className="w-3.5 h-3.5" />Sitio web
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-4">
              <div className="text-center"><p className="text-2xl font-bold text-gray-900">{company.contacts_count}</p><p className="text-xs text-gray-500">Contactos</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-gray-900">{company.deals_count}</p><p className="text-xs text-gray-500">Negocios</p></div>
              {company.annual_revenue && <div className="text-center"><p className="text-lg font-bold text-green-600">{formatCurrency(company.annual_revenue)}</p><p className="text-xs text-gray-500">Ingresos</p></div>}
            </div>
            <button onClick={() => setMergeModal(true)} className="btn-secondary btn-sm text-xs">Fusionar con...</button>
          </div>
        </div>
        {Array.isArray(company.tags) && company.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {company.tags.map(tag => (
              <span key={tag} className="text-xs bg-purple-100 text-purple-700 rounded-full px-2.5 py-1">{tag}</span>
            ))}
          </div>
        )}
        {company.description && <p className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-100">{company.description}</p>}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 -mb-px">
          {[
            ['contacts', `Contactos (${contacts.length})`],
            ['deals', `Negocios (${deals.length})`],
            ['activities', `Actividades (${activities.length})`],
            ['notes', `Notas (${notes.length})`],
            ['historial', 'Historial'],
          ].map(([tid, label]) => (
            <button key={tid} onClick={() => setTab(tid)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === tid ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'contacts' && (
        <div className="space-y-2">
          {contacts.length === 0 ? <p className="text-center text-gray-400 py-10">Sin contactos</p> :
            contacts.map(c => (
              <Link key={c.id} to={`/contacts/${c.id}`} className="card p-4 flex items-center gap-3 hover:shadow-sm block">
                <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" />
                <div className="flex-1"><p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p><p className="text-sm text-gray-500">{c.job_title || '—'}</p></div>
                <span className="text-sm text-gray-400">{c.email}</span>
              </Link>
            ))
          }
        </div>
      )}

      {tab === 'deals' && (
        <div className="space-y-2">
          {deals.length === 0 ? <p className="text-center text-gray-400 py-10">Sin negocios</p> :
            deals.map(d => (
              <Link key={d.id} to={`/deals/${d.id}`} className="card p-4 flex items-center gap-3 hover:shadow-sm block">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{d.title}</p>
                  <p className="text-sm text-gray-500">Cierre: {formatDate(d.expected_close)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(d.value)}</p>
                  {stageBadge(d.stage)}
                </div>
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

      {tab === 'historial' && <AuditLogPanel entityType="company" entityId={id} />}

      <Modal isOpen={noteModal} onClose={() => setNoteModal(false)} title={editNote ? 'Editar nota' : 'Nueva nota'} size="sm">
        <textarea className="input h-32 resize-none" placeholder="Escribe tu nota..." value={noteText} onChange={e => setNoteText(e.target.value)} />
        <div className="flex gap-3 mt-4 justify-end">
          <button onClick={() => setNoteModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={saveNote} className="btn-primary">Guardar</button>
        </div>
      </Modal>

      {/* Merge modal */}
      <Modal isOpen={mergeModal} onClose={() => { setMergeModal(false); setMergeTarget(null); setMergeSearch('') }} title="Fusionar empresa" size="md">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>{company.name}</strong> se mantendrá. Los contactos, negocios y datos de la empresa seleccionada se fusionarán y esa empresa será eliminada.
          </div>
          <div>
            <label className="label">Buscar empresa a fusionar</label>
            <input className="input" placeholder="Nombre de empresa..." value={mergeSearch} onChange={e => { setMergeSearch(e.target.value); setMergeTarget(null) }} />
          </div>
          {mergeCandidates.length > 0 && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {mergeCandidates.map(c => (
                <button key={c.id} onClick={() => { setMergeTarget(c); setMergeSearch(c.name) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${mergeTarget?.id === c.id ? 'bg-primary-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.industry || '—'} · {c.contacts_count} contactos</p>
                  </div>
                  {mergeTarget?.id === c.id && <span className="text-primary-600 text-xs font-medium">Seleccionada</span>}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => { setMergeModal(false); setMergeTarget(null); setMergeSearch('') }} className="btn-secondary">Cancelar</button>
            <button onClick={handleMerge} disabled={!mergeTarget || merging} className="btn-primary">
              {merging ? <Spinner size="sm" /> : 'Fusionar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
