import type { PBMenuItem } from '../../pb/components/chrome'
import { billingCommand } from '../billingCommands'
import { registerMenus, type MenuContext } from './index'

/* ============================================================================
   The Billing module's menus.

   "The functions and actions vary depending on what menu you open, and what
   folder you are in" (303601 Toolbar). Views is the same in every folder;
   Action, Utilities and Print are per folder.

   PROVENANCE
   · Views   — 303601 image `248dc9d0` (v02.20.02): Unsent To MSP, Sent to
               MSP | Invoice. 303601/303602 give Alt+9, Alt+0 and Alt+I in
               their text, but the capture prints no accelerators, so none
               are shown here.
   · Action  — Unsent Claims: 303601 image `23c8a9c2` (v02.20.02).
               Sent Claims: 303602 image `8ad93010` (the cloud build, which
               drops Print Label and adds Create an Appointment against the
               v02.17.19 `286d96cd`).
               Invoices: 303603 image `7726fa98` (v02.20.02).
   · Utilities — Unsent Claims: 303601 image `fa0339f2` (cloud, with the Bulk
               Claim Creation Wizard). Sent Claims: 303602 image `9afccda3`.
               Invoices has no capture; it gets the items both captures
               share.
   · Print   — Unsent Claims: 303601 image `dc4d29ae` (the three day-sheet
               reports | Print Select Text). Invoices: 303603 "Invoice
               Folder" — Print Statement (Ctrl+A) and Print Receipt (Ctrl+R),
               which it names as Print-menu items.

   Items the stage has a window or behaviour for post a Billing command
   (data/billingCommands.ts) that the window on screen handles exactly as it
   handles its own button; the rest are plain items, as inert as an
   unimplemented MOIS item.
   ========================================================================= */

const sep: PBMenuItem = { sep: true }
const cmd = (label: string, key: string | undefined, command: Parameters<typeof billingCommand>[0]): PBMenuItem =>
  ({ label, key, onSelect: () => billingCommand(command) })

function views(ctx: MenuContext): PBMenuItem[] {
  return [
    { label: 'Unsent To MSP', onSelect: () => ctx.go.node?.('bl-unsent') },
    { label: 'Sent to MSP', onSelect: () => ctx.go.node?.('bl-sent') },
    sep,
    { label: 'Invoice', onSelect: () => ctx.go.node?.('bl-invoices') },
  ]
}

const desktopProvider: PBMenuItem = { label: 'Change Desktop Provider', key: 'Alt+D' }
const openChart = (ctx: MenuContext): PBMenuItem => ({
  label: 'Open Chart', key: 'Alt+F9', onSelect: () => { ctx.go.module?.('chart'); ctx.go.node?.('demographic') },
})

function unsentAction(ctx: MenuContext): PBMenuItem[] {
  return [
    cmd('Prompt Sent to MSP', 'Alt+F1', 'prompt-chart'),
    cmd('Prompt Unsent by Patient Name', 'Alt+F2', 'prompt-patient'),
    cmd('Prompt Unsent by Provider', 'Ctrl+F4', 'prompt-doctor'),
    cmd('Prompt Unsent by Service Date', 'Ctrl+F5', 'prompt-service'),
    { label: 'Fee Code Option 1', key: 'F11' },
    { label: 'Fee Code Option 2', key: 'F12' },
    sep,
    { label: 'Duplicate Claim - NOS', key: 'F3' },
    { label: 'Duplicate Claim - DOS', key: 'Alt+F3' },
    { label: 'Duplicate Claim diff Provider', key: 'Ctrl+F3' },
    { label: 'Change Claim Provider', key: 'Ctrl+D' },
    sep,
    { label: 'Set as WCB Claim', key: 'Ctrl+W' },
    { label: 'Set as Pay Patient (PP) Claim', key: 'Ctrl+P' },
    sep,
    desktopProvider,
    openChart(ctx),
  ]
}

