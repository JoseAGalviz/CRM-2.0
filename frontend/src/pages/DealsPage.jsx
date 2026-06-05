import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { dealsAPI, contactsAPI, companiesAPI, usersAPI } from '../api/index'
import { formatCurrency, formatDate } from '../utils/formatters'
import { exportToCSV, DEAL_COLUMNS } from '../utils/export'
import { getDealHealth } from '../utils/dealHealth'
import { usePipelineStages } from '../hooks/usePipelineStages'
import toast from 'react-hot-toast'
import { UserIcon, BuildingIcon, CalendarIcon } from '../components/ui/icons'
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Spinner from '../components/ui/Spinner'

const initForm = { title: '', value: '', currency: 'USD', stage: 'lead', probability: '', expected_close: '', contact_id: '', company_id: '', description: '', tags: [] }

function DealCard({ deal, onClick, onDelete, selectionMode, isSelected, onToggleSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    disabled: selectionMode,
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style}
      className={`bg-white rounded-xl border p-3 shadow-sm transition-all ${selectionMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing hover:shadow-md'} ${isSelected ? 'border-primary-400 ring-2 ring-primary-300 bg-primary-50' : 'border-gray-200'}`}
      {...(!selectionMode ? { ...attributes, ...listeners } : {})}
      onClick={selectionMode ? () => onToggleSelect(deal.id) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        {selectionMode ? (
          <div className="flex items-center gap-2 flex-1">
            <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(deal.id)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 flex-shrink-0" onClick={e => e.stopPropagation()} />
            <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{deal.title}</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 flex-1">{deal.title}</p>
            <div className="flex gap-1 flex-shrink-0 touch-none" onPointerDown={e => e.stopPropagation()}>
              <Link to={`/deals/${deal.id}`} onClick={e => e.stopPropagation()} className="p-1 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50" title="Ver detalle">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </Link>
              <button onClick={(e) => { e.stopPropagation(); onClick(deal) }} className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50" title="Editar">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(deal.id) }} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" title="Eliminar">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </>
        )}
      </div>
      <p className="text-base font-bold text-primary-600 mt-1.5">{formatCurrency(deal.value, deal.currency)}</p>
      {deal.contact_name && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <UserIcon className="w-3 h-3 flex-shrink-0" />{deal.contact_name}
        </p>
      )}
      {deal.company_name && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <BuildingIcon className="w-3 h-3 flex-shrink-0" />{deal.company_name}
        </p>
      )}
      {deal.expected_close && (
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <CalendarIcon className="w-3 h-3 flex-shrink-0" />{formatDate(deal.expected_close)}
        </p>
      )}
      <div className="mt-2 flex items-center gap-1">
        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
          <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${deal.probability}%` }} />
        </div>
        <span className="text-xs text-gray-400">{deal.probability}%</span>
      </div>
      {Array.isArray(deal.tags) && deal.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {deal.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">{tag}</span>
          ))}
        </div>
      )}
      {(() => {
        const h = getDealHealth(deal)
        return (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${h.bg}`} title={`Health: ${h.score}`} />
            <span className={`text-xs font-medium ${h.color}`}>{h.label} · {h.score}</span>
          </div>
        )
      })()}
    </div>
  )
}

