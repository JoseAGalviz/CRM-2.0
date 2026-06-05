import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { chatApi } from '../../api/chat'
import toast from 'react-hot-toast'

const QUICK_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','👏','🎉']

function ReadTicks({ msg, members, isGroup }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const { user } = useAuth()
  if (msg.type === 'system') return null
  if (msg.sender_id !== user?.id) return null

  const reads              = msg.reads || []
  const readersExcludeSelf = reads.filter(r => r.user_id !== user?.id)
  const totalMembers       = members?.length || 2
  const allRead            = readersExcludeSelf.length >= (totalMembers - 1)

  if (reads.length === 0) {
    return (
      <span className="text-gray-400">
        <svg className="w-3.5 h-3.5 inline" fill="currentColor" viewBox="0 0 16 16">
          <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
        </svg>
      </span>
    )
  }

  const tooltipNames = readersExcludeSelf.map(r => r.name || `Usuario ${r.user_id}`).join(', ')

  return (
    <span className="relative cursor-default"
      onMouseEnter={() => readersExcludeSelf.length > 0 && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}>
      <span className={allRead ? 'text-blue-400' : 'text-violet-300'}>
        <svg className="w-4 h-4 inline -mr-1" fill="currentColor" viewBox="0 0 16 16">
          <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 11.293 1.854 8.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm-4.208 7-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0z"/>
        </svg>
      </span>
      {showTooltip && readersExcludeSelf.length > 0 && (
        <div className="absolute bottom-6 right-0 z-50 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
          <span className="font-medium">Leído por: </span>{tooltipNames}
          <div className="absolute bottom-0 right-2 translate-y-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
        </div>
      )}
    </span>
  )
}

function MiniAvatar({ name }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  )
}

function ReplyPreview({ content, senderName, isOwn }) {
  const c = content?.length > 80 ? content.slice(0, 80) + '…' : content
  return (
    <div className={`mb-1.5 px-2 py-1.5 rounded-lg border-l-2 text-xs ${isOwn ? 'bg-violet-700/50 border-violet-300 text-violet-100' : 'bg-gray-100 border-violet-400 text-gray-600'}`}>
      <p className={`font-semibold mb-0.5 ${isOwn ? 'text-violet-200' : 'text-violet-600'}`}>{senderName}</p>
      <p className="opacity-80 leading-snug">{c}</p>
    </div>
  )
}

function formatMsgTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Highlight @mentions in message content
function MsgContent({ content, isOwn }) {
  const parts = content.split(/(@\w+)/g)
  return (
    <p className="whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((part, i) =>
        /^@\w+$/.test(part)
          ? <span key={i} className={`font-semibold ${isOwn ? 'text-violet-200' : 'text-violet-600'}`}>{part}</span>
          : part
      )}
    </p>
  )
}

function Reactions({ reactions, messageId, convId, isOwn, onReact }) {
  if (!reactions?.length) return null
  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {reactions.map(r => (
        <button key={r.emoji} onClick={() => onReact(r.emoji)}
          title={r.users.map(u => u.name).join(', ')}
          className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 hover:border-violet-400 rounded-full px-2 py-0.5 shadow-sm transition-colors">
          <span>{r.emoji}</span>
          <span className="font-medium text-gray-600">{r.count}</span>
        </button>
      ))}
    </div>
  )
}

