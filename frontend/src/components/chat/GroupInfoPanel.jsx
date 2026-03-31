import { useEffect, useState } from 'react'
import { chatApi } from '../../api/chat'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'

function MemberRow({ member, isCreator, canRemove, onRemove, lastReaders }) {
  const initials = member.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const didRead  = lastReaders?.some(r => r.user_id === member.id)
  const readTime = lastReaders?.find(r => r.user_id === member.id)?.read_at

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 group">
      <div className="relative">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          {initials}
        </div>
        {didRead && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 16 16">
              <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 11.293 1.854 8.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7z"/>
            </svg>
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
        {isCreator && (
          <span className="text-xs text-violet-600 font-medium">Creador</span>
        )}
        {!isCreator && didRead && readTime && (
          <p className="text-xs text-blue-500">
            Visto {new Date(readTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        {!isCreator && !didRead && (
          <p className="text-xs text-gray-400">No visto</p>
        )}
      </div>
      {canRemove && (
        <button
          onClick={() => onRemove(member.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
          title="Eliminar del grupo"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default function GroupInfoPanel({ conv, onClose }) {
  const { user }          = useAuth()
  const { removeMember, addMembers, loadConversations, messages } = useChat()
  const [members, setMembers]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [showAddModal, setShowAdd] = useState(false)
  const [allUsers, setAllUsers]   = useState([])
  const [toAdd, setToAdd]         = useState([])

  // Get reads on last non-system message
  const convMessages = messages[conv?.id] || []
  const lastMsg = [...convMessages].reverse().find(m => m.type !== 'system')
  const lastReaders = lastMsg?.reads || []

  useEffect(() => {
    if (!conv?.id) return
    setLoading(true)
    chatApi.getMembers(conv.id)
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [conv?.id])

  async function handleRemove(memberId) {
    await removeMember(conv.id, memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  async function handleAdd() {
    if (toAdd.length === 0) return
    await addMembers(conv.id, toAdd)
    const fresh = await chatApi.getMembers(conv.id)
    setMembers(fresh)
    setToAdd([])
    setShowAdd(false)
  }

  async function openAdd() {
    const users = await chatApi.getUsers()
    const existingIds = members.map(m => m.id)
    setAllUsers(users.filter(u => !existingIds.includes(u.id)))
    setShowAdd(true)
  }

  const isCreator = conv?.created_by === user?.id
  const active    = members.filter(m => !m.left_at)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Info del grupo</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Group identity */}
      <div className="flex flex-col items-center py-5 px-4 border-b border-gray-100">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-2xl mb-2">
          {(conv?.name || 'G').slice(0, 2).toUpperCase()}
        </div>
        <p className="font-bold text-gray-900 text-base">{conv?.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{active.length} miembros</p>
      </div>

      {/* Last message read status */}
      {lastMsg && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Último mensaje visto por
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            {lastReaders.filter(r => r.user_id !== lastMsg.sender_id).length === 0 ? (
              <span className="text-xs text-gray-400">Nadie aún</span>
            ) : (
              lastReaders
                .filter(r => r.user_id !== lastMsg.sender_id)
                .map(r => {
                  const initials = (r.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div key={r.user_id} title={`${r.name} - ${new Date(r.read_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold cursor-default">
                      {initials}
                    </div>
                  )
                })
            )}
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Miembros</p>
          {isCreator && (
            <button onClick={openAdd}
              className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {active.map(m => (
              <MemberRow
                key={m.id}
                member={m}
                isCreator={m.id === conv?.created_by}
                canRemove={isCreator && m.id !== user?.id}
                onRemove={handleRemove}
                lastReaders={lastReaders}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add members mini-modal */}
      {showAddModal && (
        <div className="absolute inset-0 bg-white z-10 flex flex-col rounded-r-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900">Agregar miembros</h4>
            <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {allUsers.map(u => (
              <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm text-gray-900 flex-1">{u.name}</span>
                <input type="checkbox" checked={toAdd.includes(u.id)}
                  onChange={e => setToAdd(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))}
                  className="w-4 h-4 text-violet-600 border-gray-300 rounded" />
              </label>
            ))}
          </div>
          <div className="p-3 border-t border-gray-100">
            <button onClick={handleAdd} disabled={toAdd.length === 0}
              className="w-full bg-violet-600 text-white text-sm font-medium py-2 rounded-xl disabled:opacity-50 hover:bg-violet-700 transition-colors">
              Agregar {toAdd.length > 0 ? `(${toAdd.length})` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
