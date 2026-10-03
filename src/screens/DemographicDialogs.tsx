import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { usePatient, usePatientRoster } from '../data/patient-context'
import { patientEdits, updatePatient } from '../data/patient-edits'
import { type Patient, type ChartAddressEntry } from '../data/patients'
import { dotsOf } from '../data/clock'
import { PBButton, PBInput, PBTextArea, PBCheckbox, PBRadio, PBGroup, PBGroupBox, PBBand, PBDataWindow } from '../pb'
import { useScreenReport } from '../host/screen-state'
import { useChartRecords } from '../data/chart-records'
import { AdvancedLookupDialog } from './AdvancedLookupDialog'
import { DesktopLayer as BaseDesktopLayer, LAYER, ModalWindow } from './dialogKit'
import { DialogFooter } from './formKit'

export const today = () => dotsOf(new Date())

/** Child dialogs cover the host desktop, including the tree, without clipping. */
export function DemographicModal({ title, onClose, children, width = 620, height, dialog: dialogId }: {
  title: string; onClose: () => void; children: ReactNode; width?: number; height?: number
  /** the window's slug: reported as `host.dialog` while it is open, and its
      `host.mois.dialog.{slug}` anchor, so a lesson can grade and ring it */
  dialog?: string
}) {
  useScreenReport(dialogId ? { dialog: dialogId } : {})
  return (
    <ModalWindow title={title} onClose={onClose} portal="parent" zIndex={LAYER.demographic}
      tutorialId={dialogId ? `host.mois.dialog.${dialogId}` : undefined}
      trap={{ label: title, width: `min(${width}px, 96%)` }}
      windowStyle={{ width: '100%', height, maxHeight: '90vh' }}>
      {children}
    </ModalWindow>
  )
}

export { CmdButton } from './CmdButton'
import { CmdButton } from './CmdButton'

export function DialogButtons({ children }: { children: ReactNode }) {
  return <DialogFooter gap={10} padding={16}>{children}</DialogFooter>
}

/* --- the captured side windows --------------------------------------------
   Patient Photo, MSP Eligibility Check, Change Address Wizard, Address Expiry
   Date and Connection are laid out at the positions measured off the Drive
   `Mois/New Folder With Items` 2026-09-22 captures (8.17.06 – 8.18.34). Those
   are 1.5x captures (Patient Summary's DataWindow rows repeat every 30 device
   px against our 20), so every number below is device px ÷ 1.5, measured
   from the window face's top-left corner. Each window's height is its face
   plus the kit's title bar (29px with the frame). */

/** The kit's title bar and frame, added to a measured face height. */
const CHROME_H = 29

/**
 * Measured details these windows draw that the kit has no prop for, applied
 * as scoped rules (candidates for kit props, listed in the report):
 *   1. the sunken band panel (Photo, Outcome, Current Patient Data, Family
 *      Members / Other, Connection Details) — PBGroupBox at a 20px band with
 *      a #707070 frame and band rule (the kit's is #b6b6b6) over the face;
 *   2. the etched group frame (#dcdcdc, the kit's is #adadad) and, on MSP
 *      Eligibility Check, its bold *black* caption;
 *   3. a 22px dialog push button at a measured width (the kit's is 19px with
 *      a 68px minimum);
 *   4. a read-only edit painted white, the way the wizard's are, and a
 *      disabled one that keeps the normal field frame (Connection);
 *   5. a ticked wizard row that stays green when it is the current row —
 *      the kit's current-row salmon wins over `rowFill`, the capture's
 *      current row (the `>` one) is green.
 */
const DEM_CSS = `
.pb-dem-face { position: relative; flex: 1 1 auto; min-height: 0; }
.pb-dem-panel { position: absolute; display: flex; flex-direction: column; }
.pb-dem-panel > .pb-groupbox { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; border-color: #707070; background: var(--pb-face); --pb-band-h: 20px; }
.pb-dem-panel > .pb-groupbox > .pb-band { border-bottom-color: #707070; }
.pb-dem-panel > .pb-groupbox > div:last-child { flex: 1 1 auto; min-height: 0; position: relative; display: flex; flex-direction: column; }
.pb-dem-group { position: absolute; margin: 0; }
.pb-dem-group.pb-fieldset { border-color: #dcdcdc; padding: 0; }
.pb-dem-group > .pb-fieldset__body { position: relative; height: 100%; }
.pb-dem-group--black > .pb-fieldset__legend { color: #000; margin-left: 4px; padding: 0 3px; }
.pb-dem-btn.pb-btn { position: absolute; height: 22px; min-width: 0; padding: 0; }
.pb-dem-white.pb-field[readonly] { background: #fff; }
.pb-dem-dis.pb-field:disabled { background: #fff; border-color: var(--pb-border); }
.pb-dw__table > tbody > tr.pb-dem-ticked.is-current:nth-child(n) { background: var(--pb-dw-row); }
.pb-band .pb-dem-plain { font-weight: 400; }
.pb-dem-text { position: absolute; height: 16px; display: flex; align-items: center; white-space: nowrap; }
`

