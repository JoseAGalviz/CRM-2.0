import { useState, useEffect } from 'react'
import { useChat } from '../../context/ChatContext'
import { chatApi } from '../../api/chat'

function UserCheckbox({ u, checked, onChange }) {
  const initials = u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
        <p className="text-xs text-gray-500 truncate">{u.email}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(u.id, e.target.checked)}
        className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
      />
    </label>
  )
}

export default function CreateConversationModal({ onClose, onCreated }) {
  const [users, setUsers]           = useState([])
  const [selected, setSelected]     = useState([])
  const [type, setType]             = useState('direct') // 'direct' | 'group'
  const [groupName, setGroupName]   = useState('')
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(false)
  const { createConversation }      = useChat()

  useEffect(() => {
    chatApi.getUsers().then(setUsers).catch(console.error)
  }, [])

  function toggle(id, checked) {
    if (checked) {
      setSelected(prev => {
        const next = [...prev, id]
        // if more than 1 selected, switch to group mode
        if (next.length > 1) setType('group')
        return next
      })
    } else {
      setSelected(prev => {
        const next = prev.filter(s => s !== id)
        if (next.length <= 1) setType('direct')
        return next
      })
    }
  }

  async function handleCreate() {
    if (selected.length === 0) return
    setLoading(true)
    try {
      const conv = await createConversation({
        type: selected.length > 1 ? 'group' : type,
        name: type === 'group' || selected.length > 1 ? groupName : undefined,
        memberIds: selected,
      })
      onCreated?.(conv)
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const isGroup     = type === 'group' || selected.length > 1
  const canCreate   = selected.length > 0 && (!isGroup || groupName.trim())
  const filtered    = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Nueva conversación</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Type toggle */}
          <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
            <button
              onClick={() => { setType('direct'); setSelected(s => s.slice(0, 1)) }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${type === 'direct' && selected.length <= 1 ? 'bg-white shadow-sm text-violet-700' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Chat directo
            </button>
            <button
              onClick={() => setType('group')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${isGroup ? 'bg-white shadow-sm text-violet-700' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Grupo
            </button>
          </div>

          {/* Group name input */}
          {isGroup && (
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Nombre del grupo"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          )}

          {/* Search users */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar usuarios..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin resultados</p>
          ) : (
            filtered.map(u => (
              <UserCheckbox
                key={u.id}
                u={u}
                checked={selected.includes(u.id)}
                onChange={toggle}
              />
            ))
          )}
        </div>

        {/* Selected summary */}
        {selected.length > 0 && (
          <div className="px-5 py-2 bg-violet-50 border-t border-violet-100">
            <p className="text-xs text-violet-600 font-medium">
              {selected.length} {selected.length === 1 ? 'participante seleccionado' : 'participantes seleccionados'}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 btn-secondary py-2 rounded-xl">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate || loading}
            className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Creando...' : 'Iniciar chat'}
          </button>
        </div>
      </div>
    </div>
  )
}
