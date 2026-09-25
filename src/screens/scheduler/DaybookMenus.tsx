import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { PBMessageBox, pbSlug, usePBInstrumentation, type PBMenuItem } from '../../pb'
import {
  currentRow, encounterOf, schedulerBridge, schedulerStore, useSchedulerStore,
} from '../../data/schedulerStore'
import { UniversalSearchDialog } from '../CodeLookupDialogs'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'

/* ============================================================================
   The day book's right-click menus, and the two small windows its commands
   raise.

   - Row menu: art. 303834 `74e88fd1…` (v02.30.22, Copy / Move Appointment
     ringed), with art. 303855 `3e138ad5…` (v02.19.04) for the states: on a
     row saved with a name and no chart, Quick Registration is live and
     Measurement Template, Open Chart, Open Photo and Open Encounter are grey;
     on a charted row it is the other way round.
   - Header menu: art. 303836 `07221e59…` and art. 303837 `f667b3d3…` —
     Turn Editor - On, then Save Layout and Reset Layout, grey until the
     editor is on.
   - Delete Appt: art. 303847 "A confirmation window will open, click Yes or
     press Enter". The window's wording is not captured; it is modelled.
   - Health Issue "…" / F4: art. 303795 — "Press F4 to view and select from
     the Universal Search Window".

   The menus are anchored `host.mois.menu.row` / `host.mois.menu.header`
   with their items under them, so `host.mois.menu { menu: 'row', item }`
   drives a pick once `host.mois.openUtility { window: 'daybook-row-menu' }`
   has dropped it.
   ========================================================================= */

/** A right-click menu, dropped where the pointer was — or, replayed, beside
    the current row. */
