import {
  cocPageI18n,
  translateActionLabels,
  translateComplianceDocumentNoun,
  translateComplianceTypeLabel,
  translateEmptyTabMessage,
  translateNoData,
  translateOrganisationTypeDisplay,
  translateRegulation43Statement,
  translateSuccessBanner,
  translateTabSummaryText,
  translateUnknownOrganisation
} from './locale-strings.js'

describe('locale-strings', () => {
  test('cocPageI18n scopes keys under certificatesOfCompliance', () => {
    const i18n = cocPageI18n('en', 'list')
    expect(i18n.t('heading')).toBe(
      'View certificates and statements of compliance'
    )
  })

  test('translateEmptyTabMessage returns text for known tabs', () => {
    expect(translateEmptyTabMessage('pending', 'en')).toContain(
      'No submissions waiting for review'
    )
    expect(translateEmptyTabMessage('unknown', 'en')).toBe('')
  })

  test('translateTabSummaryText returns text for known tabs', () => {
    expect(translateTabSummaryText('accepted', 'en')).toContain('accepted')
    expect(translateTabSummaryText('unknown', 'en')).toBe('')
  })

  test('translateSuccessBanner returns direct producer copy', () => {
    expect(
      translateSuccessBanner('DirectProducer', 'accepted', 'en')
    ).toMatchObject({
      heading: 'Certificate accepted',
      text: 'Certificate has been accepted.'
    })
  })

  test('translateSuccessBanner returns compliance scheme copy', () => {
    expect(
      translateSuccessBanner('ComplianceScheme', 'cancelled', 'en')
    ).toMatchObject({
      heading: 'Statement cancelled',
      text: 'Statement has been cancelled and an email sent to the compliance scheme.'
    })
  })

  test('translateActionLabels returns accept and cancel labels', () => {
    expect(translateActionLabels('DirectProducer', 'en')).toEqual({
      accept: 'Accept certificate',
      cancel: 'Cancel certificate'
    })
    expect(translateActionLabels('ComplianceScheme', 'en')).toEqual({
      accept: 'Accept statement',
      cancel: 'Cancel statement'
    })
  })

  test('translateOrganisationTypeDisplay maps registration types', () => {
    expect(translateOrganisationTypeDisplay('DirectProducer', 'en')).toBe(
      'Direct producer'
    )
    expect(translateOrganisationTypeDisplay('ComplianceScheme', 'en')).toBe(
      'Compliance scheme'
    )
  })

  test('translateNoData and translateUnknownOrganisation return locale strings', () => {
    expect(translateNoData('en')).toBe('No data')
    expect(translateUnknownOrganisation('en')).toBe('Unknown organisation')
  })

  test('translateComplianceDocumentNoun maps registration types', () => {
    expect(translateComplianceDocumentNoun('DirectProducer', 'en')).toBe(
      'certificate of compliance'
    )
    expect(translateComplianceDocumentNoun('ComplianceScheme', 'en')).toBe(
      'statement of compliance'
    )
  })

  test('translateComplianceTypeLabel returns No data when year missing', () => {
    expect(translateComplianceTypeLabel(null, 'DirectProducer', 'en')).toBe(
      'No data'
    )
  })

  test('translateComplianceTypeLabel builds year and document label', () => {
    expect(
      translateComplianceTypeLabel(2026, 'DirectProducer', 'en')
    ).toContain('2026')
  })

  test('translateRegulation43Statement returns null when value missing', () => {
    expect(translateRegulation43Statement(null, 'Acme Ltd', 'en')).toBeNull()
  })

  test('translateRegulation43Statement builds complied and not complied copy', () => {
    expect(translateRegulation43Statement(true, 'Acme Ltd', 'en')).toContain(
      'Acme Ltd'
    )
    expect(translateRegulation43Statement(false, 'Acme Ltd', 'en')).toContain(
      'not complied'
    )
  })
})
