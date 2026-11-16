import {
  DECIMAL_TONNES_FORMAT,
  REPORT_DATE_FORMAT,
  WHOLE_TONNES_FORMAT,
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
  recyclingObligations: 'No data',
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
    expect(worksheet.getCell(`H${dataRow}`).numFmt).toBe(REPORT_DATE_FORMAT)
    expect(worksheet.getCell(`I${dataRow}`).numFmt).toBe(REPORT_DATE_FORMAT)
  })

  test.each([
    [4050, WHOLE_TONNES_FORMAT],
    [4050.25, DECIMAL_TONNES_FORMAT]
  ])(
    'formats a total obligation of %p tonnes without a trailing decimal point',
    async (totalObligationTonnes, numFmt) => {
      const { worksheet, headingsRowNumber } = await build(true, [
        { ...acceptedRow, totalObligationTonnes }
      ])
      const cell = worksheet.getCell(`G${headingsRowNumber + 1}`)

      expect(cell.value).toBe(totalObligationTonnes)
      expect(cell.numFmt).toBe(numFmt)
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
      'Recycling obligations': 'No data',
      'Percentage met': null,
      'Total obligation (tonnes)': null,
      'Date submitted': null,
      'Date accepted': null,
      'Accepted by': null,
      Cancellations: 0
    })
  })

  test('writes the heading and column headings with no data rows', async () => {
    const report = await build(false, [])

    expect(report.heading).toBe(HEADING)
    expect(report.headers).toEqual(DIRECT_PRODUCER_HEADERS)
    expect(report.rows).toEqual([])
  })
})
