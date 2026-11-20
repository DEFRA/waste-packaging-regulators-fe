import {
  CELL_BORDER,
  HEADING_FILL,
  REPORT_DATE_ALIGNMENT,
  REPORT_DATE_FORMAT,
  safeSheetName,
  REPORT_TITLE_ROWS,
  buildReportWorkbook,
  reportColumns
} from './report-workbook.js'
import { loadReport } from './report.page-object.js'

const HEADING = 'All certificate of compliance submissions, Monday 19 October'

const DIRECT_PRODUCER_HEADERS = [
  'Organisation name',
  'Organisation ID',
  'Status',
  'Recycling obligations',
  'Percentage met',
  'Total obligation (tonnes)',
  'Date submitted',
  'Date accepted',
  'Accepted by',
  'Cancellations'
]

const COMPLIANCE_SCHEME_HEADERS = [
  'Organisation name',
  'Organisation ID',
  'Status',
  'Regulation 43',
  'Recycling obligations',
  'Percentage met',
  'Total obligation (tonnes)',
  'Date submitted',
  'Date accepted',
  'Accepted by',
  'Cancellations'
]

const acceptedRow = {
  organisationId: 'org-1',
  organisationName: 'ABC Limited',
  organisationReference: 100234,
  status: 'Accepted',
  regulation43: 'Compliant',
  recyclingObligations: 'Met',
  percentageMet: 100,
  totalObligationTonnes: 4050,
  dateSubmitted: new Date('2026-12-19T00:00:00Z'),
  dateAccepted: new Date('2027-01-02T00:00:00Z'),
  acceptedBy: 'John Doe',
  cancellations: 2
}

const notSubmittedRow = {
  organisationId: 'org-2',
  organisationName: 'XYZ Packaging Limited',
  organisationReference: 'SCN0002',
  status: 'Not submitted',
  regulation43: null,
  recyclingObligations: null,
  percentageMet: null,
  totalObligationTonnes: null,
  dateSubmitted: null,
  dateAccepted: null,
  acceptedBy: null,
  cancellations: 0
}

async function build(
  isComplianceScheme,
  rows = [acceptedRow, notSubmittedRow]
) {
  return loadReport(
    await buildReportWorkbook({ heading: HEADING, rows, isComplianceScheme })
  )
}

