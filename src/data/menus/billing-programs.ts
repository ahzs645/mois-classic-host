import type { PBMenuItem } from '../../pb/components/chrome'
import { registerMenus } from './index'

/* ============================================================================
   Billing ▸ PBF Management ▸ Patient Enrollment — its Action menu.

   PROVENANCE: art. 2258278 "PBF Administrator Role", image `0f4547c1…`
   (758 × 396): Action ▸ "By-Pass Registration Process to…" with a fly-out
   of "Enroll a Patient" and "Unenroll a Patient", a rule, then "Change
   Desktop Provider  Alt+D". The two fly-out items open the By-Pass window
   (screens/PbfWindows.tsx `pbf-bypass`, INFERRED — no capture of it).
   ========================================================================= */

export function registerBillingProgramMenus() {
  registerMenus('billing:bl-pbf-enrol', (ctx) => {
    const action: PBMenuItem[] = [
      {
        label: 'By-Pass Registration Process to...',
        menu: [
          { label: 'Enroll a Patient', onSelect: () => ctx.go.open?.('pbf-bypass', { mode: 'enroll' }) },
          { label: 'Unenroll a Patient', onSelect: () => ctx.go.open?.('pbf-bypass', { mode: 'unenroll' }) },
        ],
      },
      { sep: true },
      { label: 'Change Desktop Provider', key: 'Alt+D' },
    ]
    return { Action: action }
  })
}

registerBillingProgramMenus()
