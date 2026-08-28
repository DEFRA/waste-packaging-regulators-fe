/**
 * Generates `src/server/locales/en.json` and `cy.json` from the English source
 * object below plus a hand-maintained Welsh override map. Run
 * `node scripts/generate-locales.mjs` when adding new translation keys — edit
 * the `en` tree here, add Welsh strings to `cyOverrides`, then regenerate the JSON files
 * consumed at runtime by `translate.js`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.resolve(dirname, '../src/server/locales')

const en = {
  common: {
    serviceName: 'waste-packaging-regulators-fe',
    continue: 'Continue',
    yes: 'Yes',
    no: 'No',
    search: 'Search',
    errorPrefix: 'Error: ',
    opensInNewTab: 'opens in new tab',
    errorSummary: { title: 'There is a problem' },
    nav: {
      home: 'Home',
      about: 'About',
      back: 'Back',
      signIn: 'Sign in',
      signOut: 'Sign out'
    },
    languageSwitcher: {
      label: 'Language',
      english: 'English',
      welsh: 'Cymraeg'
    },
    footer: {
      privacy: 'Privacy',
      cookies: 'Cookies',
      accessibility: 'Accessibility statement'
    }
  },
  home: {
    pageTitle: 'Home',
    heading: 'Home',
    caption: 'waste-packaging-regulators-fe'
  },
  about: {
    pageTitle: 'About',
    heading: 'About',
    caption: 'waste-packaging-regulators-fe'
  },
  auth: {
    signedOut: {
      pageTitle: 'Signed out',
      heading: 'Signed out',
      message: 'You have been signed out.'
    }
  },
  compliance: {
    components: {
      statusTag: {
        noData: 'No data',
        met: 'Met',
        notMet: 'Not met',
        compliant: 'Compliant',
        notCompliant: 'Not compliant'
      },
      sortingColumnHeader: {
        sortBy: 'Sort by {{columnLabel}}, {{direction}}',
        ascending: 'ascending',
        descending: 'descending'
      },
      pagination: {
        navAriaLabel: 'Results pages',
        previous: 'Previous',
        next: 'Next',
        pageAriaLabel: 'Page {{page}}'
      }
    }
  },
  certificatesOfCompliance: {
    common: {
      noData: 'No data',
      unknownOrganisation: 'Unknown organisation',
      documentNoun: {
        certificate: 'certificate',
        statement: 'statement',
        certificateOfCompliance: 'certificate of compliance',
        statementOfCompliance: 'statement of compliance'
      },
      organisationType: {
        directProducer: 'Direct producer',
        complianceScheme: 'Compliance scheme'
      },
      producerTypeNav: {
        ariaLabel: 'Filter by producer type',
        directProducers: 'Direct producers',
        complianceSchemes: 'Compliance schemes'
      },
      submissionStatus: {
        pending: 'Pending',
        accepted: 'Accepted',
        notSubmitted: 'Not submitted',
        cancelled: 'Cancelled',
        queried: 'Queried'
      },
      regulation43: {
        label: 'Regulation 43',
        complied: 'complied',
        notComplied: 'not complied',
        statement:
          '{{organisationName}} declared they have {{compliance}} with all other requirements in regulation 43.'
      },
      complianceTypeLabel: '{{year}} {{documentNoun}}',
      columns: {
        organisationName: 'Organisation name',
        organisationId: 'Organisation ID',
        recyclingObligations: 'Recycling obligations',
        regulation43: 'Regulation 43',
        percentageMet: 'Percentage met',
        dateSubmitted: 'Date submitted',
        submissionStatus: 'Submission status'
      },
      actions: {
        directProducer: {
          accept: 'Accept certificate',
          cancel: 'Cancel certificate'
        },
        complianceScheme: {
          accept: 'Accept statement',
          cancel: 'Cancel statement'
        }
      },
      successBanner: {
        directProducer: {
          accepted: {
            heading: 'Certificate accepted',
            text: 'Certificate has been accepted.'
          },
          cancelled: {
            heading: 'Certificate cancelled',
            text: 'Certificate has been cancelled and an email sent to the producer.'
          }
        },
        complianceScheme: {
          accepted: {
            heading: 'Statement accepted',
            text: 'Statement has been accepted.'
          },
          cancelled: {
            heading: 'Statement cancelled',
            text: 'Statement has been cancelled and an email sent to the compliance scheme.'
          }
        }
      },
      companiesHouse: {
        viewLink: 'View on Companies House'
      }
    },
    list: {
      pageTitle: 'View certificates and statements of compliance',
      heading: 'View certificates and statements of compliance',
      relevantYearCaption: '{{complianceYear}} relevant year',
      search: {
        label: 'Search by organisation name or ID',
        error: 'Enter an organisation name or ID'
      },
      tabs: {
        pending: 'Pending ({{count}})',
        accepted: 'Accepted ({{count}})',
        notSubmitted: 'Not submitted ({{count}})'
      },
      tabSummary: {
        pending: 'pending submissions',
        accepted: 'accepted submissions',
        notSubmitted: 'not submitted'
      },
      emptyTab: {
        pending:
          'No submissions waiting for review. New submissions will appear here as they arrive.',
        accepted:
          'No accepted submissions yet. Submissions you accept will be listed here.',
        notSubmitted: 'There are no outstanding submissions'
      },
      downloadLink: 'Download list (CSV)',
      searchResults: {
        caption: 'Search results',
        resultSingular: '{{count}} result for "{{searchTerm}}".',
        resultPlural: '{{count}} results for "{{searchTerm}}".',
        clearSearch: 'Clear search',
        truncated:
          'Showing the first {{count}} results. Refine your search to narrow them down.',
        noResults:
          'Check the spelling, or search for part of the organisation name or ID'
      },
      backlinkText: 'Back'
    },
    detail: {
      pageTitle: '{{companyName}}',
      backlinkText: 'Back to all submissions',
      inset: {
        statementNotSubmitted:
          'This statement is not submitted so the information will update if changed by the compliance scheme.',
        statementSubmitted:
          'The information on this statement was correct at the time of submission.',
        certificateNotSubmitted:
          'This certificate is not submitted so the information will update if changed by the producer.',
        certificateSubmitted:
          'The information on this certificate was correct at the time of submission.'
      },
      summary: {
        regulation43: 'Regulation 43',
        recyclingObligations: 'Recycling obligations',
        submissionStatus: 'Submission status',
        submittedOn: 'Submitted on',
        acceptedBy: 'Accepted by',
        acceptedDate: 'Accepted date',
        cancelledBy: 'Cancelled by',
        cancelledDate: 'Cancelled date',
        reasonForCancellation: 'Reason for cancellation',
        organisationType: 'Organisation type',
        organisationId: 'Organisation ID',
        companyNumber: 'Company number',
        nameOnAccount: 'Name on account',
        emailAddress: 'Email address',
        phoneNumber: 'Phone number'
      },
      declaration: {
        heading: 'Declaration',
        intro: '{{signedBy}} signed the declaration to verify that:',
        bulletEligible:
          'they are an approved or delegated person who is eligible to submit this {{documentNoun}} on behalf of {{companyName}}',
        bulletAccurate: 'the information they submitted is accurate',
        bulletEnforcement:
          'they understand that they may face enforcement action if they submit false or misleading information'
      },
      queryDetails: {
        heading: 'Query details',
        queriedMaterials: 'Queried materials',
        reason: 'Reason',
        dateQueried: 'Date queried'
      },
      obligations: {
        heading: 'Recycling obligations',
        valuesInTonnes: 'All values are in tonnes.',
        tableCaption: 'Recycling obligations by material, in tonnes',
        material: 'Material',
        obligationToMeet: 'Recycling obligations to meet',
        awaitingAcceptance: 'Tonnage awaiting acceptance',
        accepted: 'Tonnage accepted',
        outstanding: 'Tonnage outstanding',
        status: 'Status',
        totals: 'Totals',
        noData: 'No data',
        glassBreakdownHeading: 'Glass recycling obligation breakdown',
        glassBreakdownCaption:
          'Glass recycling obligation breakdown by material, in tonnes'
      },
      currentYear: {
        heading: 'Current year',
        noPreviousSubmissions: 'No previous submissions',
        tableCaption: 'Current year submission history',
        date: 'Date',
        action: 'Action',
        by: 'By',
        reason: 'Reason',
        viewSubmissionHidden: 'View submission',
        viewSubmissionLink: 'View submission',
        actionAccepted: 'Accepted',
        actionCancelled: 'Cancelled'
      }
    },
    accept: {
      pageTitle: '{{titleVerb}}{{docTypeLower}} — {{companyName}}',
      titleVerb: { accept: 'Accept ', error: 'Error: Accept ' },
      legend:
        'Are you sure you want to accept this {{docTypeLower}} for {{companyName}}?',
      error: 'Select yes or no'
    },
    cancel: {
      reason: {
        pageTitle: '{{titleVerb}}{{docTypeLower}} — {{companyName}}',
        titleVerb: { cancel: 'Cancel ', error: 'Error: Cancel ' },
        legend: "Why are you cancelling {{companyName}}'s {{docTypeLower}}?",
        error: 'Select why you are cancelling this {{docTypeLower}}',
        reasons: {
          incorrectSigner: {
            label: 'Not signed by correct person',
            hint: 'Name entered is not an approved or delegated person'
          },
          obligationsChanged: {
            label: 'Recycling obligations changed',
            hint: 'For example, the {{producerTypeLower}} resubmitted packaging data'
          },
          submittedEarly: {
            label: '{{producerType}} can meet recycling obligations',
            hint: '{{docType}} submitted {{notMet}}with time to acquire PRNs or PERNs',
            notMetSuffix: 'as not met '
          },
          producerRequest: {
            label: '{{producerType}} requested to cancel',
            hint: 'For example, to update information and resubmit'
          }
        },
        wording: {
          docTypeCertificate: 'Certificate',
          docTypeStatement: 'Statement',
          producerTypeProducer: 'Producer',
          producerTypeComplianceScheme: 'Compliance scheme',
          producerTypeLowerProducer: 'producer',
          producerTypeLowerComplianceScheme: 'compliance scheme'
        }
      },
      check: {
        pageTitle: 'Confirm and send cancellation email — {{companyName}}',
        heading: 'Confirm and send cancellation email',
        organisation: 'Organisation',
        cancelReason: 'Cancel reason',
        changeReasonHidden: 'reason for cancelling',
        email: 'Email',
        emailPreviewLink: 'View the cancellation email (opens in new tab)',
        inset:
          "When you confirm and send, we'll cancel the {{docTypeLower}} and email the person who submitted it.",
        confirmButton: 'Confirm and send'
      },
      emailPreview: {
        ariaLabel: 'Cancellation email preview',
        fromLabel: 'From:',
        fromValue:
          'Extended Producer Responsibility for Packaging (pEPR) <noreply@notifications.service.gov.uk>',
        toLabel: 'To:',
        subjectLabel: 'Subject:',
        defraName: 'Department for Environment, Food & Rural Affairs'
      },
      emailPreviewUnavailable: {
        pageTitle: 'Cancellation email preview unavailable',
        heading: 'Cancellation email preview unavailable',
        fallback: 'The cancellation email preview is unavailable.',
        errors: {
          noRecipients:
            'We could not find any recipient email addresses for this organisation.',
          unknownTemplate:
            'We could not find an email template for the selected cancellation reason.',
          declarationNotFound:
            'We could not find the compliance declaration for this preview.',
          invalidReason: 'The selected cancellation reason is not valid.',
          notifyNotConfigured:
            'The cancellation email preview is unavailable because GOV.UK Notify is not configured for this environment.'
        }
      }
    }
  }
}

const cy = structuredClone(en)

const welshOverrides = {
  'common.nav.home': 'Hafan',
  'common.nav.about': 'Ynghylch',
  'common.nav.back': 'Yn ôl',
  'common.nav.signIn': 'Mewngofnodi',
  'common.nav.signOut': 'Allgofnodi',
  'common.languageSwitcher.label': 'Iaith',
  'common.languageSwitcher.welsh': 'Cymraeg',
  'common.footer.privacy': 'Preifatrwydd',
  'common.footer.cookies': 'Cwcis',
  'common.footer.accessibility': 'Datganiad hygyrchedd',
  'home.pageTitle': 'Hafan',
  'home.heading': 'Hafan',
  'about.pageTitle': 'Ynghylch',
  'about.heading': 'Ynghylch',
  'compliance.components.statusTag.met': 'Wedi bodloni',
  'compliance.components.statusTag.notMet': 'Heb fodloni',
  'compliance.components.pagination.previous': 'Blaenorol',
  'compliance.components.pagination.next': 'Nesaf'
}

function setNested(obj, dottedPath, value) {
  const parts = dottedPath.split('.')
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]]
  }
  current[parts[parts.length - 1]] = value
}

for (const [key, value] of Object.entries(welshOverrides)) {
  setNested(cy, key, value)
}

fs.mkdirSync(localesDir, { recursive: true })
fs.writeFileSync(path.join(localesDir, 'en.json'), JSON.stringify(en, null, 2))
fs.writeFileSync(path.join(localesDir, 'cy.json'), JSON.stringify(cy, null, 2))
