import { InboxIcon } from './icons'

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-400 shadow-sm border border-gray-100">
        {icon || <InboxIcon className="w-7 h-7" />}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mb-6 max-w-xs leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  )
}
