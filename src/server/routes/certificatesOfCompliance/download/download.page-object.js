import { parse } from 'csv-parse/sync'

export function loadCsv(payload) {
  const lines = payload.trim().split(/\r?\n/)
  // The first line is the title row, e.g. "Pending certificate of compliance submissions, ..."
  const titleRow = lines[0].replace(/^"|"$/g, '')

  // The rest is standard CSV with headers
  const csvContent = lines.slice(1).join('\n')

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  })

  // The header row (the line after the title) as an ordered array, available
  // even when there are no data rows.
  const [headers = []] = parse(lines[1] ?? '', { skip_empty_lines: true })

  return {
    title: titleRow,
    headers,
    rows: records
  }
}
