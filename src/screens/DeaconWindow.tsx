import { useState } from 'react'
import { clinicListSpecs } from '../data/clinicManagement'
import { DEACON_CHART_STATUSES, DEACON_FUNCTIONS, DEACON_GROUPS, DEACON_TITLE, type DeaconFunction } from '../data/deacon'
import { useScreenReport } from '../host/screen-state'
import {
  PBButton, PBDataWindow, PBDropDownDataWindow, PBInput, PBSelect, PBWindow, pbSlug,
} from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { ModalLayer } from './dialogKit'
import { deaconRun } from '../data/billingPrograms'
import { useUnsentSink } from './billingProgramsKit'

/* ============================================================================
   DEACON - Data Extraction, Access, & Control.
   Administration ▸ Utilities ▸ Data Extraction, Access, & Control.

   Transcribed from `223b1919…` (303367, "How to Assign All of One Doctor's
   Patients to Another Doctor"):
     - a child window over the work area, title "DEACON - Data Extraction,
       Access, & Control", close box only;
     - left, a navy "Function List" band over the functions, grouped under
       light-blue upper-case bands with a +/- box;
     - right, a navy "Selected Function" band over a light-blue panel that
       prints Function: and Description:, then a navy "Parameter List" band
       whose rows are a caption and an edit box with "…", the current row
       salmon, the next light blue.
   The function list is 3258362's (`data/deacon.ts`).

   NOT IN THE CAPTURE, built from the article's words:
     - "Run" (303367: 'Press "Run"'). The capture is cropped above it; it
       sits at the foot of the Parameter List here.
     - the prompt Run raises. 303367: "MOIS will prompt you that the data has
       been changed and ask if you would like to see the results. Click 'Yes'
       to view an Excel sheet …". The box's wording is that sentence; the
       Excel sheet itself is not drawn.
     - picking a provider. The "…" beside a Provider field drops the provider
       list — the drop-down behaviour 303124 describes for a provider field
       when "Enable Provider Selection Prompt" is off.

   Reports `host.dialog = deacon`, `host.screen.row` = the selected
   function's anchor id (`deacon-find-and-replace-provider`) and
   `host.screen.record = run` once Run has been answered.
   ========================================================================= */

const NAVY_BAND: React.CSSProperties = {
  background: '#0b4a86', color: '#ffffff', fontWeight: 700, padding: '4px 10px', flex: 'none',
}
const PANEL = '#c9e6fb'
const SALMON = '#f4c6bd'

/* the clinic's own Provider List, active providers only — read when the
   window renders, never at module load (the menus import this file) */
const providers = () => (clinicListSpecs.find((s) => s.node === 'ad-provider-list')?.rows ?? [])
  .filter((r) => r.active === 'Y' && r.ptype)
  .map((r) => ({ provider: String(r.name), type: String(r.ptype) }))

export const deaconRowId = (f: DeaconFunction) => `deacon-${pbSlug(f.name)}`

