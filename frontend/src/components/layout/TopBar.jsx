import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/contacts': 'Contactos',
  '/companies': 'Empresas',
  '/deals': 'Pipeline de Negocios',
  '/tasks': 'Tareas',
  '/activities': 'Actividades',
  '/notes': 'Notas',
  '/profile': 'Mi Perfil',
}

export default function TopBar({ onMenuOpen }) {
  const location = useLocation()
  const title = pageTitles[location.pathname] || pageTitles[Object.keys(pageTitles).find(k => location.pathname.startsWith(k + '/')) || ''] || 'CRM Pro'

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 h-16 flex items-center px-4 gap-4">
      <button onClick={onMenuOpen} className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className="text-lg font-semibold text-gray-900 flex-1">{title}</h1>
      <div className="text-xs text-gray-400">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    </header>
  )
}
