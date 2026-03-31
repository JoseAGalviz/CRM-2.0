import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

// ── Read receipt ticks ─────────────────────────────────────────────────────────
function ReadTicks({ msg, members, isGroup }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const reads  = msg.reads || []
  // Don't show ticks for system messages
  if (msg.type === 'system') return null
  // Only show for own messages
  const { user } = useAuth()
  if (msg.sender_id !== user?.id) return null

  const readersExcludingSelf = reads.filter(r => r.user_id !== user?.id)
  const totalMembers         = members?.length || 2
  const allRead              = readersExcludingSelf.length >= (totalMembers - 1) // -1 for sender

  if (reads.length === 0) {
    // Single grey tick — sending
    return (
      <span className="text-gray-400">
        <svg className="w-3.5 h-3.5 inline" fill="currentColor" viewBox="0 0 16 16">
          <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
        </svg>
      </span>
    )
  }

  const tooltipNames = readersExcludingSelf.map(r => r.name || `Usuario ${r.user_id}`).join(', ')

  return (
    <span
      className="relative cursor-default"
      onMouseEnter={() => readersExcludingSelf.length > 0 && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Double ticks */}
      <span className={allRead ? 'text-blue-500' : 'text-gray-400'}>
        <svg className="w-4 h-4 inline -mr-1" fill="currentColor" viewBox="0 0 16 16">
          <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 11.293 1.854 8.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm-4.208 7-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0z"/>
        </svg>
      </span>

      {/* Tooltip who read (groups) */}
      {showTooltip && readersExcludingSelf.length > 0 && (
        <div className="absolute bottom-5 right-0 z-50 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
          <span className="font-medium">Leído por: </span>{tooltipNames}
          <div className="absolute bottom-0 right-2 translate-y-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
        </div>
      )}
    </span>
  )
}

// ── Avatar initials ────────────────────────────────────────────────────────────
function MiniAvatar({ name }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  )
}

function formatMsgTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ── Main MessageBubble ─────────────────────────────────────────────────────────
export default function MessageBubble({ msg, prevMsg, isGroup, members }) {
  const { user } = useAuth()
  const isOwn    = msg.sender_id === user?.id
  const isSystem = msg.type === 'system'

  // Show sender name if group and not own message and different from previous
  const showSender = isGroup && !isOwn && msg.sender_id !== prevMsg?.sender_id

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-end gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar (only for others in groups) */}
      {isGroup && !isOwn ? (
        msg.sender_id !== prevMsg?.sender_id
          ? <MiniAvatar name={msg.sender_name} />
          : <div className="w-7" />
      ) : null}

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {showSender && (
          <span className="text-xs font-semibold text-violet-600 mb-1 ml-1">
            {msg.sender_name}
          </span>
        )}

        <div className={`relative group px-3.5 py-2 rounded-2xl text-sm shadow-sm ${
          isOwn
            ? 'bg-violet-600 text-white rounded-br-sm'
            : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
        }`}>
          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.deleted_at ? <em className="opacity-60">Mensaje eliminado</em> : msg.content}</p>

          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-xs ${isOwn ? 'text-violet-200' : 'text-gray-400'}`}>
              {formatMsgTime(msg.created_at)}
            </span>
            <ReadTicks msg={msg} members={members} isGroup={isGroup} />
          </div>
        </div>
      </div>
    </div>
  )
}
