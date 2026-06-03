import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DEMO_CONTACTS } from '../demo/data'
import { formatDate } from '../utils/formatters'
import { UsersIcon } from '../components/ui/icons'
import EmptyState from '../components/ui/EmptyState'
import Avatar from '../components/ui/Avatar'

export default function ContactsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const contacts = useMemo(() => {
    if (!search) return DEMO_CONTACTS
    const q = search.toLowerCase()
    return DEMO_CONTACTS.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input className="input pl-9" placeholder="Buscar contactos..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary flex-shrink-0" disabled>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo contacto
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {contacts.length === 0 ? (
          <EmptyState icon={<UsersIcon className="w-7 h-7" />} title="Sin contactos" description="No se encontraron contactos" />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead><tr>
                  <th>Nombre</th><th>Empresa</th><th>Email</th><th>Cargo</th><th>Estado</th><th>Creado</th><th></th>
                </tr></thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/contacts/${c.id}`)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                            {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-600">{c.company_name || '—'}</td>
                      <td className="text-gray-600">{c.email || '—'}</td>
                      <td className="text-gray-600">{c.job_title || '—'}</td>
                      <td><span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{c.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                      <td className="text-gray-500 text-xs">{formatDate(c.created_at)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <Link to={`/contacts/${c.id}`} className="btn-ghost btn-sm">Ver</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {contacts.map(c => (
                <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                  <Avatar name={`${c.first_name} ${c.last_name}`} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                    <p className="text-sm text-gray-500">{c.job_title || '—'} · {c.company_name || '—'}</p>
                    <p className="text-xs text-gray-400">{c.email || c.phone || '—'}</p>
                  </div>
                  <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{c.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
