import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const demo = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login('admin@crm.com', 'password123')
      navigate('/dashboard')
    } catch {
      toast.error('Demo no disponible. Ejecuta el seed primero.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">CRM Pro</h1>
          <p className="text-gray-500 mt-1">Inicia sesión en tu cuenta</p>
        </div>

        <div className="card p-8">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" value={form.email} onChange={handle} required className="input" placeholder="admin@crm.com" autoComplete="email" />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input name="password" type="password" value={form.password} onChange={handle} required className="input" placeholder="••••••••" autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
              {loading ? <Spinner size="sm" /> : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button onClick={demo} disabled={loading} className="btn-secondary w-full text-sm">
              🎯 Probar con demo (admin@crm.com)
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
