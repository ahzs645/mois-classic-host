import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBLookup, PBTextArea, PBViewHeader, pbSlug,
  usePBInstrumentation,
} from '../pb'
import type { PBColumn } from '../pb'
import { CLINIC_COMMANDS, CLINIC_COMMAND_WIDTH, clinicListSpec } from '../data/clinicManagement'
import {
  CDIC_CATALOGUE, MY_SETTINGS_USER, blankFavourite, settingsStamp, useWorkspaceSettings,
  workspaceSettingsStore, type FavouriteMed,
} from '../data/workspaceSettings'
import { useScreenReport } from '../host/screen-state'

/* ============================================================================
   Workspace ▸ My Settings ▸ Favourite Medications — "Favourite Medication List".

   PROVENANCE. 303772 "How to Add a Medication to the Favourite Medication
   List", image `9e33924a`: the navy header `Favourite Medication List` with
   the user at the right (`ADMINISTRATOR`); command row New Record · Delete
   Record · Save · Undo · Refresh · Close Window; an empty white band; the
   grid Identifier · CDIC · … · Medication · Dose / Frequency · … · Amount;
   a splitter; and the record detail — "the bottom half of window" in the
   article's words:

       ATC Code: [      ]                 Instructions: [ ] Do Not Substitute  [ ] Do Not Adapt
       Generic Name: [ grey memo ]        PRN: [ ] (when necessary)
       Indication: [    …]                ┌ Dose Detail ───────────────┐
       Comment: / Printed on              │ ⊟ DISPENSE: 30.0 DAY        │
       Prescription [ memo ]              │    1.0 TAB ORAL AM          │
       Created: …                         Last Modified: …

   It is the same DataWindow as Administration ▸ Clinic Favourite Meds
   (`303074`, `clinicManagement.ts` → `ClinicListView`), owned by a user
   rather than by the clinic, so the grid's column table is read from that
   spec rather than transcribed twice. ClinicListView itself is a read-only
   list (no New Record / Save and a fixed detail pane), which is why this
   screen is its own file.

   Behaviour, per 303772's steps: New Record puts a blank row in the grid
   (no separate window) and makes it current; the CDIC cell takes a code and
   fills Medication, ATC Code and Generic Name from it; Identifier, Dose /
   Frequency and Amount are typed; Save (F2) writes the list; Undo drops
   unsaved changes; Delete Record removes the current row; Close Window
   shuts the sheet.
   ========================================================================= */

const COMMANDS = [...CLINIC_COMMANDS['inline-save'], 'Close Window']
  .filter((c): c is string => c !== null)

const EDITABLE = new Set(['identifier', 'cdic', 'dose', 'amount'])

function Label({ children, w = 96 }: { children: ReactNode; w?: number }) {
  return <span className="pb-form__label" style={{ width: w, flex: 'none', alignSelf: 'flex-start', paddingTop: 2 }}>{children}</span>
}

