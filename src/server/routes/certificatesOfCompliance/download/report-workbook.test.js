import {
  CANCELLATION_HEADING_FILL,
  CELL_BORDER,
  HEADING_FILL,
  REPORT_DATE_ALIGNMENT,
  REPORT_DATE_FORMAT,
  safeSheetName,
  REPORT_TITLE_ROWS,
  buildReportWorkbook,
  cancellationBlockCount,
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

const CANCELLATION_HEADERS = [
  'Date submitted',
  'Date cancelled',
  'Cancelled by',
  'Reason',
  'Status when cancelled'
]

const blankCancellationBlock = (number) =>
  Object.fromEntries(
    CANCELLATION_HEADERS.map((header) => [
      `Cancellation ${number}: ${header}`,
      null
    ])
  )

const olderCancellation = {
  dateSubmitted: new Date('2026-10-31T00:00:00Z'),
  dateCancelled: new Date('2026-11-10T00:00:00Z'),
  cancelledBy: 'Test User',
  reason: 'Not signed by correct person',
  statusWhenCancelled: 'Pending'
}

const newerCancellation = {
  dateSubmitted: new Date('2026-12-17T00:00:00Z'),
  dateCancelled: new Date('2027-01-08T00:00:00Z'),
  cancelledBy: 'Another User',
  reason: 'Recycling obligations changed',
  statusWhenCancelled: 'Accepted'
}

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
    expect(report.headers).toEqual([
      ...DIRECT_PRODUCER_HEADERS,
      ...CANCELLATION_HEADERS
    ])
  })

  test('shades the organisation column headings light grey, but not the report heading or the data', async () => {
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
      `A${headingsRowNumber}:P${headingsRowNumber}`
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
      Cancellations: 0,
      ...blankCancellationBlock(1)
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
    expect(report.headers).toEqual([
      ...DIRECT_PRODUCER_HEADERS,
      ...CANCELLATION_HEADERS
    ])
    expect(report.rows).toEqual([])
  })

  describe('cancellation blocks', () => {
    test.each([
      [[], 1],
      [[{ cancellationHistory: [] }], 1],
      [[{ cancellationHistory: [olderCancellation] }], 1],
      [
        [
          { cancellationHistory: [olderCancellation] },
          {
            cancellationHistory: [
              olderCancellation,
              newerCancellation,
              newerCancellation
            ]
          },
          {}
        ],
        3
      ]
    ])('cancellationBlockCount(%j) is %p', (rows, count) => {
      expect(cancellationBlockCount(rows)).toBe(count)
    })

    test.each([
      [false, 'K'],
      [true, 'L']
    ])(
      'starts in the column after Cancellations (compliance schemes: %p)',
      async (isComplianceScheme, column) => {
        const { worksheet, headingsRowNumber } = await build(isComplianceScheme)

        expect(worksheet.getCell(`${column}${headingsRowNumber}`).value).toBe(
          'Date submitted'
        )
        expect(
          worksheet.getCell(`${column}${headingsRowNumber - 1}`).value
        ).toBe('Cancellation 1')
      }
    )

    test('puts the report heading and a merged, bold, centred Cancellation N heading over each block in the first row', async () => {
      const { worksheet, headingsRowNumber } = await build(false, [
        {
          ...acceptedRow,
          cancellationHistory: [olderCancellation, newerCancellation]
        }
      ])

      expect(headingsRowNumber).toBe(2)
      expect(worksheet.model.merges).toEqual(['K1:O1', 'P1:T1'])
      expect(worksheet.getCell('A1').value).toBe(HEADING)
      expect(worksheet.getCell('K1').value).toBe('Cancellation 1')
      expect(worksheet.getCell('P1').value).toBe('Cancellation 2')
      expect(worksheet.getCell('K1').font).toMatchObject({ bold: true })
      expect(worksheet.getCell('K1').alignment).toMatchObject({
        horizontal: 'center'
      })
    })

    test('shades the cancellation headings darker grey and boxes them in, leaving the report heading row plain', async () => {
      const { worksheet } = await build(false)

      for (const address of ['K1', 'O1', 'K2', 'O2']) {
        expect(worksheet.getCell(address).fill).toEqual(
          CANCELLATION_HEADING_FILL
        )
        expect(worksheet.getCell(address).border).toEqual(CELL_BORDER)
      }
      expect(worksheet.getCell('J2').fill).toEqual(HEADING_FILL)
      for (const address of ['A1', 'J1']) {
        expect(worksheet.getCell(address).fill).not.toEqual(
          CANCELLATION_HEADING_FILL
        )
        expect(worksheet.getCell(address).border).not.toEqual(CELL_BORDER)
      }
    })

    test('filters every cancellation column and freezes the panes below the column headings', async () => {
      const { worksheet, headingsRowNumber } = await build(true, [
        {
          ...acceptedRow,
          cancellationHistory: [olderCancellation, newerCancellation]
        }
      ])

      expect(worksheet.autoFilter).toBe(`A2:U2`)
      expect(worksheet.views[0].ySplit).toBe(headingsRowNumber)
    })

    test('fills one block per cancellation, oldest first, and leaves the unused blocks blank', async () => {
      const { rows } = await build(false, [
        {
          ...acceptedRow,
          cancellationHistory: [olderCancellation, newerCancellation]
        },
        { ...notSubmittedRow, cancellationHistory: [olderCancellation] },
        {
          ...acceptedRow,
          organisationName: 'No cancellations Ltd',
          cancellationHistory: []
        }
      ])

      expect(rows[0]).toMatchObject({
        'Cancellation 1: Date submitted': new Date('2026-10-31T00:00:00Z'),
        'Cancellation 1: Date cancelled': new Date('2026-11-10T00:00:00Z'),
        'Cancellation 1: Cancelled by': 'Test User',
        'Cancellation 1: Reason': 'Not signed by correct person',
        'Cancellation 1: Status when cancelled': 'Pending',
        'Cancellation 2: Date submitted': new Date('2026-12-17T00:00:00Z'),
        'Cancellation 2: Date cancelled': new Date('2027-01-08T00:00:00Z'),
        'Cancellation 2: Cancelled by': 'Another User',
        'Cancellation 2: Reason': 'Recycling obligations changed',
        'Cancellation 2: Status when cancelled': 'Accepted'
      })
      expect(rows[1]).toMatchObject({
        'Cancellation 1: Cancelled by': 'Test User',
        ...blankCancellationBlock(2)
      })
      expect(rows[2]).toMatchObject({
        ...blankCancellationBlock(1),
        ...blankCancellationBlock(2)
      })
    })

    test('shows one blank Cancellation 1 block when nobody has cancelled', async () => {
      const { worksheet, rows } = await build(false)

      expect(worksheet.model.merges).toEqual(['K1:O1'])
      expect(worksheet.getCell('K1').value).toBe('Cancellation 1')
      rows.forEach((row) =>
        expect(row).toMatchObject(blankCancellationBlock(1))
      )
    })

    test('builds three blocks for three cancellations, oldest first, and leaves the unused blocks blank', async () => {
      const oldest = {
        ...olderCancellation,
        dateCancelled: new Date('2026-10-01T00:00:00Z')
      }
      const { worksheet, rows } = await build(false, [
        {
          ...acceptedRow,
          cancellationHistory: [oldest, olderCancellation, newerCancellation]
        },
        { ...notSubmittedRow, cancellationHistory: [olderCancellation] }
      ])

      expect(worksheet.model.merges).toEqual(['K1:O1', 'P1:T1', 'U1:Y1'])
      expect(worksheet.getCell('U1').value).toBe('Cancellation 3')
      expect(worksheet.autoFilter).toBe('A2:Y2')
      expect(
        [1, 2, 3].map(
          (number) => rows[0][`Cancellation ${number}: Date cancelled`]
        )
      ).toEqual([
        new Date('2026-10-01T00:00:00Z'),
        new Date('2026-11-10T00:00:00Z'),
        new Date('2027-01-08T00:00:00Z')
      ])
      expect(rows[1]).toMatchObject({
        ...blankCancellationBlock(2),
        ...blankCancellationBlock(3)
      })
    })

    test('stores the cancellation dates as left-aligned dates in every block', async () => {
      const { worksheet, headingsRowNumber } = await build(false, [
        {
          ...acceptedRow,
          cancellationHistory: [olderCancellation, newerCancellation]
        }
      ])
      const dataRow = headingsRowNumber + 1

      // Date submitted and Date cancelled of Cancellation 1 (K, L) and 2 (P, Q).
      for (const column of ['K', 'L', 'P', 'Q']) {
        const cell = worksheet.getCell(`${column}${dataRow}`)
        expect(cell.value).toBeInstanceOf(Date)
        expect(cell.numFmt).toBe(REPORT_DATE_FORMAT)
        expect(cell.alignment).toEqual(REPORT_DATE_ALIGNMENT)
      }
    })

    test('boxes in blank cancellation cells too', async () => {
      const { worksheet, headingsRowNumber } = await build(false)

      expect(worksheet.getCell(`O${headingsRowNumber + 1}`).value).toBeNull()
      expect(worksheet.getCell(`O${headingsRowNumber + 1}`).border).toEqual(
        CELL_BORDER
      )
    })
  })
})
