import ExcelJS from 'exceljs'
import { REPORT_TITLE_ROWS } from './report-workbook.js'

function cellValues(row, columnCount) {
  return Array.from({ length: columnCount }, (_, index) => {
    const value = row.getCell(index + 1).value
    return value ?? null
  })
}

// A cancellation column is keyed by its block, as in 'Cancellation 1: Reason',
// because every block repeats the same column headings.
function columnKey(blockHeading, header) {
  return blockHeading ? `${blockHeading}: ${header}` : header
}

// Only the merged Cancellation N headings count: the report heading shares
// their row.
function blockHeadings(row, columnCount) {
  return Array.from({ length: columnCount }, (_, index) => {
    const cell = row.getCell(index + 1)
    return cell.isMerged ? cell.value : null
  })
}

// Reads a report back into plain values for test assertions.
export async function loadReport(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]

  const headingsRowNumber = REPORT_TITLE_ROWS + 1
  const headers = []
  worksheet
    .getRow(headingsRowNumber)
    .eachCell({ includeEmpty: false }, (cell) => {
      headers.push(cell.value)
    })

  // Merged cells read back their block's heading in every column they cover.
  const headingsAbove = blockHeadings(
    worksheet.getRow(headingsRowNumber - 1),
    headers.length
  )
  const keys = headers.map((header, i) => columnKey(headingsAbove[i], header))

  const rows = []
  for (
    let rowNumber = headingsRowNumber + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    const values = cellValues(worksheet.getRow(rowNumber), headers.length)
    rows.push(Object.fromEntries(keys.map((key, i) => [key, values[i]])))
  }

  return {
    heading: worksheet.getCell(1, 1).value,
    headers,
    headingsRowNumber,
    rows,
    worksheet
  }
}
