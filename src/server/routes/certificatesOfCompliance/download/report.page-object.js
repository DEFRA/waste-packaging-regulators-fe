import ExcelJS from 'exceljs'
import { REPORT_TITLE_ROWS } from './report-workbook.js'

function cellValues(row, columnCount) {
  return Array.from({ length: columnCount }, (_, index) => {
    const value = row.getCell(index + 1).value
    return value ?? null
  })
}

// Reads a report back into plain values for test assertions.
export async function loadReport(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]

  const headingsRowNumber = REPORT_TITLE_ROWS + 1
  const headingsRow = worksheet.getRow(headingsRowNumber)
  const headers = []
  headingsRow.eachCell({ includeEmpty: false }, (cell) => {
    headers.push(cell.value)
  })

  const rows = []
  for (
    let rowNumber = headingsRowNumber + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    const values = cellValues(worksheet.getRow(rowNumber), headers.length)
    rows.push(
      Object.fromEntries(headers.map((header, i) => [header, values[i]]))
    )
  }

  return {
    heading: worksheet.getCell(1, 1).value,
    headers,
    headingsRowNumber,
    rows,
    worksheet
  }
}
