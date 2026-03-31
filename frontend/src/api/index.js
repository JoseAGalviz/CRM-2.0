import client from './client'

// Auth
export const authAPI = {
  login: (data) => client.post('/auth/login', data),
  register: (data) => client.post('/auth/register', data),
  logout: (refreshToken) => client.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken) => client.post('/auth/refresh', { refreshToken }),
  me: () => client.get('/auth/me'),
}

// Users
export const usersAPI = {
  list: () => client.get('/users'),
  get: (id) => client.get(`/users/${id}`),
  updateMe: (data) => client.put('/users/me', data),
  changePassword: (data) => client.put('/users/me/password', data),
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
  contacts: (id) => client.get(`/companies/${id}/contacts`),
  deals: (id) => client.get(`/companies/${id}/deals`),
}

// Deals
export const dealsAPI = {
  list: (params) => client.get('/deals', { params }),
  get: (id) => client.get(`/deals/${id}`),
  create: (data) => client.post('/deals', data),
  update: (id, data) => client.put(`/deals/${id}`, data),
  updateStage: (id, stage, lost_reason) => client.patch(`/deals/${id}/stage`, { stage, lost_reason }),
  delete: (id) => client.delete(`/deals/${id}`),
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
