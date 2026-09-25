import { useState } from 'react'
import catalog from '../data/legacy-dynamic-form-catalog.json'
import { PBButton, PBDataWindow, PBWindow, pbSlug } from '../pb'

/* ============================================================================
   Dynamic Form Selection Window — what `New Record` on Patient Chart ▸
   Forms ▸ Dynamic Forms (and `New Form` on the Encounter Detail's Encounter
   Forms tab) opens. Forms sit under their form-type band; `Ok` (or a
   double-click) opens the current one.

   PROVENANCE: manual article 303105 "Create a Dynamic Form", image
   `7518af698507…` (772×694 @1.00x — the whole window, a themed Windows
   frame with only the close box). Title bar 0–26; the grid x 10–762,
   y 34–629, no header row; the band y 34–55, flat #C8DCFA, bold caption
   with the ⊟ box in the gutter; detail rows 22px (56–78, 78–100, 100–122),
   zebra #E8E8E8, current row salmon; two columns, x 40–365 and 365–762.
   `Ok` x 288–362, `Cancel` x 379–453, y 645–667. "Ok" is MOIS's casing.
   Article 303523 (Forms ▸ Dynamic Forms, images `7d9fec89cd64…`,
   `3a3b3e5ca607…`) confirms the Group/Title pairing the folder lists —
   `Musculoskeletal` / `First Assessment` — and names a second form a user
   picks here: the Chronic Pain "Pain Assessment".

   The Musculoskeletal rows and their second-column text are the capture's.
   The bands under it are the top-level forms (window id ≥ 1000; the lower
   ids are sub-forms a measure's `…` opens, never picked here) from
   `legacy-dynamic-form-catalog.json`, grouped by their `group` in catalog
   order. The capture shows no second-column text for those, so it repeats
   the title — an assumption, not a transcription.
   ========================================================================= */

export type DynamicFormChoice = { group: string; title: string; windowId?: string }

type Row = DynamicFormChoice & { description: string }

const W = 772
const H = 694
const TITLEBAR_H = 26
/** capture x → window x */
const x = (captureX: number) => captureX
/** capture y → client y */
const y = (captureY: number) => captureY - TITLEBAR_H

/** the three rows the capture shows, windows 200 / 306 / 406 in the catalog */
const MUSCULOSKELETAL: Row[] = [
  { group: 'Musculoskeletal', title: 'First Assessment', description: 'Joint Pain - First Assessment', windowId: '200' },
  { group: 'Musculoskeletal', title: 'Osteoarthritis Follow-up', description: 'Osteoarthritis Follow-up v2', windowId: '306' },
  { group: 'Musculoskeletal', title: 'Rheumatoid Arthritis Followup', description: 'Rheumatoid Arthritis Followup', windowId: '406' },
]

type CatalogEntry = { title: string; group: string }

/** Every top-level catalog form outside the captured band, grouped in catalog order. */
function catalogRows(): Row[] {
  const byGroup = new Map<string, Row[]>()
  for (const [windowId, entry] of Object.entries(catalog as Record<string, CatalogEntry>)) {
    if (Number(windowId) < 1000 || entry.group === 'Musculoskeletal') continue
    const list = byGroup.get(entry.group) ?? []
    list.push({ group: entry.group, title: entry.title, description: entry.title, windowId })
    byGroup.set(entry.group, list)
  }
  return [...byGroup.values()].flat()
}

const ROWS: Row[] = [...MUSCULOSKELETAL, ...catalogRows()]

export function DynamicFormSelectionDialog({ onOk, onClose }: {
  onOk: (form: DynamicFormChoice) => void
  onClose: () => void
}) {
  const [current, setCurrent] = useState(0)
  const picked = ROWS[current]
  const choose = (r: Row) => onOk({ group: r.group, title: r.title, windowId: r.windowId })

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        title="Dynamic Form Selection Window"
        onClose={onClose}
        tutorialId="host.mois.dialog.dynamic-form-selection"
        style={{
          width: W, height: H, maxWidth: '100%', maxHeight: '100%',
          ['--pb-titlebar-h' as string]: `${TITLEBAR_H}px`,
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)' }}>
          <div
            style={{
              position: 'absolute', left: x(10), right: W - x(762), top: y(34), bottom: H - TITLEBAR_H - y(629),
              display: 'flex', border: '1px solid #828790', background: '#fff',
            }}
          >
            <PBDataWindow
              rows={ROWS}
              current={current}
              onCurrentChange={setCurrent}
              onActivate={choose}
              head={false}
              groupBy={(r) => r.group}
              groupLabel={(g) => g}
              groups={[...new Set(ROWS.map((r) => r.group))]}
              rowTutorialId={(r) => `host.mois.row.dform-${pbSlug(r.title)}`}
              columns={[
                { key: 'title', header: '', width: 365 - 35 },
                { key: 'description', header: '' },
              ]}
              style={{
                flex: '1 1 auto', minWidth: 0,
                ['--pb-dw-row-h' as string]: '22px',
                ['--pb-dw-gutter-width' as string]: '25px',
                ['--pb-dw-group' as string]: '#c8dcfa',
                ['--pb-dw-group-accent' as string]: '#c8dcfa',
              }}
            />
          </div>

          <PBButton
            style={{ position: 'absolute', left: x(288), top: y(645), width: 74, height: 22, minWidth: 0 }}
            data-tutorial-id="host.mois.command.dynamic-form-ok"
            disabled={!picked}
            onClick={() => picked && choose(picked)}
          >
            Ok
          </PBButton>
          <PBButton
            style={{ position: 'absolute', left: x(379), top: y(645), width: 74, height: 22, minWidth: 0 }}
            data-tutorial-id="host.mois.command.dynamic-form-cancel"
            onClick={onClose}
          >
            Cancel
          </PBButton>
        </div>
      </PBWindow>
    </div>
  )
}