/** A control at a measured spot: left `x`, top `y`. */
function At({ x, y, w, h, children, style }: { x: number; y: number; w?: number; h?: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, display: 'flex', ...style }}>{children}</div>
}

/** A caption centred on line `cy`, from `x` — or right-set to end at `end`. */
function Text({ x, end, cy, bold, children }: { x?: number; end?: number; cy: number; bold?: boolean; children: ReactNode }) {
  return <span className="pb-dem-text" style={{ top: cy - 8, ...(end !== undefined ? { right: `calc(100% - ${end}px)` } : { left: x }), fontWeight: bold ? 700 : undefined }}>{children}</span>
}

/** The sunken band panel, see DEM_CSS 1. */
function Panel({ title, right, x, y, w, h, children }: { title: ReactNode; right?: ReactNode; x: number; y: number; w: number; h: number; children?: ReactNode }) {
  return <div className="pb-dem-panel" style={{ left: x, top: y, width: w, height: h }}>
    <PBGroupBox title={title} right={right} pad={false}>{children}</PBGroupBox>
  </div>
}

/** An etched group at a measured frame: `y` is the frame's top rule. */
function Group({ title, x, y, w, h, black, children }: { title: string; x: number; y: number; w: number; h: number; black?: boolean; children?: ReactNode }) {
  /* the legend straddles the rule, so the fieldset starts half a caption above it */
  return <PBGroup title={title} className={black ? 'pb-dem-group pb-dem-group--black' : 'pb-dem-group'}
    style={{ left: x, top: y - 8, width: w, height: h + 8 }}>{children}</PBGroup>
}

/** A push button at its measured place and width, 22px tall. */
function Btn({ x, y, w, command, def, children, ...rest }: { x: number; y: number; w: number; command: string; def?: boolean; children: ReactNode } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return <CmdButton {...rest} command={command} className={def ? 'pb-dem-btn pb-btn--default' : 'pb-dem-btn'} style={{ left: x, top: y, width: w }}>{children}</CmdButton>
}

/** MOIS paints a ten-digit phone through its `(###) ###-####` edit mask: the
    chart's home number reads "(250) 983-4566" on both the Patient Photo and
    the Change Address Wizard captures. INFERRED: any other value is shown
    as stored. */
export function phoneMask(value?: string) {
  const digits = (value ?? '').replace(/\D/g, '')
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : (value ?? '')
}

/* View Or Update Patient Photo — Drive Mois 2026-09-22 8.17.22 (current
   build; supersedes art. 301174 `764f23cc…png`, v02.20.18): the Photo panel
   holds the dashed photo box ("No Photo Selected") with Update Photo /
   Remove Photo under it and nine identity lines to its right — Chart No.,
   the name ("FRANK W. AARONSON": first, middle initial, last), the two
   address lines, "CITY, PROV  POSTAL", DOB / Age / Gender, Home / Work /
   Ext., BCHN, then "Insurance:" (insurer, number, dependent) — and Ok /
   Cancel under the panel. Update Photo carries the default button's blue
   frame. The help-site build's single PHN line is gone. */
