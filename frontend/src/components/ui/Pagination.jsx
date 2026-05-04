export default function Pagination({ page, totalPages, onPageChange, total, limit }) {
  if (totalPages <= 1) return null

  const start = (page - 1) * limit + 1
  const end   = Math.min(page * limit, total)

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5)      return i + 1
    if (page <= 3)            return i + 1
    if (page >= totalPages - 2) return totalPages - 4 + i
    return page - 2 + i
  })

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 gap-3 flex-wrap">
      <p className="text-xs text-gray-500 hidden sm:block">
        <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span>
        {' '}de{' '}
        <span className="font-medium">{total}</span>
      </p>

      <div className="flex gap-1 mx-auto sm:mx-0">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="btn-ghost btn-sm disabled:opacity-30"
          aria-label="Anterior"
        >
          ‹
        </button>

        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`btn-sm px-3 text-sm font-medium rounded-lg transition-colors ${
              p === page
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="btn-ghost btn-sm disabled:opacity-30"
          aria-label="Siguiente"
        >
          ›
        </button>
      </div>
    </div>
  )
}
