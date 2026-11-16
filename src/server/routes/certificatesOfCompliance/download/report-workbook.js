import ExcelJS from 'exceljs'

export const REPORT_DATE_FORMAT = 'd mmmm yyyy'
// Percentage met is stored as the whole number the API serves (100, not 1), so
// it sorts and filters as shown; the format only adds the % sign.
export const PERCENTAGE_FORMAT = '0"%"'

export const WHOLE_TONNES_FORMAT = '#,##0'
export const DECIMAL_TONNES_FORMAT = '#,##0.###'

// Excel keeps the decimal point of '#,##0.###' even when no decimals follow, so
// a whole tonnage would read "4,050." — whole numbers get a format without one.
function tonnesFormat(value) {
  return Number.isInteger(value) ? WHOLE_TONNES_FORMAT : DECIMAL_TONNES_FORMAT
}

// Report columns in order. Regulation 43 only applies to compliance schemes, so
// it is left out of the direct producer report, which moves every later column
// one to the left (Cancellations is J for direct producers, K for schemes).
const REPORT_COLUMNS = [
  { key: 'organisationName', header: 'Organisation name', width: 40 },
  { key: 'organisationReference', header: 'Organisation ID', width: 16 },
  { key: 'status', header: 'Status', width: 16 },
  {
    key: 'regulation43',
    header: 'Regulation 43',
    width: 16,
    complianceSchemesOnly: true
  },
  { key: 'recyclingObligations', header: 'Recycling obligations', width: 22 },
  {
    key: 'percentageMet',
    header: 'Percentage met',
    width: 16,
    numFmt: PERCENTAGE_FORMAT
  },
  {
    key: 'totalObligationTonnes',
    header: 'Total obligation (tonnes)',
    width: 24,
    numFmt: tonnesFormat
  },
  {
    key: 'dateSubmitted',
    header: 'Date submitted',
    width: 18,
    numFmt: REPORT_DATE_FORMAT
  },
  {
    key: 'dateAccepted',
    header: 'Date accepted',
    width: 18,
    numFmt: REPORT_DATE_FORMAT
  },
  { key: 'acceptedBy', header: 'Accepted by', width: 28 },
  { key: 'cancellations', header: 'Cancellations', width: 16 }
]

export function reportColumns(isComplianceScheme) {
  return REPORT_COLUMNS.filter(
    (column) => isComplianceScheme || !column.complianceSchemesOnly
  )
}

// Rows above the column headings. The column headings row, its filters, the
// frozen pane and the first data row are all placed from this, never from a
// fixed row number, so rows can be added above the headings.
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
  isComplianceScheme
}) {
  const columns = reportColumns(isComplianceScheme)
  const headingsRowNumber = REPORT_TITLE_ROWS + 1

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Report', {
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
