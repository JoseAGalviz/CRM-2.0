import { useState, useRef, useEffect } from 'react'
import { useChat } from '../../context/ChatContext'

export default function MessageInput({ convId, replyTo, onCancelReply }) {
  const [text, setText]     = useState('')
  const { sendMessage, emitTyping } = useChat()
  const textareaRef = useRef(null)

  // Focus textarea when reply changes
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus()
  }, [replyTo])

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed) return
    sendMessage(convId, trimmed, replyTo?.id ?? null)
    setText('')
    onCancelReply?.()
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape' && replyTo) { e.preventDefault(); onCancelReply?.() }
  }

  function handleChange(e) {
    setText(e.target.value)
    emitTyping(convId)
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }
  }

  return (
    <div className="bg-white border-t border-gray-100" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-3 px-4 py-2 bg-violet-50 border-b border-violet-100">
          <div className="flex-1 min-w-0 border-l-2 border-violet-500 pl-3">
            <p className="text-xs font-semibold text-violet-600 truncate">{replyTo.sender_name}</p>
            <p className="text-xs text-gray-500 truncate">
              {replyTo.content?.length > 80 ? replyTo.content.slice(0, 80) + '…' : replyTo.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-full hover:bg-violet-100 text-violet-400 flex-shrink-0 transition-colors"
            title="Cancelar respuesta"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 p-3">
        <div className="flex-1 flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent focus-within:bg-white transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? 'Escribe tu respuesta…' : 'Escribe un mensaje…'}
            className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
            style={{ maxHeight: '120px', fontSize: '16px' }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-10 h-10 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-sm hover:shadow-md"
          title="Enviar"
        >
          <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