const PHOTO = { w: 668, face: 390 }
export function PatientPhotoDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const [photo, setPhoto] = useState(patient.photo ?? '')
  const [error, setError] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const request = useRef(0)
  useEffect(() => () => { request.current++ }, [])
  const years = patient.age.replace(/ OLD$/, '').replace(/\bYR\b/, 'YEARS')
  const name = [patient.first, patient.middle ? `${patient.middle[0]}.` : '', patient.last].filter(Boolean).join(' ')
  /* the identity block: x 338 in the panel, one line every 19.2px */
  const line = (i: number) => 44 + i * 19.2
  const lines: ReactNode[] = [
    <>Chart No.:&nbsp; {patient.chart}</>,
    name,
    patient.address,
    patient.address2,
    <>{[patient.city, patient.province].filter(Boolean).join(', ')}&nbsp; {patient.postal}</>,
  ]
  return <DemographicModal title="View Or Update Patient Photo" width={PHOTO.w} height={PHOTO.face + CHROME_H} onClose={onClose} dialog="patient-photo">
    <style>{DEM_CSS}</style>
    <div className="pb-dem-face">
      <Panel title="Photo" x={11} y={8} w={644} h={323}>
        <div data-tutorial-id="host.mois.field.patient-photo" style={{ position: 'absolute', left: 12, top: 13, width: 318, height: 242, boxSizing: 'border-box', border: '1px dashed #5a5a5a', display: 'grid', placeItems: 'center' }}>
          {photo ? <img src={photo} alt="Patient photo" style={{ width: '100%', height: '100%', objectFit: 'contain', minHeight: 0 }} /> : 'No Photo Selected'}
        </div>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Patient photo file" onChange={async e => {
          const f = e.target.files?.[0]; if (!f) return
          const token = ++request.current
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024) { setError('Choose a PNG, JPEG or WebP image under 5 MB.'); return }
          const reader = new FileReader()
          reader.onload = () => { if (request.current === token) { setPhoto(String(reader.result)); setError('') } }
          reader.onerror = () => { if (request.current === token) setError('The image could not be read.') }
          reader.readAsDataURL(f)
        }} />
        <Btn x={83} y={265} w={80} command="update-photo" def onClick={() => { if (file.current) { file.current.value = ''; file.current.click() } }}>Update Photo</Btn>
        <Btn x={170} y={265} w={79} command="remove-photo" disabled={!photo} onClick={() => { request.current++; setPhoto('') }}>Remove Photo</Btn>
        {/* INFERRED: where a refused file says so — the capture never shows it */}
        {error && <Text x={12} cy={298}><span role="alert">{error}</span></Text>}
        {lines.map((text, i) => <Text key={i} x={337} cy={line(i)}>{text}</Text>)}
        <Text x={337} cy={line(5)}>DOB:</Text><Text x={392} cy={line(5)}>{patient.dob}</Text>
        <Text x={473} cy={line(5)}>Age:</Text><Text x={512} cy={line(5)}>{years}</Text>
        <Text x={572} cy={line(5)}>Gender:</Text><Text x={620} cy={line(5)}>{patient.gender}</Text>
        {/* INFERRED: the Work and Ext. values' x — both are blank in the capture */}
        <Text x={337} cy={line(6)}>Home:</Text><Text x={392} cy={line(6)}>{phoneMask(patient.home)}</Text>
        <Text x={474} cy={line(6)}>Work:</Text><Text x={512} cy={line(6)}>{phoneMask(patient.work)}</Text>
        <Text x={601} cy={line(6)}>Ext.:</Text><Text x={624} cy={line(6)}>{patient.workExt}</Text>
        <Text x={337} cy={line(7)}>BCHN:</Text><Text x={392} cy={line(7)}>{patient.bchn}</Text>
        <Text x={336} cy={line(8)}>Insurance: {[patient.insuranceBy, patient.insurance, patient.dep].filter(Boolean).join(' ')}</Text>
      </Panel>
      <Btn x={244} y={348} w={76} command="photo-ok" onClick={() => { updatePatient(patient.chart, { photo }); onClose() }}>Ok</Btn>
      <Btn x={326} y={348} w={76} command="photo-cancel" onClick={onClose}>Cancel</Btn>
    </div>
  </DemographicModal>
}

/* MSP Eligibility Check — Drive Mois 2026-09-22 8.18.00 (current build):
   three etched groups with bold *black* captions — Patient Information
   (Patient, then PHN / DoB / Gender, the values in bold), MSP Login
   Information (Username, Password, Change Password... beside the password,
   Save Settings at the right), Eligibility For Date (Date of Service) — then
   the Outcome panel, its band carrying Show Source Response, over a Result /
   MSP Message grid whose columns stop short of the panel's right edge, and
   Check Eligibility (default) / Close.

   The capture's login is filled (a staff user name, a masked password, Save
   Settings ticked). The user name is not copied here, and with no MSP
   service behind this emulator the login stays empty and disabled — which is
   what a lesson and the demographics test rely on. */