export function ContextMenu({ menu, items, args, close }: {
  menu: string
  items: PBMenuItem[]
  args: Record<string, unknown>
  close: () => void
}) {
  const layer = useRef<HTMLDivElement>(null)
  const host = usePBInstrumentation()
  const [at, setAt] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const el = layer.current
    if (!el) return
    const box = el.getBoundingClientRect()
    const scale = box.width ? el.offsetWidth / box.width : 1
    let x = typeof args.x === 'number' ? args.x : NaN
    let y = typeof args.y === 'number' ? args.y : NaN
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      /* replayed: hang it off the current row (or the grid's title bar) */
      const want = menu === 'header' ? 'host.mois.field.daybook-grid' : menu === 'appt' ? dayViewAnchor() : rowAnchor()
      const target = [...document.querySelectorAll<HTMLElement>('[data-tutorial-id]')]
        .find((n) => n.getAttribute('data-tutorial-id') === want)
      const r = target?.getBoundingClientRect()
      x = r ? r.left + Math.min(420, r.width / 2) : box.left + 300
      y = r ? (menu === 'header' ? r.top + 8 : r.bottom) : box.top + 300
    }
    const left = (x - box.left) * scale
    const top = (y - box.top) * scale
    /* keep it on the desktop, as Windows flips a menu that would run off */
    setAt({ left: Math.max(0, Math.min(left, el.offsetWidth - 240)), top: Math.max(0, Math.min(top, el.offsetHeight - items.length * 22 - 20)) })
  }, [args.x, args.y, items.length, menu])

  return (
    <div ref={layer} style={{ position: 'absolute', inset: 0, zIndex: 90 }} onMouseDown={close} onContextMenu={(e) => { e.preventDefault(); close() }}>
      {at && (
        <div
          className="pb-menu"
          data-tutorial-id={`host.mois.menu.${menu}`}
          style={{ position: 'absolute', left: at.left, top: at.top, minWidth: 220 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {items.map((m, j) => (m.sep ? <div key={j} className="pb-menu__sep" /> : (
            <button
              key={j}
              className="pb-menu__item"
              disabled={m.disabled}
              data-tutorial-id={m.label ? `host.mois.menu.${menu}.${pbSlug(m.label)}` : undefined}
              onClick={() => {
                if (m.label) host?.report('menu', { menu, item: pbSlug(m.label) })
                if (m.onSelect) m.onSelect()
                else close()
              }}
            >
              {m.label}
            </button>
          )))}
        </div>
      )}
    </div>
  )
}

function dayViewAnchor(): string {
  const row = currentRow()
  return row ? `host.mois.cell.dayview-${row.hr}${row.mn}` : 'host.mois.field.day-grid'
}

function rowAnchor(): string {
  const row = currentRow()
  return row ? `host.mois.row.appt-${row.hr}${row.mn}` : 'host.mois.field.daybook-grid'
}

function RowMenu({ args, close, open }: AreaWindowProps) {
  useSchedulerStore()
  const row = currentRow()
  const charted = !!row?.chart
  const bridge = schedulerBridge()
  const onChart = !!row && row.chart === bridge.chart
  const go = (id: string, a?: Record<string, unknown>) => () => { if (!open(id, a)) close() }
  const items: PBMenuItem[] = [
    { label: 'Create Recall', disabled: !charted, onSelect: go('create-recall') },
    { label: 'View Recalls', disabled: !charted, onSelect: go('patient-recall-list') },
    { label: 'Tag to Care Plan', disabled: !charted },
    { sep: true },
    { label: 'Workflow Summary', disabled: !charted },
    { label: 'Create Appointment', onSelect: go('new-appointment') },
    { label: 'Delete Appointment', disabled: !row, onSelect: go('delete-appointment') },
    { label: 'Copy / Move Appointment', disabled: !row, onSelect: go('copy-move-appointment') },
    { label: 'Measurement Template', disabled: !charted },
    { sep: true },
    { label: 'Quick Registration', disabled: charted || !row, onSelect: go('quick-registration') },
    { sep: true },
    {
      label: 'Open Chart', disabled: !charted,
      onSelect: () => { close(); if (onChart) bridge.openNode?.('summary') },
    },
    { label: 'Open Photo', disabled: !charted },
    {
      label: 'Open Encounter', disabled: !charted,
      onSelect: () => {
        close()
        const enc = encounterOf(row, schedulerStore.get().current?.offset ?? 0, bridge.chart ?? '')
        if (enc && row) { schedulerStore.openedEncounter(row.key); bridge.openEncounter?.(enc) }
      },
    },
    { sep: true },
    { label: 'Create Task', disabled: !charted, onSelect: go('create-task', { chart: row?.chart, patient: row ? `${row.last}, ${row.first}` : '' }) },
    { label: 'Create Message', onSelect: go('create-message', { chart: row?.chart, patient: row ? `${row.last}, ${row.first}` : '' }) },
    { label: 'Create Reminder', disabled: !charted, onSelect: go('create-recall', { title: 'Create Reminder' }) },
    { label: 'Mark for Review', disabled: !charted },
    { sep: true },
    { label: 'Attachments', disabled: !charted },
    { sep: true },
    { label: 'Audit Report' },
    { label: 'Access Control' },
  ]
  return <ContextMenu menu="row" items={items} args={args} close={close} />
}

function HeaderMenu({ args, close }: AreaWindowProps) {
  const s = useSchedulerStore()
  const items: PBMenuItem[] = [
    {
      label: s.editor ? 'Turn Editor - Off' : 'Turn Editor - On',
      onSelect: () => { schedulerStore.setEditor(!s.editor); close() },
    },
    { label: 'Save Layout', disabled: !s.editor, onSelect: () => { schedulerStore.saveLayout(); close() } },
    { label: 'Reset Layout', disabled: !s.editor, onSelect: () => { schedulerStore.resetLayout(); close() } },
  ]
  return <ContextMenu menu="header" items={items} args={args} close={close} />
}

function DeleteAppointment({ close }: AreaWindowProps) {
  const row = currentRow()
  return (
    <PBMessageBox
      title="Delete Appointment"
      icon="question"
      buttons={[{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no' }]}
      onClose={(v) => {
        if (v === 'yes' && row) schedulerStore.deleteAppointment(row.key)
        close()
      }}
    >
      <DeleteText>
        {row ? `Delete the ${row.hr}:${row.mn} appointment${row.last ? ` for ${row.first} ${row.last}` : ''}?` : 'No appointment is selected.'}
      </DeleteText>
    </PBMessageBox>
  )
}

/* the Yes button carries the anchor a lesson presses */
function DeleteText({ children }: { children: ReactNode }) {
  return <span data-tutorial-id="host.mois.dialog.delete-appointment">{children}</span>
}

function HealthIssueLookup({ close }: AreaWindowProps) {
  return (
    <UniversalSearchDialog
      onPick={(r) => {
        const row = currentRow()
        if (row) schedulerStore.setIssue(row.key, r.code)
        close()
      }}
      onClose={close}
    />
  )
}

registerAreaWindow('daybook-row-menu', RowMenu)
registerAreaWindow('daybook-header-menu', HeaderMenu)
registerAreaWindow('delete-appointment', DeleteAppointment)
registerAreaWindow('daybook-health-issue', HealthIssueLookup)
