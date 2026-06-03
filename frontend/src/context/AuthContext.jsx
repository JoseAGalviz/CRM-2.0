import { createContext, useContext, useCallback } from 'react'
import { DEMO_USER } from '../demo/data'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const login = useCallback(async () => {}, [])
  const register = useCallback(async () => {}, [])
  const logout = useCallback(async () => {}, [])

  return (
    <AuthContext.Provider value={{ user: DEMO_USER, login, register, logout, loading: false }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
