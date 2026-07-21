import { load } from 'cheerio'

function readRadios($) {
  return $('.govuk-radios__item')
    .toArray()
    .map((item) => {
      const input = $(item).find('input')
      return {
        value: input.attr('value'),
        label: $(item).find('label').text().trim(),
        hint: $(item).find('.govuk-radios__hint').text().trim(),
        checked: input.is('[checked]')
      }
    })
}

function readErrorSummary($) {
  const summary = $('.govuk-error-summary')
  if (summary.length === 0) {
    return null
  }
  const link = summary.find('.govuk-error-summary__list a')
  return {
    title: summary.find('.govuk-error-summary__title').text().trim(),
    message: link.text().trim(),
    href: link.attr('href')
  }
}

function findRow($, key) {
  return $('.govuk-summary-list__row')
    .toArray()
    .map((row) => $(row))
    .find(($row) => $row.find('.govuk-summary-list__key').text().trim() === key)
}

export function loadReasonPage(payload) {
  const $ = load(payload)
  return {
    heading: $('.govuk-fieldset__heading').text().trim(),
    reasons: readRadios($),
    error: readErrorSummary($),
    hasCsrfToken: $('input[name="CSRFToken"]').length > 0,
    formAction: $('form').attr('action')
  }
}

export function loadCheckPage(payload) {
  const $ = load(payload)
  const reasonRow = findRow($, 'Cancel reason')
  const emailRow = findRow($, 'Email')
  return {
    heading: $('.govuk-heading-l').first().text().trim(),
    organisation: findRow($, 'Organisation')
      ?.find('.govuk-summary-list__value')
      .text()
      .trim(),
    reason: {
      value: reasonRow?.find('.govuk-summary-list__value').text().trim(),
      changeUrl: reasonRow?.find('.govuk-summary-list__actions a').attr('href')
    },
    emailLink: emailRow?.find('.govuk-summary-list__value a').text().trim(),
    insetText: $('.govuk-inset-text').text().trim(),
    hiddenReason: $('input[name="cancel-reason"]').attr('value'),
    confirmButton: $('.govuk-button').first().text().trim(),
    formAction: $('form').attr('action')
  }
}
