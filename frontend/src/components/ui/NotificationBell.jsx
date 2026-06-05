import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { tasksAPI } from '../../api/index'
import { formatDateRelative } from '../../utils/formatters'

const PRIORITY_COLOR = { urgent: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-yellow-400', low: 'bg-gray-400' }

export default function NotificationBell() {
  const [open, setOpen]         = useState(false)
  const [overdue, setOverdue]   = useState([])
  const [dueToday, setDueToday] = useState([])
  const [loading, setLoading]   = useState(false)
  const ref = useRef(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const now = new Date()
      const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
      const [res] = await Promise.all([
        tasksAPI.list({ status: 'pending', limit: 50 }),
      ])
      const tasks = res.data.data.tasks || []
      setOverdue(tasks.filter(t => t.due_date && new Date(t.due_date) < now))
      setDueToday(tasks.filter(t => {
        if (!t.due_date) return false
        const d = new Date(t.due_date)
        return d >= now && d <= todayEnd
      }))
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const count = overdue.length + dueToday.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetch() }}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Notificaciones"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Notificaciones</span>
            {count > 0 && <span className="badge badge-red text-xs">{count} pendientes</span>}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <p className="text-center text-gray-400 text-sm py-8">Cargando...</p>
            )}

            {!loading && count === 0 && (
              <div className="text-center py-10">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-400">Sin notificaciones pendientes</p>
              </div>
            )}

            {!loading && overdue.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 uppercase tracking-wide">
                  Vencidas ({overdue.length})
                </p>
                {overdue.map(t => (
                  <Link
                    key={t.id} to="/tasks"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                  >
                    <span className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${PRIORITY_COLOR[t.priority] || 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                      <p className="text-xs text-red-500 mt-0.5">Venció {formatDateRelative(t.due_date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!loading && dueToday.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-amber-600 bg-amber-50 uppercase tracking-wide">
                  Vencen hoy ({dueToday.length})
                </p>
                {dueToday.map(t => (
                  <Link
                    key={t.id} to="/tasks"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                  >
                    <span className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${PRIORITY_COLOR[t.priority] || 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                      <p className="text-xs text-amber-500 mt-0.5">Vence hoy</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100">
            <Link to="/tasks" onClick={() => setOpen(false)} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              Ver todas las tareas →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
