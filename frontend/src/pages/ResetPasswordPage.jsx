import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI } from '../api/index'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (form.password.length < 8) {
      toast.error('Mínimo 8 caracteres')
      return
    }
    setLoading(true)
    try {
      await authAPI.resetPassword(token, form.password)
      toast.success('Contraseña actualizada. Inicia sesión.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Token inválido o expirado')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="card p-8 text-center max-w-sm w-full">
          <p className="text-red-600 font-medium">Enlace inválido</p>
          <p className="text-sm text-gray-500 mt-2">Este enlace de recuperación no es válido o ha expirado.</p>
          <Link to="/forgot-password" className="btn-primary mt-4 block">Solicitar nuevo enlace</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">Elige una contraseña segura</p>
        </div>

        <div className="card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Nueva contraseña</label>
              <input
                type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required minLength={8} className="input" placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label className="label">Confirmar contraseña</label>
              <input
                type="password" value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                required minLength={8} className="input" placeholder="Repite la contraseña"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner size="sm" /> : 'Actualizar contraseña'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">← Volver al login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
