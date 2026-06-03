import { useState, useMemo } from 'react'
import { DEMO_DEALS } from '../demo/data'
import { formatCurrency, formatDate } from '../utils/formatters'
import { getDealHealth } from '../utils/dealHealth'
import { DEAL_STAGES } from '../utils/constants'
import { UserIcon, BuildingIcon, CalendarIcon } from '../components/ui/icons'
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function DealCard({ deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      {...attributes} {...listeners}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 flex-1">{deal.title}</p>
      </div>
      <p className="text-base font-bold text-primary-600 mt-1.5">{formatCurrency(deal.value, deal.currency)}</p>
      {deal.contact_name && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <UserIcon className="w-3 h-3 flex-shrink-0" />{deal.contact_name}
        </p>
      )}
      {deal.company_name && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <BuildingIcon className="w-3 h-3 flex-shrink-0" />{deal.company_name}
        </p>
      )}
      {deal.expected_close && (
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <CalendarIcon className="w-3 h-3 flex-shrink-0" />{formatDate(deal.expected_close)}
        </p>
      )}
      <div className="mt-2 flex items-center gap-1">
        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
          <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${deal.probability}%` }} />
        </div>
        <span className="text-xs text-gray-400">{deal.probability}%</span>
      </div>
      {(() => {
        const h = getDealHealth(deal)
        return (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${h.bg}`} title={`Health: ${h.score}`} />
            <span className={`text-xs font-medium ${h.color}`}>{h.label} · {h.score}</span>
          </div>
        )
      })()}
    </div>
  )
}

export default function DealsPage() {
  const [deals, setDeals] = useState(DEMO_DEALS)
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const dealsByStage = useMemo(() => {
    return deals.reduce((acc, d) => {
      if (!acc[d.stage]) acc[d.stage] = []
      acc[d.stage].push(d)
      return acc
    }, {})
  }, [deals])

  const stageTotals = useMemo(() => {
    return Object.fromEntries(
      Object.entries(dealsByStage).map(([stage, stageDeals]) => [stage, stageDeals.reduce((s, d) => s + d.value, 0)])
    )
  }, [dealsByStage])

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const draggedDeal = deals.find(d => d.id === active.id)
    const targetStage = over.id
    if (!draggedDeal || draggedDeal.stage === targetStage) return
    if (!DEAL_STAGES.find(s => s.value === targetStage)) return
    setDeals(prev => prev.map(d => d.id === active.id ? { ...d, stage: targetStage } : d))
  }

  const activeCard = activeId ? deals.find(d => d.id === activeId) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {deals.length} negocio{deals.length !== 1 ? 's' : ''} · Pipeline: {formatCurrency(deals.filter(d => !['won','lost'].includes(d.stage)).reduce((s,d) => s+d.value, 0))}
        </p>
        <button className="btn-primary" disabled>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo negocio
        </button>
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={({ active }) => setActiveId(active.id)} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map(stage => {
            const stageDeals = dealsByStage[stage.value] || []
            return (
              <div key={stage.value} id={stage.value} className="flex-shrink-0 w-64 md:w-72">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                    <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
                    <span className="badge badge-gray text-xs">{stageDeals.length}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{formatCurrency(stageTotals[stage.value] || 0)}</span>
                </div>

                <SortableContext items={stageDeals.map(d => d.id)} strategy={verticalListSortingStrategy} id={stage.value}>
                  <div className={`min-h-32 rounded-xl p-2 space-y-2 transition-colors ${activeId ? 'bg-gray-100 border-2 border-dashed border-gray-300' : 'bg-gray-50'}`}
                    onDragOver={(e) => e.preventDefault()}>
                    {stageDeals.map(deal => (
                      <DealCard key={deal.id} deal={deal} />
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="flex items-center justify-center h-20 text-gray-400 text-xs">Arrastra aquí</div>
                    )}
                  </div>
                </SortableContext>
              </div>
            )
          })}
        </div>
        <DragOverlay>
          {activeCard && (
            <div className="bg-white rounded-xl border-2 border-primary-400 p-3 shadow-xl opacity-90 w-64">
              <p className="text-sm font-semibold text-gray-900">{activeCard.title}</p>
              <p className="text-base font-bold text-primary-600">{formatCurrency(activeCard.value)}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
