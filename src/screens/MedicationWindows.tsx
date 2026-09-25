import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useChartExport } from '../data/chart-records'
import {
  dispenseUnits, doseFrequencies, doseRoutes, doseUnits, drugList, favouriteSources,
  type DrugRow, type FavouriteRow,
} from '../data/medications'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { registerScreenWindows } from '../host/screen-windows'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, PBTextArea, pbSlug, type PBColumn,
} from '../pb'
import { STAGE_USER, useMedRows, useMedSession, type Med, type PrintLogEntry } from './medication-model'
import { CurrentPatientBlock, FooterButton, StageMessageBox, StageWindow } from './StageWindow'

/* ============================================================================
   The windows the Rx - Prescription and Long Term Medication folders raise.

   Each is transcribed from the manual capture named on it. They are opened by
   name through the frame (`host.mois.openUtility {window}`, a menu's
   `go.open`, or the folder's own command buttons — see
   host/screen-windows.tsx) and drawn by MedicationView, which owns the rows
   they act on.
   ========================================================================= */

export const MED_WINDOWS = {
  drugLookup: 'drug-lookup',
  doseWizard: 'dose-wizard',
  favourites: 'favourite-medication-list',
  addFavourite: 'add-to-favourites',
  interaction: 'drug-interaction',
  allergyWarning: 'pharmacokinetics-allergies',
  selectToPrint: 'select-medications-to-print',
  history: 'prescription-history',
  renew: 'renew-long-term-medication',
  ltmDose: 'ltm-dose-frequency',
  voidAsk: 'void-prescription',
  voidReason: 'void-reason',
  unvoid: 'unvoid-prescription',
  deleteAsk: 'delete-prescription',
  /* not windows: the Action menu's row commands, which go through the same
     by-name switch so a menu item and a button do the same thing */
  duplicate: 'rx-duplicate',
  addToLtm: 'rx-add-to-long-term',
  printRx: 'print-rx',
} as const

registerScreenWindows(Object.values(MED_WINDOWS))

const today = MOIS_TODAY
const nowStamp = () => `${today}  ${new Date().toTimeString().slice(0, 5)}`

/* --- Advanced Lookup Service — Medications / Drug List --------------------
   303229 `f23fd642…png` (v02.1x, "CDIC Medications / Drug List") and 303236
   `4a1aafbc…png` (current, "Medications / Drug List" with "Medication &
   Natural Product Selection List" in the description pane). Columns F /
   Generic Name / Brand Name / ATC Code / ATC Name / Cost / LCA, a filter box
   over each, a yellow Row Count, the drug's detail under the list, Home /
   PgUp · Ok / Cancel · PgDwn / End, and Source ▾ + Save on Close. */
