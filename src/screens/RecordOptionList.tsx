import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { useChartExport } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { usePatient } from '../data/patient-context'
import { useScreenReport } from '../host/screen-state'
import type { PBCommand, PBMenuItem } from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import { RECORD_OPTION_WINDOWS, reviewKeyOf } from './RecordOptionWindows'
import { recordKeyOf } from './reportRecordEdits'
import { contextPoint, RowContextMenu, type ContextMenuAt } from './RowContextMenu'
import { DesktopLayer } from './StageWindow'
import { tagRecordFor, TagToCarePlanDialog } from './TagToCarePlanDialog'

/* ============================================================================
   The right-click Option List on a clinical chart folder's record.

   PROVENANCE
   - 302837 `2702f065…png` (v02.20.04, Measurements, Tag to Care Plan ringed):
       New Record · Delete Record · Save Changes |
       Create Task · Create Message · Create Reminder · Create Recall ·
       View Recalls · Mark for Review · Tag to Care Plan |
       Attachments |
       Audit Report · Access Control |
       Acknowledge History · Show History
   - 304731 `fc801c1c…png` (v02.20.04, Consult Reports): the same list down to
     Tag to Care Plan, where the capture is cropped by the Tag Information to
     Care Plan window it opened.
   - 304682 (Right Clicks): the items' meanings; Audit Report is also
     Ctrl+Shift+A. 303741: "Imaging, Consults, Procedures, Documents and Paper
     Forms … Mark for Review", and the same Acknowledgements / Workflow
     Summary rail on Measures, Imaging, Consults, Procedures, Facility
     Admissions, Documents and Orders.
   Show History is Measures-only (304682: "In the Measures folder, shows the
   history for this item"); the other folders stop at Acknowledge History.
   Documents adds Attach / Unattach / Open File (303741) and keeps its own
   screen, so it is not in this set.

   What each item does:
     New Record / Delete Record / Save Changes  the folder's own command
       buttons (New Record, Delete Record, Save), so both routes agree
     Create Task / Create Message  Create New Task / Message, linked to the
       record (303596, 303597)
     Create Recall / View Recalls  the Notifications windows
     Mark for Review  Mark Record for Review (303764); the review then shows
       in this record's Acknowledge History
     Tag to Care Plan  Tag Information to Care Plan for the record clicked
       (304731) — not the folder's first row
     Attachments  the Attachments window
     Audit Report / Access Control / Acknowledge History  RecordOptionWindows
     Show History  Measures' Show History window (302837)
   Create Reminder has no window on this stage and does nothing.

   The list reports `host.dialog = 'record-option-list'` while it is down, so
   a lesson can grade "the menu is open"; items are anchored
   `host.mois.menu.context.<item>` by RowContextMenu. Rows are anchored
   `host.mois.row.<node>-<index>` so `host.mois.rightClickRow` can reach them.
   ========================================================================= */

/** The folders whose records carry this list (ClinicalReportView nodes). */
export const OPTION_LIST_FOLDERS = new Set(['measures', 'imaging', 'consults', 'procedures', 'paper', 'admissions'])

function OpenMenu({ at, items, onClose }: { at: ContextMenuAt; items: PBMenuItem[]; onClose: () => void }) {
  useScreenReport({ dialog: 'record-option-list' })
  return <RowContextMenu at={at} items={items} onClose={onClose} />
}

/** The tag window the frame opens for a folder's first row, here opened for
    the record right-clicked; it reports itself as the frame's would. */
function TagWindow({ node, source, onClose }: { node: string; source?: MoisRecord; onClose: () => void }) {
  useScreenReport({ dialog: 'tag-to-care-plan' })
  return (
    <DesktopLayer>
      <TagToCarePlanDialog node={node} source={source} onOk={onClose} onClose={onClose} />
    </DesktopLayer>
  )
}

