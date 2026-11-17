import ExcelJS from 'exceljs'
import { reportLabels } from './report-labels.js'

export const REPORT_DATE_FORMAT = 'd mmmm yyyy'
// Excel puts dates on the right; the prototype has them on the left.
export const REPORT_DATE_ALIGNMENT = { horizontal: 'left' }

// Numbers keep Excel's General format, as in the prototype: 100 and 4050.

// Regulation 43 is for compliance schemes only.
const REPORT_COLUMNS = [
  { key: 'organisationName', width: 40 },
  { key: 'organisationReference', width: 16 },
  { key: 'status', width: 16 },
  {
    key: 'regulation43',
    width: 16,
    complianceSchemesOnly: true
  },
  { key: 'recyclingObligations', width: 22 },
  { key: 'percentageMet', width: 16 },
  { key: 'totalObligationTonnes', width: 24 },
  {
    key: 'dateSubmitted',
    width: 18,
    numFmt: REPORT_DATE_FORMAT,
    alignment: REPORT_DATE_ALIGNMENT
  },
  {
    key: 'dateAccepted',
    width: 18,
    numFmt: REPORT_DATE_FORMAT,
    alignment: REPORT_DATE_ALIGNMENT
  },
  { key: 'acceptedBy', width: 28 },
  { key: 'cancellations', width: 16 }
]

export function reportColumns(isComplianceScheme, labels = reportLabels()) {
  return REPORT_COLUMNS.filter(
    (column) => isComplianceScheme || !column.complianceSchemesOnly
  ).map((column) => ({ ...column, header: labels.columns[column.key] }))
}

const MAX_SHEET_NAME_LENGTH = 31

// Excel rejects \ / ? * [ ] : in sheet names, a leading or trailing apostrophe,
// and names over 31 characters.
export function safeSheetName(name) {
  const cleaned = trimApostrophesAndSpaces(
    String(name ?? '')
      .replaceAll(/[\\/?*[\]:]/g, '')
      .slice(0, MAX_SHEET_NAME_LENGTH)
  )
  return cleaned || 'Report'
}

function isApostropheOrSpace(character) {
  return character === "'" || character.trim() === ''
}

function trimApostrophesAndSpaces(text) {
  let start = 0
  let end = text.length
  while (start < end && isApostropheOrSpace(text[start])) {
    start++
  }
  while (end > start && isApostropheOrSpace(text[end - 1])) {
    end--
  }
  return text.slice(start, end)
}

// Rows above the column headings. Everything below is placed from this, so rows
// can be added above the headings.
export const REPORT_TITLE_ROWS = 1

function writeHeading(worksheet, heading) {
  const cell = worksheet.getCell(1, 1)
  cell.value = heading
  cell.font = { bold: true, size: 14 }
}

// Light grey behind the column headings, as in the prototype.
export const HEADING_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF3F2F1' }
}

const THIN_GREY_LINE = { style: 'thin', color: { argb: 'FFBFBFBF' } }

// Every heading and data cell is boxed in, as in the prototype.
export const CELL_BORDER = {
  top: THIN_GREY_LINE,
  left: THIN_GREY_LINE,
  bottom: THIN_GREY_LINE,
  right: THIN_GREY_LINE
}

function writeColumnHeadings(worksheet, columns, rowNumber) {
  const row = worksheet.getRow(rowNumber)
  columns.forEach((column, index) => {
    const cell = row.getCell(index + 1)
    cell.value = column.header
    cell.font = { bold: true }
    cell.fill = HEADING_FILL
    cell.border = CELL_BORDER
  })
}

function writeDataRows(worksheet, columns, rows, firstRowNumber) {
  rows.forEach((reportRow, rowIndex) => {
    const row = worksheet.getRow(firstRowNumber + rowIndex)
    columns.forEach((column, columnIndex) => {
      // Blank cells are boxed in too, so the table has no gaps.
      const cell = row.getCell(columnIndex + 1)
      cell.border = CELL_BORDER
      const value = reportRow[column.key]
      if (value == null) {
        return
      }
      cell.value = value
      if (column.numFmt) {
        cell.numFmt = column.numFmt
      }
      if (column.alignment) {
        cell.alignment = column.alignment
      }
    })
  })
}

export async function buildReportWorkbook({
  heading,
  rows,
  isComplianceScheme,
  labels = reportLabels()
}) {
  const columns = reportColumns(isComplianceScheme, labels)
  const headingsRowNumber = REPORT_TITLE_ROWS + 1

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(safeSheetName(labels.sheetName), {
    views: [{ state: 'frozen', ySplit: headingsRowNumber }]
  })

  columns.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = column.width
  })

  writeHeading(worksheet, heading)
  writeColumnHeadings(worksheet, columns, headingsRowNumber)
  writeDataRows(worksheet, columns, rows, headingsRowNumber + 1)

  worksheet.autoFilter = {
    from: { row: headingsRowNumber, column: 1 },
    to: { row: headingsRowNumber, column: columns.length }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
