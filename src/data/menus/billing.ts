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
               MSP | Invoice. 303600/303601/303602 give Alt+9, Alt+0 and
               Alt+I in their text; the capture prints no accelerators, but
               they are carried on the items so the keys work (the frame's
               hot keys run a menu item by its printed key).
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
  /* The accelerators are 303600 / 303601 / 303602's ("or you can press ALT +
     9 / ALT + 0 / ALT + I"); `248dc9d0` prints none beside the items, but
     the keys work in every Billing folder, and the frame's hot keys
     (host/hotkeys.ts) run a menu item by the key printed on it. */
  return [
    { label: 'Unsent To MSP', key: 'Alt+9', onSelect: () => ctx.go.node?.('bl-unsent') },
    { label: 'Sent to MSP', key: 'Alt+0', onSelect: () => ctx.go.node?.('bl-sent') },
    sep,
    { label: 'Invoice', key: 'Alt+I', onSelect: () => ctx.go.node?.('bl-invoices') },
  ]
}

const desktopProvider = (ctx: MenuContext): PBMenuItem => ({
  label: 'Change Desktop Provider', key: 'Alt+D', onSelect: () => ctx.go.open?.('desktop-provider'),
})
const openChart = (ctx: MenuContext): PBMenuItem => ({
  label: 'Open Chart', key: 'Alt+F9', onSelect: () => { ctx.go.module?.('chart'); ctx.go.node?.('demographic') },
})

function unsentAction(ctx: MenuContext): PBMenuItem[] {
  return [
    cmd('Prompt Sent to MSP', 'Alt+F1', 'prompt-chart'),
    cmd('Prompt Unsent by Patient Name', 'Alt+F2', 'prompt-patient'),
    cmd('Prompt Unsent by Provider', 'Ctrl+F4', 'prompt-doctor'),
    cmd('Prompt Unsent by Service Date', 'Ctrl+F5', 'prompt-service'),
    cmd('Fee Code Option 1', 'F11', 'fee-option-1'),
    cmd('Fee Code Option 2', 'F12', 'fee-option-2'),
    sep,
    cmd('Duplicate Claim - NOS', 'F3', 'duplicate-nos'),
    cmd('Duplicate Claim - DOS', 'Alt+F3', 'duplicate-dos'),
    cmd('Duplicate Claim diff Provider', 'Ctrl+F3', 'duplicate-provider'),
    cmd('Change Claim Provider', 'Ctrl+D', 'change-claim-provider'),
    sep,
    cmd('Set as WCB Claim', 'Ctrl+W', 'set-wcb'),
    cmd('Set as Pay Patient (PP) Claim', 'Ctrl+P', 'set-pay-patient'),
    sep,
    desktopProvider(ctx),
    openChart(ctx),
  ]
}

function sentAction(ctx: MenuContext): PBMenuItem[] {
  return [
    cmd('Prompt Sent by Recon Code', 'Alt+F2', 'prompt-recon'),
    cmd('Prompt Sent for Chart', 'Alt+F1', 'prompt-chart'),
    sep,
    cmd('Resubmit Claim', 'F2', 'resubmit-claim'),
    cmd('Debit Claim', 'Ctrl+F2', 'debit-claim'),
    cmd('Duplicate Claim', 'F3', 'duplicate-sent'),
    sep,
    cmd('Toggle - Approve / Adjust', 'Ctrl+A', 'toggle-approve'),
    cmd('Toggle - Write Off', 'Ctrl+W', 'toggle-write-off'),
    cmd('Toggle - Mark For Delete', 'Shift+F2', 'toggle-delete'),
    cmd('Toggle - Private Claim Flag', undefined, 'toggle-private'),
    sep,
    /* 303602: "Opens the 'Sent Claim Detail' window which will list any
       explanatory codes from MSP" (screens/SentClaimDetailWindow.tsx) */
    { label: 'Detail Expl Code', key: 'Ctrl+E', onSelect: () => ctx.go.open?.('sent-claim-detail') },
    /* screens/billing/SentClaimWindows.tsx */
    { label: 'Detail Adjustment Summary', key: 'Alt+Z', onSelect: () => ctx.go.open?.('sent-adjustment-summary') },
    { label: 'Remittance History', onSelect: () => ctx.go.open?.('sent-remittance-history') },
    sep,
    desktopProvider(ctx),
    openChart(ctx),
    { label: 'Create an Appointment' },
  ]
}

