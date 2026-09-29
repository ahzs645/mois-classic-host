import { useState } from 'react'
import { deleteQuickEntryTemplate, quickEntryRow, useQuickEntryTemplates } from '../data/quickEntryTemplates'
import { useScreenReport } from '../host/screen-state'
import { PBCommandRow, PBDataWindow, PBMessageBox, PBViewHeader, pbSlug, usePBInstrumentation } from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import { useColumnFilters } from './listKit'

/* ============================================================================
   Administration ▸ Designer Section ▸ Quick Entry — the Quick Entry List.

   PROVENANCE: manual article 3071982, `5fdf37b47490…` and `1affb7885276…`
   (v02.31.34, the current layout) and `c797c87cb7c0…` (v02.30.34):
     · view header "Quick Entry List";
     · Task Bar New Record, Delete Record, Edit Record, Close Window on the
       left and Import Records, Export Records right-anchored;
     · a filter strip with a box over Template Group and one over Name;
     · the grid Template Group / Name / Description, salmon current row.
   The node was the frame's labelled fallback until this window existed
   (data/designerSection.ts said so: no capture of it at the time).

   New Record raises Select Option; Edit Record (or a double-click) the
   group's Quick Entry Template window; Import / Export Records their
   dialogs — all in screens/QuickEntryWindows.tsx, opened by id.
   INFERRED: the Delete Record confirmation (MOIS's usual Yes / No).
   ========================================================================= */

export function QuickEntryListView({ onClose }: { onClose?: () => void }) {
  const host = usePBInstrumentation()
  const open = useOpenWindow()
  const templates = useQuickEntryTemplates()
  const [cur, setCur] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const { shown, filterRow } = useColumnFilters(templates, [
    { key: 'group', anchor: 'filter-template-group' },
    { key: 'name', anchor: 'filter-name' },
    null,
  ], { match: 'lower-trim', onChange: () => setCur(0) })
  const current = shown[Math.min(cur, shown.length - 1)]
  useScreenReport({ rows: templates.length, row: current ? pbSlug(current.name) : null })

  const edit = () => { if (current) open('quick-entry-template', { id: current.id }) }
  const right = [
    { label: 'Import Records', width: 110, onClick: () => open('quick-entry-import') },
    { label: 'Export Records', width: 110, onClick: () => open('quick-entry-export') },
  ]
  return (
    <>
      <PBViewHeader title="Quick Entry List" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => open('quick-entry-select-option') },
          { label: 'Delete Record', disabled: !current, onClick: () => current && setConfirm(true) },
          { label: 'Edit Record', disabled: !current, onClick: edit },
          { label: 'Close Window', onClick: () => onClose?.() },
        ]}
        right={(
          <span className="pb-row" style={{ gap: 0, marginRight: 17 }}>
            {right.map((b) => (
              <button
                key={b.label}
                type="button"
                className="pb-cmdrow__btn"
                style={{ width: b.width }}
                data-tutorial-id={host?.anchor('command', pbSlug(b.label))}
                onClick={() => { host?.report('command', { command: pbSlug(b.label) }); b.onClick() }}
              >
                {b.label}
              </button>
            ))}
          </span>
        )}
      />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={shown.map(quickEntryRow)}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(_r, i) => { const t = shown[i]; if (t) open('quick-entry-template', { id: t.id }) }}
          rowTutorialId={(r) => `host.mois.row.quick-entry-${pbSlug(r.name)}`}
          columns={[
            { key: 'group', header: 'Template Group', width: 204 },
            { key: 'name', header: 'Name', width: 508 },
            { key: 'description', header: 'Description' },
          ]}
          filters={filterRow}
          empty="No Quick Entry templates."
        />
      </div>
      {confirm && current && (
        <PBMessageBox
          title="Delete Record"
          icon="question"
          buttons={[
            { label: 'Yes', value: 'yes', default: true, tutorialId: 'host.mois.command.qe-delete-yes' },
            { label: 'No', value: 'no', tutorialId: 'host.mois.command.qe-delete-no' },
          ]}
          onClose={(v) => {
            setConfirm(false)
            if (v === 'yes') { deleteQuickEntryTemplate(current.id); setCur((c) => Math.max(0, c - 1)) }
          }}
        >
          Are you sure you want to delete the Quick Entry template "{current.name}"?
        </PBMessageBox>
      )}
    </>
  )
}
