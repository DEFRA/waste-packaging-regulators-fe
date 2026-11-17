import ExcelJS from 'exceljs'
import { reportLabels } from './report-labels.js'

export const REPORT_DATE_FORMAT = 'd mmmm yyyy'
// Shows a % sign without changing the stored number (100, not 1).
export const PERCENTAGE_FORMAT = '0"%"'

export const WHOLE_TONNES_FORMAT = '#,##0'
export const DECIMAL_TONNES_FORMAT = '#,##0.###'

// '#,##0.###' would show whole numbers with a trailing dot ("4,050.").
function tonnesFormat(value) {
  return Number.isInteger(value) ? WHOLE_TONNES_FORMAT : DECIMAL_TONNES_FORMAT
}

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
  {
    key: 'percentageMet',
    width: 16,
    numFmt: PERCENTAGE_FORMAT
  },
  {
    key: 'totalObligationTonnes',
    width: 24,
    numFmt: tonnesFormat
  },
  {
    key: 'dateSubmitted',
    width: 18,
    numFmt: REPORT_DATE_FORMAT
  },
  {
    key: 'dateAccepted',
    width: 18,
    numFmt: REPORT_DATE_FORMAT
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
  const cleaned = String(name ?? '')
    .replaceAll(/[\\/?*[\]:]/g, '')
    .slice(0, MAX_SHEET_NAME_LENGTH)
    .replaceAll(/^['\s]+|['\s]+$/g, '')
  return cleaned || 'Report'
}

// Rows above the column headings. Everything below is placed from this, so rows
// can be added above the headings.
export const REPORT_TITLE_ROWS = 1

function writeHeading(worksheet, heading) {
  const cell = worksheet.getCell(1, 1)
  cell.value = heading
  cell.font = { bold: true, size: 14 }
}

function writeColumnHeadings(worksheet, columns, rowNumber) {
  const row = worksheet.getRow(rowNumber)
  columns.forEach((column, index) => {
    const cell = row.getCell(index + 1)
    cell.value = column.header
    cell.font = { bold: true }
  })
}

function writeDataRows(worksheet, columns, rows, firstRowNumber) {
  rows.forEach((reportRow, rowIndex) => {
    const row = worksheet.getRow(firstRowNumber + rowIndex)
    columns.forEach((column, columnIndex) => {
      const value = reportRow[column.key]
      if (value == null) {
        return
      }
      const cell = row.getCell(columnIndex + 1)
      cell.value = value
      if (column.numFmt) {
        cell.numFmt =
          typeof column.numFmt === 'function'
            ? column.numFmt(value)
            : column.numFmt
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
