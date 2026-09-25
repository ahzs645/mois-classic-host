import { useEffect, useRef } from 'react'

/* ============================================================================
   Billing's Action-menu items and the windows they act on.

   A Billing folder's Action menu (data/menus/billing.ts) repeats what the
   window's own buttons do — Invoices' Pay Balance (Ctrl+P), Unsent Claims'
   Prompt Unsent by Patient Name (Alt+F2) — but the menu is built by the
   frame and the button's state lives in the window. The menu posts the
   command here; the window on screen handles it the same way as its button.
   Nothing is stored: a command with no window listening does nothing, which
   is also what MOIS does with a greyed item.
   ========================================================================= */

export type BillingCommand =
  | 'pay-balance' | 'write-off-balance' | 'recalculate'
  | 'prompt-invoice'
  | 'new-claim' | 'save-claim'
  | 'prompt-patient' | 'prompt-doctor' | 'prompt-service' | 'prompt-chart' | 'prompt-recon'

type Listener = (command: BillingCommand) => void

const listeners = new Set<Listener>()

/** Post a command to whichever Billing window is on screen. */
export function billingCommand(command: BillingCommand) {
  for (const listener of [...listeners]) listener(command)
}

/** Handle Billing commands for as long as the calling window is mounted. */
export function useBillingCommands(handler: Listener) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const listener: Listener = (command) => ref.current(command)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])
}
