import { useEffect, useRef } from 'react'
import { tasksAPI } from '../api/index'

const STORAGE_KEY = 'crm_notified_tasks'
const CHECK_INTERVAL = 5 * 60 * 1000 // 5 min

function getNotifiedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) } catch { return new Set() }
}

function markNotified(id) {
  const ids = getNotifiedIds()
  ids.add(id)
  // Keep only last 200 to avoid unbounded growth
  const arr = [...ids].slice(-200)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
}

async function checkAndNotify() {
  if (Notification.permission !== 'granted') return

  try {
    const res = await tasksAPI.list({ status: 'pending', limit: 50 })
    const tasks = res.data.data.tasks || []
    const now = new Date()
    const notified = getNotifiedIds()

    const overdue  = tasks.filter(t => t.due_date && new Date(t.due_date) < now && !notified.has(t.id))
    const dueToday = tasks.filter(t => {
      if (!t.due_date || notified.has(t.id)) return false
      const due = new Date(t.due_date)
      return due >= now && due.toDateString() === now.toDateString()
    })

    if (overdue.length > 0) {
      new Notification('⚠️ Tareas vencidas', {
        body: overdue.length === 1
          ? `"${overdue[0].title}" está vencida`
          : `${overdue.length} tareas están vencidas`,
        icon: '/favicon.ico',
        tag: 'crm-overdue',
      })
      overdue.forEach(t => markNotified(t.id))
    }

    if (dueToday.length > 0) {
      new Notification('📅 Tareas para hoy', {
        body: dueToday.length === 1
          ? `"${dueToday[0].title}" vence hoy`
          : `${dueToday.length} tareas vencen hoy`,
        icon: '/favicon.ico',
        tag: 'crm-today',
      })
      dueToday.forEach(t => markNotified(t.id))
    }
  } catch {
    // silent — notifications are best-effort
  }
}

export function useTaskNotifications() {
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!('Notification' in window)) return

    const run = () => {
      if (Notification.permission === 'granted') {
        checkAndNotify()
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') checkAndNotify()
        })
      }
    }

    // Small delay so app finishes loading before first check
    const init = setTimeout(run, 3000)
    intervalRef.current = setInterval(run, CHECK_INTERVAL)

    return () => {
      clearTimeout(init)
      clearInterval(intervalRef.current)
    }
  }, [])
}
