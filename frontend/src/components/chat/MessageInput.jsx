import { useState, useRef } from 'react'
import { useChat } from '../../context/ChatContext'

export default function MessageInput({ convId }) {
  const [text, setText]     = useState('')
  const { sendMessage, emitTyping } = useChat()
  const textareaRef = useRef(null)

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed) return
    sendMessage(convId, trimmed)
    setText('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleChange(e) {
    setText(e.target.value)
    emitTyping(convId)
    // Auto-resize
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }
  }

  return (
    <div className="flex items-end gap-2 p-3 bg-white border-t border-gray-100">
      <div className="flex-1 flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent focus-within:bg-white transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
          style={{ maxHeight: '120px' }}
        />
      </div>

      <button
        onClick={handleSend}
        disabled={!text.trim()}
        className="w-10 h-10 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-all duration-150 flex-shrink-0 shadow-sm hover:shadow-md"
        title="Enviar"
      >
        <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  )
}
