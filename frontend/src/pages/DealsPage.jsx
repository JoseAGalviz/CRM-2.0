import { useState, useEffect } from 'react'
import { dealsAPI, contactsAPI, companiesAPI } from '../api/index'
import { formatCurrency, formatDate } from '../utils/formatters'
import { DEAL_STAGES } from '../utils/constants'
import toast from 'react-hot-toast'
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Spinner from '../components/ui/Spinner'

const initForm = { title: '', value: '', currency: 'USD', stage: 'lead', probability: '', expected_close: '', contact_id: '', company_id: '', description: '' }

function DealCard({ deal, onClick, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      {...attributes} {...listeners}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 flex-1">{deal.title}</p>
        <div className="flex gap-1 flex-shrink-0 touch-none" onPointerDown={e => e.stopPropagation()}>
          <button onClick={(e) => { e.stopPropagation(); onClick(deal) }} className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(deal.id) }} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
      <p className="text-base font-bold text-primary-600 mt-1.5">{formatCurrency(deal.value, deal.currency)}</p>
      {deal.contact_name && <p className="text-xs text-gray-500 mt-1">👤 {deal.contact_name}</p>}
      {deal.company_name && <p className="text-xs text-gray-500">🏢 {deal.company_name}</p>}
      {deal.expected_close && <p className="text-xs text-gray-400 mt-1">📅 {formatDate(deal.expected_close)}</p>}
      <div className="mt-2 flex items-center gap-1">
        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
          <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${deal.probability}%` }} />
        </div>
        <span className="text-xs text-gray-400">{deal.probability}%</span>
      </div>
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = async () => {
    setLoading(true)
    try {
      const res = await dealsAPI.list({ limit: 200 })
      setDeals(res.data.data.deals)
    } catch { toast.error('Error cargando negocios') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    contactsAPI.list({ limit: 200 }).then(r => setContacts(r.data.data.contacts))
    companiesAPI.list({ limit: 200 }).then(r => setCompanies(r.data.data.companies))
  }, [])

  const dealsForStage = (stage) => deals.filter(d => d.stage === stage)
  const stageTotal = (stage) => dealsForStage(stage).reduce((s, d) => s + d.value, 0)

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
    setForm({ ...initForm, ...deal, value: deal.value || '', probability: deal.probability || '', expected_close: deal.expected_close ? deal.expected_close.slice(0, 10) : '', contact_id: deal.contact_id || '', company_id: deal.company_id || '' })
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

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const activeCard = activeId ? deals.find(d => d.id === activeId) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{deals.length} negocio{deals.length !== 1 ? 's' : ''} · Pipeline: {formatCurrency(deals.filter(d => !['won','lost'].includes(d.stage)).reduce((s,d) => s+d.value, 0))}</p>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo negocio
        </button>
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={({ active }) => setActiveId(active.id)} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map(stage => {
            const stageDeals = dealsForStage(stage.value)
            return (
              <div key={stage.value} id={stage.value} className="flex-shrink-0 w-64 md:w-72">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                    <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
                    <span className="badge badge-gray text-xs">{stageDeals.length}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{formatCurrency(stageTotal(stage.value))}</span>
                </div>

                {/* Droppable area */}
                <SortableContext items={stageDeals.map(d => d.id)} strategy={verticalListSortingStrategy} id={stage.value}>
                  <div className={`min-h-32 rounded-xl p-2 space-y-2 transition-colors ${activeId ? 'bg-gray-100 border-2 border-dashed border-gray-300' : 'bg-gray-50'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {}}>
                    {stageDeals.map(deal => (
                      <DealCard key={deal.id} deal={deal} onClick={openEdit} onDelete={setDeleteId} />
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
      </DndContext>

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
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner size="sm" /> : (editing ? 'Guardar' : 'Crear negocio')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar negocio" message="¿Estás seguro de eliminar este negocio?" />
    </div>
  )
}