const MSP = { w: 631, face: 542 }
export function MspEligibilityDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const [serviceDate, setServiceDate] = useState(today)
  const [attempted, setAttempted] = useState(false)
  const [source, setSource] = useState(false)
  const [save, setSave] = useState(true)
  return <DemographicModal title="MSP Eligibility Check" width={MSP.w} height={MSP.face + CHROME_H} onClose={onClose} dialog="msp-eligibility">
    <style>{DEM_CSS}</style>
    <div className="pb-dem-face">
      <Group black title="Patient Information" x={12} y={18} w={601} h={56} />
      <Text x={22} cy={38}>Patient:</Text><Text x={86} cy={38} bold>{patient.last}, {patient.first} {patient.middle}</Text>
      <Text x={22} cy={56}>PHN:</Text><Text x={86} cy={56} bold>{patient.bchn}</Text>
      <Text x={186} cy={56}>DoB:</Text><Text x={217} cy={56} bold>{patient.dob}</Text>
      <Text x={294} cy={56}>Gender:</Text><Text x={345} cy={56} bold>{patient.gender}</Text>

      <Group black title="MSP Login Information" x={12} y={96} w={601} h={54} />
      <Text x={22} cy={116}>Username:</Text>
      <At x={86} y={107} w={192} h={17}><PBInput aria-label="MSP username" w="100%" style={{ height: '100%' }} disabled value="" readOnly /></At>
      <Text x={22} cy={135}>Password:</Text>
      <At x={86} y={127} w={192} h={17}><PBInput aria-label="MSP password" type="password" w="100%" style={{ height: '100%' }} disabled value="" readOnly /></At>
      {/* its window is never captured; with no MSP service it stays disabled */}
      <PBButton className="pb-dem-btn" style={{ left: 284, top: 125, width: 107, height: 21 }} disabled title="Requires a connected MSP service">Change Password...</PBButton>
      <At x={489} y={127} h={17} style={{ alignItems: 'center' }}><PBCheckbox label="Save Settings" checked={save} onChange={setSave} /></At>

      <Group black title="Eligibility For Date" x={12} y={169} w={601} h={38} />
      <Text x={21} cy={191}>Date of Service:</Text>
      <At x={112} y={183} w={85} h={16}><PBInput aria-label="MSP date of service" w="100%" align="center" style={{ height: '100%' }} value={serviceDate} onChange={e => setServiceDate(e.target.value)} /></At>

      <Panel title="Outcome" x={13} y={220} w={602} h={270}
        right={<PBCheckbox label={<span className="pb-dem-plain">Show Source Response</span>} checked={source} onChange={e => setSource(e)} />}>
        <PBDataWindow style={{ flex: 1, background: 'white' }} gutter={false} rows={[]}
          columns={[{ key: 'result', header: 'Result', width: 176 }, { key: 'message', header: 'MSP Message', width: 404 }]}
          empty={attempted ? 'Eligibility was not checked. Connect an MSP service to retrieve a result.' : false} />
        {/* INFERRED: what Show Source Response opens is never captured */}
        {source && <PBTextArea aria-label="MSP source response" value="" readOnly placeholder="No response received." />}
      </Panel>
      <Btn x={214} y={503} w={91} command="check-eligibility" def onClick={() => setAttempted(true)}>Check Eligibility</Btn>
      <Btn x={310} y={503} w={89} command="msp-close" onClick={onClose}>Close</Btn>
    </div>
  </DemographicModal>
}

export type DemographicTerm = { term: string; category: string; code: string; system: string; alternates?: string[] }
// The only city code/alternate transcribed in the supplied lookup screenshot.
export const geographicTerms: DemographicTerm[] = [{ term: 'PRINCE GEORGE', category: 'CITY', code: 'JBLVS', system: 'PP-BC', alternates: ['PRG'] }]

