import { useState, useEffect, useCallback } from 'react'
import { notesAPI, contactsAPI, dealsAPI } from '../api/index'
import { formatDateRelative } from '../utils/formatters'
import toast from 'react-hot-toast'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import Pagination from '../components/ui/Pagination'
import { DocumentTextIcon } from '../components/ui/icons'

const initForm = { content: '', contact_id: '', deal_id: '' }

export default function NotesPage() {
  const [notes, setNotes] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState([])
  const [deals, setDeals] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await notesAPI.list({ page, limit: 20 })
      setNotes(res.data.data.notes)
      setTotal(res.data.data.total)
      setTotalPages(res.data.data.totalPages)
    } catch { toast.error('Error cargando notas') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    contactsAPI.list({ limit: 200 }).then(r => setContacts(r.data.data.contacts))
    dealsAPI.list({ limit: 200 }).then(r => setDeals(r.data.data.deals))
  }, [])

  const openCreate = () => { setForm(initForm); setEditing(null); setModal(true) }
  const openEdit = (n) => { setForm({ content: n.content, contact_id: n.contact_id || '', deal_id: n.deal_id || '' }); setEditing(n); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await notesAPI.update(editing.id, { content: form.content }); toast.success('Nota actualizada') }
      else { await notesAPI.create(form); toast.success('Nota creada') }
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await notesAPI.delete(deleteId); toast.success('Nota eliminada'); load() }
    catch { toast.error('Error eliminando') }
  }

  const h = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva nota
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : notes.length === 0 ? (
        <EmptyState icon={<DocumentTextIcon className="w-7 h-7" />} title="Sin notas" description="Crea tu primera nota"
          action={<button onClick={openCreate} className="btn-primary">Crear nota</button>} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map(n => (
              <div key={n.id} className="card p-4 flex flex-col">
                <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{n.content}</p>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">{n.owner_name}</p>
                    <p className="text-xs text-gray-400">{formatDateRelative(n.created_at)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(n)} className="btn-ghost btn-sm text-xs">Editar</button>
                    <button onClick={() => setDeleteId(n.id)} className="btn-ghost btn-sm text-xs text-red-500 hover:bg-red-50">Eliminar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="card overflow-hidden">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} limit={20} />
            </div>
          )}
        </>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Editar nota' : 'Nueva nota'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nota *</label>
            <textarea name="content" value={form.content} onChange={h} required rows={6} className="input resize-none" placeholder="Escribe tu nota aquí..." />
          </div>
          {!editing && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Contacto</label>
                <select name="contact_id" value={form.contact_id} onChange={h} className="input">
                  <option value="">Sin contacto</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Negocio</label>
                <select name="deal_id" value={form.deal_id} onChange={h} className="input">
                  <option value="">Sin negocio</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner size="sm" /> : (editing ? 'Guardar' : 'Crear nota')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar nota" message="¿Estás seguro de eliminar esta nota?" />
    </div>
  )
}
