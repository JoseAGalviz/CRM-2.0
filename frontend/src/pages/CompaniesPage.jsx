import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { companiesAPI } from '../api/index'
import { formatCurrency, formatDate } from '../utils/formatters'
import { exportToCSV, COMPANY_COLUMNS } from '../utils/export'
import { COMPANY_SIZES, INDUSTRIES } from '../utils/constants'
import toast from 'react-hot-toast'
import { BuildingIcon } from '../components/ui/icons'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Pagination from '../components/ui/Pagination'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import CsvImportModal from '../components/ui/CsvImportModal'

const IMPORT_HEADERS = ['name', 'industry', 'email', 'phone', 'website', 'city', 'country']

const initForm = { name: '', industry: '', website: '', phone: '', email: '', address: '', city: '', country: '', size: '', annual_revenue: '', description: '', tags: [] }

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [importModal, setImportModal] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await companiesAPI.list({ page, limit: 20, search })
      setCompanies(res.data.data.companies)
      setTotal(res.data.data.total)
      setTotalPages(res.data.data.totalPages)
    } catch { toast.error('Error cargando empresas') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  const openCreate = () => { setForm(initForm); setEditing(null); setModal('create') }
  const openEdit = (c) => { setForm({ ...initForm, ...c, annual_revenue: c.annual_revenue || '', tags: Array.isArray(c.tags) ? c.tags : [] }); setEditing(c); setModal('edit') }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await companiesAPI.update(editing.id, form); toast.success('Empresa actualizada') }
      else { await companiesAPI.create(form); toast.success('Empresa creada') }
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Error guardando') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await companiesAPI.delete(deleteId); toast.success('Empresa eliminada'); load() }
    catch { toast.error('Error eliminando') }
  }

  const h = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const sizeLabel = (s) => COMPANY_SIZES.find(c => c.value === s)?.label || s || '—'

  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(s => s.size === companies.length ? new Set() : new Set(companies.map(c => c.id)))
  const clearSelected = () => setSelected(new Set())

  const handleBulkDelete = async () => {
    try {
      await companiesAPI.bulkDelete([...selected])
      toast.success(`${selected.size} empresas eliminadas`)
      clearSelected(); setBulkConfirm(false); load()
    } catch { toast.error('Error eliminando') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input className="input pl-9" placeholder="Buscar empresas..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <button onClick={() => exportToCSV(companies, 'empresas', COMPANY_COLUMNS)} className="btn-secondary flex-shrink-0 text-sm">
          ↓ CSV
        </button>
        <button onClick={() => setImportModal(true)} className="btn-secondary flex-shrink-0 text-sm">
          ↑ Importar
        </button>
        <button onClick={openCreate} className="btn-primary flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva empresa
        </button>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="card p-3 flex flex-wrap items-center gap-3 bg-primary-50 border border-primary-200">
          <span className="text-sm font-medium text-primary-800">{selected.size} seleccionada{selected.size !== 1 ? 's' : ''}</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => setBulkConfirm(true)} className="btn-sm text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg px-3 py-1.5">
              Eliminar {selected.size}
            </button>
            <button onClick={clearSelected} className="btn-ghost btn-sm text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : companies.length === 0 ? (
          <EmptyState icon={<BuildingIcon className="w-7 h-7" />} title="Sin empresas" description="Agrega tu primera empresa"
            action={<button onClick={openCreate} className="btn-primary">Agregar empresa</button>} />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead><tr>
                  <th className="w-8">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600"
                      checked={companies.length > 0 && selected.size === companies.length} onChange={toggleAll} />
                  </th>
                  <th>Empresa</th><th>Industria</th><th>Tamaño</th><th>Contactos</th><th>Negocios</th><th>Ingresos</th><th></th>
                </tr></thead>
                <tbody>
                  {companies.map(c => (
                    <tr key={c.id} className={selected.has(c.id) ? 'bg-primary-50' : ''}>
                      <td onClick={e => { e.stopPropagation(); toggleSelect(c.id) }}>
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600"
                          checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                      </td>
                      <td>
                        <div>
                          <Link to={`/companies/${c.id}`} className="font-medium text-primary-600 hover:text-primary-700">{c.name}</Link>
                          {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="block text-xs text-gray-400 hover:text-primary-500 truncate max-w-xs">{c.website}</a>}
                        </div>
                      </td>
                      <td className="text-gray-600">{c.industry || '—'}</td>
                      <td className="text-gray-600">{sizeLabel(c.size)}</td>
                      <td><span className="badge badge-blue">{c.contacts_count}</span></td>
                      <td><span className="badge badge-purple">{c.deals_count}</span></td>
                      <td className="text-gray-600">{c.annual_revenue ? formatCurrency(c.annual_revenue) : '—'}</td>
                      <td>
                        <div className="flex gap-1">
                          <Link to={`/companies/${c.id}`} className="btn-ghost btn-sm">Ver</Link>
                          <button onClick={() => openEdit(c)} className="btn-ghost btn-sm">Editar</button>
                          <button onClick={() => setDeleteId(c.id)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {companies.map(c => (
                <Link key={c.id} to={`/companies/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-500">
                    <BuildingIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-sm text-gray-500">{c.industry || '—'} · {sizeLabel(c.size)}</p>
                    <p className="text-xs text-gray-400">{c.contacts_count} contactos · {c.deals_count} negocios</p>
                  </div>
                </Link>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} limit={20} />
          </>
        )}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={editing ? 'Editar empresa' : 'Nueva empresa'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nombre *</label><input name="name" value={form.name} onChange={h} required className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Industria</label>
              <select name="industry" value={form.industry} onChange={h} className="input">
                <option value="">Seleccionar</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tamaño</label>
              <select name="size" value={form.size} onChange={h} className="input">
                <option value="">Seleccionar</option>
                {COMPANY_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Email</label><input name="email" type="email" value={form.email} onChange={h} className="input" /></div>
            <div><label className="label">Teléfono</label><input name="phone" value={form.phone} onChange={h} className="input" /></div>
          </div>
          <div><label className="label">Sitio web</label><input name="website" type="url" value={form.website} onChange={h} className="input" placeholder="https://" /></div>
          <div><label className="label">Ingresos anuales (USD)</label><input name="annual_revenue" type="number" min="0" value={form.annual_revenue} onChange={h} className="input" placeholder="0" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Ciudad</label><input name="city" value={form.city} onChange={h} className="input" /></div>
            <div><label className="label">País</label><input name="country" value={form.country} onChange={h} className="input" /></div>
          </div>
          <div><label className="label">Descripción</label><textarea name="description" value={form.description} onChange={h} rows={3} className="input resize-none" /></div>
          <div>
            <label className="label">Tags (separados por coma)</label>
            <input
              className="input"
              placeholder="tag1, tag2, tag3"
              value={Array.isArray(form.tags) ? form.tags.join(', ') : ''}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner size="sm" /> : (editing ? 'Guardar' : 'Crear empresa')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar empresa" message="¿Estás seguro? Los contactos y negocios asociados no se eliminarán." />

      <ConfirmDialog isOpen={bulkConfirm} onClose={() => setBulkConfirm(false)} onConfirm={handleBulkDelete}
        title={`Eliminar ${selected.size} empresas`} message={`¿Estás seguro? Se eliminarán ${selected.size} empresas. Los contactos y negocios asociados no se eliminarán.`} />

      <CsvImportModal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        onImport={companiesAPI.import}
        entityLabel="empresas"
        templateHeaders={IMPORT_HEADERS}
        onSuccess={load}
      />
    </div>
  )
}
