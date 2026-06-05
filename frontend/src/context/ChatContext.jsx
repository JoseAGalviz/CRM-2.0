import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { chatApi } from '../api/chat'
import { useAuth } from './AuthContext'

function playNotificationBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.25)
  } catch {}
}

const ChatContext = createContext(null)

// Toast component rendered inside Toaster (inside BrowserRouter) so useNavigate works
function ChatToast({ t, senderName, preview, convId, navigate }) {
  return (
    <div
      className="flex items-start gap-3 cursor-pointer max-w-xs"
      onClick={() => { navigate(`/chat/${convId}`); toast.dismiss(t.id) }}
    >
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {senderName?.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{senderName}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{preview}</p>
      </div>
    </div>
  )
}

export function ChatProvider({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const socketRef = useRef(null)

  const [conversations, setConversations]   = useState([])
  const [activeConvId, setActiveConvId]     = useState(null)
  const [messages, setMessages]             = useState({})
  const [hasMoreMessages, setHasMoreMessages] = useState({})
  const [typingUsers, setTypingUsers]       = useState({})
  const [loadingConvs, setLoadingConvs]     = useState(false)
  const [loadingMsgs, setLoadingMsgs]       = useState(false)
  const [connected, setConnected]           = useState(false)
  const [onlineUsers, setOnlineUsers]       = useState(new Set())
  const [users, setUsers]                   = useState([])

  const typingTimers = useRef({})

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0)

  // Keep activeConvId in a ref for stable socket callbacks
  const activeConvIdRef = useRef(activeConvId)
  useEffect(() => { activeConvIdRef.current = activeConvId }, [activeConvId])

  // Keep messages in a ref so openConversation doesn't recreate on every message
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  const loadConversations = useCallback(async () => {
    if (!user) return
    setLoadingConvs(true)
    try {
      const data = await chatApi.getConversations()
      setConversations(data)
    } catch (e) {
      console.error('loadConversations', e)
    } finally {
      setLoadingConvs(false)
    }
  }, [user])

  const loadUsers = useCallback(async () => {
    try {
      const data = await chatApi.getUsers()
      setUsers(data)
    } catch (e) {
      console.error('loadUsers', e)
    }
  }, [])

  const loadMessages = useCallback(async (convId, before = null) => {
    setLoadingMsgs(true)
    try {
      const params = before ? { before, limit: 50 } : { limit: 50 }
      const data   = await chatApi.getMessages(convId, params)
      setMessages(prev => ({
        ...prev,
        [convId]: before ? [...data, ...(prev[convId] || [])] : data,
      }))
      setHasMoreMessages(prev => ({ ...prev, [convId]: data.length === 50 }))
      return data
    } catch (e) {
      console.error('loadMessages', e)
      return []
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  const openConversation = useCallback(async (convId) => {
    setActiveConvId(convId)
    if (!messagesRef.current[convId]) await loadMessages(convId)

    if (socketRef.current?.connected) {
      socketRef.current.emit('mark_read', { conversationId: convId })
    } else {
      await chatApi.markAsRead(convId)
    }

    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c)
    )
  }, [loadMessages])

  const sendMessage = useCallback((convId, content, reply_to_id = null) => {
    if (!content?.trim()) return
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { conversationId: convId, content, reply_to_id })
      socketRef.current.emit('stop_typing', { conversationId: convId })
    }
  }, [])

  const emitTyping = useCallback((convId) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('typing', { conversationId: convId })
    clearTimeout(typingTimers.current[convId])
    typingTimers.current[convId] = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { conversationId: convId })
    }, 2500)
  }, [])

  const createConversation = useCallback(async (payload) => {
    const conv = await chatApi.createConversation(payload)
    await loadConversations()
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_conversation', { conversationId: conv.id })
    }
    return conv
  }, [loadConversations])

  const addMembers   = (convId, userIds) => chatApi.addMembers(convId, userIds).then(loadConversations)
  const removeMember = (convId, userId) => chatApi.removeMember(convId, userId).then(loadConversations)

  // ── Socket.IO setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const token  = localStorage.getItem('accessToken')
    const socket = io('/', {
      auth:              { token },
      transports:        ['websocket', 'polling'],
      reconnectionDelay: 1000,
      path:              '/socket.io',
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_conversations')
    })
    socket.on('disconnect', () => setConnected(false))

    // Online presence
    socket.on('online_users', ({ userIds }) => setOnlineUsers(new Set(userIds)))
    socket.on('user_online',  ({ userId }) => setOnlineUsers(s => new Set([...s, userId])))
    socket.on('user_offline', ({ userId }) => setOnlineUsers(s => { const n = new Set(s); n.delete(userId); return n }))

    // Message editing
    socket.on('message_edited', ({ messageId, content, editedAt }) => {
      setMessages(prev => {
        const updated = {}
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[cid] = msgs.map(m => m.id === messageId ? { ...m, content, edited_at: editedAt } : m)
        }
        return updated
      })
    })

    // Message deletion
    socket.on('message_deleted', ({ messageId, deletedAt }) => {
      setMessages(prev => {
        const updated = {}
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[cid] = msgs.map(m => m.id === messageId ? { ...m, deleted_at: deletedAt, content: '' } : m)
        }
        return updated
      })
    })

    // Reactions
    socket.on('reaction_updated', ({ messageId, reactions }) => {
      setMessages(prev => {
        const updated = {}
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[cid] = msgs.map(m => m.id === messageId ? { ...m, reactions } : m)
        }
        return updated
      })
    })

    socket.on('new_message', (msg) => {
      const cid = msg.conversation_id

      setMessages(prev => ({
        ...prev,
        [cid]: [...(prev[cid] || []), msg],
      }))

      if (msg.sender_id !== user.id) {
        // Sound notification
        playNotificationBeep()

        // Toast notification when not in this conversation
        if (activeConvIdRef.current !== cid) {
          const preview = msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content
          toast.custom(
            (t) => (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 max-w-sm w-full">
                <ChatToast
                  t={t}
                  senderName={msg.sender_name}
                  preview={preview}
                  convId={cid}
                  navigate={navigate}
                />
              </div>
            ),
            { duration: 4500, id: `chat-${cid}` }
          )
        }
      }

      setConversations(prev => {
        const exists = prev.some(c => c.id === cid)
        if (!exists) { loadConversations(); return prev }
        return prev.map(c => {
          if (c.id !== cid) return c
          const isActive  = cid === activeConvIdRef.current
          const increment = (msg.sender_id !== user.id && !isActive) ? 1 : 0
          return {
            ...c,
            last_msg_content:     msg.content,
            last_msg_at:          msg.created_at,
            last_msg_sender_id:   msg.sender_id,
            last_msg_sender_name: msg.sender_name,
            unread_count:         (c.unread_count || 0) + increment,
          }
        }).sort((a, b) =>
          new Date(b.last_msg_at || b.updated_at) - new Date(a.last_msg_at || a.updated_at)
        )
      })

      if (activeConvIdRef.current === cid && msg.sender_id !== user.id) {
        socket.emit('mark_read', { conversationId: cid })
      }
    })

    socket.on('messages_read', ({ conversationId, readBy, messageIds, readAt }) => {
      setMessages(prev => {
        const msgs = prev[conversationId]
        if (!msgs) return prev
        return {
          ...prev,
          [conversationId]: msgs.map(m =>
            messageIds.includes(m.id)
              ? {
                  ...m,
                  reads: [
                    ...(m.reads || []).filter(r => r.user_id !== readBy.id),
                    { user_id: readBy.id, name: readBy.name, read_at: readAt },
                  ],
                }
              : m
          ),
        }
      })
    })

    socket.on('user_typing', ({ conversationId, userId: uid, name }) => {
      setTypingUsers(prev => ({
        ...prev,
        [conversationId]: { ...(prev[conversationId] || {}), [uid]: name },
      }))
    })
    socket.on('user_stop_typing', ({ conversationId, userId: uid }) => {
      setTypingUsers(prev => {
        const t = { ...(prev[conversationId] || {}) }
        delete t[uid]
        return { ...prev, [conversationId]: t }
      })
    })

    loadConversations()
    loadUsers()

    return () => {
      socket.disconnect()
      Object.values(typingTimers.current).forEach(clearTimeout)
      typingTimers.current = {}
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    conversations, activeConvId, messages, hasMoreMessages, typingUsers,
    loadingConvs, loadingMsgs, connected, totalUnread, onlineUsers, users,
    openConversation, sendMessage, emitTyping, createConversation,
    addMembers, removeMember, loadMessages, loadConversations, setActiveConvId,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