export default function DealsPage() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState([])
  const [companies, setCompanies] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [users, setUsers] = useState([])
  const [filters, setFilters] = useState({ owner_id: '', tag: '', value_min: '', value_max: '', close_before: '' })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedDeals, setSelectedDeals] = useState(new Set())
  const [bulkConfirmDeals, setBulkConfirmDeals] = useState(false)
  const [bulkStage, setBulkStage] = useState('')
  const [view, setView] = useState('kanban')
  const { stages: DEAL_STAGES } = usePipelineStages()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dealsAPI.list({ limit: 200 })
      setDeals(res.data.data.deals)
    } catch { toast.error('Error cargando negocios') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    contactsAPI.list({ limit: 200 }).then(r => setContacts(r.data.data.contacts))
    companiesAPI.list({ limit: 200 }).then(r => setCompanies(r.data.data.companies))
    usersAPI.directory().then(r => setUsers(r.data.data))
  }, [load])

  const filteredDeals = useMemo(() => {
    return deals.filter(d => {
      if (filters.owner_id && String(d.owner_id) !== filters.owner_id) return false
      if (filters.tag && !(Array.isArray(d.tags) && d.tags.some(t => t.toLowerCase().includes(filters.tag.toLowerCase())))) return false
      if (filters.value_min && d.value < Number(filters.value_min)) return false
      if (filters.value_max && d.value > Number(filters.value_max)) return false
      if (filters.close_before && d.expected_close && d.expected_close > filters.close_before) return false
      return true
    })
  }, [deals, filters])

  const dealsByStage = useMemo(() => {
    return filteredDeals.reduce((acc, d) => {
      if (!acc[d.stage]) acc[d.stage] = []
      acc[d.stage].push(d)
      return acc
    }, {})
  }, [filteredDeals])

  const stageTotals = useMemo(() => {
    return Object.fromEntries(
      Object.entries(dealsByStage).map(([stage, stageDeals]) => [stage, stageDeals.reduce((s, d) => s + d.value, 0)])
    )
  }, [dealsByStage])

  const hf = (key) => (e) => setFilters(f => ({ ...f, [key]: e.target.value }))

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const draggedDeal = deals.find(d => d.id === active.id)
    const targetStage = over.id

    if (!draggedDeal || draggedDeal.stage === targetStage) return
    if (!DEAL_STAGES.find(s => s.value === targetStage)) return

    setDeals(prev => prev.map(d => d.id === active.id ? { ...d, stage: targetStage } : d))
    try {
      await dealsAPI.updateStage(active.id, targetStage)
    } catch {
      toast.error('Error actualizando etapa')
      load()
    }
  }

  const openCreate = () => { setForm(initForm); setEditing(null); setModal(true) }
  const openEdit = (deal) => {
    setForm({ ...initForm, ...deal, value: deal.value || '', probability: deal.probability || '', expected_close: deal.expected_close ? deal.expected_close.slice(0, 10) : '', contact_id: deal.contact_id || '', company_id: deal.company_id || '', tags: Array.isArray(deal.tags) ? deal.tags : [] })
    setEditing(deal); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await dealsAPI.update(editing.id, form); toast.success('Negocio actualizado') }
      else { await dealsAPI.create(form); toast.success('Negocio creado') }
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Error guardando') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await dealsAPI.delete(deleteId); toast.success('Negocio eliminado'); setDeals(d => d.filter(x => x.id !== deleteId)) }
    catch { toast.error('Error eliminando') }
  }

  const h = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const toggleDealSelect = (id) => setSelectedDeals(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const exitSelectionMode = () => { setSelectionMode(false); setSelectedDeals(new Set()); setActiveId(null) }
  const enterSelectionMode = () => { setSelectionMode(true); setActiveId(null) }

  const handleBulkDeleteDeals = async () => {
    try {
      await dealsAPI.bulkDelete([...selectedDeals])
      toast.success(`${selectedDeals.size} negocios eliminados`)
      exitSelectionMode(); setBulkConfirmDeals(false); load()
    } catch { toast.error('Error eliminando') }
  }

  const handleBulkStage = async () => {
    if (!bulkStage) return
    try {
      await Promise.all([...selectedDeals].map(id => dealsAPI.updateStage(id, bulkStage)))
      toast.success(`${selectedDeals.size} negocios movidos a ${DEAL_STAGES.find(s => s.value === bulkStage)?.label}`)
      exitSelectionMode(); setBulkStage(''); load()
    } catch { toast.error('Error actualizando etapa') }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const activeCard = activeId ? deals.find(d => d.id === activeId) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filteredDeals.length}{activeFilterCount > 0 ? ` de ${deals.length}` : ''} negocio{deals.length !== 1 ? 's' : ''} · Pipeline: {formatCurrency(filteredDeals.filter(d => !['won','lost'].includes(d.stage)).reduce((s,d) => s+d.value, 0))}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className={`btn-secondary text-sm ${activeFilterCount > 0 ? 'border-primary-400 text-primary-600' : ''}`}
          >
            Filtros {activeFilterCount > 0 && <span className="ml-1 inline-flex items-center justify-center w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full">{activeFilterCount}</span>}
          </button>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => { setView('kanban'); exitSelectionMode() }} className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'kanban' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Kanban</button>
            <button onClick={() => { setView('list'); exitSelectionMode() }} className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Lista</button>
          </div>
          {view === 'kanban' && (
            <button onClick={() => selectionMode ? exitSelectionMode() : enterSelectionMode()} className={`btn-secondary text-sm ${selectionMode ? 'border-primary-400 text-primary-600' : ''}`}>
              {selectionMode ? `✓ ${selectedDeals.size} sel.` : 'Seleccionar'}
            </button>
          )}
          <button onClick={() => exportToCSV(filteredDeals, 'negocios', DEAL_COLUMNS)} className="btn-secondary text-sm">
            ↓ CSV
          </button>
          <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo negocio
        </button>
        </div>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="card p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="label">Responsable</label>
              <select className="input" value={filters.owner_id} onChange={hf('owner_id')}>
                <option value="">Todos</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tag</label>
              <input className="input" placeholder="Buscar tag..." value={filters.tag} onChange={hf('tag')} />
            </div>
            <div>
              <label className="label">Valor mín (USD)</label>
              <input className="input" type="number" min="0" placeholder="0" value={filters.value_min} onChange={hf('value_min')} />
            </div>
            <div>
              <label className="label">Valor máx (USD)</label>
              <input className="input" type="number" min="0" placeholder="∞" value={filters.value_max} onChange={hf('value_max')} />
            </div>
            <div>
              <label className="label">Cierre antes de</label>
              <input className="input" type="date" value={filters.close_before} onChange={hf('close_before')} />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => setFilters({ owner_id: '', tag: '', value_min: '', value_max: '', close_before: '' })} className="mt-3 text-xs text-red-500 hover:text-red-700">
              × Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Deals bulk bar */}
      {selectionMode && selectedDeals.size > 0 && (
        <div className="card p-3 flex flex-wrap items-center gap-3 bg-primary-50 border border-primary-200">
          <span className="text-sm font-medium text-primary-800">{selectedDeals.size} negocio{selectedDeals.size !== 1 ? 's' : ''} seleccionado{selectedDeals.size !== 1 ? 's' : ''}</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <select value={bulkStage} onChange={e => setBulkStage(e.target.value)} className="input text-sm h-8 py-1">
              <option value="">Mover a etapa...</option>
              {DEAL_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={handleBulkStage} disabled={!bulkStage} className="btn-secondary btn-sm text-sm">Mover</button>
            <button onClick={() => setBulkConfirmDeals(true)} className="btn-sm text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg px-3 py-1.5">
              Eliminar {selectedDeals.size}
            </button>
            <button onClick={exitSelectionMode} className="btn-ghost btn-sm text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Kanban */}
      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="card overflow-hidden">
          {filteredDeals.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Sin negocios</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr>
                  <th className="w-8">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600"
                      checked={filteredDeals.length > 0 && selectedDeals.size === filteredDeals.length}
                      onChange={() => setSelectedDeals(s => s.size === filteredDeals.length ? new Set() : new Set(filteredDeals.map(d => d.id)))} />
                  </th>
                  <th>Título</th><th>Etapa</th><th>Valor</th><th>Contacto</th><th>Empresa</th><th>Cierre</th><th>Prob.</th><th></th>
                </tr></thead>
                <tbody>
                  {filteredDeals.map(d => {
                    const stage = DEAL_STAGES.find(s => s.value === d.stage)
                    return (
                      <tr key={d.id} className={selectedDeals.has(d.id) ? 'bg-primary-50' : ''}>
                        <td onClick={e => { e.stopPropagation(); toggleDealSelect(d.id) }}>
                          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600"
                            checked={selectedDeals.has(d.id)} onChange={() => toggleDealSelect(d.id)} />
                        </td>
                        <td><Link to={`/deals/${d.id}`} className="font-medium text-primary-600 hover:text-primary-700">{d.title}</Link></td>
                        <td><span className={`badge ${stage?.color || 'badge-gray'}`}>{stage?.label || d.stage}</span></td>
                        <td className="font-semibold text-gray-900">{formatCurrency(d.value, d.currency)}</td>
                        <td className="text-gray-500 text-sm">{d.contact_name || '—'}</td>
                        <td className="text-gray-500 text-sm">{d.company_name || '—'}</td>
                        <td className="text-gray-500 text-sm">{formatDate(d.expected_close)}</td>
                        <td className="text-gray-500 text-sm">{d.probability}%</td>
                        <td>
                          <div className="flex gap-1">
                            <Link to={`/deals/${d.id}`} className="btn-ghost btn-sm text-xs">Ver</Link>
                            <button onClick={() => openEdit(d)} className="btn-ghost btn-sm text-xs">Editar</button>
                            <button onClick={() => setDeleteId(d.id)} className="btn-ghost btn-sm text-xs text-red-500">Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── KANBAN VIEW ── */}
      {view === 'kanban' && <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={({ active }) => setActiveId(active.id)} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map(stage => {
            const stageDeals = dealsByStage[stage.value] || []
            return (
              <div key={stage.value} id={stage.value} className="flex-shrink-0 w-64 md:w-72">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                    <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
                    <span className="badge badge-gray text-xs">{stageDeals.length}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{formatCurrency(stageTotals[stage.value] || 0)}</span>
                </div>

                {/* Droppable area */}
                <SortableContext items={stageDeals.map(d => d.id)} strategy={verticalListSortingStrategy} id={stage.value}>
                  <div className={`min-h-32 rounded-xl p-2 space-y-2 transition-colors ${activeId ? 'bg-gray-100 border-2 border-dashed border-gray-300' : 'bg-gray-50'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {}}>
                    {stageDeals.map(deal => (
                      <DealCard key={deal.id} deal={deal} onClick={openEdit} onDelete={setDeleteId}
                        selectionMode={selectionMode} isSelected={selectedDeals.has(deal.id)} onToggleSelect={toggleDealSelect} />
                    ))}
                    {stageDeals.length === 0 && (
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
              <p className="text-base font-bold text-primary-600">{formatCurrency(activeCard.value)}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>}

      {/* Form Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Editar negocio' : 'Nuevo negocio'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Título *</label><input name="title" value={form.title} onChange={h} required className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Valor (USD)</label><input name="value" type="number" min="0" step="0.01" value={form.value} onChange={h} className="input" /></div>
            <div><label className="label">Probabilidad (%)</label><input name="probability" type="number" min="0" max="100" value={form.probability} onChange={h} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Etapa</label>
              <select name="stage" value={form.stage} onChange={h} className="input">
                {DEAL_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div><label className="label">Cierre esperado</label><input name="expected_close" type="date" value={form.expected_close} onChange={h} className="input" /></div>
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
              <label className="label">Empresa</label>
              <select name="company_id" value={form.company_id} onChange={h} className="input">
                <option value="">Sin empresa</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Descripción</label><textarea name="description" value={form.description} onChange={h} rows={3} className="input resize-none" /></div>
          <div>
            <label className="label">Tags (separados por coma)</label>
            <input
              className="input"
              placeholder="tag1, tag2, tag3"
              value={Array.isArray(form.tags) ? form.tags.join(', ') : ''}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner size="sm" /> : (editing ? 'Guardar' : 'Crear negocio')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar negocio" message="¿Estás seguro de eliminar este negocio?" />

      <ConfirmDialog isOpen={bulkConfirmDeals} onClose={() => setBulkConfirmDeals(false)} onConfirm={handleBulkDeleteDeals}
        title={`Eliminar ${selectedDeals.size} negocios`} message={`¿Estás seguro? Se eliminarán ${selectedDeals.size} negocios permanentemente.`} />
    </div>
  )
}
