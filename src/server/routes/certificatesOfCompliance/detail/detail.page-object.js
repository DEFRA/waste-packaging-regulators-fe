import { load } from 'cheerio'

// The first column (material name / date) is a `<th scope="row">` row header,
// so these indexes count only the `<td>` cells that follow it.
const TONNAGE_COLUMN = {
  OBLIGATION_TO_MEET: 0,
  AWAITING_ACCEPTANCE: 1,
  ACCEPTED: 2,
  OUTSTANDING: 3
}

const CURRENT_YEAR_COLUMN = {
  DATE: 0,
  ACTION: 1,
  BY: 2,
  REASON: 3,
  LINK: 4
}

const SUMMARY_ROW = '.govuk-summary-list__row'
const SUMMARY_KEY = '.govuk-summary-list__key'
const GOVUK_TAG = '.govuk-tag'

function readTag($, row) {
  const tag = $(row).find(GOVUK_TAG)
  const cls = tag.attr('class') ?? ''
  const colour = /govuk-tag--(green|red|grey|blue|yellow|teal)/.exec(cls)?.[1]
  return { text: tag.text().trim(), colour: colour ?? null }
}

function readRow($, row) {
  const cells = $(row)
    .find('td')
    .toArray()
    .map((c) => $(c).text().trim())
  return {
    material: $(row).find('th').first().text().trim(),
    tonnages: {
      obligationToMeet: cells[TONNAGE_COLUMN.OBLIGATION_TO_MEET],
      awaitingAcceptance: cells[TONNAGE_COLUMN.AWAITING_ACCEPTANCE],
      accepted: cells[TONNAGE_COLUMN.ACCEPTED],
      outstanding: cells[TONNAGE_COLUMN.OUTSTANDING]
    },
    statusTag: readTag($, row)
  }
}

function readTable($, testid) {
  return {
    rows: $(`[data-testid="${testid}"] tbody tr`)
      .toArray()
      .map((r) => readRow($, r)),
    totals: readRow($, $(`[data-testid="${testid}"] tfoot tr`).get(0))
  }
}

function findSummaryRow($, key) {
  return $(SUMMARY_ROW)
    .toArray()
    .map((row) => $(row))
    .find(($row) => $row.find(SUMMARY_KEY).text().trim() === key)
}

function summaryValue($row) {
  return $row?.find('.govuk-summary-list__value').text().trim() ?? null
}

function readSummaryRow($, key) {
  const row = findSummaryRow($, key)
  if (!row) {
    return { present: false, value: null, tag: null }
  }

  const tag = readTag($, row)
  const hasTag = $(row).find(GOVUK_TAG).length > 0

  return {
    present: true,
    value: summaryValue(row),
    tag: hasTag ? tag : null
  }
}

function readOutcomeStatus($) {
  const statusRow = findSummaryRow($, 'Submission status')
  return {
    statusLabel: statusRow?.find(SUMMARY_KEY).text().trim(),
    statusTag: statusRow ? readTag($, statusRow) : null
  }
}

function readAccepted($) {
  const acceptedByRow = findSummaryRow($, 'Accepted by')
  if (!acceptedByRow) {
    return { present: false }
  }

  return {
    present: true,
    ...readOutcomeStatus($),
    acceptedBy: summaryValue(acceptedByRow),
    acceptedDate: summaryValue(findSummaryRow($, 'Accepted date'))
  }
}

function readCancellation($) {
  const cancelledByRow = findSummaryRow($, 'Cancelled by')
  if (!cancelledByRow) {
    return { present: false }
  }

  return {
    present: true,
    ...readOutcomeStatus($),
    cancelledBy: summaryValue(cancelledByRow),
    cancelledDate: summaryValue(findSummaryRow($, 'Cancelled date')),
    reason: summaryValue(findSummaryRow($, 'Reason for cancellation'))
  }
}

function readNotificationBanner($) {
  const banner = $('.govuk-notification-banner')
  if (banner.length === 0) {
    return { present: false }
  }

  return {
    present: true,
    cancelled: banner.hasClass('app-notification-banner--cancelled'),
    heading: banner.find('.govuk-notification-banner__title').text().trim(),
    text: banner.find('.govuk-notification-banner__content').text().trim()
  }
}

function readDeclaration($) {
  const section = $('[data-testid="declaration"]')
  return {
    present: section.length > 0,
    documentNoun: section.find('[data-testid="declaration-noun"]').text().trim()
  }
}

function readRegulation43($) {
  const section = $('[data-testid="regulation-43"]')
  return {
    present: section.length > 0,
    text: section.find('p').text().trim()
  }
}

function readObligationsSection($) {
  return {
    tablePresent: $('[data-testid="obligations-table"]').length > 0,
    noData: $('[data-testid="obligations-no-data"]').length > 0
  }
}

function readButton($, button) {
  return { text: $(button).text().trim(), href: $(button).attr('href') }
}

function readActions($) {
  const buttons = $('.govuk-button-group a[role="button"]').toArray()
  const findByPrefix = (prefix) => {
    const button = buttons.find(($button) =>
      $($button).text().trim().startsWith(prefix)
    )
    return button ? readButton($, button) : null
  }
  return {
    accept: findByPrefix('Accept'),
    cancel: findByPrefix('Cancel')
  }
}

function readCurrentYear($) {
  const rows = $('[data-testid="current-year-table"] tbody tr')
    .toArray()
    .map((row) => {
      const cells = $(row).find('td')
      return {
        date: cells.eq(CURRENT_YEAR_COLUMN.DATE).text().trim(),
        action: cells
          .eq(CURRENT_YEAR_COLUMN.ACTION)
          .find(GOVUK_TAG)
          .text()
          .trim(),
        by: cells.eq(CURRENT_YEAR_COLUMN.BY).text().trim(),
        reason: cells.eq(CURRENT_YEAR_COLUMN.REASON).text().trim(),
        viewSubmissionUrl: cells
          .eq(CURRENT_YEAR_COLUMN.LINK)
          .find('a')
          .attr('href')
      }
    })
  return { rows }
}

export function loadDetailPage(payload) {
  const $ = load(payload)
  return {
    heading: $('h1').first().text().trim(),
    insetText: $('.govuk-inset-text').text().trim(),
    summaryRows: {
      recyclingObligations: readSummaryRow($, 'Recycling obligations'),
      submissionStatus: readSummaryRow($, 'Submission status'),
      submittedOn: readSummaryRow($, 'Submitted on'),
      nameOnAccount: readSummaryRow($, 'Name on account'),
      organisationType: readSummaryRow($, 'Organisation type'),
      companyNumber: readSummaryRow($, 'Company number'),
      emailAddress: readSummaryRow($, 'Email address'),
      phoneNumber: readSummaryRow($, 'Phone number')
    },
    materials: readTable($, 'obligations-table'),
    glass: readTable($, 'glass-breakdown-table'),
    banner: readNotificationBanner($),
    declaration: readDeclaration($),
    accepted: readAccepted($),
    cancellation: readCancellation($),
    actions: readActions($),
    currentYear: readCurrentYear($),
    regulation43: readRegulation43($),
    obligations: readObligationsSection($)
  }
}
