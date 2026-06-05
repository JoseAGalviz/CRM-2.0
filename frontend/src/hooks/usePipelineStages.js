import { useState, useEffect } from 'react'
import { pipelineAPI } from '../api/index'
import { DEAL_STAGES } from '../utils/constants'

let _cache = null
let _promise = null

export function usePipelineStages() {
  const [stages, setStages] = useState(_cache || DEAL_STAGES)
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) { setStages(_cache); setLoading(false); return }
    if (!_promise) {
      _promise = pipelineAPI.list()
        .then(r => {
          const data = r.data.data.filter(s => s.is_active).map(s => ({
            value: s.value,
            label: s.name,
            color: s.color,
            dot: s.dot_color,
            probability: s.probability,
          }))
          _cache = data
          return data
        })
        .catch(() => DEAL_STAGES)
    }
    _promise.then(data => { setStages(data); setLoading(false) })
  }, [])

  const invalidate = () => { _cache = null; _promise = null }

  return { stages, loading, invalidate }
}