export function DeaconWindow({ close }: AreaWindowProps) {
  const [collapsed, setCollapsed] = useState(() => new Set(DEACON_GROUPS))
  const [cur, setCur] = useState(-1)
  const [params, setParams] = useState<Record<string, string>>({})
  const [paramRow, setParamRow] = useState(0)
  const [asking, setAsking] = useState(false)
  const [ran, setRan] = useState(false)
  /* a destructive function asks first (data/deacon.ts `confirm`, INFERRED) */
  const [confirming, setConfirming] = useState(false)
  /* a function with behaviour (the LFP panel pair, data/billingPrograms.ts
     deaconRun) answers Run with its own message, or refuses with one */
  const [outcome, setOutcome] = useState<{ ok: boolean; message: string } | null>(null)
  const sink = useUnsentSink()
  const selected = cur >= 0 ? DEACON_FUNCTIONS[cur] : undefined

  useScreenReport({
    dialog: 'deacon',
    row: selected ? deaconRowId(selected) : null,
    record: ran ? 'run' : null,
    /* which function the run was, so a lesson can grade Delete future
       daybook vs Update Patient Status (slug only) */
    deaconFunction: ran && selected ? pbSlug(selected.name) : null,
  })

  return (
    <ModalLayer zIndex={75}>
      <PBWindow
        child
        controls={false}
        title={DEACON_TITLE}
        onClose={close}
        tutorialId="host.mois.dialog.deacon"
        style={{ width: 980, height: 600, maxWidth: '100%', maxHeight: '100%' }}
      >
        <div className="pb-row" style={{ flex: '1 1 auto', minHeight: 0, alignItems: 'stretch', gap: 8, padding: 8, background: '#ffffff' }}>
          {/* ---- Function List ---- */}
          <div style={{ width: 358, flex: 'none', display: 'flex', flexDirection: 'column', border: '1px solid #9ab' }}>
            <div style={NAVY_BAND}>Function List</div>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }} data-tutorial-id="host.mois.field.function-list">
              <PBDataWindow<DeaconFunction>
                head={false}
                gutter={false}
                rules={false}
                rows={DEACON_FUNCTIONS}
                current={cur}
                onCurrentChange={(i) => { setCur(i); setParams({}); setParamRow(0); setRan(false) }}
                groupBy={(f) => f.group}
                groups={DEACON_GROUPS}
                groupLabel={(g) => g}
                collapsed={collapsed}
                onCollapsedChange={setCollapsed}
                groupTutorialId={(g) => `host.mois.group.deacon-${pbSlug(g)}`}
                rowTutorialId={(f) => `host.mois.row.${deaconRowId(f)}`}
                rowFill={(_, i) => (i === cur ? SALMON : '#ffffff')}
                columns={[{ key: 'name', header: '', render: (f) => <span style={{ paddingLeft: 26 }}>{f.name}</span> }]}
              />
            </div>
          </div>

          {/* ---- Selected Function + Parameter List ---- */}
          <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ border: '1px solid #9ab', flex: 'none' }} data-tutorial-id="host.mois.field.selected-function">
              <div style={NAVY_BAND}>Selected Function</div>
              <div style={{ background: PANEL, padding: '6px 12px', minHeight: 58 }}>
                <div className="pb-row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ width: 70, flex: 'none' }}>Function:</span>
                  <span>{selected?.name ?? ''}</span>
                </div>
                <div className="pb-row" style={{ gap: 12, alignItems: 'flex-start', paddingTop: 2 }}>
                  <span style={{ width: 70, flex: 'none' }}>Description:</span>
                  <span style={{ whiteSpace: 'normal' }}>{selected?.description ?? ''}</span>
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #9ab', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={NAVY_BAND}>Parameter List</div>
              <div style={{ flex: '1 1 auto', minHeight: 0, background: '#ffffff' }} data-tutorial-id="host.mois.field.parameter-list">
                {(selected?.params ?? []).map((p, i) => (
                  <div
                    key={p}
                    className="pb-row"
                    onMouseDown={() => setParamRow(i)}
                    style={{ gap: 8, padding: '4px 12px', background: i === paramRow ? SALMON : PANEL }}
                  >
                    <span style={{ width: 172, flex: 'none' }}>{p}</span>
                    {/provider/i.test(p) ? (
                      <PBDropDownDataWindow
                        w={236}
                        listW={300}
                        rows={providers()}
                        columns={[{ key: 'provider', header: 'Provider' }, { key: 'type', header: 'Type', width: 80 }]}
                        value={params[p] ?? ''}
                        onSelect={(row) => setParams((v) => ({ ...v, [p]: row.provider }))}
                        tutorialId={`host.mois.field.${pbSlug(p)}`}
                      />
                    ) : selected?.kinds?.[p] === 'status' || selected?.kinds?.[p] === 'statuses' ? (
                      /* a chart status parameter drops the status list (INFERRED) */
                      <PBSelect
                        w={236}
                        options={['', ...DEACON_CHART_STATUSES]}
                        value={params[p] ?? ''}
                        onChange={(e) => setParams((v) => ({ ...v, [p]: e.target.value }))}
                        data-tutorial-id={`host.mois.field.${pbSlug(p)}`}
                      />
                    ) : (
                      /* the plain edit boxes of 3295289 `07de3928…` / `43859d93…` */
                      <PBInput
                        w={236}
                        value={params[p] ?? ''}
                        onChange={(e) => setParams((v) => ({ ...v, [p]: e.target.value }))}
                        data-tutorial-id={`host.mois.field.${pbSlug(p)}`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="pb-row" style={{ padding: '6px 12px', background: '#ffffff', justifyContent: 'flex-end', flex: 'none' }}>
                <PBButton
                  wide
                  disabled={!selected?.params}
                  command="run"
                  onClick={() => {
                    const result = selected ? deaconRun(selected.name, params) : null
                    if (result && !result.ok) { setOutcome({ ok: false, message: result.message ?? '' }); return }
                    if (result) { sink(result.claims ?? []); setOutcome({ ok: true, message: result.message ?? '' }) }
                    if (selected?.confirm) { setConfirming(true); return }
                    setAsking(true)
                  }}
                >
                  Run
                </PBButton>
              </div>
            </div>
          </div>
        </div>
      </PBWindow>

      {asking && (
        /* the kit's message box, drawn here so its Yes / No carry command
           anchors a lesson can press */
        <div className="pb-modal-layer" style={{ zIndex: 80 }}>
          <PBWindow child controls={false} title="DEACON" onClose={() => setAsking(false)} className="pb-msgbox" tutorialId="host.mois.dialog.deacon-results">
            <div className="pb-msgbox__body">
              <span className="pb-msgbox__text">
                {outcome?.ok && outcome.message ? <>{outcome.message}<br /><br /></> : null}
                The data has been changed. Would you like to see the results?
              </span>
            </div>
            <div className="pb-msgbox__footer">
              {['Yes', 'No'].map((b) => (
                <PBButton
                  key={b}
                  className={b === 'Yes' ? 'pb-btn--default' : undefined}
                  command={pbSlug(b)}
                  onClick={() => { setAsking(false); setRan(true) }}
                >
                  {b}
                </PBButton>
              ))}
            </div>
          </PBWindow>
        </div>
      )}

      {confirming && selected?.confirm && (
        <div className="pb-modal-layer" style={{ zIndex: 80 }}>
          <PBWindow child controls={false} title="DEACON" onClose={() => setConfirming(false)} className="pb-msgbox" tutorialId="host.mois.dialog.deacon-confirm">
            <div className="pb-msgbox__body">
              <span className="pb-msgbox__text">{selected.confirm}</span>
            </div>
            <div className="pb-msgbox__footer">
              {['Yes', 'No'].map((b) => (
                <PBButton
                  key={b}
                  className={b === 'No' ? 'pb-btn--default' : undefined}
                  command={`deacon-confirm-${pbSlug(b)}`}
                  onClick={() => { setConfirming(false); if (b === 'Yes') setAsking(true) }}
                >
                  {b}
                </PBButton>
              ))}
            </div>
          </PBWindow>
        </div>
      )}

      {outcome && !outcome.ok && (
        <div className="pb-modal-layer" style={{ zIndex: 80 }}>
          <PBWindow child controls={false} title="DEACON" onClose={() => setOutcome(null)} className="pb-msgbox" tutorialId="host.mois.dialog.deacon-error">
            <div className="pb-msgbox__body">
              <span className="pb-msgbox__text">{outcome.message}</span>
            </div>
            <div className="pb-msgbox__footer">
              <PBButton className="pb-btn--default" command="deacon-error-ok" onClick={() => setOutcome(null)}>OK</PBButton>
            </div>
          </PBWindow>
        </div>
      )}
    </ModalLayer>
  )
}

registerAreaWindow('deacon', DeaconWindow)
