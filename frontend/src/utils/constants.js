export const DEAL_STAGES = [
  { value: 'lead', label: 'Lead', color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-400' },
  { value: 'qualified', label: 'Calificado', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  { value: 'proposal', label: 'Propuesta', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  { value: 'negotiation', label: 'Negociación', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  { value: 'won', label: 'Ganado', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  { value: 'lost', label: 'Perdido', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
]

export const TASK_STATUSES = [
  { value: 'pending', label: 'Pendiente', color: 'badge-yellow' },
  { value: 'in_progress', label: 'En progreso', color: 'badge-blue' },
  { value: 'done', label: 'Completado', color: 'badge-green' },
  { value: 'cancelled', label: 'Cancelado', color: 'badge-gray' },
]

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Baja', color: 'badge-gray' },
  { value: 'medium', label: 'Media', color: 'badge-blue' },
  { value: 'high', label: 'Alta', color: 'badge-yellow' },
  { value: 'urgent', label: 'Urgente', color: 'badge-red' },
]

export const ACTIVITY_TYPES = [
  { value: 'call', label: 'Llamada', icon: '📞' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'meeting', label: 'Reunión', icon: '🤝' },
  { value: 'demo', label: 'Demo', icon: '💻' },
  { value: 'follow_up', label: 'Seguimiento', icon: '🔔' },
  { value: 'other', label: 'Otro', icon: '📋' },
]

export const CONTACT_SOURCES = [
  { value: 'web', label: 'Web' },
  { value: 'referral', label: 'Referido' },
  { value: 'cold', label: 'Contacto frío' },
  { value: 'event', label: 'Evento' },
  { value: 'other', label: 'Otro' },
]

export const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup (1-50)' },
  { value: 'smb', label: 'PyME (51-500)' },
  { value: 'enterprise', label: 'Empresa (500+)' },
]

export const INDUSTRIES = [
  'Technology', 'Manufacturing', 'Consulting', 'Pharmaceuticals',
  'Aerospace', 'Finance', 'Healthcare', 'Retail', 'Education',
  'Real Estate', 'Energy', 'Media', 'Other'
]
