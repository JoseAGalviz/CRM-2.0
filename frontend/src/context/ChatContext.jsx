import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { chatApi } from '../api/chat'
import { useAuth } from './AuthContext'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const { user } = useAuth()
  const socketRef = useRef(null)

  const [conversations, setConversations]       = useState([])
  const [activeConvId, setActiveConvId]         = useState(null)
  const [messages, setMessages]                 = useState({})         // { [convId]: Message[] }
  const [typingUsers, setTypingUsers]           = useState({})         // { [convId]: { userId: name } }
  const [loadingConvs, setLoadingConvs]         = useState(false)
  const [loadingMsgs, setLoadingMsgs]           = useState(false)
  const [connected, setConnected]               = useState(false)

  // Soft notification sound
  const notificationSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'))

  const typingTimers = useRef({})

  // ── Total unread badge ───────────────────────────────────────────────────────
  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0)

  // ── Load conversations ───────────────────────────────────────────────────────
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

  // ── Load messages for a conversation ────────────────────────────────────────
  const loadMessages = useCallback(async (convId, before = null) => {
    setLoadingMsgs(true)
    try {
      const params = before ? { before, limit: 50 } : { limit: 50 }
      const data   = await chatApi.getMessages(convId, params)
      setMessages(prev => ({
        ...prev,
        [convId]: before ? [...data, ...(prev[convId] || [])] : data,
      }))
      return data
    } catch (e) {
      console.error('loadMessages', e)
      return []
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  // ── Open conversation ────────────────────────────────────────────────────────
  const openConversation = useCallback(async (convId) => {
    setActiveConvId(convId)
    if (!messages[convId]) await loadMessages(convId)

    // Mark as read
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark_read', { conversationId: convId })
    } else {
      await chatApi.markAsRead(convId)
    }

    // Update unread count locally
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c)
    )
  }, [messages, loadMessages])

  // ── Send message ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback((convId, content) => {
    if (!content?.trim()) return
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { conversationId: convId, content })
      // Stop typing
      socketRef.current.emit('stop_typing', { conversationId: convId })
    }
  }, [])

  // ── Typing ───────────────────────────────────────────────────────────────────
  const emitTyping = useCallback((convId) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('typing', { conversationId: convId })
    clearTimeout(typingTimers.current[convId])
    typingTimers.current[convId] = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { conversationId: convId })
    }, 2500)
  }, [])

  // ── Create conversation ──────────────────────────────────────────────────────
  const createConversation = useCallback(async (payload) => {
    const conv = await chatApi.createConversation(payload)
    await loadConversations()
    // Join socket room
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_conversation', { conversationId: conv.id })
    }
    return conv
  }, [loadConversations])

  // ── Add / remove members ─────────────────────────────────────────────────────
  const addMembers  = (convId, userIds) => chatApi.addMembers(convId, userIds).then(loadConversations)
  const removeMember = (convId, userId) => chatApi.removeMember(convId, userId).then(loadConversations)

  // ── Socket.IO setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const token  = localStorage.getItem('accessToken')
    const socketHost = window.location.hostname === 'localhost' ? 'http://localhost:5000' : `${window.location.protocol}//${window.location.hostname}:5000`
    const socket = io(socketHost, {
      auth:              { token },
      transports:        ['websocket', 'polling'],
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_conversations')
    })
    socket.on('disconnect', () => setConnected(false))

    // New message received
    socket.on('new_message', (msg) => {
      const cid = msg.conversation_id
      setMessages(prev => ({
        ...prev,
        [cid]: [...(prev[cid] || []), msg],
      }))

      // Play sound if message is not from self
      if (msg.sender_id !== user.id) {
        notificationSound.current.play().catch(e => console.log('Audio play blocked by browser:', e))
      }

      // Update last message + unread in conversation list
      setConversations(prev => {
        const exists = prev.some(c => c.id === cid)
        if (!exists) {
          // Unknown conversation, refresh list
          loadConversations()
          return prev
        }
        return prev.map(c => {
          if (c.id !== cid) return c
          const isActive  = cid === activeConvIdRef.current
          const increment = (msg.sender_id !== user.id && !isActive) ? 1 : 0
          return {
            ...c,
            last_msg_content:    msg.content,
            last_msg_at:         msg.created_at,
            last_msg_sender_name: msg.sender_name,
            unread_count:        (c.unread_count || 0) + increment,
          }
        }).sort((a, b) =>
          new Date(b.last_msg_at || b.updated_at) - new Date(a.last_msg_at || a.updated_at)
        )
      })

      // Auto-mark as read if conversation is active
      if (activeConvIdRef.current === cid && msg.sender_id !== user.id) {
        socket.emit('mark_read', { conversationId: cid })
      }
    })

    // Read receipts update
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

    // Typing
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

    return () => {
      socket.disconnect()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a ref to activeConvId for use inside socket callbacks
  const activeConvIdRef = useRef(activeConvId)
  useEffect(() => { activeConvIdRef.current = activeConvId }, [activeConvId])

  const value = {
    conversations,
    activeConvId,
    messages,
    typingUsers,
    loadingConvs,
    loadingMsgs,
    connected,
    totalUnread,
    openConversation,
    sendMessage,
    emitTyping,
    createConversation,
    addMembers,
    removeMember,
    loadMessages,
    loadConversations,
    setActiveConvId,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
