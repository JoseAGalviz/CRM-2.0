import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'
import { DEAL_STAGES } from '../../utils/constants'
import Spinner from './Spinner'
import { UserIcon, BuildingIcon, BriefcaseIcon } from './icons'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function highlight(text, query) {
  if (!query || !text) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [cursor, setCursor]     = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const debouncedQuery = useDebounce(query, 280)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults(null)
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults(null); return }
    setLoading(true)
    client.get('/search', { params: { q: debouncedQuery, limit: 5 } })
      .then(r => { setResults(r.data.data); setCursor(0) })
      .catch(() => setResults(null))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  const allItems = results ? [
    ...results.contacts.map(c => ({ type: 'contact', id: c.id, primary: `${c.first_name} ${c.last_name}`, secondary: c.job_title || c.email || '', url: `/contacts/${c.id}` })),
    ...results.companies.map(c => ({ type: 'company', id: c.id, primary: c.name, secondary: c.industry || '', url: `/companies/${c.id}` })),
    ...results.deals.map(d => ({ type: 'deal', id: d.id, primary: d.title, secondary: DEAL_STAGES.find(s => s.value === d.stage)?.label || d.stage, url: `/deals` })),
  ] : []

  const go = useCallback((item) => {
    navigate(item.url)
    onClose()
  }, [navigate, onClose])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, allItems.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
      if (e.key === 'Enter' && allItems[cursor]) go(allItems[cursor])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, allItems, cursor, go, onClose])

  if (!isOpen) return null

  const typeIcon = {
    contact: <UserIcon className="w-4 h-4" />,
    company: <BuildingIcon className="w-4 h-4" />,
    deal:    <BriefcaseIcon className="w-4 h-4" />,
  }
  const typeLabel = { contact: 'Contacto', company: 'Empresa', deal: 'Negocio' }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar contactos, empresas, negocios..."
            className="flex-1 text-sm outline-none placeholder-gray-400"
          />
          {loading && <Spinner size="sm" />}
          <kbd className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        {results && (
          <div className="max-h-80 overflow-y-auto">
            {allItems.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Sin resultados para "{query}"</p>
            ) : (
              <ul>
                {allItems.map((item, i) => (
                  <li key={`${item.type}-${item.id}`}>
                    <button
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i === cursor ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                      onClick={() => go(item)}
                      onMouseEnter={() => setCursor(i)}
                    >
                      <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">{typeIcon[item.type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {highlight(item.primary, debouncedQuery)}
                        </p>
                        {item.secondary && <p className="text-xs text-gray-500 truncate">{item.secondary}</p>}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{typeLabel[item.type]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Empty state / hints */}
        {!results && !loading && (
          <div className="px-4 py-5 text-xs text-gray-400 space-y-1">
            <p>↑↓ navegar &nbsp;·&nbsp; Enter seleccionar &nbsp;·&nbsp; Esc cerrar</p>
          </div>
        )}
      </div>
    </div>
  )
}