export function DemographicLookupDialog({ title, value, rows: source, city, onPick, onClose }: {
  title: string; value: string; rows: DemographicTerm[]; city?: boolean; onPick: (row: DemographicTerm) => void; onClose: () => void
}) {
  const p = usePatient()
  const [search, setSearch] = useState(value)
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState('200')
  const [systems, setSystems] = useState(city ? ['PP-BC'] : [...new Set(source.map(r => r.system))])
  const [categories, setCategories] = useState(city ? ['CITY', 'COMMUNITY', 'DISTRICT MUNICIPALITY'] : [...new Set(source.map(r => r.category))])
  const [status, setStatus] = useState('Active')
  const [cur, setCur] = useState(0)
  const [savedSettings, setSavedSettings] = useState<{ systems: string[]; categories: string[] } | null>(null)
  const rows = source.filter(r => systems.includes(r.system) && categories.includes(r.category)
    && [r.term, ...(r.alternates ?? [])].some(t => t.toUpperCase().includes(search.toUpperCase()))
    && r.code.includes(code.toUpperCase()) && r.category.includes(category.toUpperCase()) && status !== 'Inactive').slice(0, Math.max(0, Number(limit) || 0))
  const selected = rows[Math.min(cur, Math.max(0, rows.length - 1))]
  const toggle = (list: string[], item: string) => list.includes(item) ? list.filter(x => x !== item) : [...list, item]
  return <DemographicModal title={`MOIS - Universal Search Window for Chart Number: ${p.chart} ${p.first} ${p.last} — ${title}`} width={1000} height={640} onClose={onClose} dialog="universal-search">
    <div className="pb-row" style={{ alignItems: 'stretch', padding: 4, gap: 4 }}>
      <div style={{ width: '25%' }}><PBBand>Select from Code System(s)</PBBand>
        {(city ? ['PP-BC', 'PP-AB', 'PP-MB'] : [...new Set(source.map(r => r.system))]).map(s => <div key={s}><PBCheckbox label={s.replace('PP-', '')} checked={systems.includes(s)} onChange={() => setSystems(toggle(systems, s))} /></div>)}</div>
      <div style={{ width: '26%' }}><PBBand>Filter to Reference Set(s)</PBBand>
        {(city ? ['CITY', 'COMMUNITY', 'DISTRICT MUNICIPALITY'] : [...new Set(source.map(r => r.category))]).map(c => <div key={c}><PBCheckbox label={c} checked={categories.includes(c)} onChange={() => setCategories(toggle(categories, c))} /></div>)}</div>
      <div style={{ flex: 1 }}><PBBand>Parameters: Code Systems</PBBand>
        <label>Code is <PBInput aria-label="Lookup code" value={code} onChange={e => setCode(e.target.value)} /></label><br />
        <label>Category is like <PBInput aria-label="Lookup category" value={category} onChange={e => setCategory(e.target.value)} /></label>
        <div className="pb-row">Status is {['Active', 'Inactive', 'Either'].map(s => <PBRadio key={s} name="lookup-status" label={s} checked={status === s} onChange={() => setStatus(s)} />)}</div>
        <label>Limit list to <PBInput aria-label="Lookup limit" w={64} value={limit} onChange={e => setLimit(e.target.value)} /> records</label>
      </div>
    </div>
    <div className="pb-row" style={{ padding: 4 }}><span>Search For:</span><PBInput aria-label={`${title} search`} style={{ flex: 1 }} value={search} onChange={e => { setSearch(e.target.value); setCur(0) }} /><PBButton onClick={() => setCur(0)}>Search</PBButton></div>
    <div style={{ display: 'flex', flex: 1, minHeight: 0, padding: 4 }}><PBDataWindow style={{ flex: 1, background: 'white' }} rows={rows} current={cur} onCurrentChange={setCur} onActivate={onPick}
      columns={[{ key: 'term', header: 'Term' }, { key: 'category', header: 'Category', width: 170 }, { key: 'code', header: 'Code', width: 90 }, { key: 'system', header: 'Code System', width: 120 }]}
      empty="No matching entries in the available lookup data." /></div>
    <div style={{ padding: 6 }}>Rows: {rows.length}</div><PBBand>Alternate Terms [{selected?.alternates?.length ?? 0}]</PBBand>
    <div style={{ background: 'white', padding: 6, minHeight: 54 }}>{selected?.alternates?.join(', ')}</div>
    <DialogButtons><PBButton onClick={() => setSavedSettings({ systems, categories })}>Save My Default Settings</PBButton>
      <PBButton onClick={() => { setSystems(savedSettings?.systems ?? (city ? ['PP-BC'] : [...new Set(source.map(r => r.system))])); setCategories(savedSettings?.categories ?? (city ? ['CITY', 'COMMUNITY', 'DISTRICT MUNICIPALITY'] : [...new Set(source.map(r => r.category))])); setSearch(''); setCode(''); setCategory(''); setStatus('Active'); setLimit('200') }}>Restore Settings</PBButton>
      <PBButton disabled={!selected} onClick={() => selected && onPick(selected)}>Select</PBButton><PBButton onClick={onClose}>Cancel</PBButton></DialogButtons>
  </DemographicModal>
}