describe('#report-workbook', () => {
  test('reportColumns leaves Regulation 43 out for direct producers', () => {
    expect(reportColumns(false).map((c) => c.header)).toEqual(
      DIRECT_PRODUCER_HEADERS
    )
    expect(reportColumns(true).map((c) => c.header)).toEqual(
      COMPLIANCE_SCHEME_HEADERS
    )
  })

  test('puts the heading in the first row and the column headings after the title rows', async () => {
    const report = await build(false)

    expect(report.heading).toBe(HEADING)
    expect(report.headingsRowNumber).toBe(REPORT_TITLE_ROWS + 1)
    expect(report.headers).toEqual(DIRECT_PRODUCER_HEADERS)
  })

  test('shades every column heading light grey, and nothing else', async () => {
    const { worksheet, headingsRowNumber } = await build(true)

    for (const column of ['A', 'D', 'K']) {
      expect(worksheet.getCell(`${column}${headingsRowNumber}`).fill).toEqual(
        HEADING_FILL
      )
    }
    // exceljs reads an unfilled cell back as { pattern: 'none' }.
    expect(worksheet.getCell('A1').fill).not.toEqual(HEADING_FILL)
    expect(worksheet.getCell(`A${headingsRowNumber + 1}`).fill).not.toEqual(
      HEADING_FILL
    )
  })

  test('boxes in every heading and data cell, blank ones included, but not the report heading', async () => {
    const { worksheet, headingsRowNumber } = await build(true)
    const notSubmittedRowNumber = headingsRowNumber + 2

    expect(worksheet.getCell(`A${headingsRowNumber}`).border).toEqual(
      CELL_BORDER
    )
    expect(worksheet.getCell(`K${headingsRowNumber + 1}`).border).toEqual(
      CELL_BORDER
    )
    // Not submitted: Date submitted (H) is blank.
    expect(worksheet.getCell(`H${notSubmittedRowNumber}`).value).toBeNull()
    expect(worksheet.getCell(`H${notSubmittedRowNumber}`).border).toEqual(
      CELL_BORDER
    )
    expect(worksheet.getCell('A1').border).not.toEqual(CELL_BORDER)
  })

  test('filters on the column headings row across every column and freezes the panes above the data', async () => {
    const { worksheet, headingsRowNumber } = await build(true)

    expect(worksheet.autoFilter).toBe(
      `A${headingsRowNumber}:K${headingsRowNumber}`
    )
    expect(worksheet.views[0]).toMatchObject({
      state: 'frozen',
      ySplit: headingsRowNumber
    })
  })

  test.each([
    [false, 'J'],
    [true, 'K']
  ])(
    'puts Cancellations in the expected column (compliance schemes: %p)',
    async (isComplianceScheme, column) => {
      const { worksheet, headingsRowNumber } = await build(isComplianceScheme)

      expect(worksheet.getCell(`${column}${headingsRowNumber}`).value).toBe(
        'Cancellations'
      )
      expect(worksheet.getCell(`${column}${headingsRowNumber + 1}`).value).toBe(
        2
      )
    }
  )

  test('stores numbers as numbers and dates as dates', async () => {
    const { rows, worksheet, headingsRowNumber } = await build(true)
    const [accepted] = rows

    expect(accepted['Organisation ID']).toBe(100234)
    expect(accepted['Percentage met']).toBe(100)
    expect(accepted['Total obligation (tonnes)']).toBe(4050)
    expect(accepted.Cancellations).toBe(2)
    expect(accepted['Date submitted']).toEqual(new Date('2026-12-19T00:00:00Z'))
    expect(accepted['Date accepted']).toEqual(new Date('2027-01-02T00:00:00Z'))

    const dataRow = headingsRowNumber + 1
    for (const column of ['H', 'I']) {
      const cell = worksheet.getCell(`${column}${dataRow}`)
      expect(cell.numFmt).toBe(REPORT_DATE_FORMAT)
      expect(cell.alignment).toEqual(REPORT_DATE_ALIGNMENT)
    }
  })

  test.each([[4050], [4050.25]])(
    'shows percentage met and a total obligation of %p tonnes in the General format, with no % sign or thousands separator',
    async (totalObligationTonnes) => {
      const { worksheet, headingsRowNumber } = await build(true, [
        { ...acceptedRow, totalObligationTonnes }
      ])
      const dataRow = headingsRowNumber + 1
      const percentage = worksheet.getCell(`F${dataRow}`)
      const total = worksheet.getCell(`G${dataRow}`)

      expect(percentage.value).toBe(100)
      expect(percentage.numFmt).toBeUndefined()
      expect(total.value).toBe(totalObligationTonnes)
      expect(total.numFmt).toBeUndefined()
    }
  )

  test('leaves blank values as empty cells and keeps 0 cancellations', async () => {
    const { rows } = await build(true)
    const notSubmitted = rows[1]

    expect(notSubmitted).toEqual({
      'Organisation name': 'XYZ Packaging Limited',
      'Organisation ID': 'SCN0002',
      Status: 'Not submitted',
      'Regulation 43': null,
      'Recycling obligations': null,
      'Percentage met': null,
      'Total obligation (tonnes)': null,
      'Date submitted': null,
      'Date accepted': null,
      'Accepted by': null,
      Cancellations: 0
    })
  })

  test('names the worksheet Report', async () => {
    const { worksheet } = await build(false)

    expect(worksheet.name).toBe('Report')
  })

  test.each([
    ['Adroddiad', 'Adroddiad'],
    ['[Draft] Report: 2026/27?', 'Draft Report 202627'],
    ["'Quoted'", 'Quoted'],
    [" ' Mixed ends ' ", 'Mixed ends'],
    ["Inner 'quotes' stay", "Inner 'quotes' stay"],
    ["' '", 'Report'],
    [
      'A name that is far longer than Excel allows',
      'A name that is far longer than'
    ],
    ['[]:*?/\\', 'Report'],
    [undefined, 'Report']
  ])('makes the sheet name %p safe for Excel as %p', (name, expected) => {
    expect(safeSheetName(name)).toBe(expected)
  })

  test('writes the heading and column headings with no data rows', async () => {
    const report = await build(false, [])

    expect(report.heading).toBe(HEADING)
    expect(report.headers).toEqual(DIRECT_PRODUCER_HEADERS)
    expect(report.rows).toEqual([])
  })
})