export function FavouriteMedicationListView({ onClose }: { onClose?: () => void }) {
  const host = usePBInstrumentation()
  const saved = useWorkspaceSettings().favourites
  const [rows, setRows] = useState<FavouriteMed[]>(() => saved.map((f) => ({ ...f })))
  const [dirty, setDirty] = useState(false)
  /* the capture has the second row, ALESSE, current */
  const [cur, setCur] = useState(Math.min(1, saved.length - 1))
  const [serial, setSerial] = useState(0)

  const current = rows.length ? Math.min(cur, rows.length - 1) : -1
  const row = current >= 0 ? rows[current] : undefined

  /* rows / saved as the other lists report them; `draft` while a New Record
     row is unsaved; `row` is the current row's Identifier; `record` says how
     far the current row has got: `new` (blank), `coded` (its CDIC found a
     drug), `saved` */
  useScreenReport({
    rows: rows.length,
    saved: !dirty,
    draft: rows.some((r) => !r.created),
    row: row ? pbSlug(row.identifier) || null : null,
    record: !row ? null : row.created ? 'saved' : row.medication ? 'coded' : 'new',
  })

  const update = (i: number, patch: Partial<FavouriteMed>) => {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
    setDirty(true)
  }

  const setCell = (i: number, key: string, value: string) => {
    if (key === 'cdic') {
      const hit = CDIC_CATALOGUE[value.trim()]
      update(i, hit ? { cdic: value, medication: hit.medication, atc: hit.atc, generic: hit.generic } : { cdic: value })
      return
    }
    update(i, { [key]: value } as Partial<FavouriteMed>)
  }

  const command = (label: string) => {
    switch (label) {
      case 'New Record': {
        setRows((rs) => [...rs, blankFavourite(`new-${serial + 1}`)])
        setSerial((n) => n + 1)
        setCur(rows.length)
        setDirty(true)
        return
      }
      case 'Delete Record':
        if (current < 0) return
        setRows((rs) => rs.filter((_, j) => j !== current))
        setCur(Math.max(0, current - 1))
        setDirty(true)
        return
      case 'Save': {
        const stamp = settingsStamp()
        const next = rows.map((r) => {
          const before = saved.find((s) => s.id === r.id)
          const changed = !before || JSON.stringify(before) !== JSON.stringify(r)
          /* the tree prints quantities with one decimal: `30 DAY` → `30.0 DAY` */
          const oneDecimal = (s: string) => s.replace(/^(\d+(?:\.\d+)?)/, (n) => Number(n).toFixed(1))
          const doseDetail: FavouriteMed['doseDetail'] = r.doseDetail ?? (r.amount || r.dose
            ? [`DISPENSE: ${oneDecimal(r.amount)}`.trim(), oneDecimal(r.dose)]
            : null)
          return {
            ...r,
            doseDetail,
            created: r.created || stamp,
            modified: changed ? stamp : r.modified,
          }
        })
        workspaceSettingsStore.saveFavourites(next)
        setRows(next)
        setDirty(false)
        return
      }
      case 'Undo':
      case 'Refresh':
        setRows(saved.map((f) => ({ ...f })))
        setCur((c) => Math.min(c, saved.length - 1))
        setDirty(false)
        return
      case 'Close Window':
        onClose?.()
    }
  }

  const spec = clinicListSpec('ad-meds')
  const columns: PBColumn<FavouriteMed>[] = (spec?.columns ?? []).map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
    align: c.align,
    headAlign: c.headAlign ?? 'center',
    dots: c.dots,
    render: EDITABLE.has(c.key)
      ? (r: FavouriteMed, i: number) => (i === current && !r.created
        ? (
          <PBInput
            w="100%"
            value={String(r[c.key as keyof FavouriteMed] ?? '')}
            data-tutorial-id={host?.anchor('field', `favourite-${c.key}`)}
            onChange={(e) => setCell(i, c.key, e.target.value.toUpperCase())}
          />
        )
        : String(r[c.key as keyof FavouriteMed] ?? ''))
      : undefined,
  }))

  return (
    <>
      <PBViewHeader title="Favourite Medication List" right={<span style={{ fontWeight: 'bold' }}>{MY_SETTINGS_USER}</span>} />
      <PBCommandRow
        commands={COMMANDS.map((label) => ({
          label,
          width: CLINIC_COMMAND_WIDTH[label],
          onClick: () => command(label),
        }))}
      />
      {/* the band under the command row is there but empty */}
      <div style={{ height: 21, background: '#ffffff', flex: 'none' }} />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow<FavouriteMed>
          columns={columns}
          rows={rows}
          current={current >= 0 ? current : undefined}
          onCurrentChange={setCur}
          rowTutorialId={(r, i) => `host.mois.row.favourite-${pbSlug(r.identifier) || `new-${i + 1}`}`}
          style={{ ['--pb-band' as string]: '#ffffff' }}
          empty="No records."
        />
      </div>

      {/* the master/detail splitter, then the record detail */}
      <div style={{ height: 1, background: '#646464', flex: 'none' }} />
      <div
        data-tutorial-id={host?.anchor('group', 'favourite-detail')}
        style={{ flex: 'none', height: 216, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}
      >
        <div key={row?.id ?? 'none'} className="pb-row" style={{ flex: '1 1 auto', minHeight: 0, alignItems: 'flex-start', gap: 18, padding: '6px 8px' }}>
          <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div className="pb-row" style={{ gap: 6 }}>
              <Label>ATC Code:</Label>
              <PBInput w={86} readOnly value={row?.atc ?? ''} style={{ background: 'var(--pb-field-ro)' }} data-tutorial-id="host.mois.field.atc-code" />
            </div>
            <div className="pb-row" style={{ gap: 6 }}>
              <Label>Generic Name:</Label>
              <PBTextArea rows={2} w="100%" readOnly value={row?.generic ?? ''} style={{ background: 'var(--pb-field-ro)' }} />
            </div>
            <div className="pb-row" style={{ gap: 6 }}>
              <Label>Indication:</Label>
              <PBLookup w={120} name="indication" value={row?.indication ?? ''} onChange={(v) => { if (row) update(current, { indication: v }) }} />
            </div>
            <div className="pb-row" style={{ gap: 6 }}>
              <Label>Comment:<br /><br />Printed on<br />Prescription</Label>
              <PBTextArea
                rows={4}
                w="100%"
                value={row?.comment ?? ''}
                disabled={!row}
                onChange={(e) => { if (row) update(current, { comment: e.target.value }) }}
                data-tutorial-id="host.mois.field.comment"
              />
            </div>
          </div>
          <div style={{ flex: '0 0 370px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div className="pb-row" style={{ gap: 12 }}>
              <Label w={80}>Instructions:</Label>
              <PBCheckbox label="Do Not Substitute" checked={row?.noSubstitute ?? false} disabled={!row} onChange={(v) => update(current, { noSubstitute: v })} />
              <PBCheckbox label="Do Not Adapt" checked={row?.noAdapt ?? false} disabled={!row} onChange={(v) => update(current, { noAdapt: v })} />
            </div>
            <div className="pb-row" style={{ gap: 12 }}>
              <Label w={80}>PRN:</Label>
              <PBCheckbox label="(when necessary)" checked={row?.prn ?? false} disabled={!row} onChange={(v) => update(current, { prn: v })} />
            </div>
            <fieldset className="pb-fieldset" style={{ marginTop: 4, background: '#ffffff' }}>
              <legend className="pb-fieldset__legend">Dose Detail</legend>
              <div className="pb-fieldset__body" style={{ fontFamily: 'monospace', whiteSpace: 'pre', minHeight: 80 }}>
                {row?.doseDetail && (
                  <>
                    <div style={{ fontWeight: 'bold' }}>⊟ {row.doseDetail[0]}</div>
                    <div>{'   └ '}{row.doseDetail[1]}</div>
                  </>
                )}
              </div>
            </fieldset>
          </div>
        </div>
        <div className="pb-row" style={{ flex: 'none', gap: 12, background: '#f0f0f0', padding: '3px 8px', whiteSpace: 'pre' }}>
          <span>Created:</span>
          <span style={{ width: 300 }}>{row?.created ?? ''}</span>
          <span>Last Modified:</span>
          <span>{row?.modified ?? ''}</span>
        </div>
      </div>
    </>
  )
}
