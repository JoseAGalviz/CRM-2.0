import { useState, useEffect } from 'react'
import { auditAPI } from '../api/index'
import { formatDateRelative } from '../utils/formatters'
import Spinner from '../components/ui/Spinner'

const ACTION_LABELS = { create: 'Creado', update: 'Actualizado', delete: 'Eliminado' }
const ACTION_COLORS = { create: 'badge-green', update: 'badge-blue', delete: 'badge-red' }
const ENTITY_LABELS = { contact: 'Contacto', company: 'Empresa', deal: 'Negocio', task: 'Tarea' }
const LIMIT = 25

export default function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ entity_type: '', action: '' })

  useEffect(() => {
    setLoading(true)
    const params = { page, limit: LIMIT }
    if (filters.entity_type) params.entity_type = filters.entity_type
    if (filters.action) params.action = filters.action
    auditAPI.list(params)
      .then(r => { setLogs(r.data.data.logs); setTotal(r.data.data.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filters])

  const setFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1) }
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial de cambios</h1>
        <p className="text-sm text-gray-500 mt-1">{total} registros</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <select className="input w-auto text-sm" value={filters.entity_type} onChange={e => setFilter('entity_type', e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(ENTITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input w-auto text-sm" value={filters.action} onChange={e => setFilter('action', e.target.value)}>
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Acción</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Entidad</th>
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Campos</th>
                    <th className="px-4 py-3 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">Sin registros</td></tr>
                  ) : logs.map(log => {
                    let changes = null
                    try { changes = log.changes ? (typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes) : null } catch {}
                    const changesCount = changes ? Object.keys(changes).length : 0
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`badge ${ACTION_COLORS[log.action] || 'badge-gray'}`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{ENTITY_LABELS[log.entity_type] || log.entity_type}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{log.entity_name || `#${log.entity_id}`}</td>
                        <td className="px-4 py-3 text-gray-600">{log.user_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{changesCount > 0 ? `${changesCount} campo${changesCount !== 1 ? 's' : ''}` : '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateRelative(log.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="btn-secondary btn-sm disabled:opacity-40">← Anterior</button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="btn-secondary btn-sm disabled:opacity-40">Siguiente →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