export function useRecordOptionList({ node, record, commands, setCur }: {
  node: string
  /** the record current in the folder (after a right-click, the one clicked) */
  record: MoisRecord | undefined
  /** the folder's command row, so the menu's New / Delete / Save press the same buttons */
  commands: PBCommand[]
  setCur: (index: number) => void
}): {
  active: boolean
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void
  rowTutorialId?: (row: unknown, index: number) => string
  /** the popup itself: render it inside the grid's positioned box */
  menu: ReactNode
  /** the windows it raises that the folder draws (Tag to Care Plan) */
  windows: ReactNode
  /** the rail's View Detail… — the same window Acknowledge History opens */
  openWorkflowSummary: () => void
} {
  const active = OPTION_LIST_FOLDERS.has(node)
  const [at, setAt] = useState<ContextMenuAt>(null)
  const [tagging, setTagging] = useState(false)
  const open = useOpenWindow()
  const patient = usePatient()
  const data = useChartExport()

  const named = tagRecordFor(node, data, record)
  const value = node === 'measures' && record
    ? [record.str_value && `Value: ${record.str_value}${record.str_units ? ` ${record.str_units}` : ''}`, record.str_flag && `Flag: ${record.str_flag}`].filter(Boolean).join('   ')
    : ''
  const recordKey = recordKeyOf(patient.chart, node, record)
  const about = { recordKey, category: named.category, date: named.date, description: named.description, value }
  const who = { chart: patient.chart, patient: `${patient.last}, ${patient.first}`.toUpperCase() }
  const linkedTo = [named.category, named.date, named.description].filter(Boolean).join(' ')
  const press = (label: string) => commands.find((c) => c?.label === label)?.onClick

  const items: PBMenuItem[] = [
    { label: 'New Record', onSelect: press('New Record') },
    { label: 'Delete Record', disabled: !record, onSelect: press('Delete Record') },
    { label: 'Save Changes', onSelect: press('Save') },
    { sep: true },
    { label: 'Create Task', onSelect: () => { open('create-task', { ...who, linkedTo }) } },
    { label: 'Create Message', onSelect: () => { open('create-message', { ...who, linkedTo }) } },
    { label: 'Create Reminder' },
    { label: 'Create Recall', onSelect: () => { open('create-recall', who) } },
    { label: 'View Recalls', onSelect: () => { open('patient-recall-list', who) } },
    { label: 'Mark for Review', disabled: !record, onSelect: () => { open('mark-for-review', { rowKey: reviewKeyOf(recordKey) }) } },
    { label: 'Tag to Care Plan', disabled: !record, onSelect: () => setTagging(true) },
    { sep: true },
    { label: 'Attachments', onSelect: () => { open('add-attachment') } },
    { sep: true },
    { label: 'Audit Report', disabled: !record, onSelect: () => { open(RECORD_OPTION_WINDOWS.auditReport, about) } },
    { label: 'Access Control', disabled: !record, onSelect: () => { open(RECORD_OPTION_WINDOWS.accessControl, about) } },
    { sep: true },
    { label: 'Acknowledge History', disabled: !record, onSelect: () => { open(RECORD_OPTION_WINDOWS.workflowSummary, about) } },
    ...(node === 'measures' ? [{ label: 'Show History', disabled: !record, onSelect: () => { open('show-history') } }] : []),
  ]

  /* the row under the pointer becomes current first, as a left click would
     make it — MOIS acts on the row right-clicked (MedicationView does the
     same); a click below the last row opens the list on no record */
  const onContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    if (!active) return
    const tr = (event.target as HTMLElement).closest('tbody tr')
    if (tr?.parentElement) {
      const i = Array.from(tr.parentElement.children).indexOf(tr)
      if (i >= 0) setCur(i)
    }
    setAt(contextPoint(event))
  }

  return {
    active,
    onContextMenu,
    rowTutorialId: active && node !== 'measures' ? (_row, index) => `host.mois.row.${node}-${index}` : undefined,
    menu: at ? <OpenMenu at={at} items={items} onClose={() => setAt(null)} /> : null,
    windows: tagging ? <TagWindow node={node} source={record} onClose={() => setTagging(false)} /> : null,
    openWorkflowSummary: () => { open(RECORD_OPTION_WINDOWS.workflowSummary, about) },
  }
}
