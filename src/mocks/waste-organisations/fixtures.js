// waste-organisations mock data: the organisation registry (address,
// registrations, Companies House number) served by the organisations backend.

import {
  orgs,
  OBLIGATION_YEAR,
  MOCK_REGISTRATION_STATUS,
  MOCK_BUSINESS_COUNTRY,
  MOCK_BUSINESS_COUNTRY_WALES,
  MOCK_BUSINESS_COUNTRY_SCOTLAND,
  MOCK_BUSINESS_COUNTRY_NORTHERN_IRELAND,
  MOCK_REGISTRATION_TIMESTAMP
} from '#mocks/identities.js'

// waste-organisations records — the separate system that carries address /
// registration data. Keyed by organisation id; served by GET /organisations/{id}
// and (filtered by registration type) by GET /organisations.
function complianceSchemeOrganisation(
  id,
  schemeName,
  operatorName,
  companiesHouseNumber,
  addressLine1,
  postcode = 'SW1A 1AA'
) {
  return {
    id,
    name: schemeName,
    tradingName: operatorName,
    businessCountry: MOCK_BUSINESS_COUNTRY,
    companiesHouseNumber,
    address: { addressLine1, postcode, country: 'EN' },
    registrations: [
      {
        created: MOCK_REGISTRATION_TIMESTAMP,
        updated: MOCK_REGISTRATION_TIMESTAMP,
        status: MOCK_REGISTRATION_STATUS,
        type: 'COMPLIANCE_SCHEME',
        registrationYear: OBLIGATION_YEAR
      }
    ]
  }
}

function directProducerOrganisation(
  id,
  name,
  companiesHouseNumber,
  addressLine1,
  postcode,
  { businessCountry = MOCK_BUSINESS_COUNTRY, addressCountry = 'EN' } = {}
) {
  return {
    id,
    name,
    tradingName: null,
    businessCountry,
    companiesHouseNumber,
    address: { addressLine1, postcode, country: addressCountry },
    registrations: [
      {
        created: MOCK_REGISTRATION_TIMESTAMP,
        updated: MOCK_REGISTRATION_TIMESTAMP,
        status: MOCK_REGISTRATION_STATUS,
        type: 'LARGE_PRODUCER',
        registrationYear: OBLIGATION_YEAR
      }
    ]
  }
}

