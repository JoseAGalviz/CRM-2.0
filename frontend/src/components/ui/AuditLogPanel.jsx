import { useState, useEffect } from 'react'
import { auditAPI } from '../../api/index'
import { formatDateRelative } from '../../utils/formatters'
import Spinner from './Spinner'

const ACTION_LABELS = { create: 'Creado', update: 'Actualizado', delete: 'Eliminado' }
const ACTION_COLORS = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
}
const FIELD_LABELS = {
  first_name: 'Nombre', last_name: 'Apellido', email: 'Email',
  phone: 'Teléfono', mobile: 'Móvil', job_title: 'Cargo',
  department: 'Departamento', company_id: 'Empresa ID', source: 'Origen',
  status: 'Estado', name: 'Nombre', industry: 'Industria',
  website: 'Sitio web', city: 'Ciudad', country: 'País',
  size: 'Tamaño', annual_revenue: 'Ingresos anuales', title: 'Título',
  value: 'Valor', currency: 'Moneda', stage: 'Etapa',
  probability: 'Probabilidad (%)', expected_close: 'Cierre esperado',
  contact_id: 'Contacto ID', description: 'Descripción',
  lost_reason: 'Razón de pérdida', assigned_to: 'Asignado a ID',
  priority: 'Prioridad', due_date: 'Fecha límite', deal_id: 'Negocio ID',
}

const LIMIT = 15

export default function AuditLogPanel({ entityType, entityId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setLoading(true)
    auditAPI.list({ entity_type: entityType, entity_id: entityId, page, limit: LIMIT })
      .then(r => { setLogs(r.data.data.logs); setTotal(r.data.data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [entityType, entityId, page])

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>
  if (logs.length === 0) return <p className="text-center text-gray-400 py-10">Sin historial de cambios</p>

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-3">
      {logs.map(log => {
        let changes = null
        try { changes = log.changes ? (typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes) : null } catch {}
        const changedFields = changes ? Object.entries(changes) : []
        return (
          <div key={log.id} className="card p-4 flex gap-3">
            <div className="flex-shrink-0 pt-0.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                {ACTION_LABELS[log.action] || log.action}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{log.user_name || 'Sistema'}</span>
              </p>
              {changedFields.length > 0 && (
                <div className="mt-2 space-y-1">
                  {changedFields.map(([field, [oldVal, newVal]]) => (
                    <div key={field} className="text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{FIELD_LABELS[field] || field}:</span>{' '}
                      <span className="line-through text-red-400">{oldVal !== null && oldVal !== undefined ? String(oldVal) : '—'}</span>
                      {' → '}
                      <span className="text-green-600">{newVal !== null && newVal !== undefined ? String(newVal) : '—'}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">{formatDateRelative(log.created_at)}</p>
            </div>
          </div>
        )
      })}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="btn-secondary btn-sm disabled:opacity-40">← Anterior</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="btn-secondary btn-sm disabled:opacity-40">Siguiente →</button>
        </div>
      )}
    </div>
  )
}
