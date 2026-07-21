import { load } from 'cheerio'

const TONNAGE_COLUMN = {
  MATERIAL: 0,
  OBLIGATION_TO_MEET: 1,
  AWAITING_ACCEPTANCE: 2,
  ACCEPTED: 3,
  OUTSTANDING: 4
}

const CURRENT_YEAR_COLUMN = {
  DATE: 0,
  ACTION: 1,
  BY: 2,
  REASON: 3
}

const SUMMARY_ROW = '.govuk-summary-list__row'
const SUMMARY_KEY = '.govuk-summary-list__key'

function readTag($, row) {
  const tag = $(row).find('.govuk-tag')
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
    material: cells[TONNAGE_COLUMN.MATERIAL],
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
  const bodyRows = $(`[data-testid="${testid}"] tbody tr`).toArray()
  return {
    rows: bodyRows.slice(0, -1).map((r) => readRow($, r)),
    totals: readRow($, bodyRows.at(-1))
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
          .find('.govuk-tag')
          .text()
          .trim(),
        by: cells.eq(CURRENT_YEAR_COLUMN.BY).text().trim(),
        reason: cells.eq(CURRENT_YEAR_COLUMN.REASON).text().trim()
      }
    })
  return { rows }
}

export function loadDetailPage(payload) {
  const $ = load(payload)
  return {
    heading: $('h1').first().text().trim(),
    insetText: $('.govuk-inset-text').text().trim(),
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
