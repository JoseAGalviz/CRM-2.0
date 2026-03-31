import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usersAPI } from '../api/index'
import toast from 'react-hot-toast'
import Spinner from '../components/ui/Spinner'
import Avatar from '../components/ui/Avatar'
import { formatDate } from '../utils/formatters'

export default function ProfilePage() {
  const { user } = useAuth()
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', avatar_url: user?.avatar_url || '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const handleProfile = async (e) => {
    e.preventDefault(); setSavingProfile(true)
    try {
      await usersAPI.updateMe(profileForm)
      toast.success('Perfil actualizado')
    } catch (err) { toast.error(err.response?.data?.message || 'Error actualizando perfil') }
    finally { setSavingProfile(false) }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Las contraseñas no coinciden'); return }
    if (pwForm.newPassword.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    setSavingPw(true)
    try {
      await usersAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('Contraseña actualizada')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) { toast.error(err.response?.data?.message || 'Error actualizando contraseña') }
    finally { setSavingPw(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile info */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={user?.name} size="lg" src={user?.avatar_url} />
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-gray-500">{user?.email}</p>
            <div className="flex gap-2 mt-1">
              <span className={`badge ${user?.role === 'admin' ? 'badge-purple' : 'badge-blue'}`}>{user?.role}</span>
              <span className="text-xs text-gray-400">Miembro desde {formatDate(user?.created_at)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleProfile} className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">Información personal</h3>
          <div>
            <label className="label">Nombre</label>
            <input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} required className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user?.email} disabled className="input bg-gray-50 text-gray-400" />
          </div>
          <div>
            <label className="label">URL del avatar</label>
            <input type="url" value={profileForm.avatar_url} onChange={e => setProfileForm(f => ({ ...f, avatar_url: e.target.value }))} className="input" placeholder="https://..." />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingProfile} className="btn-primary">
              {savingProfile ? <Spinner size="sm" /> : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Password */}
      <div className="card p-6">
        <form onSubmit={handlePassword} className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">Cambiar contraseña</h3>
          <div>
            <label className="label">Contraseña actual</label>
            <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required className="input" />
          </div>
          <div>
            <label className="label">Nueva contraseña</label>
            <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required className="input" />
          </div>
          <div>
            <label className="label">Confirmar nueva contraseña</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required className="input" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingPw} className="btn-primary">
              {savingPw ? <Spinner size="sm" /> : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>

      {/* Security info */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Seguridad</h3>
        <div className="space-y-2 text-sm">
          {[
            ['Autenticación', 'JWT + Refresh tokens'],
            ['Cifrado', 'bcrypt (12 rounds)'],
            ['Sesiones', 'Expiración: 15 min / 7 días'],
            ['Último acceso', formatDate(user?.last_login)],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-gray-500 w-36 flex-shrink-0">{k}:</span>
              <span className="text-gray-700">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
