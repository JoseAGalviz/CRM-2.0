import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

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
    <span
      className="relative cursor-default"
      onMouseEnter={() => readersExcludeSelf.length > 0 && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
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
  const clampedContent = content?.length > 80 ? content.slice(0, 80) + '…' : content
  return (
    <div className={`mb-1.5 px-2 py-1.5 rounded-lg border-l-2 text-xs ${
      isOwn
        ? 'bg-violet-700/50 border-violet-300 text-violet-100'
        : 'bg-gray-100 border-violet-400 text-gray-600'
    }`}>
      <p className={`font-semibold mb-0.5 ${isOwn ? 'text-violet-200' : 'text-violet-600'}`}>
        {senderName}
      </p>
      <p className="opacity-80 leading-snug">{clampedContent}</p>
    </div>
  )
}

function formatMsgTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ msg, prevMsg, isGroup, members, onReply }) {
  const { user } = useAuth()
  const [hover, setHover] = useState(false)
  const isOwn    = msg.sender_id === user?.id
  const isSystem = msg.type === 'system'
  const showSender = isGroup && !isOwn && msg.sender_id !== prevMsg?.sender_id

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">{msg.content}</span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-end gap-1.5 mb-1 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar (group, others only) */}
      {isGroup && !isOwn ? (
        msg.sender_id !== prevMsg?.sender_id
          ? <MiniAvatar name={msg.sender_name} />
          : <div className="w-7" />
      ) : null}

      {/* Reply button — shown on hover */}
      <div className={`flex items-center self-center transition-opacity duration-100 ${hover ? 'opacity-100' : 'opacity-0'} ${isOwn ? 'order-last mr-1' : 'order-first ml-1'}`}>
        <button
          onClick={() => onReply?.(msg)}
          className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
          title="Responder"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
      </div>

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[65%]`}>
        {showSender && (
          <span className="text-xs font-semibold text-violet-600 mb-1 ml-1">{msg.sender_name}</span>
        )}

        <div className={`px-3.5 py-2 rounded-2xl text-sm shadow-sm ${
          isOwn
            ? 'bg-violet-600 text-white rounded-br-sm'
            : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
        }`}>
          {/* Reply preview */}
          {msg.reply_to_id && msg.reply_content && (
            <ReplyPreview
              content={msg.reply_content}
              senderName={msg.reply_sender_name || 'Usuario'}
              isOwn={isOwn}
            />
          )}

          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {msg.deleted_at
              ? <em className="opacity-60">Mensaje eliminado</em>
              : msg.content}
          </p>

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
