/**
 * Export an array of objects to a CSV file download.
 * @param {object[]} data - rows to export
 * @param {string}   filename - without extension
 * @param {{ label: string, key?: string, fn?: (row) => any }[]} columns
 */
export function exportToCSV(data, filename, columns) {
  const header = columns.map(c => `"${c.label}"`).join(',')
  const rows = data.map(row =>
    columns.map(c => {
      const val = c.fn ? c.fn(row) : (row[c.key] ?? '')
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  )
  const csv = '﻿' + [header, ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const CONTACT_COLUMNS = [
  { label: 'Nombre',     key: 'first_name' },
  { label: 'Apellido',   key: 'last_name' },
  { label: 'Email',      key: 'email' },
  { label: 'Teléfono',   key: 'phone' },
  { label: 'Cargo',      key: 'job_title' },
  { label: 'Empresa',    key: 'company_name' },
  { label: 'Estado',     key: 'status' },
  { label: 'Origen',     key: 'source' },
  { label: 'Ciudad',     key: 'city' },
  { label: 'País',       key: 'country' },
  { label: 'Creado',     key: 'created_at' },
]

export const COMPANY_COLUMNS = [
  { label: 'Empresa',        key: 'name' },
  { label: 'Industria',      key: 'industry' },
  { label: 'Tamaño',         key: 'size' },
  { label: 'Email',          key: 'email' },
  { label: 'Teléfono',       key: 'phone' },
  { label: 'Web',            key: 'website' },
  { label: 'Ciudad',         key: 'city' },
  { label: 'País',           key: 'country' },
  { label: 'Ingresos anuales', key: 'annual_revenue' },
  { label: 'Creado',         key: 'created_at' },
]

export const DEAL_COLUMNS = [
  { label: 'Título',        key: 'title' },
  { label: 'Valor',         key: 'value' },
  { label: 'Moneda',        key: 'currency' },
  { label: 'Etapa',         key: 'stage' },
  { label: 'Probabilidad',  fn: r => `${r.probability}%` },
  { label: 'Contacto',      key: 'contact_name' },
  { label: 'Empresa',       key: 'company_name' },
  { label: 'Cierre esperado', fn: r => r.expected_close ? r.expected_close.slice(0, 10) : '' },
  { label: 'Creado',        key: 'created_at' },
]
