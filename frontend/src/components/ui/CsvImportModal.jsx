import { useState, useRef } from 'react'
import Modal from './Modal'
import Spinner from './Spinner'

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase()
    .replace(/\s+/g, '_').replace(/[áa]/g, 'a').replace(/[é]/g, 'e')
    .replace(/[í]/g, 'i').replace(/[ó]/g, 'o').replace(/[ú]/g, 'u')
  )
  return lines.slice(1).map(line => {
    const vals = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { vals.push(cur); cur = '' }
      else cur += ch
    }
    vals.push(cur)
    const row = {}
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim() })
    return row
  }).filter(r => Object.values(r).some(v => v))
}

export default function CsvImportModal({ isOpen, onClose, onImport, entityLabel, templateHeaders, onSuccess }) {
  const [rows, setRows] = useState([])
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const reset = () => { setRows([]); setPreview([]); setResult(null); setError('') }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) { setError('Solo archivos .csv'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result)
      if (parsed.length === 0) { setError('Archivo vacío o formato incorrecto'); return }
      setError('')
      setRows(parsed)
      setPreview(parsed.slice(0, 3))
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = async () => {
    if (rows.length === 0) return
    setLoading(true)
    try {
      const res = await onImport(rows)
      setResult(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Error importando')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    const hadResult = !!result
    reset(); onClose()
    if (hadResult && onSuccess) onSuccess()
  }

  const downloadTemplate = () => {
    const csv = '﻿' + templateHeaders.join(',') + '\r\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `plantilla_${entityLabel}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Importar ${entityLabel}`} size="lg">
      <div className="space-y-4">
        {!result ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Sube un archivo CSV con los datos a importar.</p>
              <button onClick={downloadTemplate} className="btn-ghost btn-sm text-xs text-primary-600">
                ↓ Descargar plantilla
              </button>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600">{rows.length > 0 ? `${rows.length} filas cargadas` : 'Haz clic para seleccionar un archivo CSV'}</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            {preview.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Vista previa (primeras 3 filas):</p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-50">
                      <tr>{Object.keys(preview[0]).map(k => <th key={k} className="px-3 py-2 text-left font-medium text-gray-600">{k}</th>)}</tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 text-gray-700 max-w-32 truncate">{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={handleClose} className="btn-secondary">Cancelar</button>
              <button onClick={handleImport} disabled={rows.length === 0 || loading} className="btn-primary">
                {loading ? <Spinner size="sm" /> : `Importar ${rows.length} filas`}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{result.imported} importados</p>
              {result.skipped > 0 && <p className="text-sm text-gray-500 mt-1">{result.skipped} omitidos (duplicados o sin nombre)</p>}
            </div>
            <button onClick={handleClose} className="btn-primary">Cerrar</button>
          </div>
        )}
      </div>
    </Modal>
  )
}
