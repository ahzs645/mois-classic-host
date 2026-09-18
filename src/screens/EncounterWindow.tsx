import { useState } from 'react'
import {
  PBBand, PBButton, PBCaption, PBCheckbox, PBDataWindow, PBInput, PBLookup,
  PBMenuBar, PBPatientBannerYellow, PBSelect, PBTabs, PBTextArea, PBWindow, IconIdCard,
} from '../pb'
import { measurementRows, patient } from '../data/mois'

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

export function EncounterWindow({
  encounter, onClose, onAttachment,
}: {
  encounter?: EncounterRecord
  onClose: () => void
  onAttachment: () => void
}) {
  const [tab, setTab] = useState('Progress Note(s)')
  const enc = encounter ?? { id: patient.encounter }
  const time = enc.hr && enc.mn ? `${enc.hr} : ${enc.mn}` : '14 : 00'

  return (
    <PBWindow
      child
      icon={<IconIdCard />}
      title={`${patient.short} 39 YEAR OLD ${patient.sex}`}
      sub={<>chart no.: {patient.chart} -&nbsp;&nbsp;&nbsp;encounter no.: {enc.id}</>}
      onClose={onClose}
      style={{ width: 'min(822px, calc(100vw - 40px))', height: 'min(742px, calc(100vh - 90px))' }}
    >
      <PBMenuBar items={MENU} />

      <PBPatientBannerYellow
        name={patient.short}
        bchn={patient.bchn}
        home="250.765.3212"
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
            <PBInput key={enc.id + 'd'} w={68} align="center" defaultValue={enc.date ?? '2026.08.10'} />
            <PBInput key={enc.id + 't'} w={46} align="center" defaultValue={time} />
            <span style={{ marginLeft: 6 }}>Slots:</span>
            <PBInput w={26} align="center" defaultValue="4" />
          </div>

          <span className="pb-form__label">Provider:</span>
          <PBInput defaultValue="FAKERRY, FAKER" />

          <span className="pb-form__label">Ser. Loc.:</span>
          <PBSelect
            key={enc.id + 'l'}
            options={['ACROPOLIS MANOR', 'DAW HEALTH UNIT', 'URGENT CARE']}
            defaultValue={enc.loc || 'ACROPOLIS MANOR'}
          />

          <span className="pb-form__label">Visit Code:</span>
          <PBInput w={68} defaultValue="R" readOnly />

          <span className="pb-form__label">Visit Reason:</span>
          <PBInput key={enc.id + 'r'} defaultValue={enc.reason || 'TEST 3'} />

          <span className="pb-form__label">Appt Status:</span>
          <PBSelect options={['', 'Arrived', 'Seen', 'Discharged']} w={62} />

          <span className="pb-form__label">Attending:</span>
          <PBLookup />
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
          {[0, 1, 2, 3].map((i) => (
            <div className="pb-row" key={i} style={{ marginBottom: 3, gap: 4 }}>
              <PBLookup w={100} /><PBLookup w={76} /><PBInput w={32} align="center" defaultValue="-" />
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
          {tab === 'Progress Note(s)' && <ProgressNotePage />}
          {tab === 'Measurements' && <MeasurementsPage />}
          {tab === 'Service(s)' && <ServicesPage onNew={onAttachment} />}
          {tab === 'Detail / Coding' && <CodingPage />}
          {(tab === 'Encounter Summary' || tab === 'Encounter Forms') && (
            <div className="pb-dw__empty" style={{ padding: 24 }}>{tab} — no content retrieved.</div>
          )}
        </PBTabs>
      </div>
    </PBWindow>
  )
}

function ProgressNotePage() {
  return (
    <>
      <PBBand right={<><PBButton size="sm">Print Note</PBButton><PBButton size="sm">New Note</PBButton><PBButton size="sm">Delete Note</PBButton></>}>
        New Note
      </PBBand>
      <div className="pb-row" style={{ padding: '3px 6px' }}>
        <span>Author:</span>
        <PBSelect options={['', 'JALIL, AHMAD', 'FAKERRY, FAKER']} w={158} />
        <span style={{ width: 8 }} />
        <PBCheckbox label="Complete" />
        <span style={{ width: 8 }} />
        <span>Created By:</span>
        <span className="pb-row__spacer" />
        <PBButton size="sm" style={{ minWidth: 20 }}>&lsaquo;</PBButton>
        <span style={{ width: 46, textAlign: 'center' }}>* of 0</span>
        <PBButton size="sm" style={{ minWidth: 20 }}>&rsaquo;</PBButton>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, padding: '0 6px 4px', display: 'flex' }}>
        <PBTextArea style={{ flex: '1 1 auto', height: '100%' }} />
      </div>
      <div className="pb-row" style={{ padding: '2px 6px 4px', borderTop: '1px solid #d6d6d6', gap: 0 }}>
        <span>Created:&nbsp;&nbsp;&nbsp;2026.08.12&nbsp; 07:39&nbsp;&nbsp; JALIL, AHMAD</span>
        <span style={{ width: 90 }} />
        <span>Last Modified:</span>
      </div>
    </>
  )
}

function MeasurementsPage() {
  return (
    <>
      <div className="pb-cmdrow" style={{ padding: 2 }}>
        <button className="pb-cmdrow__btn">New Record</button>
        <button className="pb-cmdrow__btn">Delete Record</button>
        <button className="pb-cmdrow__btn">Graph</button>
        <button className="pb-cmdrow__btn">Calculator</button>
        <button className="pb-cmdrow__btn">Template</button>
        <button className="pb-cmdrow__btn" style={{ minWidth: 98 }}>Other Template</button>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          rows={measurementRows}
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
    </>
  )
}

function ServicesPage({ onNew }: { onNew: () => void }) {
  return (
    <>
      <div className="pb-cmdrow" style={{ padding: 2 }}>
        <button className="pb-cmdrow__btn" onClick={onNew}>New…</button>
        <button className="pb-cmdrow__btn" onClick={onNew}>Edit…</button>
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
          rows={[
            { start: '2026.08.10', episode: 'PRENATAL CARE', event: 'REMOVAL OF EAR CANAL OSTEOMA', phase: 'One Time', mrp: 'TECHNICAL SUPPORT' },
          ]}
        />
      </div>
    </>
  )
}

/* The real Detail / Coding tab: two columns of encounter attributes, a
   Visit Reason block, then a coding matrix of lookup pairs — Procedure gets
   two code slots, Health Issue and Service get four each. */
function CodingPage() {
  const CODE_SLOTS: [string, number][] = [
    ['Procedure:', 2],
    ['Health Issue:', 4],
    ['Service:', 4],
  ]
  return (
    <div style={{ padding: '6px 8px' }}>
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '84px 1fr', width: 264, flex: 'none' }}>
          <span className="pb-form__label">Resource:</span><PBInput w={176} defaultValue="VC1NHA" />
          <span className="pb-form__label">Room:</span><PBInput w={68} />
          <span className="pb-form__label">Docu. Status:</span>
          <div className="pb-row"><PBInput w={22} align="center" defaultValue="I" /><span>(C = Complete)</span></div>
          <span className="pb-form__label">Billing Status:</span>
          <div className="pb-row"><PBInput w={22} align="center" defaultValue="I" /><span>(B = Billed)</span></div>
          <span className="pb-form__label">Payor:</span><PBSelect options={['', 'MSP', 'ICBC', 'WCB']} w={84} />
        </div>

        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '106px 1fr', flex: '1 1 auto', minWidth: 0 }}>
          <span className="pb-form__label pb-form__label--right">Appt Status:</span>
          <PBSelect options={['', 'Arrived', 'Seen', 'Discharged']} w={62} />
          <span className="pb-form__label pb-form__label--right">Service Location:</span>
          <PBSelect options={['ACROPOLIS MANOR', 'DAW HEALTH UNIT']} w={170} />
          <span className="pb-form__label pb-form__label--right">Visit Mode:</span>
          <PBSelect options={['DIRECT ENCOUNTER WITH CLIENT ALONE', 'TELEPHONE', 'VIDEO']} w={358} />
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
        <PBInput w={330} defaultValue="TEST 3" style={{ alignSelf: 'flex-start' }} />
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
