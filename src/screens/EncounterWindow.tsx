import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useChartExport, useChartRecords } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { stamp } from '../data/charts/detail'
import { date, serviceEpisodes } from '../data/charts/relations'
import { visitCodeRows } from '../data/daybook'
import {
  selectFormRows,
  type EncounterFormRow, type FormListRow
} from '../data/encounterForms'
import {
  apptStatusCodes, providerSearchRows,
  serviceLocations,
  type ProviderSearchRow, type ServiceEpisodeRow
} from '../data/encounterPickers'
import { type MeasureTemplate } from '../data/measures'
import { usePatient } from '../data/patient-context'
import type { HostShellProps } from '../host/types'
import {
  IconIdCard,
  PBBand, PBButton, PBCaption, PBCheckbox, PBDataWindow, PBDropDownDataWindow,
  PBInput, PBLookup, PBMenuBar, PBPatientBannerBlue, PBPatientBannerYellow, PBSelect,
  PBTabs, PBTextArea, PBWindow,
  pbSlug,
} from '../pb'
import { ServiceCodeLookupDialog, UniversalSearchDialog } from './CodeLookupDialogs'
import {
  MeasureCalculatorDialog, MeasureCalculatorsDialog, MeasureTemplateGridDialog,
  MeasureTemplateSelectionDialog, MeasurementDetailDialog, defaultMeasureTemplate,
  type MeasurementRow,
} from './MeasureDialogs'

const MENU = [
  { label: 'Save', menu: [{ label: 'Save Encounter', key: 'Ctrl+S' }, { label: 'Save and Close' }] },
  { label: 'Chart Views', menu: [{ label: 'Patient Summary' }, { label: 'Health Issues' }, { label: 'Prescriptions' }, { label: 'Documents' }] },
  { label: 'Action', menu: [{ label: 'New Service Event…' }, { label: 'Link Health Issue…' }, { sep: true }, { label: 'Mark for Review' }] },
  { label: 'Print', menu: [{ label: 'Print Encounter' }, { label: 'Print Note' }] },
  { label: 'Utilities', menu: [{ label: 'Spell Check' }, { label: 'Templates…' }] },
  { label: 'Close', menu: [{ label: 'Close Encounter' }] },
]

const TABS = ['Progress Note(s)', 'Measurements', 'Service(s)', 'Detail / Coding', 'Encounter Summary', 'Encounter Forms']

/* A window class in the PowerBuilder sense: one instance per encounter, so
   several can be open at once and each carries its own record. */
export type EncounterRecord = {
  id: string
  date?: string
  hr?: string
  mn?: string
  reason?: string
  loc?: string
}

