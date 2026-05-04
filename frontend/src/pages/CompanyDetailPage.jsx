import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { companiesAPI } from '../api/index'
import { formatCurrency, formatDate } from '../utils/formatters'
import { DEAL_STAGES, COMPANY_SIZES } from '../utils/constants'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'
import Avatar from '../components/ui/Avatar'
import { BuildingIcon, MailIcon, PhoneIcon, GlobeIcon } from '../components/ui/icons'

export default function CompanyDetailPage() {
  const { id } = useParams()
  const [company, setCompany] = useState(null)
  const [contacts, setContacts] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('contacts')

  useEffect(() => {
    Promise.all([
      companiesAPI.get(id),
      companiesAPI.contacts(id),
      companiesAPI.deals(id),
    ]).then(([c, ct, d]) => {
      setCompany(c.data.data)
      setContacts(ct.data.data)
      setDeals(d.data.data)
    }).catch(() => toast.error('Error cargando empresa'))
    .finally(() => setLoading(false))
  }, [id])

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
          <div className="flex gap-4">
            <div className="text-center"><p className="text-2xl font-bold text-gray-900">{company.contacts_count}</p><p className="text-xs text-gray-500">Contactos</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-gray-900">{company.deals_count}</p><p className="text-xs text-gray-500">Negocios</p></div>
            {company.annual_revenue && <div className="text-center"><p className="text-lg font-bold text-green-600">{formatCurrency(company.annual_revenue)}</p><p className="text-xs text-gray-500">Ingresos</p></div>}
          </div>
        </div>
        {company.description && <p className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-100">{company.description}</p>}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {[['contacts', `Contactos (${contacts.length})`], ['deals', `Negocios (${deals.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
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
              <div key={d.id} className="card p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{d.title}</p>
                  <p className="text-sm text-gray-500">Cierre: {formatDate(d.expected_close)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(d.value)}</p>
                  {stageBadge(d.stage)}
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
