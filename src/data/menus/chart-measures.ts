import type { PBMenuItem } from '../../pb/components/chrome'
import { measureCalculators } from '../measures'
import { registerMenus } from './index'

/* ============================================================================
   Patient Chart ▸ Measures — the Action menu with the folder's own items.

   PROVENANCE: art. 302837 image `b06f52f6…` (Action dropped over Measures,
   Show History ringed): Account Summary | Invoice Window, Create Referral
   Note, Create Consult Note, Link to Encounter, Measurement Template, Show
   History, Filter Measures, Graph Measures, Print Label | Change Desktop
   Provider | Create Task, Create Message, Attachments | View Acknowledge
   History. Art. 303069 opens Link to Encounter from here ("Select 'Action'
   from the toolbar … Find 'Link to Encounter'"); 303070 calls Measurement
   Template by its older name, Template Entry.

   Create Message opens `measure-create-message`, which raises New Message
   for a PHQ-9 questionnaire row and Create New Message for anything else
   (302837 "How to Send a Patient Questionnaire"; MeasureEntryWindows.tsx).

   Utilities gains Calculators … — "The calculators can be accessed by
   clicking on 'utilities' on the task bar" (302837 "Calculators") — the same
   fly-out the Encounter Detail Window's Utilities menu carries, listing the
   Measure Calculators picker's five (data/measures.ts).
   ========================================================================= */

const sep: PBMenuItem = { sep: true }

registerMenus('chart:measures', (ctx) => ({
  Action: [
    { label: 'Account Summary', key: 'Alt+F1' },
    sep,
    { label: 'Invoice Window', key: 'Alt+I' },
    { label: 'Create Referral Note', key: 'Ctrl+R', onSelect: () => ctx.go.letter?.('referral') },
    { label: 'Create Consult Note', key: 'Ctrl+Shift+R', onSelect: () => ctx.go.letter?.('consult') },
    { label: 'Link to Encounter', onSelect: () => ctx.go.open?.('encounter-link-service') },
    { label: 'Measurement Template', onSelect: () => ctx.go.open?.('measurement-template') },
    { label: 'Show History', onSelect: () => ctx.go.open?.('show-history') },
    { label: 'Filter Measures', key: 'Ctrl+F', onSelect: () => ctx.go.open?.('filter-measures') },
    { label: 'Graph Measures', key: 'Ctrl+G', onSelect: () => ctx.go.open?.('measurement-graph') },
    { label: 'Print Label', key: 'Ctrl+L' },
    sep,
    { label: 'Change Desktop Provider', key: 'Alt+D' },
    sep,
    { label: 'Create Task', key: 'Ctrl+K', onSelect: () => ctx.go.open?.('create-task') },
    { label: 'Create Message', key: 'Ctrl+M', onSelect: () => ctx.go.open?.('measure-create-message') },
    { label: 'Attachments', onSelect: () => ctx.go.open?.('add-attachment') },
    sep,
    { label: 'View Acknowledge History' },
  ],
  Utilities: [
    ...(ctx.base?.Utilities ?? []),
    sep,
    {
      label: 'Calculators ...',
      menu: measureCalculators.map((c): PBMenuItem => ({ label: c, onSelect: () => ctx.go.open?.('measure-calculator', { calculator: c }) })),
    },
  ],
}))