export function AddressExpiryDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const [expiry, setExpiry] = useState(today)
  const [error, setError] = useState('')
  /* Drive Mois 2026-09-22 8.18.34: the bold question from x 18; the prompt,
     the Expiry Date caption and Ok all start at x 87 — the window is left-set,
     not centred — and the date is centred in its edit. */
  return <DemographicModal title="Address Expiry Date" width={365} height={152 + CHROME_H} onClose={onClose} dialog="address-expiry-date">
    <style>{DEM_CSS}</style>
    <div className="pb-dem-face">
      <Text x={18} cy={21} bold>Would you like to archive the patient's current address?</Text>
      <Text x={86} cy={48}>If yes, please select an expiry date:</Text>
      <Text x={86} cy={72}>Expiry Date:</Text>
      <At x={156} y={64} w={95} h={16}><PBInput aria-label="Address expiry date" w="100%" align="center" style={{ height: '100%' }} value={expiry} onChange={e => setExpiry(e.target.value)} /></At>
      {/* INFERRED: the capture never shows a refused date */}
      {error && <Text x={156} cy={94}><span role="alert" style={{ color: '#c00000' }}>{error}</span></Text>}
      <Btn x={88} y={109} w={75} command="archive-ok" onClick={() => {
        const iso = expiry.replace(/[/.]/g, '-')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(iso)) || new Date(iso).toISOString().slice(0, 10) !== iso) { setError('Enter a valid date as YYYY.MM.DD.'); return }
        updatePatient(patient.chart, { addressHistory: [{ ...addressOf(patient), expiry }, ...(patient.addressHistory ?? [])] }); onClose()
      }}>Ok</Btn>
      <Btn x={172} y={109} w={75} command="archive-cancel" onClick={onClose}>Cancel</Btn>
    </div>
  </DemographicModal>
}

export function addressOf(p: Patient): ChartAddressEntry {
  return { address: p.address, address2: p.address2, city: p.city, province: p.province, postal: p.postal, country: p.country,
    home: p.home, work: p.work, cell: p.cell, other: p.pager, ext: p.workExt, fax: p.fax, emailHome: p.emailHome, emailWork: p.emailWork }
}

/** Renders children on the desktop layer, above any open modal — for a list
    a modal opens over itself (the wizard's Find / Add); nothing until the
    desktop is found. */
export function DesktopLayer({ children }: { children: ReactNode }) {
  return <BaseDesktopLayer fallback="none">{children}</BaseDesktopLayer>
}

/* Change Address Wizard — Drive Mois 2026-09-22 8.18.23 (current build;
   art. 301556 `a136af6f…png`, v02.20.19, agrees on the parts): the Current
   Patient Data panel holds two etched groups with navy captions — Patient
   (Chart No., Patient Name in three edits) and Current Address (two address
   lines, City / Province, Postal Code / Country, Home) — every edit read-only
   but painted white; then the Family Members / Other (pre-loaded from the
   patient's Family Hx list) panel over a grid — Update / Chart / Last Name /
   First Name / Middle Name / Address / Address / City / Province / Country /
   Postal Code, white header rules, columns stopping short of the panel —
   whose ticked rows are green; then Find / Add Patient to List alone at the
   bottom left and Update / Cancel. Find / Add opens the list of patient
   charts (the Advanced Lookup Service); a picked chart joins the grid with
   its Update box ticked.

   The capture's two family rows are pre-loaded and ticked. The chart export
   carries a Family Hx entry's name but not its linked chart (captured-3924's
   note), so INFERRED: an entry is pre-loaded when its name — first and last,
   a bracketed alias dropped — is a chart on the roster. */
