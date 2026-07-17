import { load } from 'cheerio'

const TONNAGE_COLUMN = {
  MATERIAL: 0,
  OBLIGATION_TO_MEET: 1,
  AWAITING_ACCEPTANCE: 2,
  ACCEPTED: 3,
  OUTSTANDING: 4
}

function readTag($, row) {
  const tag = $(row).find('.govuk-tag')
  const cls = tag.attr('class') ?? ''
  const colour = /govuk-tag--(green|red|grey|blue|yellow)/.exec(cls)?.[1]
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
    tablePresent: $('[data-testid="obligations-table"]').length > 0
  }
}

export function loadDetailPage(payload) {
  const $ = load(payload)
  return {
    materials: readTable($, 'obligations-table'),
    glass: readTable($, 'glass-breakdown-table'),
    declaration: readDeclaration($),
    regulation43: readRegulation43($),
    obligations: readObligationsSection($)
  }
}
