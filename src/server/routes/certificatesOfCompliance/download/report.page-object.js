import ExcelJS from 'exceljs'
import { REPORT_TITLE_ROWS } from './report-workbook.js'

function cellValues(row, columnCount) {
  return Array.from({ length: columnCount }, (_, index) => {
    const value = row.getCell(index + 1).value
    return value ?? null
  })
}

// Blocks repeat their headings, so keys look like 'Cancellation 1: Reason'.
function columnKey(blockHeading, header) {
  return blockHeading ? `${blockHeading}: ${header}` : header
}

// Merged cells only: the report heading shares this row.
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

  // A merged heading reads back in every column it covers.
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
