import { useState, useEffect, useCallback } from 'react'
import { pipelineAPI } from '../api/index'
import { usePipelineStages } from '../hooks/usePipelineStages'
import toast from 'react-hot-toast'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Spinner from '../components/ui/Spinner'

const initForm = { name: '', value: '', probability: 25, color: 'bg-blue-100 text-blue-800', dot_color: 'bg-blue-500' }

const COLOR_PRESETS = [
  { label: 'Gris',    color: 'bg-gray-100 text-gray-800',    dot: 'bg-gray-400'   },
  { label: 'Azul',    color: 'bg-blue-100 text-blue-800',    dot: 'bg-blue-500'   },
  { label: 'Amarillo',color: 'bg-yellow-100 text-yellow-800',dot: 'bg-yellow-500' },
  { label: 'Naranja', color: 'bg-orange-100 text-orange-800',dot: 'bg-orange-500' },
  { label: 'Verde',   color: 'bg-green-100 text-green-800',  dot: 'bg-green-500'  },
  { label: 'Rojo',    color: 'bg-red-100 text-red-800',      dot: 'bg-red-500'    },
  { label: 'Violeta', color: 'bg-violet-100 text-violet-800',dot: 'bg-violet-500' },
  { label: 'Ámbar',   color: 'bg-amber-100 text-amber-800',  dot: 'bg-amber-500'  },
]

export default function PipelineSettingsPage() {
  const [stages, setStages]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(initForm)
  const [saving, setSaving]   = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { invalidate } = usePipelineStages()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await pipelineAPI.list(); setStages(r.data.data) }
    catch { toast.error('Error cargando etapas') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(initForm); setEditing(null); setModal(true) }
  const openEdit = (s) => {
    setForm({ name: s.name, value: s.value, probability: s.probability, color: s.color, dot_color: s.dot_color })
    setEditing(s); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await pipelineAPI.update(editing.id, form); toast.success('Etapa actualizada') }
      else { await pipelineAPI.create(form); toast.success('Etapa creada') }
      invalidate(); setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await pipelineAPI.delete(deleteId); toast.success('Etapa eliminada'); invalidate(); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Error eliminando') }
  }

  const toggleActive = async (s) => {
    try {
      await pipelineAPI.update(s.id, { ...s, is_active: !s.is_active })
      invalidate(); load()
    } catch { toast.error('Error') }
  }

  const h = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Pipeline de ventas</h1>
          <p className="text-sm text-gray-500">Configura las etapas del pipeline de negocios</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva etapa
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="space-y-2">
          {stages.map((s, i) => (
            <div key={s.id} className={`card p-4 flex items-center gap-4 ${!s.is_active ? 'opacity-60' : ''}`}>
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${s.dot_color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900">{s.name}</p>
                  <span className={`badge text-xs ${s.color}`}>{s.value}</span>
                  {s.is_default && <span className="badge badge-gray text-xs">Predeterminada</span>}
                  {!s.is_active && <span className="badge badge-gray text-xs">Inactiva</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Probabilidad: {s.probability}% · Orden: {s.sort_order}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(s)} className="btn-ghost btn-sm text-xs">Editar</button>
                <button onClick={() => toggleActive(s)} className="btn-ghost btn-sm text-xs">
                  {s.is_active ? 'Desactivar' : 'Activar'}
                </button>
                {!s.is_default && (
                  <button onClick={() => setDeleteId(s.id)} className="btn-ghost btn-sm text-xs text-red-500">Eliminar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Editar etapa' : 'Nueva etapa'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nombre *</label><input name="name" value={form.name} onChange={h} required className="input" placeholder="ej. Propuesta enviada" /></div>
          {!editing && (
            <div>
              <label className="label">Valor (identificador) *</label>
              <input name="value" value={form.value} onChange={h} required className="input font-mono" placeholder="ej. proposal_sent"
                pattern="[a-z0-9_]+" title="Solo letras minúsculas, números y guión bajo" />
              <p className="text-xs text-gray-400 mt-1">Solo letras minúsculas, números y _</p>
            </div>
          )}
          <div>
            <label className="label">Probabilidad (%)</label>
            <input name="probability" type="number" min="0" max="100" value={form.probability} onChange={h} className="input" />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map(p => (
                <button key={p.color} type="button"
                  onClick={() => setForm(f => ({ ...f, color: p.color, dot_color: p.dot }))}
                  className={`rounded-lg px-3 py-2 text-xs font-medium border-2 transition-all ${p.color} ${form.color === p.color ? 'border-primary-500 scale-105' : 'border-transparent'}`}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${p.dot}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner size="sm" /> : (editing ? 'Guardar' : 'Crear etapa')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar etapa" message="¿Estás seguro? Solo se puede eliminar si no tiene negocios activos." />
    </div>
  )
}