export function DrugLookupWindow({ initial = '', onPick, onClose }: {
  initial?: string
  onPick: (drug: DrugRow) => void
  onClose: () => void
}) {
  const [filters, setFilters] = useState<Partial<Record<keyof DrugRow, string>>>({ generic: initial })
  const [source, setSource] = useState('ALL')
  const rows = useMemo(() => drugList.filter((d) => (Object.keys(filters) as (keyof DrugRow)[])
    .every((k) => !filters[k] || String(d[k]).toUpperCase().includes(filters[k]!.toUpperCase()))), [filters])
  const [cur, setCur] = useState(0)
  const row = rows[Math.min(cur, rows.length - 1)]
  const filterBox = (k: keyof DrugRow) => (
    <PBInput value={filters[k] ?? ''} onChange={(e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setCur(0) }}
      data-tutorial-id={`host.mois.field.drug-${k}`} />
  )
  const columns: PBColumn<DrugRow>[] = [
    { key: 'f', header: 'F', width: 18, align: 'center' },
    { key: 'generic', header: 'Generic Name', width: 300 },
    { key: 'brand', header: 'Brand Name' },
    { key: 'atc', header: 'ATC Code', width: 66 },
    { key: 'atcName', header: 'ATC Name', width: 156 },
    { key: 'cost', header: 'Cost', width: 52, align: 'right' },
    { key: 'lca', header: 'LCA', width: 52, align: 'right' },
  ]
  return (
    <StageWindow id={MED_WINDOWS.drugLookup} title="Advanced Lookup Service" width={1000} height={690} onClose={onClose}
      bodyStyle={{ padding: 8, gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }}>
        <div className="pb-band--ruled">
          <PBBand right={<span style={{ background: 'var(--pb-yellow)', padding: '0 30px 0 6px', alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>Row Count = {rows.length}</span>}>
            Medications / Drug List
          </PBBand>
        </div>
        <PBDataWindow
          flush rules="white"
          style={{ flex: '1 1 auto', minHeight: 0 }}
          columns={columns}
          rows={rows}
          filters={[filterBox('f'), filterBox('generic'), filterBox('brand'), filterBox('atc'), filterBox('atcName'), null, null]}
          current={Math.min(cur, Math.max(0, rows.length - 1))}
          onCurrentChange={setCur}
          onActivate={(r) => onPick(r)}
          rowTutorialId={(r) => `host.mois.row.drug-${r.cdic}`}
          empty="No medication matches those filters."
        />
      </div>
      <div className="pb-form" style={{ flex: 'none', gridTemplateColumns: '84px 1fr 84px 180px', background: '#fffdf7', border: '1px solid var(--pb-border)', padding: '4px 8px', gap: '1px 6px' }}>
        <span className="pb-form__label pb-form__label--right">Generic Name:</span><b>{row?.generic}</b>
        <span className="pb-form__label pb-form__label--right">ATC Code:</span><b>{row?.atc}</b>
        <span className="pb-form__label pb-form__label--right">Manufacturer:</span><span>{row?.manufacturer}</span>
        <span className="pb-form__label pb-form__label--right">ATC Name:</span><span>{row?.atcName}</span>
        <span className="pb-form__label pb-form__label--right">Brand Name:</span><b>{row?.brand}</b>
        <span className="pb-form__label pb-form__label--right">CDIC:</span><span>{row?.cdic}</span>
        <span className="pb-form__label pb-form__label--right">Agent Name:</span><span />
        <span className="pb-form__label pb-form__label--right">Tag:</span><span />
      </div>
      <div className="pb-field" style={{ height: 38, flex: 'none', padding: '3px 5px', background: '#fff' }}>
        Medication &amp; Natural Product Selection List
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
        <PBButton wide onClick={() => setCur(0)}>Home</PBButton>
        <PBButton wide onClick={() => setCur((c) => Math.max(0, c - 12))}>PgUp</PBButton>
        <span style={{ flex: '1 1 auto' }} />
        <FooterButton primary disabled={!row} onClick={() => row && onPick(row)} tutorialId="host.mois.command.drug-lookup-ok">Ok</FooterButton>
        <span style={{ width: 14 }} />
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span style={{ flex: '1 1 auto' }} />
        <PBButton wide onClick={() => setCur((c) => Math.min(rows.length - 1, c + 12))}>PgDwn</PBButton>
        <PBButton wide onClick={() => setCur(rows.length - 1)}>End</PBButton>
      </div>
      <div className="pb-row" style={{ flex: 'none', gap: 8 }} data-tutorial-id="host.mois.field.drug-source">
        <span>Source:</span>
        <PBSelect w={190} value={source} onChange={(e) => setSource(e.target.value)} options={['ALL', 'CDIC', 'NATUROPATHIC DRUG LIST']} />
        <PBCheckbox label="Save on Close" />
      </div>
    </StageWindow>
  )
}

/* --- Extended: Medication Dose Wizard -------------------------------------
   303236 `4a1aafbc…png` (single dose) and `c351f94c…png` / `c82d7ead…png` /
   `9eb0e82e…png` (Multi-step Dose). The patient line, the drug block, Multi-
   step Dose + Reset Dose, the instruction flags and Note; then either one
   Dose(s) row with New / Delete and a Dispense amount, or a Multi-Step Dose
   Section of FOR / THEN FOR groups, each with Edit / New / Delete. Save (F2)
   · Save / Close · Cancel along the bottom. */
type DoseLine = { dose: string; units: string; route: string; freq: string }
type DoseGroup = { duration: string; doses: DoseLine[] }

export function DoseWizardWindow({ med, multi: startMulti = false, onSave, onClose }: {
  med?: Med
  multi?: boolean
  onSave: (built: { dose: string; amount: string; dispense: string; doses: string[] }, close: boolean) => void
  onClose: () => void
}) {
  const p = usePatient()
  const [multi, setMulti] = useState(startMulti)
  const line = (): DoseLine => ({ dose: '1', units: 'TAB', route: 'ORAL', freq: 'DAILY' })
  const [single, setSingle] = useState<DoseLine[]>([line()])
  const [amount, setAmount] = useState('30')
  const [amountUnits, setAmountUnits] = useState('DAY')
  /* the capture's own titration: 1.0 AM for a week, then 1.5, then 1.5 AM +
     0.5 PM — which is the manual's worked example */
  const [groups, setGroups] = useState<DoseGroup[]>([
    { duration: '1 WEEK', doses: [{ dose: '1.0', units: 'Tablet', route: 'ORAL', freq: 'AM' }] },
    { duration: '1 WEEK', doses: [{ dose: '1.5', units: 'Tablet', route: 'ORAL', freq: 'AM' }] },
    { duration: '1 WEEK', doses: [{ dose: '1.5', units: 'Tablet', route: 'ORAL', freq: 'AM' }, { dose: '0.5', units: 'Tablet', route: 'ORAL', freq: 'PM' }] },
  ])
  const text = (d: DoseLine) => `${d.dose} ${d.units} ${d.route} ${d.freq}`
  const save = (close: boolean) => onSave(multi
    ? { dose: 'MULTI-STEP DOSE', amount: 'SEE DETAIL', dispense: groups.map((g, i) => `${i ? 'THEN FOR' : 'FOR'}: ${g.duration}`).join(' / '), doses: groups.flatMap((g) => g.doses.map(text)) }
    : { dose: single.map(text).join(' + '), amount: `${amount} ${amountUnits}`, dispense: `${Number(amount).toFixed(1)} ${amountUnits}`, doses: single.map(text) },
  close)

  const doseRow = (d: DoseLine, set: (next: DoseLine) => void, buttons: ReactNode, key: string) => (
    <div key={key} className="pb-row" style={{ gap: 4, padding: '1px 0' }}>
      <PBInput w={58} align="center" value={d.dose} onChange={(e) => set({ ...d, dose: e.target.value })} />
      <PBSelect w={112} value={d.units} options={[...new Set([d.units, ...doseUnits])]} onChange={(e) => set({ ...d, units: e.target.value })} />
      <PBSelect w={112} value={d.route} options={[...new Set([d.route, ...doseRoutes])]} onChange={(e) => set({ ...d, route: e.target.value })} />
      <PBSelect w={112} value={d.freq} options={[...new Set([d.freq, ...doseFrequencies])]} onChange={(e) => set({ ...d, freq: e.target.value })} />
      <span style={{ flex: '1 1 auto' }} />
      {buttons}
    </div>
  )
  const heads = (
    <div className="pb-row" style={{ gap: 4, color: '#000' }}>
      <span style={{ width: 58, textAlign: 'center' }}>Dose</span>
      <span style={{ width: 112, textAlign: 'center' }}>Dose Units</span>
      <span style={{ width: 112, textAlign: 'center' }}>Route</span>
      <span style={{ width: 112, textAlign: 'center' }}>Frequency</span>
    </div>
  )

  return (
    <StageWindow id={MED_WINDOWS.doseWizard} title="Extended: Medication Dose Wizard" width={700} height={640} onClose={onClose}
      footer={<>
        <FooterButton onClick={() => save(false)}>Save (F2)</FooterButton>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={() => save(true)} tutorialId="host.mois.command.save-close">Save / Close</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div style={{ background: '#fff', borderBottom: '1px solid var(--pb-border)', padding: '4px 8px', flex: 'none' }}>
        <div className="pb-row" style={{ gap: 0 }}>
          <span style={{ width: 180 }}>FIRST:&nbsp; <b>{p.first}</b></span>
          <span style={{ width: 150 }}>MIDDLE:&nbsp; <b>{p.middle}</b></span>
          <span style={{ width: 160 }}>LAST:&nbsp; <b>{p.last}</b></span>
          <span style={{ width: 120 }}>DoB:&nbsp; <b>{p.dob}</b></span>
          <span>SEX:&nbsp; <b>{p.sex}</b></span>
        </div>
        <div className="pb-form" style={{ gridTemplateColumns: '84px 1fr auto', gap: '0 6px', padding: '4px 0 0', minHeight: 44 }}>
          <span>CDIC (DIN):</span><b>{med?.cdic}</b><span>Order Date: <b>{med?.order ?? today}</b></span>
          <span>Brand Name:</span><b>{med?.med}</b><span />
          <span>Generic Name:</span><b>{med?.generic}</b><span />
        </div>
      </div>
      <div className="pb-row" style={{ alignItems: 'flex-start', padding: '6px 8px', gap: 12, flex: 'none', borderBottom: '1px solid var(--pb-border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: 160 }}>
          <span data-tutorial-id="host.mois.field.multi-step-dose" style={{ alignSelf: 'flex-start' }}>
            <PBCheckbox label="Multi-step Dose" checked={multi} onChange={setMulti} />
          </span>
          <PBButton style={{ width: 84 }} onClick={() => { setSingle([line()]); setMulti(false) }}>Reset Dose</PBButton>
        </div>
        <div className="pb-form" style={{ gridTemplateColumns: '70px auto', gap: '1px 6px', padding: 0 }}>
          <span className="pb-form__label pb-form__label--right">Instructions:</span><PBCheckbox label="Do Not Substitute" />
          <span /><PBCheckbox label="Do Not Adapt" />
          <span className="pb-form__label pb-form__label--right">PRN:</span><PBCheckbox label="(when necessary)" />
          <span className="pb-form__label pb-form__label--right">Repeat:</span>
          <div className="pb-row"><PBCheckbox /><PBInput w={42} /><b>&#10007;</b></div>
        </div>
        <span>Note:</span>
        <PBTextArea rows={4} w="100%" style={{ flex: '1 1 auto' }} />
      </div>

      {!multi ? (
        <div data-tutorial-id="host.mois.group.doses" style={{ flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)' }}>
          <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--pb-border)' }}>
            <b>Dose(s)</b>
            <div style={{ paddingLeft: 22 }}>
              {heads}
              {single.map((d, i) => doseRow(d, (next) => setSingle((s) => s.map((x, j) => (j === i ? next : x))), <>
                <PBButton style={{ width: 54 }} onClick={() => setSingle((s) => [...s, line()])}>New</PBButton>
                <PBButton style={{ width: 54 }} onClick={() => setSingle((s) => (s.length > 1 ? s.filter((_, j) => j !== i) : s))}>Delete</PBButton>
              </>, `d${i}`))}
            </div>
          </div>
          <div style={{ padding: '4px 8px' }} data-tutorial-id="host.mois.group.dispense">
            <b>Dispense:</b>
            <div className="pb-row" style={{ paddingLeft: 40, gap: 4 }}>
              <span>Amount:</span>
              <PBInput w={46} align="center" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <PBSelect w={150} value={amountUnits} options={dispenseUnits} onChange={(e) => setAmountUnits(e.target.value)} />
            </div>
          </div>
        </div>
      ) : (
        <div data-tutorial-id="host.mois.group.multi-step-dose-section" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)' }}>
          <div style={{ padding: '3px 8px', fontWeight: 700, borderBottom: '1px solid var(--pb-border)' }}>Multi-Step Dose Section</div>
          {groups.map((g, gi) => (
            <div key={gi} style={{ borderBottom: '1px solid #9a9a9a', padding: '3px 8px 4px' }}>
              <div className="pb-row" style={{ gap: 4 }}>
                <b style={{ flex: '1 1 auto' }}>{gi ? 'THEN FOR' : 'FOR'}: {g.duration}</b>
                <PBButton style={{ width: 54 }}>Edit</PBButton>
                <PBButton style={{ width: 54 }} onClick={() => setGroups((all) => [...all.slice(0, gi + 1), { duration: '1 WEEK', doses: [line()] }, ...all.slice(gi + 1)])}>New</PBButton>
                <PBButton style={{ width: 54 }} onClick={() => setGroups((all) => (all.length > 1 ? all.filter((_, j) => j !== gi) : all))}>Delete</PBButton>
                <b style={{ width: 40 }}>Group</b>
              </div>
              <div style={{ paddingLeft: 22 }}>
                {heads}
                {g.doses.map((d, di) => doseRow(d, (next) => setGroups((all) => all.map((x, j) => (j === gi ? { ...x, doses: x.doses.map((y, k) => (k === di ? next : y)) } : x))), <>
                  <PBButton style={{ width: 54 }} onClick={() => setGroups((all) => all.map((x, j) => (j === gi ? { ...x, doses: [...x.doses, line()] } : x)))}>New</PBButton>
                  <PBButton style={{ width: 54 }} onClick={() => setGroups((all) => all.map((x, j) => (j === gi && x.doses.length > 1 ? { ...x, doses: x.doses.filter((_, k) => k !== di) } : x)))}>Delete</PBButton>
                  <b style={{ width: 40 }}>Dose</b>
                </>, `g${gi}d${di}`))}
              </div>
            </div>
          ))}
        </div>
      )}
    </StageWindow>
  )
}

/* --- Favourite Medication List --------------------------------------------
   303235 `fb8dab6b…png`: Medication List band, filter boxes over Type /
   Identifier / Medication Name, the grid, a Medication Detail band, Source ▾ +
   Save on Close, and Delete Favourite · Continue (F2) · Cancel. */
export function FavouriteListWindow({ onPick, onClose }: { onPick: (f: FavouriteRow) => void; onClose: () => void }) {
  const [session, update] = useMedSession()
  const [source, setSource] = useState('ALL')
  const [filter, setFilter] = useState<Record<string, string>>({})
  const rows = session.favourites.filter((f) => (source === 'ALL' || (source === 'My Favourites') === (f.type === 'USER'))
    && Object.entries(filter).every(([k, v]) => !v || String(f[k as keyof FavouriteRow]).toUpperCase().includes(v.toUpperCase())))
  const [cur, setCur] = useState(0)
  const row = rows[Math.min(cur, rows.length - 1)]
  const box = (k: string) => <PBInput value={filter[k] ?? ''} onChange={(e) => setFilter((f) => ({ ...f, [k]: e.target.value }))} />
  return (
    <StageWindow id={MED_WINDOWS.favourites} title="Favourite Medication List" width={866} height={674} onClose={onClose}
      bodyStyle={{ padding: 8, gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }}>
        <PBBand>Medication List</PBBand>
        <PBDataWindow
          flush style={{ flex: '1 1 auto', minHeight: 0 }}
          rows={rows}
          current={Math.min(cur, Math.max(0, rows.length - 1))}
          onCurrentChange={setCur}
          onActivate={(r) => onPick(r)}
          filters={[box('type'), box('identifier'), box('med'), null, null]}
          rowTutorialId={(r) => `host.mois.row.favourite-${pbSlug(r.identifier)}`}
          columns={[
            { key: 'type', header: 'Type', width: 58 },
            { key: 'identifier', header: 'Identifier', width: 160 },
            { key: 'med', header: 'Medication Name' },
            { key: 'dose', header: 'Dose / Freq', width: 136 },
            { key: 'amount', header: 'Amount', width: 84 },
          ]}
          empty="No favourite medications."
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', height: 150, flex: 'none', border: '1px solid var(--pb-border)' }}>
        <PBBand>Medication Detail</PBBand>
        <div style={{ display: 'flex', flex: '1 1 auto' }}>
          <div style={{ flex: '1 1 auto', background: '#fff', padding: '4px 8px', whiteSpace: 'pre-wrap' }}>{row ? `${row.generic}\n${row.dose}  ${row.amount}` : ''}</div>
          <div style={{ width: 230, borderLeft: '1px solid var(--pb-border)' }} />
        </div>
      </div>
      <div className="pb-row" style={{ flex: 'none', gap: 8 }}>
        <span>Source:</span>
        <PBSelect w={130} value={source} options={favouriteSources} onChange={(e) => setSource(e.target.value)} />
        <PBCheckbox label="Save on Close" />
      </div>
      <div className="pb-row" style={{ flex: 'none' }}>
        <FooterButton onClick={() => row && update((s) => ({ ...s, favourites: s.favourites.filter((f) => f !== row) }))}>Delete Favourite</FooterButton>
        <span style={{ flex: '1 1 auto' }} />
        <FooterButton primary disabled={!row} onClick={() => row && onPick(row)} tutorialId="host.mois.command.favourite-continue">Continue (F2)</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span style={{ flex: '1 1 auto' }} />
      </div>
    </StageWindow>
  )
}

/* --- Confirmation: Add to Favourite Medication List -----------------------
   303234 `139782a5…png`: an Enter Medication Identifier band, Identifier
   prefilled with the medication name, Continue / Cancel. */
export function AddFavouriteWindow({ med, onDone, onClose }: { med?: Med; onDone: () => void; onClose: () => void }) {
  const [, update] = useMedSession()
  const [identifier, setIdentifier] = useState(med?.med ?? '')
  const add = () => {
    if (med) {
      update((s) => ({
        ...s,
        favourites: [...s.favourites, { type: 'USER' as const, identifier, med: med.med, dose: med.dose, amount: med.amount, cdic: med.cdic, generic: med.generic }]
          .sort((a, b) => a.type.localeCompare(b.type) || a.identifier.localeCompare(b.identifier)),
      }))
    }
    onDone()
  }
  return (
    <StageWindow id={MED_WINDOWS.addFavourite} title="Confirmation: Add to Favourite Medication List" width={380} onClose={onClose}
      bodyStyle={{ padding: '10px 18px 4px' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={add} tutorialId="host.mois.command.favourite-add-continue">Continue</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div className="pb-groupbox">
        <PBBand>Enter Medication Identifier</PBBand>
        <div className="pb-row" style={{ padding: '6px 8px', background: 'var(--pb-face)' }}>
          <span>Identifier:</span>
          <PBInput w="100%" value={identifier} onChange={(e) => setIdentifier(e.target.value)} data-tutorial-id="host.mois.field.favourite-identifier" />
        </div>
      </div>
    </StageWindow>
  )
}

/* --- Pharmacokinetics and Allergies ------------------------------------------
   The read-only window both print routes raise before the prescription list.

   PROVENANCE (text only — no capture of this window survives anywhere in the
   manual, and the catalogue's §10 note says so):
     303229  Print Rx: "An allergy warning window pops up; close after
             review", then Drug Interaction Results if applicable, then the
             prescription list.
     303229  Renew / Print (F2): "the Pharmacokinetics and Allergies Window
             (Read-Only) will open for review. i. Close or press ESC to
             continue ii. The Select Medications to Print window will open".
     303217  "Renew/Print (F2) first shows you the Pharmacokinetics and
             Allergies window and then the full Prescriptions list";
             "Renew/Print Direct will skip the Pharmacokinetics and Allergies
             window".
     303741  "Print Rx — Opens an Allergy Alert dialog and a Prescription List
             window"; 303131 / 303132: "An allergy warning window will open
             followed by a drug selection list".
   Both routes put the same window in the same place (allergies, read-only,
   closed to reach the list), so this is one window under the name 303229 /
   303217 give it. What it holds is what its name and 303131 say: the
   patient's allergies with their reactions ("the patient's allergies and
   corresponding reactions … an allergy warning will pop up"), and the
   pharmacokinetic measures the prescription list itself prints — Height,
   Weight and GFR (303229 `8bc95398…png`'s Print Height / Print Weight / Print
   GFR strip). Everything shown comes from the chart: its Reaction Risks
   (tdt_allergy) and the latest HEIGHT / WEIGHT / GFR measures. The layout is
   the kit's print-window idiom (Current Patient, banded lists, one Close);
   the window has no capture to measure against.
   ------------------------------------------------------------------------ */
const PK_MEASURES: { label: string; match: (code: string, name: string) => boolean }[] = [
  { label: 'HEIGHT', match: (code, name) => code === '1948' || name === 'HEIGHT' },
  { label: 'WEIGHT', match: (code, name) => code === '22732' || name === 'WEIGHT' },
  { label: 'GFR', match: (code, name) => code === '27540' || /\bGFR\b/.test(name) },
]

export function PharmacokineticsAllergiesWindow({ onClose }: { onClose: () => void }) {
  const data = useChartExport()
  /* "Close or press ESC to continue" */
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  const measures = PK_MEASURES.map(({ label, match }) => {
    const latest = (data?.measure ?? [])
      .filter((m) => match(m.str_code ?? '', (m.str_description ?? '').toUpperCase()))
      .sort((a, b) => (b.dtm_collect_date ?? '').localeCompare(a.dtm_collect_date ?? ''))[0]
    return {
      measure: label,
      value: latest?.str_value ?? '',
      units: latest?.str_units ?? '',
      collected: (latest?.dtm_collect_date ?? '').split(' ')[0]!.replace(/\//g, '.'),
    }
  })
  const allergies = (data?.allergy ?? []).map((a) => ({
    start: (a.dtm_start ?? '').replace(/\//g, '.'),
    substance: a.str_substance ?? '',
    type: a.str_intolerance_type ?? '',
    reactions: a.str_reactions ?? a.str_reaction ?? '',
    severity: a.str_severity ?? '',
  }))
  return (
    <StageWindow id={MED_WINDOWS.allergyWarning} title="Pharmacokinetics and Allergies" width={760} height={470} onClose={onClose}
      footer={<>
        <span>(Read-Only)</span>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={onClose} tutorialId="host.mois.command.pharmacokinetics-close">Close</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <CurrentPatientBlock />
      <div data-tutorial-id="host.mois.group.pharmacokinetics" style={{ display: 'flex', flexDirection: 'column', flex: 'none', margin: '0 6px' }}>
        <PBBand>Pharmacokinetics</PBBand>
        <PBDataWindow
          flush style={{ height: 84 }}
          rows={measures}
          columns={[
            { key: 'measure', header: 'Measure', width: 120 },
            { key: 'value', header: 'Value', width: 110, align: 'center' },
            { key: 'units', header: 'Units', width: 110, align: 'center' },
            { key: 'collected', header: 'Collected' },
          ]}
        />
      </div>
      <div data-tutorial-id="host.mois.group.allergies" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, margin: '0 6px 6px' }}>
        <PBBand>Allergies</PBBand>
        <PBDataWindow
          flush style={{ flex: '1 1 auto', minHeight: 0 }}
          rows={allergies}
          rowStatus={() => 'flag'}
          columns={[
            { key: 'start', header: 'Start', width: 80, align: 'center' },
            { key: 'substance', header: 'Substance', width: 150 },
            { key: 'type', header: 'Type', width: 120 },
            { key: 'reactions', header: 'Reactions' },
            { key: 'severity', header: 'Severity', width: 190 },
          ]}
          empty="No allergies recorded for this patient."
        />
      </div>
    </StageWindow>
  )
}

/* --- Drug Interaction Results ----------------------------------------------
   303229 `db9c345c…png`: Current Patient; "Interactions  Show: All /
   Drug-Drug / Drug-Adverse Reaction" with counts; the grey scope note; a
   coloured band per severity with each pair and its monograph underneath;
   Print Anyway · Cancel Print. The monograph text is not the capture's (a
   licensed Cerner Multum monograph): what is shown is built from this chart —
   which of its prescriptions meet which of its recorded reaction risks. */
type Interaction = { kind: 'drug-drug' | 'drug-adverse'; severity: string; a: string; b: string; text: string }

export function useInteractions(): Interaction[] {
  const data = useChartExport()
  const rx = useMedRows('rx')
  return useMemo(() => {
    const out: Interaction[] = []
    for (const allergy of data?.allergy ?? []) {
      const substance = (allergy.str_substance ?? '').toUpperCase()
      if (!substance) continue
      /* a penicillin allergy meets every penicillin: ATC J01C */
      const hits = rx.filter((m) => !m.voided && (m.med.toUpperCase().includes(substance)
        || (substance.includes('PENICILLIN') && m.atc.startsWith('J01C'))))
      for (const m of hits) {
        out.push({
          kind: 'drug-adverse',
          severity: allergy.str_severity ?? '',
          a: m.med,
          b: substance,
          text: `${m.generic || m.med} is recorded against a ${String(allergy.str_intolerance_type ?? 'reaction risk').toLowerCase()} to ${substance} `
            + `(${allergy.str_reactions ?? allergy.str_reaction ?? 'reaction not recorded'}; ${String(allergy.str_severity ?? 'severity not recorded').toLowerCase()}), `
            + `entered ${String(allergy.dtm_start ?? '').replace(/\//g, '.')} in Reaction Risks. Review the risk before this prescription is printed.`,
        })
      }
    }
    return out
  }, [data, rx])
}

export function DrugInteractionWindow({ onPrint, onClose }: { onPrint: () => void; onClose: () => void }) {
  const found = useInteractions()
  const [show, setShow] = useState<'all' | 'drug-drug' | 'drug-adverse'>('all')
  const shown = found.filter((f) => show === 'all' || f.kind === show)
  const count = (k: Interaction['kind']) => found.filter((f) => f.kind === k).length
  return (
    <StageWindow id={MED_WINDOWS.interaction} title="Drug Interaction Results" width={827} height={736} onClose={onClose}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={onPrint} tutorialId="host.mois.command.print-anyway">Print Anyway</FooterButton>
        <FooterButton onClick={onClose} tutorialId="host.mois.command.cancel-print">Cancel Print</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <CurrentPatientBlock />
      <div style={{ margin: '0 6px', padding: '6px 8px 4px', borderBottom: '1px solid var(--pb-border)', flex: 'none' }}>
        <div className="pb-row" style={{ gap: 12 }}>
          <b>Interactions</b><span>Show:</span>
          <PBRadio name="ix" label={`All (${found.length})`} checked={show === 'all'} onChange={() => setShow('all')} />
          <span style={{ flex: '1 1 auto' }} />
          <PBRadio name="ix" label={`Drug-Drug (${count('drug-drug')})`} checked={show === 'drug-drug'} onChange={() => setShow('drug-drug')} />
          <span style={{ flex: '1 1 auto' }} />
          <PBRadio name="ix" label={`Drug-Adverse Reaction (${count('drug-adverse')})`} checked={show === 'drug-adverse'} onChange={() => setShow('drug-adverse')} />
        </div>
        <div style={{ color: '#6d6d6d', textAlign: 'center', paddingTop: 3 }}>
          Showing interactions, including Adverse Reactions, for drugs on this Prescription between themselves and with the Long Term Medication list.
        </div>
      </div>
      <div data-tutorial-id="host.mois.group.interactions" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', margin: '0 6px 6px', background: '#fff', border: '1px solid var(--pb-border)' }}>
        {shown.length === 0 ? <div className="pb-dw__empty">No interactions found.</div> : (
          <>
            <div style={{ background: '#ff8a9c', padding: '2px 6px', fontWeight: 700 }}>&#8863; Drug-Adverse Reaction ( {shown.length} )</div>
            {shown.map((f, i) => (
              <div key={i} style={{ padding: '4px 10px 8px 18px' }}>
                <div><b>&#8863; {f.a.toLowerCase()}</b>&nbsp; and &nbsp;<b>{f.b.toLowerCase()}</b></div>
                <div style={{ background: '#d4ebf8', margin: '4px 0 0 28px', padding: '4px 6px' }}>{f.text}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </StageWindow>
  )
}

/* --- Select Medications to Print ------------------------------------------
   303229 `8bc95398…png`: Current Patient, a Prescription List with an Include
   tick per row (none ticked), the selected row's Generic Name / Comment and
   instruction flags, the Print Height / Print Weight / Print GFR strip with its
   note. From v2.27 the pharmacy sits in its own band under Current Patient
   (303227 `b8e5665f…png`: "No pharmacy on file. Add One" on yellow), and the
   bottom right keeps Printer and Fax, each with Change... (`2ceaf4ef…png`),
   over Print (F2) · Sign and Print · Sign and Fax · Sign and Task · Cancel. */
export function SelectMedsToPrintWindow({ include: preset = [], onClose }: { include?: string[]; onClose: () => void }) {
  const rows = useMedRows('rx').filter((m) => !m.voided)
  const [, update] = useMedSession()
  const [include, setInclude] = useState<Set<string>>(() => new Set(preset))
  const [cur, setCur] = useState(0)
  const row = rows[cur]
  const print = () => {
    const picked = rows.filter((m) => include.has(m.id))
    if (picked.length) {
      const when = nowStamp()
      update((s) => ({
        ...s,
        printed: { ...s.printed, ...Object.fromEntries(picked.map((m) => [m.id, when])) },
        printLog: [{ date: when, by: STAGE_USER, station: 'MOIS-STAGE', items: picked, version: 'Original' }, ...s.printLog],
      }))
    }
    onClose()
  }
  return (
    <StageWindow id={MED_WINDOWS.selectToPrint} title="Select Medications to Print" width={1000} height={720} onClose={onClose}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={print} tutorialId="host.mois.command.print-f2">Print (F2)</FooterButton>
        <FooterButton onClick={print}>Sign and Print</FooterButton>
        <FooterButton onClick={print}>Sign and Fax</FooterButton>
        <FooterButton onClick={print}>Sign and Task</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <CurrentPatientBlock healthNo />
      <div style={{ margin: '0 6px', flex: 'none' }}>
        <PBBand>Pharmacy</PBBand>
        <div className="pb-row" style={{ background: '#fdf8c4', padding: '4px 8px', gap: 16 }}>
          <span>No pharmacy on file.</span><button type="button" className="pb-link">Add One</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, margin: '0 6px' }}>
        <PBBand>Prescription List</PBBand>
        <PBDataWindow
          flush style={{ flex: '1 1 auto', minHeight: 0 }}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(_r, i) => `host.mois.row.print-${i}`}
          columns={[
            {
              key: 'include', header: 'Include', width: 52, align: 'center',
              render: (m) => <PBCheckbox checked={include.has(m.id)} tutorialId={`host.mois.check.include-${pbSlug(m.med).slice(0, 24)}`}
                onChange={(on) => setInclude((s) => { const n = new Set(s); on ? n.add(m.id) : n.delete(m.id); return n })} />,
            },
            { key: 'order', header: 'Order', width: 76, align: 'center' },
            { key: 'cdic', header: 'CDIC', width: 70, align: 'center' },
            { key: 'med', header: 'Medication' },
            { key: 'dose', header: 'Dose / Frequency', width: 170 },
            { key: 'amount', header: 'Amount', width: 130 },
          ]}
          empty="No prescriptions to print."
        />
      </div>
      <div data-tutorial-id="host.mois.group.print-instructions" style={{ display: 'flex', gap: 8, padding: '6px 10px', margin: '0 6px', borderTop: '1px solid var(--pb-border)', flex: 'none' }}>
        <div className="pb-form" style={{ gridTemplateColumns: '74px 1fr', flex: '1 1 auto', padding: 0, alignItems: 'start' }}>
          <span className="pb-form__label">Generic Name:</span><PBTextArea rows={2} w="100%" readOnly value={row?.generic ?? ''} />
          <span className="pb-form__label">Comment:</span><PBTextArea rows={3} w="100%" readOnly value={row?.comment ?? ''} />
        </div>
        <div className="pb-form" style={{ gridTemplateColumns: '70px auto', width: 250, padding: 0, gap: '1px 6px' }}>
          <span className="pb-form__label pb-form__label--right">Instructions:</span><PBCheckbox label="Do Not Substitute" checked={row?.record?.str_no_substitute === 'Y'} />
          <span /><PBCheckbox label="Do Not Adapt" checked={row?.record?.str_do_not_adapt === 'Y'} />
          <span className="pb-form__label pb-form__label--right">PRN:</span><PBCheckbox label="(when necessary)" checked={row?.record?.str_prn === 'Y'} />
          <span className="pb-form__label pb-form__label--right">Repeat:</span><div className="pb-row"><PBCheckbox /><PBInput w={42} /><b>&#10007;</b></div>
          <span className="pb-form__label pb-form__label--right">Last Printed:</span><span>{row?.lastPrinted}</span>
        </div>
      </div>
      <div style={{ display: 'flex', margin: '0 6px 6px', border: '1px solid var(--pb-border)', background: '#fff', flex: 'none' }}>
        <div data-tutorial-id="host.mois.group.print-measures" style={{ flex: '1 1 auto', padding: '4px 10px' }}>
          <div className="pb-row" style={{ gap: 26 }}>
            <PBCheckbox label="Print Height" /><PBCheckbox label="Print Weight" /><PBCheckbox label="Print GFR" />
          </div>
          <div style={{ paddingTop: 3 }}>
            When patient age is less than 12 and Height or Weight measures occurred within the past month, then the associated measure is selected for printing by default.  GFR selected by default for all patients if value is less than 60.
          </div>
        </div>
        <div style={{ width: 330, borderLeft: '1px solid var(--pb-border)' }}>
          {[['Printer:', 'Default'], ['Fax:', 'DEFAULT']].map(([k, v]) => (
            <div key={k} className="pb-row" style={{ padding: '4px 8px', borderBottom: '1px solid #e2e2e2' }}>
              <span style={{ width: 56 }}>{k}</span><span style={{ flex: '1 1 auto' }}>{v}</span><button type="button" className="pb-link">Change...</button>
            </div>
          ))}
        </div>
      </div>
    </StageWindow>
  )
}

/* --- Prescription History ---------------------------------------------------
   303229 `46f7e419…png`: Printing History (Date Printed / Printed By) on the
   left — every time this patient's prescriptions went to the printer; on the
   right the selected print's Date Printed / Printed By / Work Station over
   CDIC · MEDICATION · DOSE/FREQ · AMOUNT, "all the prescriptions that were
   printed on that selected date"; one Reprint Prescription button, which
   prints the sheet again with today's date. The export records each
   prescription's last print (`dtm_last_printed`), so those prints are listed
   under the user who last touched the record; prints made on this stage are
   listed as made. */
export function PrescriptionHistoryWindow({ onReprint, onClose }: { onReprint: () => void; onClose: () => void }) {
  const [session, update] = useMedSession()
  const rx = useMedRows('rx')
  const entries = useMemo(() => {
    const exported = new Map<string, PrintLogEntry>()
    for (const m of rx) {
      const r = m.record
      if (!r?.dtm_last_printed) continue
      const date = r.dtm_last_printed.replace(/\//g, '.').replace(/:\d\d$/, '')
      const at = exported.get(date) ?? { date, by: r.stp_user_modify ?? r.stp_user_create ?? '', station: r.stp_create_machine ?? '', items: [], version: 'Original' as const }
      at.items = [...at.items, m]
      exported.set(date, at)
    }
    return [...session.printLog, ...[...exported.values()].sort((a, b) => b.date.localeCompare(a.date))]
  }, [rx, session.printLog])
  const [cur, setCur] = useState(0)
  const entry = entries[Math.min(cur, entries.length - 1)]
  const reprint = () => {
    if (!entry) return
    update((s) => ({ ...s, printLog: [{ ...entry, date: nowStamp(), by: STAGE_USER, station: 'MOIS-STAGE', version: 'Copy' }, ...s.printLog] }))
    setCur(0)
    onReprint()
  }
  return (
    <StageWindow id={MED_WINDOWS.history} title="Prescription History" width={995} height={706} onClose={onClose}
      footer={<><FooterButton onClick={reprint} tutorialId="host.mois.command.reprint-prescription" wide={false}>Reprint Prescription</FooterButton><span className="pb-footer__spacer" /></>}>
      <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, margin: '6px 6px 0', border: '1px solid var(--pb-border)' }}>
        <div style={{ width: 282, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--pb-border)' }}>
          <PBBand>Printing History</PBBand>
          <PBDataWindow
            flush style={{ flex: '1 1 auto', minHeight: 0 }}
            rows={entries.map((e) => ({ date: e.date, by: e.by }))}
            current={cur}
            onCurrentChange={setCur}
            columns={[{ key: 'date', header: 'Date Printed', width: 108, align: 'center' }, { key: 'by', header: 'Printed By' }]}
            empty="Not printed yet."
          />
        </div>
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div className="pb-band">
            <span>Date Printed:&nbsp; <b>{entry?.date}</b>&nbsp;&nbsp; Printed By:&nbsp; <b>{entry?.by}</b></span>
            <span className="pb-band__spacer" />
            <span style={{ fontWeight: 400 }}>Work Station:&nbsp; {entry?.station}</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            <div className="pb-row" style={{ fontWeight: 700, gap: 0, borderBottom: '1px solid #000', margin: '0 18px 0 0', padding: '0 0 2px 2px' }}>
              <span style={{ width: 68 }}>CDIC</span><span style={{ flex: '1 1 auto' }}>MEDICATION</span><span style={{ width: 116 }}>DOSE/FREQ</span><span style={{ width: 104 }}>AMOUNT</span>
            </div>
            {entry?.items.map((m) => (
              <div key={m.id} className="pb-row" style={{ gap: 0, borderBottom: '1px solid #000', margin: '0 18px 0 0', padding: '3px 0 3px 2px' }}>
                <span style={{ width: 68 }}>{m.cdic}</span><span style={{ flex: '1 1 auto' }}>{m.med}</span><span style={{ width: 116 }}>{m.dose}</span><span style={{ width: 104 }}>{m.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StageWindow>
  )
}

/* --- Renew Long Term Medication --------------------------------------------
   303217 `afb058fa…png`: Patient Information, then the Long Term Medication
   List — Renew tick, Start, Current Medication, * (F free text / S
   structured), Dose / Frequency, Amount, Dispense, Units, Refills — a pink
   rule, and the stopped medications under N/A / End / Stopped Medication. The
   current row's ATC Code, CDIC, Generic Name, Instructions and flags below,
   and Dose Detail "DISPENSE: 0.0 ENTER ON RENEW". Renew / Print Direct ·
   Renew / Print (F2) · Cancel. */
export function RenewLtmWindow({ preselect, onRenewed, onClose }: {
  /** the row that was current when Renew was pressed */
  preselect?: string
  onRenewed: (made: Med[], print: boolean) => void
  onClose: () => void
}) {
  const p = usePatient()
  const all = useMedRows('ltm')
  const running = all.filter((m) => !m.end)
  const stopped = all.filter((m) => m.end)
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(preselect ? [preselect] : []))
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [cur, setCur] = useState(Math.max(0, running.findIndex((m) => m.id === preselect)))
  const row = running[cur]
  const renew = (print: boolean) => {
    const made = running.filter((m) => ticked.has(m.id)).map((m) => {
      const amount = amounts[m.id]?.trim()
      return { ...m, amount: amount || '0 ENTER ON RENEW' }
    })
    onRenewed(made, print)
  }
  const grid = (rows: Med[], stoppedList: boolean) => (
    <PBDataWindow
      flush style={{ flex: stoppedList ? 'none' : '1 1 auto', minHeight: 0, ...(stoppedList ? { height: 96 } : {}) }}
      rows={rows}
      current={stoppedList ? -1 : cur}
      onCurrentChange={stoppedList ? undefined : setCur}
      rowClassName={() => (stoppedList ? 'pb-dw--checked' : undefined)}
      rowTutorialId={(m) => `host.mois.row.renew-${pbSlug(m.med).slice(0, 24)}`}
      columns={[
        stoppedList
          ? { key: 'na', header: 'N/A', width: 40, align: 'center' as const }
          : {
              key: 'renew', header: 'Renew', width: 40, align: 'center' as const,
              render: (m: Med) => <PBCheckbox checked={ticked.has(m.id)} tutorialId={`host.mois.check.renew-${pbSlug(m.med).slice(0, 24)}`}
                onChange={(on) => setTicked((s) => { const n = new Set(s); on ? n.add(m.id) : n.delete(m.id); return n })} />,
            },
        { key: stoppedList ? 'end' : 'order', header: stoppedList ? 'End' : 'Start', width: 70, align: 'center' as const },
        { key: 'med', header: stoppedList ? 'Stopped Medication' : 'Current Medication' },
        { key: 'doseKind', header: '*', width: 16, align: 'center' as const },
        { key: 'dose', header: 'Dose / Frequency', width: 146 },
        {
          key: 'amount', header: 'Amount', width: 128,
          render: (m: Med) => (stoppedList ? '' : (
            <input className="pb-field" style={{ width: '100%', height: 16, border: 0, background: ticked.has(m.id) ? '#fff' : '#c8c8c8' }}
              disabled={!ticked.has(m.id)} value={amounts[m.id] ?? ''}
              /* 303229: the first amount entered is prefilled for the other
                 ticked medications, each still editable on its own row */
              onChange={(e) => {
                const v = e.target.value
                setAmounts((a) => ({ ...a, ...Object.fromEntries([...ticked].filter((id) => id !== m.id && !a[id]).map((id) => [id, v])), [m.id]: v }))
              }} />
          )),
        },
        { key: 'dispense', header: 'Dispense', width: 60, align: 'center' as const, render: () => '0' },
        { key: 'units', header: 'Units', width: 90 },
        { key: 'refills', header: 'Refills', width: 44, align: 'center' as const, render: () => '0' },
      ]}
      empty={stoppedList ? '' : 'No long term medications.'}
    />
  )
  return (
    <StageWindow id={MED_WINDOWS.renew} title="Renew Long Term Medication" width={1010} height={680} onClose={onClose}
      footer={<>
        <span>* F = Freetext / S = Structured Entry</span>
        <span className="pb-footer__spacer" />
        <FooterButton onClick={() => renew(false)} tutorialId="host.mois.command.renew-print-direct" wide={false}>Renew / Print Direct</FooterButton>
        <FooterButton primary onClick={() => renew(true)} tutorialId="host.mois.command.renew-print-f2" wide={false}>Renew / Print (F2)</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div className="pb-groupbox" style={{ margin: '6px 6px 0', flex: 'none' }}>
        <PBBand>Patient Information</PBBand>
        <div className="pb-form" style={{ gridTemplateColumns: '150px 1fr 150px 1fr', background: '#fff', padding: '3px 8px', gap: '0 6px' }}>
          <span>Chart:&nbsp; <b>{p.chart}</b></span><span>Patient:&nbsp; <b>{`${p.first} ${p.last}`.toUpperCase()}</b></span>
          <span>DoB:&nbsp; <b>{p.dob}</b></span><span>Insurance by:&nbsp; <b>{p.insuranceBy ?? 'BC'}</b></span>
          <span /><span>Alias:&nbsp; {p.alias}</span>
          <span>Gender:&nbsp; <b>{p.sex}</b></span><span>Insurance No.:&nbsp; <b>{p.bchn ?? p.insurance ?? ''}</b></span>
        </div>
      </div>
      <div data-tutorial-id="host.mois.group.long-term-medication-list" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, margin: '0 6px' }}>
        <PBBand>Long Term Medication List</PBBand>
        {grid(running, false)}
        <div style={{ height: 14, background: '#f7a8a8', flex: 'none' }} />
        {grid(stopped, true)}
      </div>
      <div style={{ display: 'flex', margin: '4px 6px', gap: 8, flex: 'none' }}>
        <div className="pb-form" style={{ gridTemplateColumns: '78px 1fr', flex: '1 1 auto', padding: 0, alignItems: 'start' }}>
          <span className="pb-form__label">ATC Code:</span><div className="pb-row"><PBInput w={90} readOnly value={row?.atc ?? ''} /><span style={{ marginLeft: 'auto' }}>CDIC:</span><PBInput w={90} readOnly value={row?.cdic ?? ''} /></div>
          <span className="pb-form__label">Generic Name:</span><PBTextArea rows={2} w="100%" readOnly value={row?.generic ?? ''} />
          <span className="pb-form__label">Instructions:</span><PBTextArea rows={2} w="100%" readOnly value={row?.comment ?? ''} />
        </div>
        <div className="pb-form" style={{ gridTemplateColumns: '70px auto', width: 200, padding: 0, gap: '1px 6px', alignContent: 'start' }}>
          <span className="pb-form__label pb-form__label--right">Instructions:</span><PBCheckbox label="Do Not Substitute" />
          <span className="pb-form__label pb-form__label--right">PRN:</span><PBCheckbox label="(when necessary)" />
          <span /><PBCheckbox label="Do Not Adapt" />
        </div>
        <div style={{ width: 290, fontFamily: 'var(--pb-font-mono)', whiteSpace: 'pre', padding: '2px 8px' }}>
          <b>&#8863; DISPENSE: {amounts[row?.id ?? ''] ? amounts[row!.id] : '0.0 ENTER ON RENEW'}</b>
          {row?.doses.length ? `\n   ${row.doses.join('\n   ')}` : row?.dose ? `\n   ${row.dose}` : ''}
        </div>
      </div>
    </StageWindow>
  )
}

/* --- Long Term Medication Dose / Frequency ---------------------------------
   303215 `0baf096f…png`: one "Enter Dose/Frequency:" box, Ok (F2) · Cancel. */
export function LtmDoseWindow({ onOk, onClose }: { onOk: (dose: string) => void; onClose: () => void }) {
  const [dose, setDose] = useState('')
  return (
    <StageWindow id={MED_WINDOWS.ltmDose} title="Long Term Medication Dose / Frequency" width={428} onClose={onClose}
      bodyStyle={{ padding: '12px 16px 4px' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={() => onOk(dose)} tutorialId="host.mois.command.ltm-dose-ok">Ok (F2)</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div className="pb-row" style={{ gap: 12, padding: '4px 8px 10px', border: '1px solid var(--pb-border)' }}>
        <span>Enter Dose/Frequency:</span>
        <PBInput w={240} value={dose} onChange={(e) => setDose(e.target.value)} data-tutorial-id="host.mois.field.ltm-dose" />
      </div>
    </StageWindow>
  )
}

/* --- Void / UnVoid ----------------------------------------------------------
   303232: "MOIS will ask you if you want to void this prescription. Click
   Yes. In the confirmation window, type the reason … Click 'Void Record'."
   Neither window is captured; the question is a Win32 Yes/No box and the
   reason window follows the "Confirmation: …" naming of the one captured
   confirmation window in this family (303234 `139782a5…png`). */
export function VoidAskBox({ med, onYes, onClose }: { med?: Med; onYes: () => void; onClose: () => void }) {
  return (
    <StageMessageBox id={MED_WINDOWS.voidAsk} title="Void Prescription" icon="question"
      buttons={[{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no' }]}
      onClose={(v) => (v === 'yes' ? onYes() : onClose())}>
      Do you want to void this prescription?{med ? <><br /><br />{med.med}</> : null}
    </StageMessageBox>
  )
}

export function VoidReasonWindow({ onVoid, onClose }: { onVoid: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <StageWindow id={MED_WINDOWS.voidReason} title="Confirmation: Void Prescription" width={420} onClose={onClose}
      bodyStyle={{ padding: '10px 14px 4px' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={() => onVoid(reason)} tutorialId="host.mois.command.void-record">Void Record</FooterButton>
        <FooterButton onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div className="pb-groupbox">
        <PBBand>Reason</PBBand>
        <div style={{ padding: 6, background: 'var(--pb-face)' }}>
          <PBTextArea rows={4} w="100%" value={reason} onChange={(e) => setReason(e.target.value)} data-tutorial-id="host.mois.field.void-reason" />
        </div>
      </div>
    </StageWindow>
  )
}

export function UnvoidAskBox({ onYes, onClose }: { onYes: () => void; onClose: () => void }) {
  return (
    <StageMessageBox id={MED_WINDOWS.unvoid} title="UnVoid Prescription" icon="question"
      buttons={[{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no' }]}
      onClose={(v) => (v === 'yes' ? onYes() : onClose())}>
      Do you want to unvoid this prescription?
    </StageMessageBox>
  )
}

export function DeleteAskBox({ onYes, onClose }: { onYes: () => void; onClose: () => void }) {
  return (
    <StageMessageBox id={MED_WINDOWS.deleteAsk} title="Delete Record" icon="question"
      buttons={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no', default: true }]}
      onClose={(v) => (v === 'yes' ? onYes() : onClose())}>
      Do you want to delete the current record?
    </StageMessageBox>
  )
}
