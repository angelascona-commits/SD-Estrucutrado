export function toPeruInputDateTime(value: string | null | undefined): string {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16)

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)

  const year = parts.find((p) => p.type === 'year')?.value || ''
  const month = parts.find((p) => p.type === 'month')?.value || ''
  const day = parts.find((p) => p.type === 'day')?.value || ''
  const hour = parts.find((p) => p.type === 'hour')?.value || ''
  const minute = parts.find((p) => p.type === 'minute')?.value || ''

  return `${year}-${month}-${day}T${hour}:${minute}`
}

export function toPeruDisplayDateTime(value: string | null | undefined): string {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
  })
}

export function fromPeruInputDateTime(value: string): string | null {
  if (!value) return null
  return `${value}:00-05:00`
}

export function getCurrentPeruInputDateTime(): string {
  return toPeruInputDateTime(new Date().toISOString())
}