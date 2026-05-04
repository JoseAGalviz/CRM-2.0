import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardAPI } from '../api/index'
import { formatCurrency, formatDateRelative } from '../utils/formatters'
import { DEAL_STAGES, ACTIVITY_TYPES } from '../utils/constants'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'
import {
  UsersIcon, BuildingIcon, BriefcaseIcon, CurrencyDollarIcon,
  CalendarIcon, ChartBarIcon, CheckCircleIcon, ExclamationIcon,
  ActivityTypeIcon,
} from '../components/ui/icons'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

function MetricCard({ title, value, subtitle, icon, color, to }) {
  const card = (
    <div className={`card p-5 flex items-center gap-4 transition-all duration-200 ${to ? 'cursor-pointer hover:shadow-card-hover hover:-translate-y-px' : ''}`}>
      <div className={`w-11 h-11 ${color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
  return to ? <Link to={to}>{card}</Link> : card
}

const STAGE_COLORS = { lead: '#94a3b8', qualified: '#3b82f6', proposal: '#f59e0b', negotiation: '#f97316', won: '#10b981', lost: '#ef4444' }

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      dashboardAPI.metrics(),
      dashboardAPI.dealsByStage(),
      dashboardAPI.dealsByMonth(),
      dashboardAPI.recentActivities(),
      dashboardAPI.overdueTasks(),
    ]).then(([m, s, mo, a, t]) => {
      setData({ metrics: m.data.data, byStage: s.data.data, byMonth: mo.data.data, activities: a.data.data, tasks: t.data.data })
    }).catch(() => toast.error('Error cargando dashboard')).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!data) return null

  const { metrics, byStage, byMonth, activities, tasks } = data

  const pieData = byStage.map(s => ({
    name: DEAL_STAGES.find(d => d.value === s.stage)?.label || s.stage,
    value: s.count,
    color: STAGE_COLORS[s.stage]
  }))

  const monthData = byMonth.map(m => ({
    mes: m.month,
    'Deals': m.count,
    'Cerrados': m.won_count,
  }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Contactos"        value={metrics.contacts}   icon={<UsersIcon className="w-5 h-5" />}           color="bg-violet-50 text-violet-600" to="/contacts" />
        <MetricCard title="Empresas"         value={metrics.companies}  icon={<BuildingIcon className="w-5 h-5" />}         color="bg-blue-50 text-blue-600"     to="/companies" />
        <MetricCard title="Negocios activos" value={metrics.activeDeals} subtitle={`${metrics.wonDeals} ganados`} icon={<BriefcaseIcon className="w-5 h-5" />} color="bg-emerald-50 text-emerald-600" to="/deals" />
        <MetricCard title="Ingresos"         value={formatCurrency(metrics.revenue)} subtitle={`Pipeline: ${formatCurrency(metrics.pipeline)}`} icon={<CurrencyDollarIcon className="w-5 h-5" />} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Tareas pendientes"  value={metrics.pendingTasks}        icon={<CheckCircleIcon className="w-5 h-5" />}  color="bg-orange-50 text-orange-600" to="/tasks" />
        <MetricCard title="Tareas vencidas"    value={metrics.overdueTasks}         icon={<ExclamationIcon className="w-5 h-5" />}  color="bg-red-50 text-red-600"       to="/tasks?status=pending" />
        <MetricCard title="Actividades (mes)"  value={metrics.activitiesThisMonth}  icon={<CalendarIcon className="w-5 h-5" />}     color="bg-teal-50 text-teal-600"     to="/activities" />
        <MetricCard title="Won rate"           value={metrics.activeDeals + metrics.wonDeals > 0 ? `${Math.round(metrics.wonDeals / (metrics.activeDeals + metrics.wonDeals) * 100)}%` : '—'} icon={<ChartBarIcon className="w-5 h-5" />} color="bg-purple-50 text-purple-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart - deals by month */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Negocios por mes</h2>
          {monthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Deals" fill="#ddd6fe" radius={[4,4,0,0]} />
                <Bar dataKey="Cerrados" fill="#7c3aed" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin datos suficientes</div>
          )}
        </div>

        {/* Pie chart - deals by stage */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Pipeline por etapa</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${Math.round(percent * 100)}%`} labelLine={false} fontSize={11}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sin negocios</div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activities */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Actividades recientes</h2>
            <Link to="/activities" className="text-sm text-primary-600 hover:text-primary-700 font-medium">Ver todas</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {activities.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin actividades recientes</p>
            ) : activities.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <span className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400"><ActivityTypeIcon type={a.type} className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.subject}</p>
                  <p className="text-xs text-gray-500">{a.contact_name || a.deal_title || '—'} · {formatDateRelative(a.occurred_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue tasks */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Tareas vencidas</h2>
            <Link to="/tasks" className="text-sm text-primary-600 hover:text-primary-700 font-medium">Ver todas</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {tasks.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">¡Sin tareas vencidas!</p>
            ) : tasks.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                  <p className="text-xs text-gray-500">{t.contact_name || '—'} · {formatDateRelative(t.due_date)}</p>
                </div>
                <span className={`badge badge-red text-xs`}>{t.priority}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
