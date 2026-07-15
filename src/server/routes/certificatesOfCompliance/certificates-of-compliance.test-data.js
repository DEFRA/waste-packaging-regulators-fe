/**
 * Object Mother for certificates-of-compliance tests.
 *
 * Each named export is a plain object derived from the mock data and provides
 * the URL, display name, IDs, and any other fields used across multiple tests.
 * Tests should import from here rather than hardcoding IDs or names directly.
 */
import {
  mockDetailData,
  mockDirectProducerPendingNotMetDetailData,
  mockComplianceSchemeDetailData,
  mockComplianceSchemePendingNotMetDetailData,
  mockComplianceSchemeAcceptedDetailData,
  mockDirectProducerAcceptedDetailData,
  mockDirectProducerCancelledDetailData,
  mockComplianceSchemeCancelledDetailData,
  mockAcceptedOnlyDeclaration,
  mockCancelledOnlyDeclaration,
  mockNotSubmittedItems,
  mockComplianceSchemeNotSubmittedItems
} from './certificates-of-compliance.mock.js'

function detailUrl(data) {
  return `/${data.organisation.id}/certificates-of-compliance/${data.id}`
}

function unsubmittedUrl(item, year = 2026) {
  return `/${item.organisationId}/certificates-of-compliance?obligationYear=${year}`
}

function displayName(data) {
  const { organisation } = data
  return (
    organisation.name ??
    organisation.complianceSchemeName ??
    organisation.schemeOperatorName
  )
}

// --- Direct producer pending (all Met) ---
export const HOWCO = {
  url: detailUrl(mockDetailData),
  name: displayName(mockDetailData),
  id: mockDetailData.id,
  organisationId: mockDetailData.organisation.id,
  referenceNumber: mockDetailData.organisation.referenceNumber,
  companiesHouseNumber: mockDetailData.organisation.companiesHouseNumber,
  submitterName: mockDetailData.submitterName,
  obligationYear: mockDetailData.obligationYear
}

// --- Direct producer pending (Not Met) ---
export const GREENFIELD = {
  url: detailUrl(mockDirectProducerPendingNotMetDetailData),
  name: displayName(mockDirectProducerPendingNotMetDetailData),
  id: mockDirectProducerPendingNotMetDetailData.id,
  organisationId: mockDirectProducerPendingNotMetDetailData.organisation.id
}

// --- Compliance scheme pending (all Met) ---
export const ECOPACK = {
  url: detailUrl(mockComplianceSchemeDetailData),
  name: displayName(mockComplianceSchemeDetailData),
  id: mockComplianceSchemeDetailData.id,
  organisationId: mockComplianceSchemeDetailData.organisation.id,
  obligationYear: mockComplianceSchemeDetailData.obligationYear
}

// --- Compliance scheme pending (Not Met) ---
export const GREENCIRCLE = {
  url: detailUrl(mockComplianceSchemePendingNotMetDetailData),
  name: displayName(mockComplianceSchemePendingNotMetDetailData),
  id: mockComplianceSchemePendingNotMetDetailData.id,
  organisationId: mockComplianceSchemePendingNotMetDetailData.organisation.id
}

// --- Compliance scheme accepted ---
export const NATIONWIDE = {
  url: detailUrl(mockComplianceSchemeAcceptedDetailData),
  name: displayName(mockComplianceSchemeAcceptedDetailData),
  id: mockComplianceSchemeAcceptedDetailData.id,
  organisationId: mockComplianceSchemeAcceptedDetailData.organisation.id,
  acceptedDate: '12 January 2027 at 12:05'
}

// --- Direct producer accepted ---
export const ACME = {
  url: detailUrl(mockDirectProducerAcceptedDetailData),
  name: displayName(mockDirectProducerAcceptedDetailData),
  id: mockDirectProducerAcceptedDetailData.id,
  organisationId: mockDirectProducerAcceptedDetailData.organisation.id,
  acceptedDate: '15 January 2027 at 14:30'
}

// --- Direct producer cancelled ---
export const GREENFIELD_CANCELLED = {
  url: detailUrl(mockDirectProducerCancelledDetailData),
  name: displayName(mockDirectProducerCancelledDetailData),
  id: mockDirectProducerCancelledDetailData.id,
  organisationId: mockDirectProducerCancelledDetailData.organisation.id
}

// --- Compliance scheme cancelled ---
export const GREENCIRCLE_CANCELLED = {
  url: detailUrl(mockComplianceSchemeCancelledDetailData),
  name: displayName(mockComplianceSchemeCancelledDetailData),
  id: mockComplianceSchemeCancelledDetailData.id,
  organisationId: mockComplianceSchemeCancelledDetailData.organisation.id
}

// --- Accepted-only history declaration ---
export const HILL_INDUSTRIES = {
  url: detailUrl(mockAcceptedOnlyDeclaration),
  name: displayName(mockAcceptedOnlyDeclaration),
  id: mockAcceptedOnlyDeclaration.id,
  organisationId: mockAcceptedOnlyDeclaration.organisation.id,
  acceptedDate: '15 April 2026 at 11:20'
}

// --- Cancelled-only history declaration ---
export const RIVERDALE = {
  url: detailUrl(mockCancelledOnlyDeclaration),
  name: displayName(mockCancelledOnlyDeclaration),
  id: mockCancelledOnlyDeclaration.id,
  organisationId: mockCancelledOnlyDeclaration.organisation.id,
  cancelledDate: '8 April 2026 at 10:00'
}

// --- Not-submitted direct producers ---
export const REDWOOD = {
  url: unsubmittedUrl(mockNotSubmittedItems[0]),
  name: mockNotSubmittedItems[0].organisationName,
  organisationId: mockNotSubmittedItems[0].organisationId,
  referenceNumber: mockNotSubmittedItems[0].organisationReferenceNumber
}

export const COASTAL_BOTTLING = {
  url: unsubmittedUrl(mockNotSubmittedItems[1]),
  name: mockNotSubmittedItems[1].organisationName,
  organisationId: mockNotSubmittedItems[1].organisationId,
  referenceNumber: mockNotSubmittedItems[1].organisationReferenceNumber
}

export const STERLING = {
  url: unsubmittedUrl(mockNotSubmittedItems[2]),
  name: mockNotSubmittedItems[2].organisationName,
  organisationId: mockNotSubmittedItems[2].organisationId,
  referenceNumber: mockNotSubmittedItems[2].organisationReferenceNumber
}

export const PINNACLE = {
  url: unsubmittedUrl(mockNotSubmittedItems[3]),
  name: mockNotSubmittedItems[3].organisationName,
  organisationId: mockNotSubmittedItems[3].organisationId,
  referenceNumber: mockNotSubmittedItems[3].organisationReferenceNumber
}

// --- Not-submitted compliance schemes ---
export const FUTUREPACK = {
  url: unsubmittedUrl(mockComplianceSchemeNotSubmittedItems[0]),
  name: mockComplianceSchemeNotSubmittedItems[0].organisationName,
  organisationId: mockComplianceSchemeNotSubmittedItems[0].organisationId,
  referenceNumber:
    mockComplianceSchemeNotSubmittedItems[0].organisationReferenceNumber
}
