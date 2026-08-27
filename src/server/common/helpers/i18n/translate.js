import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { getLocale } from './get-locale.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const localesPath = path.resolve(dirname, '../../../locales')
const DEFAULT_LOCALE = 'en'
const dictionariesCache = {}

function loadDictionary(locale) {
  if (!dictionariesCache[locale]) {
    const filePath = path.join(localesPath, `${locale}.json`)
    dictionariesCache[locale] = JSON.parse(readFileSync(filePath, 'utf-8'))
  }

  return dictionariesCache[locale]
}

function getNestedValue(obj, key) {
  return key
    .split('.')
    .reduce(
      (acc, current) => (acc && current in acc ? acc[current] : undefined),
      obj
    )
}

export function hasLocaleKey(locale, key) {
  const requestedDictionary = loadDictionary(locale)
  const defaultDictionary =
    locale === DEFAULT_LOCALE
      ? requestedDictionary
      : loadDictionary(DEFAULT_LOCALE)

  return (
    getNestedValue(requestedDictionary, key) !== undefined ||
    getNestedValue(defaultDictionary, key) !== undefined
  )
}

function interpolate(template, params) {
  return template.replaceAll(/\{\{(\w+)\}\}/g, (_match, paramName) =>
    paramName in params ? String(params[paramName]) : ''
  )
}

export function translate(locale, key, params = {}) {
  const requestedDictionary = loadDictionary(locale)
  const defaultDictionary =
    locale === DEFAULT_LOCALE
      ? requestedDictionary
      : loadDictionary(DEFAULT_LOCALE)

  const value =
    getNestedValue(requestedDictionary, key) ??
    getNestedValue(defaultDictionary, key) ??
    key

  if (typeof value !== 'string') {
    return key
  }

  return interpolate(value, params)
}

export const COMPLIANCE_COMPONENT_LOCALE = {
  statusTag: 'compliance.components.statusTag',
  sortingColumnHeader: 'compliance.components.sortingColumnHeader',
  pagination: 'compliance.components.pagination',
  summaryList: 'compliance.components.summaryList'
}

export function resolveComponentLocaleKey(
  locale,
  pageLocaleBase,
  componentName,
  key
) {
  const pageKey = pageLocaleBase
    ? `${pageLocaleBase}.components.${componentName}.${key}`
    : null

  if (pageKey && hasLocaleKey(locale, pageKey)) {
    return pageKey
  }

  const componentBase = COMPLIANCE_COMPONENT_LOCALE[componentName]
  if (componentBase) {
    return `${componentBase}.${key}`
  }

  return pageKey ?? key
}

export function translateComponent(
  locale,
  pageLocaleBase,
  componentName,
  key,
  params = {}
) {
  return translate(
    locale,
    resolveComponentLocaleKey(locale, pageLocaleBase, componentName, key),
    params
  )
}

export function pageI18n(locale, pageLocaleBase) {
  return {
    t(key, params = {}) {
      return translate(locale, `${pageLocaleBase}.${key}`, params)
    },
    ct(component, key, params = {}) {
      return translateComponent(locale, pageLocaleBase, component, key, params)
    },
    ck(component, key) {
      return resolveComponentLocaleKey(locale, pageLocaleBase, component, key)
    }
  }
}

export function buildPageViewModel(request, pageKey) {
  const locale = getLocale(request)

  return {
    pageTitle: translate(locale, `${pageKey}.pageTitle`),
    heading: translate(locale, `${pageKey}.heading`)
  }
}

/** Clears cached dictionaries — for tests only. */
export function clearLocaleCacheForTests() {
  for (const key of Object.keys(dictionariesCache)) {
    delete dictionariesCache[key]
  }
}