function invoiceAction(ctx: MenuContext): PBMenuItem[] {
  return [
    cmd('Prompt by Reconciliation Code', 'Alt+F1', 'prompt-invoice-recon'),
    cmd('Prompt by Payor Code', 'Alt+F2', 'prompt-invoice-payor'),
    cmd('Prompt by Invoice #', 'Alt+F3', 'prompt-invoice'),
    sep,
    cmd('Pay Balance', 'Ctrl+P', 'pay-balance'),
    cmd('W/O Balance', 'Ctrl+W', 'write-off-balance'),
    cmd('Transaction Note', undefined, 'transaction-note'),
    cmd('Recalculate Balance Owing', undefined, 'recalculate'),
    sep,
    cmd('Paste Sent MSP Claim', undefined, 'paste-msp-claim'),
    sep,
    desktopProvider(ctx),
    openChart(ctx),
  ]
}

function utilities(ctx: MenuContext): PBMenuItem[] {
  const teleplan: PBMenuItem = { label: 'Change Teleplan Password', onSelect: () => ctx.go.open?.('change-teleplan-password') }
  const clipboard: PBMenuItem[] = [
    { label: 'Provider Address to Clipboard' },
    { label: 'Patient Address to Clipboard (lookup)', onSelect: () => ctx.go.lookup?.() },
  ]
  /* screens/billing/ClaimWizards.tsx and SentReviewWizard.tsx */
  if (ctx.node === 'bl-unsent') {
    return [
      { label: 'Claim Review Wizard', onSelect: () => ctx.go.open?.('unsent-claim-review-wizard') },
      { label: 'Bulk Claim Creation Wizard', onSelect: () => ctx.go.open?.('batch-claim-wizard') },
      ...clipboard, sep, teleplan,
    ]
  }
  if (ctx.node === 'bl-sent') {
    return [{ label: 'Claim Review Wizard', onSelect: () => ctx.go.open?.('msp-review-wizard') }, ...clipboard, sep, teleplan]
  }
  return [...clipboard, sep, teleplan]
}

const DAY_SHEETS = ['Day Sheet - Desktop Provider', 'Day Sheet - All Providers', 'Current Daybook as Slate']

function print(ctx: MenuContext): PBMenuItem[] {
  const selectText: PBMenuItem = { label: 'Print Select Text', key: 'Ctrl+Shift+N' }
  if (ctx.node === 'bl-invoices') {
    return [
      cmd('Print Statement', 'Ctrl+A', 'print-statement'),
      cmd('Print Receipt', 'Ctrl+R', 'print-receipt'),
      sep, selectText,
    ]
  }
  /* the day sheets keep the Patient Chart menu's own handlers (the Selection
     Parameter window, data/schedulerPrintReports.ts); falling back to
     `go.print` if the base menu ever drops one */
  const base = ctx.base?.Print ?? []
  const sheets = DAY_SHEETS.map((label) => base.find((item) => item.label === label) ?? { label, onSelect: () => ctx.go.print?.(label) })
  return [...sheets, sep, selectText]
}

/** Registered at module load, and again by screens/BillingViews.tsx, which the
    frame imports for its exports: the package's `"sideEffects"` field lets
    the Next bundler drop the side-effect-only import in register.ts. */
export function registerBillingMenus() {
  registerMenus('billing', billingMenus)
}

/* The frame's navigation, as the last menu build handed it over. A Billing
   window that moves the learner on — Sent Claims' Resubmit and Debit Claim
   "Will open the Unsent to MSP folder" (303602) — has no navigator prop of
   its own; the menu is rebuilt on every frame render, so this is current. */
let lastGo: MenuContext['go'] | null = null

/** Select a tree node the way the menu's Views items do. */
export function billingNavigate(node: string) {
  lastGo?.node?.(node)
}

const billingMenus = (ctx: MenuContext) => {
  lastGo = ctx.go
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
