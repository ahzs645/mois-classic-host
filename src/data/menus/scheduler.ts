import type { PBMenuItem } from '../../pb/components/chrome'
import { currentRow, dayRows, schedulerBridge, schedulerStore } from '../schedulerStore'
import { ensureSchedulerPrintReports } from '../schedulerPrintReports'
import { registerMenus } from './index'

/* ============================================================================
   The Scheduler's Action, Print and Utilities menus.

   PROVENANCE
   - Action: art. 303834 `d2620a14…` (v02.30.22, the whole list dropped with
     Copy / Move Appointment ringed); art. 303835 `53a8819d…` and art. 303820
     `3bc6e4e3…` (v02.17.20) agree on the order, which newer builds only
     extend (Measurement Template, Move to Online Schedule, Patient Summary /
     Detail, Hide Patient Summary). MOIS's own "Default Service Code 1/2" and
     "Open Chart (current encounter)" spellings are kept — the manual's steps
     call the last one "Find Encounter" (art. 303848).
   - Print: art. 303825 `a53ced96…` (v02.22.98, Print Appointment Card
     ringed) and art. 303824 `e05f4621…` (v02.17.20, the Day Sheet pair).
   - Utilities: art. 303855 says Quick Registration is reached from the row's
     right-click menu "or … the Utilities menu on the toolbar". No capture of
     the Scheduler's Utilities list exists, so the Patient Chart list is kept
     and Quick Registration added to it.
   ========================================================================= */

registerMenus('scheduler', (ctx) => {
  ensureSchedulerPrintReports()
  const open = (id: string, args?: Record<string, unknown>) => () => ctx.go.open?.(id, args)
  const print = (label: string) => () => ctx.go.print?.(label)
  const onDayBook = ctx.node === 'p-daybook'

  const action: PBMenuItem[] = [
    { label: 'Summary All Visit', key: 'Alt+F1' },
    { label: 'Daybook Bar - Multi', key: 'Alt+F2', onSelect: open('provider-schedule-summary', { multi: true }) },
    { label: 'Daybook Bar - Single', key: 'Alt+F3', onSelect: open('provider-schedule-summary', { multi: false }) },
    { sep: true },
    { label: 'Copy / Move Day Book Items', key: 'Ctrl+O', onSelect: open('copy-move-daybook') },
    { label: 'Copy / Move Appointment', onSelect: open('copy-move-appointment') },
    { label: 'Copy Encounter Data', key: 'Ctrl+Shift+C' },
    { label: 'Paste Encounter Data', key: 'Ctrl+Shift+P' },
    {
      label: 'Bill MSP (current encounter)', key: 'Ctrl+B',
      onSelect: () => { const row = currentRow(); if (row) schedulerStore.bill(row.key) },
    },
    {
      label: 'Bill MSP (all encounters)', key: 'Ctrl+I',
      onSelect: () => {
        const c = schedulerStore.get().current
        if (c) schedulerStore.billAll(c.provider, c.offset)
      },
    },
    { label: 'Measurement Template' },
    { label: 'Move to Online Schedule' },
    { sep: true },
    { label: 'Create Message', key: 'Ctrl+M', onSelect: open('create-message') },
    { label: 'Patient Summary / Detail', key: 'Ctrl+Q' },
    { label: 'Hide Patient Summary', key: 'Ctrl+Shift+Q' },
    { label: 'Find Rx', key: 'Alt+F8' },
    {
      /* Alt+F9 opens the current appointment's chart on its Encounters folder */
      label: 'Open Chart (current encounter)', key: 'Alt+F9',
      onSelect: () => {
        const row = currentRow()
        if (row && row.chart && row.chart === schedulerBridge().chart) ctx.go.node?.('encounters')
      },
    },
    { label: 'Attachments' },
    { sep: true },
    { label: 'Default Service Code 1', key: 'F11' },
    { label: 'Default Service Code 2', key: 'F12' },
    { label: 'Print Label', key: 'Ctrl+L' },
    { sep: true },
    { label: 'Change Desktop Provider', key: 'Alt+D' },
    { label: 'Create an Appointment', onSelect: open('new-appointment') },
  ]

  const printMenu: PBMenuItem[] = [
    { label: 'Day Sheet - Desktop Provider', onSelect: print('Day Sheet - Desktop Provider') },
    { label: 'Day Sheet - All Providers', onSelect: print('Day Sheet - All Providers') },
    { label: 'Current Daybook as Slate', onSelect: print('Current Daybook as Slate') },
    { sep: true },
    { label: 'Print Daybook', onSelect: open('print-current-daybook') },
    { label: 'Print Daily Appointment', onSelect: print('Print Daily Appointment') },
    { label: 'Print Select Text', key: 'Ctrl+Shift+N' },
    { label: 'Print Appointment Card', onSelect: open('appointment-card') },
    { label: 'Print Encounter' },
  ]

  const utilities: PBMenuItem[] = [
    { label: 'Lock MOIS / Switch User', key: 'Ctrl+Alt+L' },
    { label: 'Paste Patient Text' },
    { sep: true },
    {
      /* only a row saved with a name and no chart can be registered */
      label: 'Quick Registration',
      disabled: onDayBook && !!currentRow() && !!currentRow()?.chart,
      onSelect: open('quick-registration'),
    },
    { sep: true },
    { label: 'Health Maintenance Review', key: 'Ctrl+H' },
    { label: 'Flow Sheet Review' },
    { label: 'MSP Eligibility Check' },
    { label: 'Provider Address to Clipboard' },
    { label: 'Patient Address to Clipboard (lookup)', onSelect: () => ctx.go.lookup?.() },
    { sep: true },
    { label: 'Change Teleplan Password' },
    { label: 'Patient Address to Clipboard (current)' },
  ]

  return { Action: action, Print: printMenu, Utilities: utilities }
})

/** Rows of the current day, for windows that list them. */
export const currentDayRows = () => {
  const c = schedulerStore.get().current
  return c ? dayRows(schedulerStore.get(), c.provider, c.offset) : []
}
