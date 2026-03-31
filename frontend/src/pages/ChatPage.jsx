import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'
import ConversationList from '../components/chat/ConversationList'
import MessageBubble from '../components/chat/MessageBubble'
import MessageInput from '../components/chat/MessageInput'
import CreateConversationModal from '../components/chat/CreateConversationModal'
import GroupInfoPanel from '../components/chat/GroupInfoPanel'
import { chatApi } from '../api/chat'

// ── Date separator between messages ──────────────────────────────────────────
function DateSeparator({ date }) {
  const d    = new Date(date)
  const now  = new Date()
  const diff = Math.floor((now - d) / 86400000)
  let label
  if (diff === 0)      label = 'Hoy'
  else if (diff === 1) label = 'Ayer'
  else                 label = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-xs text-gray-400 font-medium capitalize">{label}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator({ names }) {
  if (!names?.length) return null
  const text = names.length === 1
    ? `${names[0]} está escribiendo`
    : `${names.join(', ')} están escribiendo`
  return (
    <div className="flex items-center gap-2 px-5 py-2 text-xs text-gray-400 italic">
      <span className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </span>
      {text}...
    </div>
  )
}

// ── Connection badge ──────────────────────────────────────────────────────────
function ConnectionBadge({ connected }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
      {connected ? 'En línea' : 'Reconectando...'}
    </span>
  )
}

export default function ChatPage() {
  const { conversationId }   = useParams()
  const navigate             = useNavigate()
  const { user }             = useAuth()
  const {
    conversations, activeConvId, openConversation,
    messages, typingUsers, connected, loadMessages,
  } = useChat()

  const [showCreate, setShowCreate]   = useState(false)
  const [showGroupInfo, setGroupInfo] = useState(false)
  const [members, setMembers]         = useState([])
  const [loadingMore, setLoadingMore] = useState(false)
  const messagesEndRef                = useRef(null)
  const messagesBoxRef                = useRef(null)
  const prevScrollHeight              = useRef(0)

  const activeConv   = conversations.find(c => c.id === activeConvId)
  const convMsgs     = messages[activeConvId] || []
  const typingNames  = Object.values(typingUsers[activeConvId] || {})
  const isGroup      = activeConv?.type === 'group'
  const convName     = activeConv
    ? (isGroup ? activeConv.name : activeConv.peer?.name)
    : null

  // Open conversation from URL param on mount
  useEffect(() => {
    if (conversationId) {
      openConversation(Number(conversationId))
    }
  }, [conversationId]) // eslint-disable-line

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!loadingMore) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [convMsgs.length]) // eslint-disable-line

  // Load members when group info shown or active conv changes
  useEffect(() => {
    if (activeConvId && isGroup) {
      chatApi.getMembers(activeConvId).then(setMembers).catch(() => {})
    }
  }, [activeConvId, isGroup])

  // ── Infinite scroll (load older messages) ────────────────────────────────────
  async function handleScroll() {
    const box = messagesBoxRef.current
    if (!box || loadingMore || !activeConvId) return
    if (box.scrollTop < 50 && convMsgs.length >= 50) {
      const oldest = convMsgs[0]
      if (!oldest) return
      setLoadingMore(true)
      prevScrollHeight.current = box.scrollHeight
      await loadMessages(activeConvId, oldest.id)
      setLoadingMore(false)
      // Restore scroll position
      requestAnimationFrame(() => {
        box.scrollTop = box.scrollHeight - prevScrollHeight.current
      })
    }
  }

  function handleCreated(conv) {
    openConversation(conv.id)
    navigate(`/chat/${conv.id}`)
  }

  // ── Group messages by date ────────────────────────────────────────────────────
  function renderMessages() {
    const items = []
    let lastDate = null
    convMsgs.forEach((msg, i) => {
      const msgDate = msg.created_at?.slice(0, 10)
      if (msgDate !== lastDate) {
        items.push(<DateSeparator key={`sep-${msgDate}`} date={msg.created_at} />)
        lastDate = msgDate
      }
      items.push(
        <MessageBubble
          key={msg.id}
          msg={msg}
          prevMsg={convMsgs[i - 1]}
          isGroup={isGroup}
          members={members}
        />
      )
    })
    return items
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-6 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">

      {/* ── Left panel: conversation list ─────────────────────────────────────── */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col flex-shrink-0 ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Mensajes</h1>
            <ConnectionBadge connected={connected} />
          </div>
          <button
            id="new-chat-btn"
            onClick={() => setShowCreate(true)}
            className="w-9 h-9 bg-violet-600 hover:bg-violet-700 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
            title="Nueva conversación"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <ConversationList onSelect={() => navigate(`/chat/${activeConvId}`)} />
      </div>

      {/* ── Center panel: message area ────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
        {!activeConvId ? (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
            <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Bienvenido al Chat</h2>
            <p className="text-gray-500 text-sm max-w-xs mb-6">Selecciona una conversación o inicia una nueva para comenzar a chatear.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              Nueva conversación
            </button>
          </div>
        ) : (
          <>
            {/* Conv header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
              {/* Mobile back */}
              <button
                className="md:hidden p-1 mr-2 rounded-lg hover:bg-gray-100 text-gray-500"
                onClick={() => { navigate('/chat') }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Avatar + name */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                  isGroup
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    : 'bg-gradient-to-br from-violet-500 to-indigo-600'
                }`}>
                  {(convName || '?').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{convName}</p>
                  <p className="text-xs text-gray-400">
                    {isGroup ? `${activeConv?.member_count || members.length} miembros` : 'Chat privado'}
                  </p>
                </div>
              </div>

              {/* Group info toggle */}
              {isGroup && (
                <button
                  onClick={() => setGroupInfo(v => !v)}
                  className={`p-2 rounded-lg transition-colors ${showGroupInfo ? 'bg-violet-100 text-violet-600' : 'hover:bg-gray-100 text-gray-500'}`}
                  title="Info del grupo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Messages */}
            <div
              ref={messagesBoxRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 space-y-0.5"
            >
              {loadingMore && (
                <div className="flex justify-center py-3">
                  <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {convMsgs.length === 0 && !loadingMore && (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <p className="text-gray-400 text-sm">No hay mensajes aún</p>
                  <p className="text-gray-300 text-xs mt-1">¡Sé el primero en escribir!</p>
                </div>
              )}
              {renderMessages()}
              <TypingIndicator names={typingNames} />
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <MessageInput convId={activeConvId} />
          </>
        )}
      </div>

      {/* ── Right panel: group info ────────────────────────────────────────────── */}
      {isGroup && showGroupInfo && activeConv && (
        <div className="hidden lg:flex w-72 flex-shrink-0 border-l border-gray-100 flex-col relative overflow-hidden">
          <GroupInfoPanel
            conv={activeConv}
            onClose={() => setGroupInfo(false)}
          />
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateConversationModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
