import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import GlobalSearch from '../ui/GlobalSearch'

const pageTitles = {
  '/dashboard':  'Dashboard',
  '/contacts':   'Contactos',
  '/companies':  'Empresas',
  '/deals':      'Pipeline de Negocios',
  '/tasks':      'Tareas',
  '/activities': 'Actividades',
  '/notes':      'Notas',
  '/profile':    'Mi Perfil',
  '/chat':       'Chat',
}

export default function TopBar({ onMenuOpen }) {
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)

  const title = pageTitles[location.pathname]
    || pageTitles[Object.keys(pageTitles).find(k => location.pathname.startsWith(k + '/')) || '']
    || 'CRM Pro'

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-10 h-14 flex items-center gap-3 px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-top">
        {/* Hamburger – mobile only */}
        <button
          onClick={onMenuOpen}
          className="lg:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-base font-semibold text-gray-900 leading-none">{title}</h1>

        <div className="flex-1" />

        {/* Search trigger – desktop */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors w-48"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-400 bg-white font-mono">⌘K</kbd>
        </button>

        {/* Search trigger – mobile */}
        <button
          onClick={() => setSearchOpen(true)}
          className="sm:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Date – tablet+ */}
        <p className="hidden md:block text-xs text-gray-400 capitalize">
          {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
        </p>
      </header>

      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