const WIZARD = { w: 905, face: 560 }
const familyKey = (name: string) => name.toUpperCase().replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
export function AddressWizardDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<Patient[]>([])
  const [unticked, setUnticked] = useState<string[]>([])
  const roster = usePatientRoster()
  const familyHx = useChartRecords('family_hx')
  const preloaded = useMemo(() => {
    const names = new Set(familyHx.map(r => familyKey(String(r.str_name ?? ''))).filter(Boolean))
    return roster.filter(p => p.chart !== patient.chart && names.has(familyKey(`${p.first} ${p.last}`)))
  }, [familyHx, roster, patient.chart])
  const members = [...preloaded, ...added.filter(p => !preloaded.some(m => m.chart === p.chart))]
  const selected = members.map(m => m.chart).filter(c => !unticked.includes(c))
  const [current, setCurrent] = useState(0)
  useScreenReport(adding ? { prompt: 'find-add-patient' } : {})
  const columns = [{ key: 'chart', header: 'Chart', width: 61 }, { key: 'last', header: 'Last Name', width: 96 }, { key: 'first', header: 'First Name', width: 86 },
    { key: 'middle', header: 'Middle Name', width: 73 }, { key: 'address', header: 'Address', width: 101 }, { key: 'address2', header: 'Address', width: 98 },
    { key: 'city', header: 'City', width: 80 }, { key: 'province', header: 'Province', width: 63 }, { key: 'country', header: 'Country', width: 57 }, { key: 'postal', header: 'Postal Code', width: 72 }]
  const field = (label: string, value: string | undefined, x: number, y: number, w: number, center?: boolean) =>
    <At x={x} y={y} w={w} h={16}><PBInput aria-label={label} className="pb-dem-white" w="100%" align={center ? 'center' : undefined} style={{ height: '100%' }} value={value ?? ''} readOnly /></At>
  return <DemographicModal title="Change Address Wizard" width={WIZARD.w} height={WIZARD.face + CHROME_H} onClose={onClose} dialog="change-address-wizard">
    <style>{DEM_CSS}</style>
    <div className="pb-dem-face">
      <Panel title="Current Patient Data" x={13} y={13} w={873} h={167}>
        <Group title="Patient" x={12} y={13} w={383} h={119} />
        <Text x={22} cy={34}>Chart No.:</Text>{field('Wizard chart', patient.chart, 114, 27, 84, true)}
        <Text x={22} cy={54}>Patient Name:</Text>
        {field('Wizard last name', patient.last, 114, 47, 125)}{field('Wizard first name', patient.first, 241, 47, 93)}{field('Wizard middle name', patient.middle, 337, 47, 43)}
        <Group title="Current Address" x={412} y={13} w={383} h={119} />
        <Text x={422} cy={34}>Address:</Text>{field('Wizard address', patient.address, 514, 27, 267)}
        <Text x={422} cy={54}>Address:</Text>{field('Wizard address 2', patient.address2, 514, 47, 267)}
        <Text x={422} cy={74}>City:</Text>{field('Wizard city', patient.city, 514, 67, 127)}
        <Text end={698} cy={74}>Province:</Text>{field('Wizard province', patient.province, 702, 67, 78)}
        <Text x={422} cy={94}>Postal Code:</Text>{field('Wizard postal code', patient.postal, 514, 87, 91, true)}
        <Text end={698} cy={94}>Country:</Text>{field('Wizard country', patient.country, 702, 87, 78)}
        <Text x={422} cy={115}>Home:</Text>{field('Wizard home', phoneMask(patient.home), 514, 107, 91, true)}
      </Panel>
      <Panel title="Family Members / Other (pre-loaded from the patient's Family Hx list)" x={13} y={187} w={873} h={322}>
        <PBDataWindow style={{ flex: 1, background: 'white' }} rules="white" rowFill={p => selected.includes(p.chart) ? '#9de89c' : undefined}
          rowClassName={p => selected.includes(p.chart) ? 'pb-dem-ticked' : undefined}
          rows={members.map(p => ({ ...p, ...patientEdits(p.chart) }))} columns={[
            { key: 'update', header: 'Update', width: 50, render: (p: Patient) => <span style={{ display: 'flex', justifyContent: 'center' }}><PBCheckbox checked={selected.includes(p.chart)}
              onChange={() => setUnticked(v => v.includes(p.chart) ? v.filter(c => c !== p.chart) : [...v, p.chart])} /></span> }, ...columns,
          ]} current={current} onCurrentChange={setCurrent} empty={false} />
      </Panel>
      <Btn x={12} y={518} w={134} command="find-add-patient-to-list" onClick={() => setAdding(true)}>Find / Add Patient to List</Btn>
      <Btn x={368} y={518} w={75} command="wizard-update" disabled={!selected.length} onClick={() => {
        for (const chart of selected) updatePatient(chart, { address: patient.address, address2: patient.address2, city: patient.city, province: patient.province, country: patient.country, postal: patient.postal, home: patient.home })
        onClose()
      }}>Update</Btn>
      <Btn x={451} y={518} w={75} command="wizard-cancel" onClick={onClose}>Cancel</Btn>
    </div>
    {adding && <DesktopLayer>
      <AdvancedLookupDialog chart={patient.chart} zIndex={95}
        roster={roster.filter(p => p.chart !== patient.chart && !members.some(m => m.chart === p.chart))}
        onPick={chart => {
          const p = roster.find(r => r.chart === chart)
          if (p) { setAdded(v => [...v, p]); setUnticked(v => v.filter(c => c !== p.chart)) }
          setAdding(false)
        }}
        onClose={() => setAdding(false)} />
    </DesktopLayer>}
  </DemographicModal>
}

