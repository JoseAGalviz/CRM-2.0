import { useState } from 'react'
import { useChat } from '../../context/ChatContext'
import { useAuth } from '../../context/AuthContext'

// Formats "2025-03-31T12:34:56" → "12:34" or "31/03" based on age
function formatTime(iso) {
  if (!iso) return ''
  const d   = new Date(iso)
  const now  = new Date()
  const diff = now - d
  if (diff < 86400000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
}

function ConvAvatar({ conv, size = 10 }) {
  if (conv.type === 'direct' && conv.peer) {
    const initials = conv.peer.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    return (
      <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
        {initials}
      </div>
    )
  }
  // Group
  const initials = (conv.name || 'G').slice(0, 2).toUpperCase()
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initials}
    </div>
  )
}

export default function ConversationList({ onSelect }) {
  const { conversations, activeConvId, openConversation, loadingConvs } = useChat()
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const filtered = conversations.filter(c => {
    const name = c.type === 'direct' ? c.peer?.name : c.name
    return name?.toLowerCase().includes(search.toLowerCase())
  })

  async function handleSelect(conv) {
    await openConversation(conv.id)
    onSelect?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar conversaciones..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loadingConvs ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-12 px-4">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {search ? 'Sin resultados' : 'No hay conversaciones'}
          </div>
        ) : (
          filtered.map(conv => {
            const isActive   = conv.id === activeConvId
            const displayName = conv.type === 'direct' ? conv.peer?.name : conv.name
            const lastMsg    = conv.last_msg_content
            const isMyMsg    = conv.last_msg_sender_id === user?.id
            const prefix     = conv.type === 'group' && conv.last_msg_sender_name && !isMyMsg
              ? `${conv.last_msg_sender_name?.split(' ')[0]}: `
              : isMyMsg ? 'Tú: ' : ''

            return (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 border-b border-gray-50 hover:bg-gray-50 ${
                  isActive ? 'bg-violet-50 border-l-2 border-l-violet-500' : ''
                }`}
              >
                <ConvAvatar conv={conv} size={10} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm font-semibold truncate ${isActive ? 'text-violet-700' : 'text-gray-900'}`}>
                      {displayName}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(conv.last_msg_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-xs text-gray-500 truncate">
                      {lastMsg ? `${prefix}${lastMsg}` : (conv.type === 'group' ? `${conv.member_count || 0} miembros` : 'Sin mensajes')}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 bg-violet-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
