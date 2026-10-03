import { registerClaimWizards } from './ClaimWizards'
import { registerInvoiceWindows } from './InvoiceWindows'
import { registerSentClaimWindows } from './SentClaimWindows'
import { registerSentReviewWizard } from './SentReviewWizard'
import './UnsentClaimWindows'
import { registerFolderView } from '../folderViewRegistry'
import { MspClaimSummaryView } from './MspClaimSummaryView'

/* ============================================================================
   The Billing module's windows (stream A1): every file under
   screens/billing/ registers its windows at module load
   (registerAreaWindow / registerScreenWindows). This is imported for that
   side effect from screens/areaWindows.register.ts, and `registerBillingWindows`
   is called again from screens/BillingViews.tsx, which the frame imports for
   its exports — the package's "sideEffects" field can drop a side-effect-only
   import. Every call is idempotent.
   ========================================================================= */
export function registerBillingWindows() {
  registerClaimWizards()
  registerInvoiceWindows()
  registerSentClaimWindows()
  registerSentReviewWizard()
  /* MSP Claims' own page, MSP Claim Summary (references/billing.md) */
  registerFolderView(['bl-msp'], MspClaimSummaryView)
}

registerBillingWindows()