export function EncounterWindow({ encounter, onClose, loadEncounterForms, encounterFormSlot }: {
  encounter?: EncounterRecord
  onClose: () => void
  encounterFormSlot?: HostShellProps['encounterFormSlot']
  loadEncounterForms?: () => Promise<FormListRow[]>
}) {
  const patient = usePatient()
  const [tab, setTab] = useState('Progress Note(s)')
  const enc: EncounterRecord = encounter ?? { id: patient.encounter ?? 'NO ENCOUNTER' }
  const record = useChartRecords('encounter').find(r => r.id_encounter === enc.id)
  const time = enc.hr && enc.mn ? `${enc.hr} : ${enc.mn}` : ''

  /* the four coded-link rows and the attending provider, each of which is
     filled either by typing or by the picker its "…" opens */
  const [issues, setIssues] = useState([1, 2, 3, 4].map(i => record?.[`str_diag_code_${i}`] ?? ''))
  const [services, setServices] = useState([1, 2, 3, 4].map(i => record?.[`str_fee_code_${i}`] ?? ''))
  const [attending, setAttending] = useState(record?.str_attending ?? '')
  const [picking, setPicking] = useState<
    { kind: 'issue' | 'service'; row: number } | { kind: 'attending' } | null
  >(null)

  return (
    <PBWindow
      /* the MDI child a lesson rings when it is talking about the open
         encounter rather than the chart behind it */
      tutorialId="host.mois.window.encounter"
      child
      icon={<IconIdCard />}
      title={`${patient.short} ${patient.age} ${patient.sex}`}
      sub={<>chart no.: {patient.chart} -&nbsp;&nbsp;&nbsp;encounter no.: {enc.id}</>}
      onClose={onClose}
      style={{ width: 940, height: 870, maxWidth: '100%', maxHeight: '100%' }}
    >
      <PBMenuBar items={MENU} />

      <PBPatientBannerYellow
        name={patient.short}
        bchn={patient.bchn ?? ''}
        home={patient.phone}
        dob={patient.dob}
        sex={patient.sex}
      />

      {/* ---- the dense encounter header form ------------------------------
          Four visual columns: identity, times, coded links, general note. */}
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '4px 6px 6px', gap: 0, flex: 'none' }}>
        {/* column 1 — identity */}
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: 'auto 1fr', width: 250, flex: 'none' }}>
          <span className="pb-form__label">Date:</span>
          <div className="pb-row">
            <PBInput key={enc.id + 'd'} w={68} align="center" defaultValue={enc.date ?? ''} />
            <PBInput key={enc.id + 't'} w={46} align="center" defaultValue={time} />
            <span style={{ marginLeft: 6 }}>Slots:</span>
            <PBInput w={26} align="center" defaultValue={record?.num_time_slots ?? ''} />
          </div>

          <span className="pb-form__label">Provider:</span>
          <PBInput defaultValue={record?.lkp_provider ?? ''} />

          <span className="pb-form__label">Ser. Loc.:</span>
          <PBDropDownDataWindow
            key={enc.id + 'l'}
            columns={[{ key: 'name', header: 'Service Location' }]}
            rows={serviceLocations}
            value={enc.loc || ''}
            listW={330}
            tutorialId="host.mois.lookup.service-location"
          />

          <span className="pb-form__label">Visit Code:</span>
          <PBDropDownDataWindow
            columns={[
              { key: 'code', header: 'Code', width: 58 },
              { key: 'description', header: 'Description', width: 264 },
              { key: 'mode', header: 'Visit Mode', width: 126 },
              {
                key: 'slots',
                header: '#',
                width: 46,
                /* the slot count is painted in the code's own colour — the
                   same fill the day book books an appointment of it in */
                render: (r) => (
                  <span
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      background: r.slots === '' ? undefined : (r.fill ?? '#ffffff'),
                    }}
                  >
                    {r.slots}
                  </span>
                ),
              },
              { key: 'mhk', header: 'MHK', width: 44 },
            ]}
            rows={visitCodeRows}
            value={record?.str_visit_code ?? ''}
            display="code"
            w={68}
            listW={538}
            tutorialId="host.mois.lookup.visit-code"
          />

          <span className="pb-form__label">Visit Reason:</span>
          <PBInput key={enc.id + 'r'} defaultValue={enc.reason ?? ''} />

          <span className="pb-form__label">Appt Status:</span>
          <PBDropDownDataWindow
            columns={[
              { key: 'code', header: 'Code', width: 52 },
              { key: 'description', header: 'Description', width: 160 },
            ]}
            rows={apptStatusCodes}
            value={record?.str_appt_status ?? ''}
            display="code"
            w={62}
            listW={214}
            tutorialId="host.mois.lookup.appt-status"
          />

          <span className="pb-form__label">Attending:</span>
          <PBLookup
            name="attending"
            value={attending}
            onChange={setAttending}
            onDots={() => setPicking({ kind: 'attending' })}
          />
        </div>

        {/* column 2 — times */}
        <div style={{ width: 160, flex: 'none', paddingLeft: 8 }}>
          <div style={{ textAlign: 'center', marginBottom: 2 }}><PBCaption>Times</PBCaption></div>
          {['Arrived:', 'In-Room:', 'Seen:', 'Discharge:'].map((l) => (
            <div className="pb-row" key={l} style={{ marginBottom: 3, justifyContent: 'flex-end' }}>
              <span style={{ width: 56, textAlign: 'right' }}>{l}</span>
              <PBInput w={46} /><PBInput w={30} align="center" defaultValue=":" />
            </div>
          ))}
          <div className="pb-row" style={{ justifyContent: 'flex-end' }}>
            <span>Duration of Care:</span><PBInput w={46} />
          </div>
        </div>

        {/* column 3 — coded links */}
        <div style={{ flex: 'none', paddingLeft: 8 }}>
          <div className="pb-row" style={{ marginBottom: 2, gap: 4 }}>
            <span style={{ width: 100, textAlign: 'center' }}><PBCaption>Health Issues</PBCaption></span>
            <span style={{ width: 76, textAlign: 'center' }}><PBCaption>Services</PBCaption></span>
            <span style={{ width: 32, textAlign: 'center' }}><PBCaption>Nbr. of</PBCaption></span>
          </div>
          {/* each pair is a lookup: Health Issues opens the Universal Search
              Window, Services the Master Service Code List */}
          {[0, 1, 2, 3].map((i) => (
            <div className="pb-row" key={i} style={{ marginBottom: 3, gap: 4 }}>
              <PBLookup
                w={100}
                name={`health-issue-${i + 1}`}
                value={issues[i] ?? ''}
                onChange={(v) => setIssues((r) => r.map((x, j) => (j === i ? v : x)))}
                onDots={() => setPicking({ kind: 'issue', row: i })}
              />
              <PBLookup
                w={76}
                name={`service-${i + 1}`}
                value={services[i] ?? ''}
                onChange={(v) => setServices((r) => r.map((x, j) => (j === i ? v : x)))}
                onDots={() => setPicking({ kind: 'service', row: i })}
              />
              <PBInput w={32} align="center" defaultValue="-" />
            </div>
          ))}
        </div>

        {/* column 4 — general note */}
        <div style={{ flex: '1 1 auto', minWidth: 0, paddingLeft: 8 }}>
          <div style={{ marginBottom: 2 }}><PBCaption>General Note</PBCaption></div>
          <PBTextArea rows={5} w="100%" />
        </div>
      </div>

      {/* ---- tabbed detail ---- */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px 3px' }}>
        <PBTabs tabs={TABS} active={tab} onChange={setTab}>
          {tab === 'Progress Note(s)' && <ProgressNotePage encounter={enc.id} />}
          {tab === 'Measurements' && <MeasurementsPage encounter={enc.id} />}
          {tab === 'Service(s)' && <ServicesPage encounter={enc.id} />}
          {tab === 'Detail / Coding' && <CodingPage record={record} />}
          {tab === 'Encounter Summary' && <EncounterSummaryPage encounter={enc.id} />}
          <div style={{ display: tab === 'Encounter Forms' ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
            <EncounterFormsPage encounterId={enc.id} loadEncounterForms={loadEncounterForms} encounterFormSlot={encounterFormSlot} />
          </div>
        </PBTabs>
      </div>

      {picking?.kind === 'issue' && (
        <UniversalSearchDialog
          onPick={(r) => {
            setIssues((rows) => rows.map((x, j) => (j === picking.row ? r.term : x)))
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
      {picking?.kind === 'service' && (
        <ServiceCodeLookupDialog
          onPick={(r) => {
            setServices((rows) => rows.map((x, j) => (j === picking.row ? r.code : x)))
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
      {picking?.kind === 'attending' && (
        <ProviderSearchDialog
          onPick={(r) => { setAttending(r.name); setPicking(null) }}
          onClose={() => setPicking(null)}
        />
      )}
    </PBWindow>
  )
}

/* ============================================================================
   Encounter Forms — the forms filed against this encounter.

   `New Form` opens the Select Form picker; picking one and pressing
   `Create Form` files it here. MOIS lists a completed web form under the
   ASSESSMENT type rather than the ATTACHMENT type it is registered as.
   ========================================================================= */
function EncounterFormsPage({ encounterId, loadEncounterForms, encounterFormSlot }: {
  encounterId: string
  loadEncounterForms?: () => Promise<FormListRow[]>
  encounterFormSlot?: HostShellProps['encounterFormSlot']
}) {
  const forms = useChartRecords('form_header').filter(r => r.id_encounter === encounterId)
  const [rows, setRows] = useState<EncounterFormRow[]>(() => forms.map(r => ({ type: r.id_form_type ?? '', name: r.str_form_window ?? '', attending: r.id_author ?? '', formId: r.id_form_header })))
  const [opened, setOpened] = useState<EncounterFormRow | null>(null)
  const formData = useRef<Record<string, Record<string, unknown>>>({})
  const [cur, setCur] = useState(0)
  const [picking, setPicking] = useState(false)
  return (
    <>
      <div className="pb-cmdrow" style={{ padding: 2 }}>
        <button
          className="pb-cmdrow__btn"
          data-tutorial-id="host.mois.command.new-form"
          onClick={() => setPicking(true)}
        >
          New Form
        </button>
        <button
          className="pb-cmdrow__btn"
          data-tutorial-id="host.mois.command.delete-form"
          onClick={() => setRows((r) => r.filter((_, i) => i !== cur))}
        >
          Delete Form
        </button>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          columns={[
            { key: 'type', header: 'Form Type', width: 268, headAlign: 'center' },
            { key: 'name', header: 'Form Name', width: 302, headAlign: 'center' },
            { key: 'attending', header: 'Attending', width: 222, headAlign: 'center' },
          ]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(row) => { if (row.presetKey) setOpened(row) }}
          rowTutorialId={(r) => `host.mois.row.form-${pbSlug(String(r.name))}`}
          empty=""
        />
      </div>
      {opened?.presetKey && opened.formId && encounterFormSlot && (
        <EncounterWebformWindow onClose={() => setOpened(null)}>
          {encounterFormSlot({
            presetKey: opened.presetKey, encounterId, formId: opened.formId,
            initialData: formData.current[opened.formId],
            onFormDataChange: (data) => { formData.current[opened.formId!] = data },
            onClose: () => setOpened(null),
          })}
        </EncounterWebformWindow>
      )}
      {picking && (
        <SelectFormDialog
          loadEncounterForms={loadEncounterForms}
          onCreate={(f) => {
            /* the picker's type is the registration type; the filed row carries
               the clinical type MOIS assigns it */
            const row = { type: 'ASSESSMENT', name: f.name, attending: '', presetKey: f.presetKey, formId: crypto.randomUUID() }
            setRows((r) => [...r, row])
            setCur(rows.length)
            setPicking(false)
            if (row.presetKey) setOpened(row)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  )
}

/** The `Select Form` picker: a filterable list of every registered form. */
/** MOIS hosts the modern webform renderer in a separate File / View window. */
function EncounterWebformWindow({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const [maximized, setMaximized] = useState(false)
  const toggleMaximized = () => setMaximized((value) => !value)
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: maximized ? 0 : 8, zIndex: 91 }}>
      <PBWindow title="MOIS" child onClose={onClose} onMinimize={onClose}
        tutorialId="host.mois.window.webform"
        maximized={maximized} onMaximize={toggleMaximized}
        style={{ width: maximized ? '100%' : 'min(1020px, 100%)', height: maximized ? '100%' : 'min(830px, 100%)' }}>
        <PBMenuBar items={[
          { label: 'File', menu: [{ label: 'Close', onSelect: onClose }] },
          { label: 'View', menu: [{ label: maximized ? 'Restore Down' : 'Maximize', onSelect: toggleMaximized }] },
        ]} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          {children}
        </div>
      </PBWindow>
    </div>
  )
}

function SelectFormDialog({ onCreate, onClose, loadEncounterForms }: {
  onCreate: (form: FormListRow) => void
  onClose: () => void
  loadEncounterForms?: () => Promise<FormListRow[]>
}) {
  const [cur, setCur] = useState(0)
  const [type, setType] = useState('')
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [forms, setForms] = useState(loadEncounterForms ? [] : selectFormRows)
  const [loading, setLoading] = useState(Boolean(loadEncounterForms))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!loadEncounterForms) return
    let active = true
    loadEncounterForms().then((rows) => {
      if (active) { setForms(rows); setLoading(false); setCur(0) }
    }).catch(() => {
      if (active) { setError('Could not load the MOIS forms. Close this window and try again.'); setLoading(false) }
    })
    return () => { active = false }
  }, [loadEncounterForms])
  const shown = forms.filter((f) =>
    f.type.toLowerCase().includes(type.toLowerCase())
    && f.name.toLowerCase().includes(name.toLowerCase())
    && f.version.toLowerCase().includes(version.toLowerCase()))
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 90 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.select-form"
        className="pb-select-form"
        title="Select Form"
        onClose={onClose}
        style={{ width: 'min(735px, 100%)', height: 'min(698px, 100%)' }}
      >
        <div className="pb-select-form__list">
          <PBBand>Form List</PBBand>
          {error && <div role="alert" style={{ padding: 8 }}>{error}</div>}
          <PBDataWindow
            flush
            columns={[
              { key: 'type', header: 'Form Type', width: 252, headAlign: 'center' },
              { key: 'name', header: 'Form Name', headAlign: 'center' },
              { key: 'version', header: 'Version', width: 48, headAlign: 'center' },
            ]}
            filters={[
              <PBInput key="type" value={type} onChange={(e) => { setType(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.form-type" />,
              <PBInput key="name" value={name} onChange={(e) => { setName(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.form-name" />,
              <PBInput key="version" value={version} onChange={(e) => { setVersion(e.target.value); setCur(0) }} />,
            ]}
            rows={shown}
            empty={loading ? 'Loading MOIS forms…' : 'No matching forms'}
            current={cur}
            onCurrentChange={setCur}
            rowTutorialId={(r) => `host.mois.row.select-form-${pbSlug(String(r.name))}`}
          />
        </div>
        <div className="pb-row pb-select-form__actions">
          <PBButton
            style={{ minWidth: 108 }}
            data-tutorial-id="host.mois.command.create-form"
            disabled={loading || !shown[cur]}
            onClick={() => shown[cur] && onCreate(shown[cur]!)}
          >
            Create Form
          </PBButton>
          <PBButton style={{ minWidth: 108 }} onClick={onClose}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

/* ============================================================================
   Encounter Summary — everything filed against this encounter, grouped.

   MOIS paints a band per group carrying its own count, and each record row
   ends in two glyphs: a blue curved arrow that opens the record and a red
   check clipboard for its acknowledgement state.
   ========================================================================= */
function EncounterSummaryPage({ encounter }: { encounter: string }) {
  const data = useChartExport()
  const rows = [
    ...(data?.encounter_note ?? []).filter(r => r.id_encounter === encounter).map(r => ({ group: 'PROGRESS NOTES', date: date(r.dtm_note_create), description: r.str_author ?? '', detail: r.str_note ?? '' })),
    ...(data?.measure ?? []).filter(r => r.id_encounter === encounter).map(r => ({ group: 'MEASUREMENTS', date: date(r.dtm_collect_date), description: r.str_description ?? '', detail: [r.str_value, r.str_units].filter(Boolean).join(' ') })),
    ...(data?.form_header ?? []).filter(r => r.id_encounter === encounter).map(r => ({ group: 'ENCOUNTER FORMS', date: date(r.dtm_created), description: r.str_form_window ?? '', detail: '' })),
  ]
  const groups = [...new Set(rows.map(r => r.group))]
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(['WEB FORMS']))
  return (
    <>
      <div className="pb-row" style={{ gap: 16, padding: '4px 8px' }}>
        <button className="pb-link" onClick={() => setCollapsed(new Set())}>Expand All</button>
        <button className="pb-link" onClick={() => setCollapsed(new Set(groups))}>
          Collapse All
        </button>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          columns={[
            { key: 'date', header: 'Date', width: 150 },
            { key: 'description', header: 'Description', width: 700 },
            { key: 'detail', header: 'Detail', width: 600 },
            {
              key: 'link',
              header: 'Hyperlink',
              width: 160,
              align: 'center',
              /* the two glyphs MOIS ends each record row with: a blue curved
                 arrow that opens it, and a red check for its acknowledgement */
              render: () => null,
            },
          ]}
          rows={rows}
          groupBy={(r) => r.group}
          /* both bands are painted even when a group has no rows to show */
          groups={groups}
          groupLabel={(g, rs) => <strong>{`${g}   [${rs.length}]`}</strong>}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          empty=""
        />
      </div>
    </>
  )
}

function ProgressNotePage({ encounter }: { encounter: string }) {
  const notes = useChartRecords('encounter_note', 'dtm_note_create').filter(r => r.id_encounter === encounter)
  const [index, setIndex] = useState(0)
  const note = notes[index]
  return (
    <>
      <PBBand right={<><PBButton size="sm">Print Note</PBButton><PBButton size="sm">New Note</PBButton><PBButton size="sm">Delete Note</PBButton></>}>
        New Note
      </PBBand>
      <div className="pb-row" style={{ padding: '3px 6px' }}>
        <span>Author:</span>
        <PBInput value={note?.str_author ?? ''} readOnly w={158} />
        <span style={{ width: 8 }} />
        <PBCheckbox label="Complete" checked={note?.str_complete === 'Y'} />
        <span style={{ width: 8 }} />
        <span>Created By: {note?.stp_user_create ?? ''}</span>
        <span className="pb-row__spacer" />
        <PBButton size="sm" style={{ minWidth: 20 }} disabled={index === 0} onClick={() => setIndex(i => i - 1)}>&lsaquo;</PBButton>
        <span style={{ width: 46, textAlign: 'center' }}>{notes.length ? index + 1 : 0} of {notes.length}</span>
        <PBButton size="sm" style={{ minWidth: 20 }} disabled={index >= notes.length - 1} onClick={() => setIndex(i => i + 1)}>&rsaquo;</PBButton>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, padding: '0 6px 4px', display: 'flex' }}>
        <PBTextArea value={note?.str_note ?? ''} readOnly style={{ flex: '1 1 auto', height: '100%' }} />
      </div>
      <div className="pb-row" style={{ padding: '2px 6px 4px', borderTop: '1px solid #d6d6d6', gap: 0 }}>
        <span>Created: {stamp(note)}</span>
        <span style={{ width: 90 }} />
        <span>Last Modified:</span>
      </div>
    </>
  )
}

/* ============================================================================
   Measurements — the measures recorded at this encounter.

   Four of the six commands open a window, and all four end by writing rows
   into this grid: `New Record` files one blank row and opens Measurement
   Detail over it, `Template` and `Other Template` file every row of a measure
   template that was given a value, and `Calculator` files the one measure it
   computes. A row that has been filed but not yet saved stays current, which
   is what paints it salmon.
   ========================================================================= */
type MeasurementCommand = 'detail' | 'template' | 'other-template' | 'calculators'

function MeasurementsPage({ encounter }: { encounter: string }) {
  const measures = useChartRecords('measure').filter(r => r.id_encounter === encounter)
  const [rows, setRows] = useState<MeasurementRow[]>(() => measures.map(r => ({ code: r.str_code ?? '', name: r.str_description ?? '', value: r.str_value ?? '', flag: r.str_abnormal ?? '', units: r.str_units ?? '', collected: r.dtm_collect_date, by: r.str_collect_by, report: r.str_report, lower: r.str_normal_lower, upper: r.str_normal_high })))
  const [cur, setCur] = useState(0)
  const [open, setOpen] = useState<MeasurementCommand | null>(null)
  /* Other Template picks a template first, then opens its grid */
  const [template, setTemplate] = useState<MeasureTemplate | null>(null)
  const [calculator, setCalculator] = useState<string | null>(null)
  /* which row Measurement Detail is over: a new blank one, or the current */
  const [editing, setEditing] = useState<number | null>(null)

  const file = (added: MeasurementRow[]) => {
    if (!added.length) return
    setRows((r) => [...r, ...added])
    setCur(rows.length + added.length - 1)
  }

  const newRecord = () => {
    const blank: MeasurementRow = { code: '', name: '', value: '', flag: '', units: '', fresh: true }
    setRows((r) => [...r, blank])
    setCur(rows.length)
    setEditing(rows.length)
    setOpen('detail')
  }

  const command = (label: string, onClick: () => void, width?: number) => (
    <button
      className="pb-cmdrow__btn"
      style={width ? { minWidth: width } : undefined}
      /* namespaced: the chart's own Encounters screen is still behind this
         window and carries a `New Record` of its own */
      data-tutorial-id={`host.mois.command.measure-${pbSlug(label)}`}
      onClick={onClick}
    >
      {label}
    </button>
  )

  return (
    <>
      <div className="pb-cmdrow" style={{ padding: 2 }}>
        {command('New Record', newRecord)}
        {command('Delete Record', () => setRows((r) => r.filter((_, i) => i !== cur)))}
        {command('Graph', () => {})}
        {command('Calculator', () => setOpen('calculators'))}
        {command('Template', () => { setTemplate(null); setOpen('template') })}
        {command('Other Template', () => setOpen('other-template'), 98)}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(_r, i) => { setEditing(i); setOpen('detail') }}
          rowTutorialId={(r) => `host.mois.row.measure-${pbSlug(String(r.code || r.name || 'new'))}`}
          columns={[
            { key: 'code', header: 'Code', width: 62, align: 'center' },
            { key: 'd', header: '', dots: true },
            { key: 'name', header: 'Test Name' },
            { key: 'value', header: 'Value', width: 130, align: 'center' },
            { key: 'flag', header: 'Flag', width: 58, align: 'center' },
            { key: 'units', header: 'Units', width: 72, align: 'center' },
          ]}
        />
      </div>

      {open === 'detail' && editing != null && rows[editing] && (
        <MeasurementDetailDialog
          row={rows[editing]!}
          encounter={encounter}
          onOk={(row) => {
            setRows((r) => r.map((x, i) => (i === editing ? row : x)))
            setOpen(null)
            setEditing(null)
          }}
          onClose={() => { setOpen(null); setEditing(null) }}
        />
      )}
      {open === 'template' && (
        <MeasureTemplateGridDialog
          title={template?.name ?? defaultMeasureTemplate.name}
          /* ENCOUNTER WINDOW is the one template whose measure list was
             captured. Another one opens its grid empty rather than showing
             the encounter measures under someone else's name. */
          slots={!template || template.name === defaultMeasureTemplate.name
            ? defaultMeasureTemplate.slots
            : []}
          onSave={(added) => { file(added); setOpen(null) }}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'other-template' && (
        <MeasureTemplateSelectionDialog
          onOpen={(t) => { setTemplate(t); setOpen('template') }}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'calculators' && !calculator && (
        <MeasureCalculatorsDialog
          onOpen={setCalculator}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'calculators' && calculator && (
        <MeasureCalculatorDialog
          calculator={calculator}
          onSave={(row) => { file([row]); setCalculator(null); setOpen(null) }}
          onClose={() => { setCalculator(null); setOpen(null) }}
        />
      )}
    </>
  )
}

/* ============================================================================
   Service(s) — the service events billed against this encounter.

   `New…` picks the episode the event belongs to first: MOIS will not file a
   service event that is not attached to one of the patient's open episodes.
   ========================================================================= */
function ServicesPage({ encounter }: { encounter: string }) {
  const data = useChartExport()
  const events = (data?.service_event ?? []).filter(r => r.str_object === 'tdt_encounter' && r.id_object === encounter)
  const rows = events.map(r => {
    const service = data?.chart_service.find(s => s.id_chart_service === r.id_chart_service)
    return { start: date(service?.dtm_start), episode: service?.str_service_code_term ?? '', event: r.str_service_code_term ?? '', phase: r.str_service_phase ?? '', mrp: service?.str_service_mrp ?? '' }
  })
  const [picking, setPicking] = useState(false)
  return (
    <>
      <div className="pb-cmdrow" style={{ padding: 2 }}>
        <button
          className="pb-cmdrow__btn"
          data-tutorial-id="host.mois.command.new-service"
          onClick={() => setPicking(true)}
        >
          New…
        </button>
        <button className="pb-cmdrow__btn" onClick={() => setPicking(true)}>Edit…</button>
        <button className="pb-cmdrow__btn">Delete</button>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          columns={[
            { key: 'start', header: 'Start Date', width: 88, align: 'center' },
            { key: 'episode', header: 'Service Episode', width: 150 },
            { key: 'event', header: 'Service Event' },
            { key: 'phase', header: 'Phase', width: 82, align: 'center' },
            { key: 'mrp', header: 'Service MRP', width: 140 },
          ]}
          rows={rows}
        />
      </div>
      {picking && (
        <ServiceEpisodesDialog
          onPick={() => setPicking(false)}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  )
}

/* The episode picker: every episode the patient is enrolled in, a stopped one
   greyed rather than hidden.

   The rows, the banner and the button *count* are from the capture; the four
   action labels are reconstructed, so they are the one part of this dialog
   that is not transcribed. Re-capture the window to confirm them. */
function ServiceEpisodesDialog({ onPick, onClose }: {
  onPick: (row: ServiceEpisodeRow) => void
  onClose: () => void
}) {
  const patient = usePatient()
  const [cur, setCur] = useState(0)
  const serviceEpisodeRows = serviceEpisodes(useChartExport())
  const row = serviceEpisodeRows[cur]
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 95 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.service-episodes"
        title="Patient's Service Episodes"
        onClose={onClose}
        style={{ width: 'min(720px, 100%)', height: 'min(420px, 100%)' }}
      >
        <PBPatientBannerBlue
          top={[{ label: 'Patient', value: patient.short }, { label: 'Chart', value: patient.chart }]}
          bottom={[{ label: 'DoB', value: patient.dob }, { label: 'Sex', value: patient.sex }]}
        />
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 6 }}>
          <PBDataWindow
            columns={[
              { key: 'episode', header: 'Service Episode', width: 300 },
              { key: 'mrp', header: 'Episode MRP', width: 180 },
              { key: 'start', header: 'Start Date', width: 90, align: 'center' },
              { key: 'stop', header: 'Stop Date', width: 90, align: 'center' },
            ]}
            rows={serviceEpisodeRows}
            current={cur}
            onCurrentChange={setCur}
            onActivate={(r) => onPick(r)}
            /* a stopped episode is struck through rather than dropped */
            rowClassName={(r) => (r.stop ? 'pb-dw--struck' : undefined)}
            rowTutorialId={(r) => `host.mois.row.episode-${pbSlug(String(r.episode))}`}
          />
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 8, padding: '4px 0 10px', flex: 'none' }}>
          <PBButton
            style={{ minWidth: 150 }}
            data-tutorial-id="host.mois.command.use-episode"
            onClick={() => row && onPick(row)}
          >
            Use This Episode
          </PBButton>
          <PBButton style={{ minWidth: 150 }}>New Episode…</PBButton>
          <PBButton style={{ minWidth: 150 }}>Edit Episode…</PBButton>
          <PBButton style={{ minWidth: 150 }}>Stop Episode</PBButton>
          <PBButton style={{ minWidth: 100 }} onClick={onClose}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

/* ============================================================================
   MOIS - Search Window — the `Attending` ellipsis.

   Every provider and provider group on file. A group's Members column lists
   the providers it stands for, which is how a lesson can tell the two apart.
   ========================================================================= */
function ProviderSearchDialog({ onPick, onClose }: {
  onPick: (row: ProviderSearchRow) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [cur, setCur] = useState(0)
  const rows = providerSearchRows.filter((r) => (
    r.name.toUpperCase().includes(search.trim().toUpperCase())
  ))
  const row = rows[Math.min(cur, rows.length - 1)]
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 95 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.provider-search"
        title="MOIS - Search Window"
        onClose={onClose}
        style={{ width: 'min(880px, 100%)', height: 'min(600px, 100%)' }}
      >
        <PBBand>Provider List</PBBand>
        <div className="pb-row" style={{ gap: 4, padding: '3px 4px', flex: 'none' }}>
          <span style={{ color: 'var(--pb-link)' }}>Search For:</span>
          <PBLookup w="100%" value={search} onChange={setSearch} name="provider-search" />
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 4px' }}>
          <PBDataWindow
            columns={[
              { key: 'name', header: 'Name', width: 210 },
              { key: 'role', header: 'Role', width: 150 },
              { key: 'type', header: 'Type', width: 96 },
              { key: 'members', header: 'Members' },
              { key: 'status', header: 'Status', width: 56, align: 'center' },
            ]}
            rows={rows}
            current={Math.min(cur, Math.max(0, rows.length - 1))}
            onCurrentChange={setCur}
            onActivate={(r) => onPick(r)}
            rowTutorialId={(r) => `host.mois.row.provider-${pbSlug(String(r.name))}`}
            empty="No provider matches."
          />
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 14, padding: '8px 0 10px', flex: 'none' }}>
          <PBButton
            style={{ minWidth: 108 }}
            disabled={!row}
            data-tutorial-id="host.mois.command.select-provider"
            onClick={() => row && onPick(row)}
          >
            Select
          </PBButton>
          <PBButton style={{ minWidth: 108 }} onClick={onClose}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

function CodingPage({ record }: { record?: MoisRecord }) {
  const CODE_SLOTS: [string, number][] = [
    ['Procedure:', 2],
    ['Health Issue:', 4],
    ['Service:', 4],
  ]
  return (
    <div style={{ padding: '6px 8px' }}>
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '84px 1fr', width: 264, flex: 'none' }}>
          <span className="pb-form__label">Resource:</span><PBInput w={176} defaultValue={record?.str_resource ?? ''} />
          <span className="pb-form__label">Room:</span><PBInput w={68} />
          <span className="pb-form__label">Docu. Status:</span>
          <div className="pb-row"><PBInput w={22} align="center" defaultValue={record?.str_status_docu ?? ''} /><span>(C = Complete)</span></div>
          <span className="pb-form__label">Billing Status:</span>
          <div className="pb-row"><PBInput w={22} align="center" defaultValue={record?.str_status_bill ?? ''} /><span>(B = Billed)</span></div>
          <span className="pb-form__label">Payor:</span><PBSelect options={['', 'MSP', 'ICBC', 'WCB']} w={84} />
        </div>

        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '106px 1fr', flex: '1 1 auto', minWidth: 0 }}>
          <span className="pb-form__label pb-form__label--right">Appt Status:</span>
          <PBSelect options={['', 'Arrived', 'Seen', 'Discharged']} w={62} />
          <span className="pb-form__label pb-form__label--right">Service Location:</span>
          <PBSelect options={['', record?.str_service_location ?? '']} defaultValue={record?.str_service_location ?? ''} w={170} />
          <span className="pb-form__label pb-form__label--right">Visit Mode:</span>
          <PBSelect options={['', record?.str_visit_mode ?? '', 'TELEPHONE', 'VIDEO']} defaultValue={record?.str_visit_mode ?? ''} w={358} />
          <span className="pb-form__label pb-form__label--right">Priority:</span>
          <PBSelect options={['', 'ROUTINE', 'URGENT']} w={170} />
          <span className="pb-form__label pb-form__label--right">Encounter Ref.:</span>
          <PBInput w={200} />
        </div>
      </div>

      <div className="pb-row" style={{ marginTop: 4, alignItems: 'flex-start' }}>
        <span style={{ width: 84 }}>Visit Reason:</span>
        <span className="pb-stack">
          <PBLookup w={80} />
          <PBLookup w={80} />
        </span>
        <PBInput w={330} defaultValue={record?.str_appt_note ?? ''} style={{ alignSelf: 'flex-start' }} />
      </div>

      <div className="pb-hrule" style={{ margin: '6px 0 4px' }} />

      {/* the coding matrix */}
      <div className="pb-row" style={{ gap: 0 }}>
        <span style={{ width: 84 }}><b>Coding:</b></span>
        {['Code 1', 'Code 2', 'Code 3', 'Code 4', 'Code 5'].map((c) => (
          <span key={c} style={{ width: 92, textAlign: 'center' }}><b>{c}</b></span>
        ))}
      </div>
      {CODE_SLOTS.map(([label, n]) => (
        <div className="pb-row" key={label} style={{ gap: 0, marginTop: 3 }}>
          <span style={{ width: 84 }}>{label}</span>
          {Array.from({ length: n }, (_, i) => (
            <span key={i} style={{ width: 92 }}><PBLookup w={88} /></span>
          ))}
        </div>
      ))}

      <div className="pb-row" style={{ marginTop: 6, alignItems: 'flex-start' }}>
        <span style={{ width: 84 }}>General Note:</span>
        <PBTextArea rows={7} w={446} />
      </div>
    </div>
  )
}