function sentAction(ctx: MenuContext): PBMenuItem[] {
  return [
    cmd('Prompt Sent by Recon Code', 'Alt+F2', 'prompt-recon'),
    cmd('Prompt Sent for Chart', 'Alt+F1', 'prompt-chart'),
    sep,
    { label: 'Resubmit Claim', key: 'F2' },
    { label: 'Debit Claim', key: 'Ctrl+F2' },
    { label: 'Duplicate Claim', key: 'F3' },
    sep,
    { label: 'Toggle - Approve / Adjust', key: 'Ctrl+A' },
    { label: 'Toggle - Write Off', key: 'Ctrl+W' },
    { label: 'Toggle - Mark For Delete', key: 'Shift+F2' },
    { label: 'Toggle - Private Claim Flag' },
    sep,
    /* 303602: "Opens the 'Sent Claim Detail' window which will list any
       explanatory codes from MSP" (screens/SentClaimDetailWindow.tsx) */
    { label: 'Detail Expl Code', key: 'Ctrl+E', onSelect: () => ctx.go.open?.('sent-claim-detail') },
    { label: 'Detail Adjustment Summary', key: 'Alt+Z' },
    { label: 'Remittance History' },
    sep,
    desktopProvider,
    openChart(ctx),
    { label: 'Create an Appointment' },
  ]
}

function invoiceAction(ctx: MenuContext): PBMenuItem[] {
  return [
    { label: 'Prompt by Reconciliation Code', key: 'Alt+F1' },
    { label: 'Prompt by Payor Code', key: 'Alt+F2' },
    { label: 'Prompt by Invoice #', key: 'Alt+F3' },
    sep,
    cmd('Pay Balance', 'Ctrl+P', 'pay-balance'),
    cmd('W/O Balance', 'Ctrl+W', 'write-off-balance'),
    { label: 'Transaction Note' },
    { label: 'Recalculate Balance Owing' },
    sep,
    { label: 'Paste Sent MSP Claim' },
    sep,
    desktopProvider,
    openChart(ctx),
  ]
}

function utilities(ctx: MenuContext): PBMenuItem[] {
  const teleplan: PBMenuItem = { label: 'Change Teleplan Password', onSelect: () => ctx.go.open?.('change-teleplan-password') }
  const clipboard: PBMenuItem[] = [
    { label: 'Provider Address to Clipboard' },
    { label: 'Patient Address to Clipboard (lookup)', onSelect: () => ctx.go.lookup?.() },
  ]
  if (ctx.node === 'bl-unsent') {
    return [{ label: 'Claim Review Wizard' }, { label: 'Bulk Claim Creation Wizard' }, ...clipboard, sep, teleplan]
  }
  if (ctx.node === 'bl-sent') return [{ label: 'Claim Review Wizard' }, ...clipboard, sep, teleplan]
  return [...clipboard, sep, teleplan]
}

const DAY_SHEETS = ['Day Sheet - Desktop Provider', 'Day Sheet - All Providers', 'Current Daybook as Slate']

function print(ctx: MenuContext): PBMenuItem[] {
  const selectText: PBMenuItem = { label: 'Print Select Text', key: 'Ctrl+Shift+N' }
  if (ctx.node === 'bl-invoices') {
    return [{ label: 'Print Statement', key: 'Ctrl+A' }, { label: 'Print Receipt', key: 'Ctrl+R' }, sep, selectText]
  }
  /* the day sheets keep the Patient Chart menu's own handlers */
  const base = ctx.base?.Print ?? []
  const sheets = DAY_SHEETS.map((label) => base.find((item) => item.label === label) ?? { label })
  return [...sheets, sep, selectText]
}

/** Registered at module load, and again by screens/BillingViews.tsx, which the
    frame imports for its exports: the package's `"sideEffects"` field lets
    the Next bundler drop the side-effect-only import in register.ts. */
export function registerBillingMenus() {
  registerMenus('billing', billingMenus)
}

const billingMenus = (ctx: MenuContext) => {
  const action = ctx.node === 'bl-unsent' ? unsentAction(ctx)
    : ctx.node === 'bl-sent' ? sentAction(ctx)
      : ctx.node === 'bl-invoices' ? invoiceAction(ctx)
        : undefined
  return {
    Views: views(ctx),
    ...(action ? { Action: action } : {}),
    Utilities: utilities(ctx),
    Print: print(ctx),
  }
}

registerBillingMenus()
