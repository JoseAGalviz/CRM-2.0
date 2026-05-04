import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'

const features = [
  { icon: '👥', text: 'Gestión de contactos y empresas' },
  { icon: '💼', text: 'Pipeline de negocios visual' },
  { icon: '📊', text: 'Dashboard con métricas en tiempo real' },
  { icon: '💬', text: 'Chat interno con notificaciones' },
]

export default function LoginPage() {
  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login }   = useAuth()
  const navigate    = useNavigate()

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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel (desktop) ───────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] bg-slate-900 p-12 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-violet-700/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-purple-900/30 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">CRM Pro</span>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestiona tus<br />clientes de forma<br />
            <span className="text-violet-400">inteligente</span>
          </h2>
          <p className="text-slate-400 text-base mb-10 leading-relaxed">
            Centraliza contactos, negocios y actividades.<br />Tu equipo, sincronizado.
          </p>

          <ul className="space-y-4">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="text-lg leading-none">{f.icon}</span>
                <span className="text-slate-300 text-sm">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-slate-600 text-xs">© {new Date().getFullYear()} CRM Pro. Todos los derechos reservados.</p>
      </div>

      {/* ── Right panel (form) ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CRM Pro</h1>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido de vuelta</h1>
          <p className="text-sm text-gray-500 mb-8">Inicia sesión en tu cuenta</p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                name="email" type="email" value={form.email} onChange={handle}
                required className="input" placeholder="tu@empresa.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                name="password" type="password" value={form.password} onChange={handle}
                required className="input" placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
              {loading ? <Spinner size="sm" /> : 'Iniciar sesión'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-gray-400 bg-white">o prueba con</span>
            </div>
          </div>

          <button onClick={demo} disabled={loading} className="btn-secondary w-full">
            Entrar con cuenta demo
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
