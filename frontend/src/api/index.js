import client from './client'

// Auth
export const authAPI = {
  login: (data) => client.post('/auth/login', data),
  register: (data) => client.post('/auth/register', data),
  logout: (refreshToken) => client.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken) => client.post('/auth/refresh', { refreshToken }),
  me: () => client.get('/auth/me'),
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => client.post('/auth/reset-password', { token, password }),
  twoFA: {
    status: () => client.get('/auth/2fa/status'),
    setup: () => client.post('/auth/2fa/setup'),
    enable: (token) => client.post('/auth/2fa/enable', { token }),
    disable: (token) => client.post('/auth/2fa/disable', { token }),
    verify: (userId, token) => client.post('/auth/2fa/verify', { userId, token }),
  },
}

// Users
export const usersAPI = {
  list: () => client.get('/users'),
  directory: () => client.get('/users/directory'),
  get: (id) => client.get(`/users/${id}`),
  updateMe: (data) => client.put('/users/me', data),
  changePassword: (data) => client.put('/users/me/password', data),
  create: (data) => client.post('/users', data),
  update: (id, data) => client.put(`/users/${id}`, data),
  toggleStatus: (id) => client.patch(`/users/${id}/status`),
  delete: (id) => client.delete(`/users/${id}`),
}

// Dashboard
export const dashboardAPI = {
  metrics: () => client.get('/dashboard/metrics'),
  dealsByStage: () => client.get('/dashboard/deals-by-stage'),
  dealsByMonth: () => client.get('/dashboard/deals-by-month'),
  recentActivities: () => client.get('/dashboard/recent-activities'),
  overdueTasks: () => client.get('/dashboard/overdue-tasks'),
  topDeals: () => client.get('/dashboard/top-deals'),
}

// Contacts
export const contactsAPI = {
  list: (params) => client.get('/contacts', { params }),
  get: (id) => client.get(`/contacts/${id}`),
  create: (data) => client.post('/contacts', data),
  update: (id, data) => client.put(`/contacts/${id}`, data),
  delete: (id) => client.delete(`/contacts/${id}`),
  import: (rows) => client.post('/contacts/import', { rows }),
  bulkDelete: (ids) => client.post('/contacts/bulk-delete', { ids }),
  bulkAssign: (ids, owner_id) => client.patch('/contacts/bulk-assign', { ids, owner_id }),
  findDuplicates: () => client.get('/contacts/find-duplicates'),
  merge: (keepId, mergeId) => client.post('/contacts/merge', { keepId, mergeId }),
  deals: (id) => client.get(`/contacts/${id}/deals`),
  activities: (id) => client.get(`/contacts/${id}/activities`),
  tasks: (id) => client.get(`/contacts/${id}/tasks`),
  notes: (id) => client.get(`/contacts/${id}/notes`),
}

// Companies
export const companiesAPI = {
  list: (params) => client.get('/companies', { params }),
  get: (id) => client.get(`/companies/${id}`),
  create: (data) => client.post('/companies', data),
  update: (id, data) => client.put(`/companies/${id}`, data),
  delete: (id) => client.delete(`/companies/${id}`),
  import: (rows) => client.post('/companies/import', { rows }),
  bulkDelete: (ids) => client.post('/companies/bulk-delete', { ids }),
  merge: (keepId, mergeId) => client.post('/companies/merge', { keepId, mergeId }),
  contacts: (id) => client.get(`/companies/${id}/contacts`),
  deals: (id) => client.get(`/companies/${id}/deals`),
  activities: (id) => client.get(`/companies/${id}/activities`),
  notes: (id) => client.get(`/companies/${id}/notes`),
}

// Deals
export const dealsAPI = {
  list: (params) => client.get('/deals', { params }),
  get: (id) => client.get(`/deals/${id}`),
  create: (data) => client.post('/deals', data),
  update: (id, data) => client.put(`/deals/${id}`, data),
  updateStage: (id, stage, lost_reason) => client.patch(`/deals/${id}/stage`, { stage, lost_reason }),
  delete: (id) => client.delete(`/deals/${id}`),
  bulkDelete: (ids) => client.post('/deals/bulk-delete', { ids }),
  activities: (id) => client.get(`/deals/${id}/activities`),
  tasks: (id) => client.get(`/deals/${id}/tasks`),
  notes: (id) => client.get(`/deals/${id}/notes`),
}

// Tasks
export const tasksAPI = {
  list: (params) => client.get('/tasks', { params }),
  get: (id) => client.get(`/tasks/${id}`),
  create: (data) => client.post('/tasks', data),
  update: (id, data) => client.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => client.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => client.delete(`/tasks/${id}`),
}

// Activities
export const activitiesAPI = {
  list: (params) => client.get('/activities', { params }),
  get: (id) => client.get(`/activities/${id}`),
  create: (data) => client.post('/activities', data),
  update: (id, data) => client.put(`/activities/${id}`, data),
  delete: (id) => client.delete(`/activities/${id}`),
}

// Notes
export const notesAPI = {
  list: (params) => client.get('/notes', { params }),
  create: (data) => client.post('/notes', data),
  update: (id, data) => client.put(`/notes/${id}`, data),
  delete: (id) => client.delete(`/notes/${id}`),
}

// Search
export const searchAPI = {
  global: (q, limit = 5) => client.get('/search', { params: { q, limit } }),
}

// Audit logs
export const auditAPI = {
  list: (params) => client.get('/audit-logs', { params }),
}

// Pipeline stages
export const pipelineAPI = {
  list: () => client.get('/pipeline'),
  create: (data) => client.post('/pipeline', data),
  update: (id, data) => client.put(`/pipeline/${id}`, data),
  delete: (id) => client.delete(`/pipeline/${id}`),
}

// Webhooks
export const webhooksAPI = {
  list: () => client.get('/webhooks'),
  create: (data) => client.post('/webhooks', data),
  update: (id, data) => client.put(`/webhooks/${id}`, data),
  toggle: (id) => client.patch(`/webhooks/${id}/toggle`),
  delete: (id) => client.delete(`/webhooks/${id}`),
  deliveries: (id, limit = 20) => client.get(`/webhooks/${id}/deliveries`, { params: { limit } }),
  test: (id) => client.post(`/webhooks/${id}/test`),
}
