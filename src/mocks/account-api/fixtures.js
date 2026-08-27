// Account API mock data: each organisation's reference number and nominated
// contacts, plus the stand-in signed-in user returned for the submitter lookup.

import { orgs } from '#mocks/identities.js'

// Account API organisations — carry the reference number and the nominated
// contacts. Direct producers are matched by external id (== organisation id);
// compliance schemes by Companies House number, with only the operator
// (isComplianceScheme) counting. Persons drive the contact block and the
// cancellation-email recipients.
function approvedPerson(firstName, lastName, email, telephoneNumber) {
  return {
    firstName,
    lastName,
    jobTitle: 'Compliance Manager',
    email,
    telephoneNumber,
    serviceRole: 'Approved Person'
  }
}

const basicUserPerson = {
  firstName: 'Sam',
  lastName: 'Reed',
  jobTitle: 'Analyst',
  email: 'sam.reed@example.test',
  telephoneNumber: '020 7946 1111',
  serviceRole: 'Basic User'
}

const directProducerAccount = (externalId, name, referenceNumber, persons) => ({
  externalId,
  name,
  referenceNumber,
  companiesHouseNumber: null,
  isComplianceScheme: false,
  persons
})

const complianceSchemeAccount = (
  externalId,
  name,
  referenceNumber,
  companiesHouseNumber,
  persons
) => ({
  externalId,
  name,
  referenceNumber,
  companiesHouseNumber,
  isComplianceScheme: true,
  persons
})

export const accountOrganisations = [
  directProducerAccount(orgs.howco.id, orgs.howco.name, orgs.howco.reference, [
    approvedPerson(
      'Catherine',
      'Morris',
      'catherine.morris@howco.test',
      '020 7946 0100'
    ),
    approvedPerson(
      'James',
      'Wright',
      'james.wright@howco.test',
      '020 7946 0109'
    )
  ]),
  directProducerAccount(
    orgs.redwood.id,
    orgs.redwood.name,
    orgs.redwood.reference,
    [
      approvedPerson(
        'Olivia',
        'Hart',
        'olivia.hart@redwood.test',
        '020 7946 0101'
      )
    ]
  ),
  directProducerAccount(
    orgs.coastal.id,
    orgs.coastal.name,
    orgs.coastal.reference,
    [
      approvedPerson(
        'Tom',
        'Baxter',
        'tom.baxter@coastal.test',
        '020 7946 0102'
      )
    ]
  ),
  directProducerAccount(
    orgs.sterling.id,
    orgs.sterling.name,
    orgs.sterling.reference,
    [
      approvedPerson(
        'Ruth',
        'Ellis',
        'ruth.ellis@sterling.test',
        '020 7946 0104'
      )
    ]
  ),
  directProducerAccount(
    orgs.pinnacle.id,
    orgs.pinnacle.name,
    orgs.pinnacle.reference,
    [
      approvedPerson(
        'Iwan',
        'Price',
        'iwan.price@pinnacle.test',
        '020 7946 0105'
      )
    ]
  ),
  directProducerAccount(
    orgs.meridian.id,
    orgs.meridian.name,
    orgs.meridian.reference,
    [
      approvedPerson(
        'Grace',
        'Owusu',
        'grace.owusu@meridian.test',
        '020 7946 0106'
      )
    ]
  ),
  directProducerAccount(
    orgs.thornbury.id,
    orgs.thornbury.name,
    orgs.thornbury.reference,
    [
      approvedPerson(
        'Leah',
        'Chapman',
        'leah.chapman@thornbury.test',
        '020 7946 0112'
      )
    ]
  ),
  complianceSchemeAccount(
    orgs.ecopack.id,
    orgs.ecopack.operatorName,
    orgs.ecopack.reference,
    orgs.ecopack.companiesHouseNumber,
    [approvedPerson('Jane', 'Doe', 'jane.doe@ecopack.co.uk', '020 7946 0110')]
  ),
  complianceSchemeAccount(
    orgs.futurepack.id,
    orgs.futurepack.operatorName,
    orgs.futurepack.reference,
    orgs.futurepack.companiesHouseNumber,
    [
      basicUserPerson,
      approvedPerson(
        'Nadia',
        'Clarke',
        'nadia.clarke@futurepack.test',
        '020 7946 0103'
      )
    ]
  ),
  complianceSchemeAccount(
    orgs.metroline.id,
    orgs.metroline.operatorName,
    orgs.metroline.reference,
    orgs.metroline.companiesHouseNumber,
    [
      approvedPerson(
        'Priya',
        'Rao',
        'priya.rao@metroline.test',
        '020 7946 0107'
      )
    ]
  ),
  complianceSchemeAccount(
    orgs.southgate.id,
    orgs.southgate.operatorName,
    orgs.southgate.reference,
    orgs.southgate.companiesHouseNumber,
    [
      approvedPerson(
        'Daniel',
        'Okafor',
        'daniel.okafor@southgate.test',
        '020 7946 0108'
      )
    ]
  ),
  complianceSchemeAccount(
    orgs.greencircle.id,
    orgs.greencircle.operatorName,
    orgs.greencircle.reference,
    orgs.greencircle.companiesHouseNumber,
    [
      approvedPerson(
        'Aled',
        'Bevan',
        'aled.bevan@greencircle.test',
        '020 7946 0111'
      )
    ]
  )
]

// A default Account user returned for the submitter-phone lookup on submitted
// declarations (GET /api/users/user-organisations). The submitter's phone number
// is a secondary field, so a single stand-in user is enough.
export const mockAccountUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.org',
  telephone: '01234 567890',
  serviceRole: 'Regulator Admin',
  serviceRoleId: 4,
  organisations: [{ name: 'Example Environment Agency', nationId: 1 }]
}
