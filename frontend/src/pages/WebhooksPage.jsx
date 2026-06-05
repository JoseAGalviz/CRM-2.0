import { useState, useEffect, useCallback } from 'react'
import { webhooksAPI } from '../api/index'
import toast from 'react-hot-toast'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Spinner from '../components/ui/Spinner'

const ALL_EVENTS = [
  { group: 'Contactos', events: ['contact.created', 'contact.updated', 'contact.deleted'] },
  { group: 'Negocios', events: ['deal.created', 'deal.updated', 'deal.stage_changed', 'deal.won', 'deal.lost'] },
  { group: 'Tareas', events: ['task.created', 'task.completed'] },
  { group: 'Empresas', events: ['company.created', 'company.updated', 'company.deleted'] },
]

const initForm = { name: '', url: '', events: [], secret: '', is_active: true }

function StatusDot({ active }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
}

export default function WebhooksPage() {
  const [hooks, setHooks]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(initForm)
  const [saving, setSaving]     = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deliveries, setDeliveries] = useState(null)
  const [deliveriesHook, setDeliveriesHook] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await webhooksAPI.list()
      setHooks(res.data.data)
    } catch { toast.error('Error cargando webhooks') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(initForm); setEditing(null); setModal(true) }
  const openEdit = (h) => { setForm({ name: h.name, url: h.url, events: h.events, secret: h.secret || '', is_active: !!h.is_active }); setEditing(h); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.events.length === 0) { toast.error('Selecciona al menos un evento'); return }
    setSaving(true)
    try {
      if (editing) { await webhooksAPI.update(editing.id, form); toast.success('Webhook actualizado') }
      else { await webhooksAPI.create(form); toast.success('Webhook creado') }
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await webhooksAPI.delete(deleteId); toast.success('Webhook eliminado'); load() }
    catch { toast.error('Error eliminando') }
  }

  const handleToggle = async (h) => {
    try {
      await webhooksAPI.toggle(h.id)
      toast.success(h.is_active ? 'Webhook desactivado' : 'Webhook activado')
      load()
    } catch { toast.error('Error') }
  }

  const handleTest = async (h) => {
    try {
      await webhooksAPI.test(h.id)
      toast.success('Test enviado')
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
  }

  const openDeliveries = async (h) => {
    setDeliveriesHook(h)
    try {
      const res = await webhooksAPI.deliveries(h.id, 20)
      setDeliveries(res.data.data)
    } catch { toast.error('Error cargando entregas') }
  }

  const toggleEvent = (ev) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev]
    }))
  }

  const toggleGroup = (groupEvents) => {
    const allSelected = groupEvents.every(ev => form.events.includes(ev))
    setForm(f => ({
      ...f,
      events: allSelected
        ? f.events.filter(ev => !groupEvents.includes(ev))
        : [...new Set([...f.events, ...groupEvents])]
    }))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500">Notificaciones HTTP hacia sistemas externos en tiempo real</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo webhook
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : hooks.length === 0 ? (
        <div className="card p-10 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="font-medium text-gray-700 mb-1">Sin webhooks configurados</p>
          <p className="text-sm text-gray-500 mb-4">Conecta el CRM con Zapier, n8n, Slack u otros sistemas</p>
          <button onClick={openCreate} className="btn-primary">Crear primer webhook</button>
        </div>
      ) : (
        <div className="space-y-3">
          {hooks.map(h => (
            <div key={h.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <StatusDot active={h.is_active} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{h.name}</p>
                      {!h.is_active && <span className="badge badge-gray text-xs">Inactivo</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate font-mono">{h.url}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {h.events.map(ev => (
                        <span key={ev} className="text-xs bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">{ev}</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {h.success_count}/{h.delivery_count} entregas exitosas
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleTest(h)} className="btn-ghost btn-sm text-xs" title="Enviar test">Test</button>
                  <button onClick={() => openDeliveries(h)} className="btn-ghost btn-sm text-xs">Entregas</button>
                  <button onClick={() => openEdit(h)} className="btn-ghost btn-sm text-xs">Editar</button>
                  <button onClick={() => handleToggle(h)} className={`btn-ghost btn-sm text-xs ${h.is_active ? 'text-amber-600' : 'text-green-600'}`}>
                    {h.is_active ? 'Pausar' : 'Activar'}
                  </button>
                  <button onClick={() => setDeleteId(h.id)} className="btn-ghost btn-sm text-xs text-red-500">Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Editar webhook' : 'Nuevo webhook'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nombre *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="input" placeholder="Mi webhook de Slack" /></div>
          <div><label className="label">URL destino *</label><input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required type="url" className="input font-mono text-sm" placeholder="https://hooks.slack.com/..." /></div>
          <div><label className="label">Secret (opcional)</label><input value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))} className="input font-mono text-sm" placeholder="Para verificar firma HMAC-SHA256" /></div>
          <div>
            <label className="label">Eventos *</label>
            <div className="space-y-3 border border-gray-200 rounded-lg p-3">
              {ALL_EVENTS.map(({ group, events }) => {
                const allSel = events.every(ev => form.events.includes(ev))
                return (
                  <div key={group}>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer mb-1.5">
                      <input type="checkbox" checked={allSel} onChange={() => toggleGroup(events)} className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600" />
                      {group}
                    </label>
                    <div className="grid grid-cols-2 gap-1 pl-5">
                      {events.map(ev => (
                        <label key={ev} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                          <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600" />
                          <span className="font-mono text-xs">{ev}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner size="sm" /> : (editing ? 'Guardar' : 'Crear webhook')}</button>
          </div>
        </form>
      </Modal>

      {/* Deliveries Modal */}
      <Modal isOpen={!!deliveriesHook} onClose={() => { setDeliveriesHook(null); setDeliveries(null) }} title={`Entregas — ${deliveriesHook?.name}`} size="lg">
        {!deliveries ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : deliveries.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Sin entregas registradas</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {deliveries.map(d => (
              <div key={d.id} className={`rounded-lg border p-3 text-xs ${d.response_status >= 200 && d.response_status < 300 ? 'border-green-200 bg-green-50' : d.error ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-semibold">{d.event}</span>
                  <div className="flex items-center gap-2">
                    {d.response_status && <span className={`font-bold ${d.response_status < 300 ? 'text-green-700' : 'text-red-700'}`}>{d.response_status}</span>}
                    <span className="text-gray-400">{new Date(d.delivered_at).toLocaleString('es-ES')}</span>
                  </div>
                </div>
                {d.error && <p className="text-red-600 mt-1">{d.error}</p>}
                {d.response_body && <p className="text-gray-500 truncate">{d.response_body}</p>}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar webhook" message="¿Estás seguro? Se perderán todos los logs de entregas." />
    </div>
  )
}
