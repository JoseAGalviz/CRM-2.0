import client from './client'

export const chatApi = {
  // Users
  getUsers: ()                          => client.get('/chat/users').then(r => r.data.data),

  // Conversations
  getConversations: ()                  => client.get('/chat/conversations').then(r => r.data.data),
  createConversation: (payload)         => client.post('/chat/conversations', payload).then(r => r.data.data),

  // Messages
  getMessages: (convId, params)         => client.get(`/chat/conversations/${convId}/messages`, { params }).then(r => r.data.data),
  sendMessage: (convId, content)        => client.post(`/chat/conversations/${convId}/messages`, { content }).then(r => r.data.data),
  markAsRead: (convId)                  => client.put(`/chat/conversations/${convId}/read`).then(r => r.data.data),

  // Members
  getMembers: (convId)                  => client.get(`/chat/conversations/${convId}/members`).then(r => r.data.data),
  addMembers: (convId, userIds)         => client.post(`/chat/conversations/${convId}/members`, { userIds }).then(r => r.data.data),
  removeMember: (convId, userId)        => client.delete(`/chat/conversations/${convId}/members/${userId}`).then(r => r.data.data),
}
