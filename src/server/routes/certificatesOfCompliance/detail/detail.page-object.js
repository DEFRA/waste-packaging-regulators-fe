import { load } from 'cheerio'

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
    material: cells[0],
    tonnages: {
      obligationToMeet: cells[1],
      awaitingAcceptance: cells[2],
      accepted: cells[3],
      outstanding: cells[4]
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

export function loadDetailPage(payload) {
  const $ = load(payload)
  return {
    materials: readTable($, 'obligations-table'),
    glass: readTable($, 'glass-breakdown-table')
  }
}
