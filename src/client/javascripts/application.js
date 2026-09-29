import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  SkipLink
} from 'govuk-frontend'
import { initRegulatorSessionSync } from './regulator-session-sync.js'
import { unimplementedLinkMessage } from './unimplemented-link-message.js'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Radios)
createAll(SkipLink)

initRegulatorSessionSync()
unimplementedLinkMessage()
