import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api/index'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'
import { UsersIcon, BriefcaseIcon, ChartBarIcon, ChatIcon, MailIcon } from '../components/ui/icons'

const features = [
  { Icon: UsersIcon,     label: 'Gestión de contactos y empresas',       color: 'bg-violet-500/20 text-violet-300' },
  { Icon: BriefcaseIcon, label: 'Pipeline de negocios visual',            color: 'bg-blue-500/20   text-blue-300'   },
  { Icon: ChartBarIcon,  label: 'Dashboard con métricas en tiempo real',  color: 'bg-emerald-500/20 text-emerald-300' },
  { Icon: ChatIcon,      label: 'Chat interno con notificaciones',         color: 'bg-amber-500/20  text-amber-300'  },
]

export default function LoginPage() {
  const [form, setForm]         = useState({ email: '', password: '' })
  const [loading, setLoading]   = useState(false)
  const [twoFAStep, setTwoFAStep] = useState(false)
  const [twoFAUserId, setTwoFAUserId] = useState(null)
  const [totpCode, setTotpCode] = useState('')
  const { login, loginWithTokens } = useAuth()
  const navigate                = useNavigate()

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login(form.email, form.password)
      if (res?.requires2fa) {
        setTwoFAStep(true)
        setTwoFAUserId(res.userId)
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const submit2FA = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.twoFA.verify(twoFAUserId, totpCode)
      const { user, accessToken, refreshToken } = res.data.data
      loginWithTokens(user, accessToken, refreshToken)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Código incorrecto')
    } finally {
      setLoading(false)
    }
  }

  const demo = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login('demo@crm.com', 'demo123')
      navigate('/dashboard')
    } catch {
      toast.error('Demo no disponible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel (desktop) ───────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] bg-slate-900 p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-violet-700/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-purple-900/30 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-800/10 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/50">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">CRM Pro</span>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestiona tus<br />clientes de forma<br />
            <span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
              inteligente
            </span>
          </h2>
          <p className="text-slate-400 text-base mb-10 leading-relaxed">
            Centraliza contactos, negocios y actividades.<br />Tu equipo, sincronizado.
          </p>

          <ul className="space-y-3">
            {features.map(({ Icon, label, color }, i) => (
              <li key={i} className="flex items-center gap-3.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-slate-300 text-sm">{label}</span>
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

          <h1 className="text-2xl font-bold text-gray-900 mb-1">{twoFAStep ? 'Verificación 2FA' : 'Bienvenido de vuelta'}</h1>
          <p className="text-sm text-gray-500 mb-8">{twoFAStep ? 'Ingresa el código de tu app de autenticación' : 'Inicia sesión en tu cuenta'}</p>

          {twoFAStep ? (
            <form onSubmit={submit2FA} className="space-y-5">
              <div>
                <label className="label">Código de 6 dígitos</label>
                <input value={totpCode} onChange={e => setTotpCode(e.target.value)} required maxLength={6} pattern="[0-9]{6}"
                  className="input text-center text-2xl tracking-[0.5em] font-mono" placeholder="000000" autoFocus />
              </div>
              <button type="submit" disabled={loading || totpCode.length < 6} className="btn-primary w-full btn-lg">
                {loading ? <Spinner size="sm" /> : 'Verificar'}
              </button>
              <button type="button" onClick={() => { setTwoFAStep(false); setTotpCode('') }} className="w-full text-sm text-gray-500 hover:text-gray-700">
                ← Volver al login
              </button>
            </form>
          ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                  <MailIcon className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  name="email" type="email" value={form.email} onChange={handle}
                  required className="input pl-10" placeholder="tu@empresa.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  name="password" type="password" value={form.password} onChange={handle}
                  required className="input pl-10" placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
              {loading ? <Spinner size="sm" /> : 'Iniciar sesión'}
            </button>
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">¿Olvidaste tu contraseña?</Link>
            </div>
          </form>

          )}

          {!twoFAStep && (<>
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
          </>)}
        </div>
      </div>
    </div>
  )
}
