import { getInitials } from '../../utils/formatters'

const colors = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500'
]

function getColor(name) {
  const idx = (name || '').charCodeAt(0) % colors.length
  return colors[idx]
}

export default function Avatar({ name, src, size = 'md', className = '' }) {
  const sizes = { xs: 'h-6 w-6 text-xs', sm: 'h-8 w-8 text-sm', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' }
  if (src) {
    return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover ${className}`} />
  }
  return (
    <div className={`${sizes[size]} ${getColor(name)} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}>
      {getInitials(name)}
    </div>
  )
}
