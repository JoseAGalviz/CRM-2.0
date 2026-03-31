import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Las contraseñas no coinciden'); return }
    if (form.password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      navigate('/dashboard')
      toast.success('Cuenta creada exitosamente')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrarse')
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
          <p className="text-gray-500 mt-1">Crea tu cuenta gratuita</p>
        </div>

        <div className="card p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Nombre completo</label>
              <input name="name" type="text" value={form.name} onChange={handle} required className="input" placeholder="Tu nombre" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" value={form.email} onChange={handle} required className="input" placeholder="tu@empresa.com" />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input name="password" type="password" value={form.password} onChange={handle} required className="input" placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <label className="label">Confirmar contraseña</label>
              <input name="confirm" type="password" value={form.confirm} onChange={handle} required className="input" placeholder="Repite la contraseña" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full btn-lg mt-2">
              {loading ? <Spinner size="sm" /> : 'Crear cuenta'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