/* Connection — Drive Mois 2026-09-22 8.17.06 (current build): the
   Connection Details panel over Continue / Cancel. Name carries a "…"
   button; Name, Address, Phone and Fax are disabled (white, grey ink, the
   phone and fax centred) and only Comment takes typing. The capture shows
   the chart's pharmacy connection (the Patient Summary's Pharmacy row,
   8.04.20), and Demographics behind it.

   INFERRED: it is what Pharmacy Information's `Change...` opens — the only
   pharmacy control on Demographics — and its "…" hands over to the
   pharmacy list (`lookup`, Demographics' own Select Pharmacy). Cancel puts
   back the pharmacy the window opened on. The Comment is not kept: the
   chart's pharmacy record has no comment field. */
export function ConnectionDialog({ onClose, lookup }: {
  onClose: () => void
  /** the list the "…" opens, drawn over this window; `close` returns here */
  lookup?: (close: () => void) => ReactNode
}) {
  const patient = usePatient()
  const pharmacy = patient.pharmacy ?? {}
  const [initial] = useState(() => patient.pharmacy)
  const [comment, setComment] = useState('')
  const [picking, setPicking] = useState(false)
  const value = (label: string, v: string | undefined, y: number, w: number, center?: boolean) =>
    <At x={72} y={y} w={w} h={17}><PBInput aria-label={label} title={v} className="pb-dem-dis" w="100%" align={center ? 'center' : undefined} style={{ height: '100%' }} value={v ?? ''} disabled readOnly /></At>
  return <DemographicModal title="Connection" width={405} height={300 + CHROME_H} onClose={onClose} dialog="connection">
    <style>{DEM_CSS}</style>
    <div className="pb-dem-face">
      <Panel title="Connection Details" x={8} y={15} w={382} h={237}>
        <Text end={68} cy={21}>Name:</Text>
        <At x={72} y={12} w={296} h={17}>
          <span className="pb-inputgroup" style={{ width: '100%' }}>
            <PBInput aria-label="Connection name" title={pharmacy.name} className="pb-dem-dis" style={{ height: '100%' }} value={pharmacy.name ?? ''} disabled readOnly />
            <PBButton bare command="connection-name-lookup" className="pb-inputgroup__btn pb-inputgroup__btn--dots" title="Look up…"
              disabled={!lookup} onClick={() => setPicking(true)}>…</PBButton>
          </span>
        </At>
        <Text end={68} cy={42}>Address:</Text>{value('Connection address', pharmacy.address, 33, 296)}
        <Text end={68} cy={64}>Phone:</Text>{value('Connection phone', pharmacy.phone, 55, 97, true)}
        <Text end={68} cy={86}>Fax:</Text>{value('Connection fax', pharmacy.fax, 77, 97, true)}
        <Text end={68} cy={107}>Comment:</Text>
        <At x={72} y={100} w={296} h={109}><PBTextArea aria-label="Connection comment" style={{ width: '100%', height: '100%' }} value={comment} onChange={e => setComment(e.target.value)} /></At>
      </Panel>
      <Btn x={102} y={266} w={77} command="connection-continue" onClick={onClose}>Continue</Btn>
      <Btn x={198} y={266} w={76} command="connection-cancel" onClick={() => { updatePatient(patient.chart, { pharmacy: initial ?? {} }); onClose() }}>Cancel</Btn>
    </div>
    {picking && lookup?.(() => setPicking(false))}
  </DemographicModal>
}