export const wasteOrganisations = [
  directProducerOrganisation(
    orgs.howco.id,
    orgs.howco.name,
    '12345678',
    'Registered Add Line 1',
    'CB113DG'
  ),
  directProducerOrganisation(
    orgs.greenfield.id,
    orgs.greenfield.name,
    '23456789',
    '3 Meadow View',
    'BS1 5TF'
  ),
  directProducerOrganisation(
    orgs.acme.id,
    orgs.acme.name,
    '12345678',
    '1 Acme Way',
    'LS1 1AA'
  ),
  directProducerOrganisation(
    orgs.bluesky.id,
    orgs.bluesky.name,
    '12345678',
    '5 Sky Road',
    'M1 1AA'
  ),
  directProducerOrganisation(
    orgs.redwood.id,
    orgs.redwood.name,
    '17121895',
    'Registered Add Line 1',
    'CB113DG'
  ),
  directProducerOrganisation(
    orgs.sterling.id,
    orgs.sterling.name,
    '34921001',
    '14 Mill Lane',
    'LS1 4PL'
  ),
  directProducerOrganisation(
    orgs.pinnacle.id,
    orgs.pinnacle.name,
    '51036002',
    '7 Industrial Park',
    'M1 2AB'
  ),
  directProducerOrganisation(
    orgs.meridian.id,
    orgs.meridian.name,
    '62147003',
    '22 Commerce Road',
    'B1 1BB'
  ),
  // No Companies House number — exercises the "No data" empty state on the
  // not-submitted detail page.
  directProducerOrganisation(
    orgs.coastal.id,
    orgs.coastal.name,
    null,
    '9 Harbour Way',
    'PL1 1AA'
  ),
  directProducerOrganisation(
    orgs.thornbury.id,
    orgs.thornbury.name,
    '31847205',
    '2 Bridge Street',
    'GL1 1AA'
  ),
  directProducerOrganisation(
    orgs.cwmniPacio.id,
    orgs.cwmniPacio.name,
    '98765432',
    '12 Heol y Ffordd',
    'CF10 1AA',
    { businessCountry: MOCK_BUSINESS_COUNTRY_WALES, addressCountry: 'WLS' }
  ),
  directProducerOrganisation(
    orgs.highlandPack.id,
    orgs.highlandPack.name,
    '76543210',
    '14 Castle Street',
    'EH1 2NG',
    { businessCountry: MOCK_BUSINESS_COUNTRY_SCOTLAND, addressCountry: 'SCT' }
  ),
  directProducerOrganisation(
    orgs.belfastPack.id,
    orgs.belfastPack.name,
    '87651234',
    '22 Donegall Square',
    'BT1 5GS',
    {
      businessCountry: MOCK_BUSINESS_COUNTRY_NORTHERN_IRELAND,
      addressCountry: 'NIR'
    }
  ),
  complianceSchemeOrganisation(
    orgs.ecopack.id,
    orgs.ecopack.name,
    orgs.ecopack.operatorName,
    orgs.ecopack.companiesHouseNumber,
    'EcoPack House'
  ),
  complianceSchemeOrganisation(
    orgs.greencircle.id,
    orgs.greencircle.name,
    orgs.greencircle.operatorName,
    orgs.greencircle.companiesHouseNumber,
    'GreenCircle House'
  ),
  complianceSchemeOrganisation(
    orgs.kestrel.id,
    orgs.kestrel.name,
    orgs.kestrel.operatorName,
    orgs.kestrel.companiesHouseNumber,
    'Kestrel House'
  ),
  complianceSchemeOrganisation(
    orgs.larchwood.id,
    orgs.larchwood.name,
    orgs.larchwood.operatorName,
    orgs.larchwood.companiesHouseNumber,
    'Larchwood House'
  ),
  complianceSchemeOrganisation(
    orgs.nationwide.id,
    orgs.nationwide.name,
    orgs.nationwide.operatorName,
    orgs.nationwide.companiesHouseNumber,
    'Nationwide House'
  ),
  complianceSchemeOrganisation(
    orgs.riverside.id,
    orgs.riverside.name,
    orgs.riverside.operatorName,
    orgs.riverside.companiesHouseNumber,
    'Riverside House'
  ),
  complianceSchemeOrganisation(
    orgs.ashcroft.id,
    orgs.ashcroft.name,
    orgs.ashcroft.operatorName,
    orgs.ashcroft.companiesHouseNumber,
    'Ashcroft House'
  ),
  complianceSchemeOrganisation(
    orgs.bramble.id,
    orgs.bramble.name,
    orgs.bramble.operatorName,
    orgs.bramble.companiesHouseNumber,
    'Bramble House'
  ),
  complianceSchemeOrganisation(
    orgs.caldera.id,
    orgs.caldera.name,
    orgs.caldera.operatorName,
    orgs.caldera.companiesHouseNumber,
    'Caldera House'
  ),
  complianceSchemeOrganisation(
    orgs.dovetail.id,
    orgs.dovetail.name,
    orgs.dovetail.operatorName,
    orgs.dovetail.companiesHouseNumber,
    'Dovetail House'
  ),
  complianceSchemeOrganisation(
    orgs.futurepack.id,
    orgs.futurepack.name,
    orgs.futurepack.operatorName,
    orgs.futurepack.companiesHouseNumber,
    'FuturePack House'
  ),
  complianceSchemeOrganisation(
    orgs.metroline.id,
    orgs.metroline.name,
    orgs.metroline.operatorName,
    orgs.metroline.companiesHouseNumber,
    'Metroline House',
    'M2 5BQ'
  ),
  complianceSchemeOrganisation(
    orgs.southgate.id,
    orgs.southgate.name,
    orgs.southgate.operatorName,
    orgs.southgate.companiesHouseNumber,
    'Southgate House',
    'N14 6BS'
  ),
  // Detail-only organisations. Present in the by-id lookup (their declaration
  // detail pages resolve) but excluded from the /organisations listing so they
  // never surface as not-submitted rows.
  directProducerOrganisation(
    orgs.hill.id,
    orgs.hill.name,
    '70240201',
    '1 Hill Road',
    'S1 1AA'
  ),
  directProducerOrganisation(
    orgs.riverdale.id,
    orgs.riverdale.name,
    '80150102',
    '2 River Lane',
    'NE1 1AA'
  ),
  directProducerOrganisation(
    orgs.ashfield.id,
    orgs.ashfield.name,
    '44092103',
    '3 Ashfield Road',
    'CF1 1AA'
  ),
  complianceSchemeOrganisation(
    orgs.beacon.id,
    orgs.beacon.name,
    orgs.beacon.operatorName,
    orgs.beacon.companiesHouseNumber,
    'Beacon House'
  )
]