export default function MessageBubble({ msg, prevMsg, isGroup, members, onReply, convId, onUpdate }) {
  const { user } = useAuth()
  const [hover, setHover]           = useState(false)
  const [showEmoji, setShowEmoji]   = useState(false)
  const [editing, setEditing]       = useState(false)
  const [editText, setEditText]     = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const emojiRef = useRef(null)

  const isOwn    = msg.sender_id === user?.id
  const isSystem = msg.type === 'system'
  const showSender = isGroup && !isOwn && msg.sender_id !== prevMsg?.sender_id

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return
    const handler = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji])

  const handleReact = async (emoji) => {
    setShowEmoji(false)
    try { await chatApi.react(convId, msg.id, emoji) }
    catch { toast.error('Error al reaccionar') }
  }

  const startEdit = () => {
    setEditText(msg.content)
    setEditing(true)
    setHover(false)
  }

  const saveEdit = async () => {
    if (!editText.trim() || editText === msg.content) { setEditing(false); return }
    try {
      await chatApi.editMessage(convId, msg.id, editText)
      setEditing(false)
    } catch { toast.error('Error al editar') }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setConfirmDelete(false)
    try { await chatApi.deleteMessage(convId, msg.id) }
    catch { toast.error('Error al eliminar') }
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">{msg.content}</span>
      </div>
    )
  }

  return (
    <div className={`flex items-end gap-1.5 mb-1 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setConfirmDelete(false) }}>

      {/* Avatar (group others only) */}
      {isGroup && !isOwn ? (
        msg.sender_id !== prevMsg?.sender_id ? <MiniAvatar name={msg.sender_name} /> : <div className="w-7" />
      ) : null}

      {/* Action buttons — hover */}
      {!msg.deleted_at && (
        <div className={`flex items-center gap-0.5 self-center transition-opacity duration-100 ${hover ? 'opacity-100' : 'opacity-0'} ${isOwn ? 'order-last' : 'order-first'}`}>
          {/* Emoji react */}
          <div className="relative" ref={emojiRef}>
            <button onClick={() => setShowEmoji(v => !v)}
              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors" title="Reaccionar">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showEmoji && (
              <div className={`absolute bottom-full mb-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-2 flex gap-1 ${isOwn ? 'right-0' : 'left-0'}`}>
                {QUICK_EMOJIS.map(e => (
                  <button key={e} onClick={() => handleReact(e)} className="text-lg hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Reply */}
          <button onClick={() => onReply?.(msg)}
            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors" title="Responder">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          {/* Edit (own messages only) */}
          {isOwn && (
            <button onClick={startEdit}
              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors" title="Editar">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {/* Delete (own or admin) */}
          {(isOwn || user?.role === 'admin') && (
            <button onClick={handleDelete}
              className={`p-1.5 rounded-full transition-colors ${confirmDelete ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500'}`}
              title={confirmDelete ? '¿Confirmar eliminación?' : 'Eliminar'}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[65%]`}>
        {showSender && (
          <span className="text-xs font-semibold text-violet-600 mb-1 ml-1">{msg.sender_name}</span>
        )}

        {/* Edit mode */}
        {editing ? (
          <div className="flex flex-col gap-1.5 w-full">
            <textarea className="input text-sm resize-none rounded-xl px-3 py-2 min-w-48" rows={2}
              value={editText} onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() } if (e.key === 'Escape') setEditing(false) }}
              autoFocus />
            <div className="flex gap-1.5 justify-end text-xs">
              <button onClick={() => setEditing(false)} className="px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100">Cancelar</button>
              <button onClick={saveEdit} className="px-2 py-1 rounded-lg bg-violet-600 text-white hover:bg-violet-700">Guardar</button>
            </div>
          </div>
        ) : (
          <>
            <div className={`px-3.5 py-2 rounded-2xl text-sm shadow-sm ${
              isOwn ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
            }`}>
              {msg.reply_to_id && msg.reply_content && (
                <ReplyPreview content={msg.reply_content} senderName={msg.reply_sender_name || 'Usuario'} isOwn={isOwn} />
              )}

              {msg.deleted_at
                ? <p className="italic opacity-60 text-sm">Mensaje eliminado</p>
                : <MsgContent content={msg.content} isOwn={isOwn} />
              }

              <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {msg.edited_at && !msg.deleted_at && (
                  <span className={`text-xs opacity-60 ${isOwn ? 'text-violet-200' : 'text-gray-400'}`}>editado</span>
                )}
                <span className={`text-xs ${isOwn ? 'text-violet-200' : 'text-gray-400'}`}>
                  {formatMsgTime(msg.created_at)}
                </span>
                <ReadTicks msg={msg} members={members} isGroup={isGroup} />
              </div>
            </div>

            {/* Reactions */}
            <Reactions reactions={msg.reactions} messageId={msg.id} convId={convId} isOwn={isOwn} onReact={handleReact} />
          </>
        )}
      </div>
    </div>
  )
}
