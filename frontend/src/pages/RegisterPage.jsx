import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'

export default function RegisterPage() {
  const [form, setForm]     = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate     = useNavigate()

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Las contraseñas no coinciden'); return }
    if (form.password.length < 8)       { toast.error('La contraseña debe tener al menos 8 caracteres'); return }
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel (desktop) ───────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-center w-[44%] bg-slate-900 p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-violet-700/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-purple-900/30 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-14">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">CRM Pro</span>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Empieza gratis.<br />
            <span className="text-violet-400">Sin límites.</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Crea tu cuenta en segundos y comienza a gestionar tu negocio de manera más eficiente.
          </p>
        </div>
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

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Crea tu cuenta</h1>
          <p className="text-sm text-gray-500 mb-8">Gratis, sin tarjeta de crédito</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Nombre completo</label>
              <input
                name="name" type="text" value={form.name} onChange={handle}
                required className="input" placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                name="email" type="email" value={form.email} onChange={handle}
                required className="input" placeholder="tu@empresa.com"
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                name="password" type="password" value={form.password} onChange={handle}
                required className="input" placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label className="label">Confirmar contraseña</label>
              <input
                name="confirm" type="password" value={form.confirm} onChange={handle}
                required className="input" placeholder="Repite la contraseña"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full btn-lg mt-2">
              {loading ? <Spinner size="sm" /> : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
