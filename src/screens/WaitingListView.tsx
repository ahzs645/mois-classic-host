import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropDownDataWindow,
  PBInput, PBLookup, PBRadio, PBSelect, PBTabs, PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'
import { daybookProviders, waitListRows, waitListNames } from '../data/mois'

/* Provider Waiting List — transcribed from the tdt_wait_list evidence
   capture, including the DropDownDataWindow on the Wait List field, and
   art. 303841 `d266cb00…` (v02.22.93) for the taskbar (New Appt … Close
   Window) and the five tabs: Contact Information, List Detail, Procedure
   List, Unavailable Date(s), Correspondence Log. */

type Wait = Record<string, string>

/* Widths and row pitch are the DEV v02.31.23 list's, read off the header of
   evidence/MATRIX-R1360-row (Aug 2026, 100 %): a 16 px gutter, then
   36 / 106 / 83 / 47 / 14 / 81 / 33 / 31 / 150 / 159 / 41 — Priority ends at
   the pane's edge — with rows 19 px apart. */
const columns: PBColumn<Wait>[] = [
  { key: 'row', header: 'Row#', width: 36, align: 'center' },
  { key: 'last', header: 'Last Name', width: 106 },
  { key: 'first', header: 'First Name', width: 83 },
  { key: 'chart', header: 'Chart', width: 47, align: 'center' },
  { key: 'd', header: '', width: 14, dots: true },
  { key: 'added', header: 'Date Added', width: 81, align: 'center' },
  { key: 'wt', header: 'W.T.', width: 33, align: 'center' },
  /* not booked paints a small bold ×, not a ballot ✗ (MATRIX-R1366-bk-d) */
  { key: 'bkd', header: "Bk'd", width: 31, align: 'center', render: (r) => (r.bkd === '\u2717' ? <b>×</b> : r.bkd) },
  { key: 'list', header: 'List', width: 150 },
  { key: 'reason', header: 'Reason', width: 159 },
  { key: 'priority', header: 'Priority', width: 41, align: 'center' },
]
const GRID_VARS = { ['--pb-dw-row-h' as string]: '19px', ['--pb-dw-gutter-width' as string]: '15px' } as CSSProperties

/* Six fixed-width tabs, 128 px each and packed left (PBTabs' `tabWidth`):
   v02.31.23 adds Appointment History after Correspondence Log
   (evidence/MATRIX-R1372-patient-name). The page under them is a framed
   panel inset 6 px, as in the Group Visit List. */
const TABS = ['Contact Information', 'List Detail', 'Procedure List', 'Unavailable Date(s)', 'Correspondence Log', 'Appointment History']
const TAB_WIDTH = 128
const TAB_CSS = `
.pb-wl-tabs .pb-tabs, .pb-wl-tabs .pb-tabs__page { min-width: 0; }
.pb-wl-frame { flex: 1 1 auto; min-height: 0; min-width: 0; overflow: hidden; display: flex; flex-direction: column; margin: 6px 6px 0; border: 1px solid #a0a0a0; border-bottom: 0; background: var(--pb-face); }
`

export function WaitingListView({ mode = 'provider' }: { mode?: 'provider' | 'resource' }) {
  const [tab, setTab] = useState('Contact Information')
  const [show, setShow] = useState('waiting')
  const [cur, setCur] = useState(2)

  return (
    <>
      <PBViewHeader title={mode === 'provider' ? 'Provider Waiting List' : 'Resource Waiting List'} />
      {/* every command is live in the DEV capture, Save and Undo included,
          and Create Appointment is the one wide button: 103 px beside nine
          of 76.5 px */}
      <PBCommandRow
        commands={[
          'New Appt', 'Delete Appt', 'Save', 'Undo', 'Refresh', 'Create Appointment',
          'Print Report', 'Print List', 'Open Chart', 'Close Window',
        ].map((label) => ({ label, exactWidth: label === 'Create Appointment' ? 103 : 76.5 }))}
      />

      {/* filter block: a required owner, an optional list, and the record
          scope. DEV (evidence/MATRIX-R1360-row): left-aligned labels 7 px in,
          223 px drop-downs at 68 px, and the two Show radios stacked in one
          column with Hide booked patients beside the second */}
      <div className="pb-form" style={{ gridTemplateColumns: '61px auto auto 1fr', padding: '3px 7px 2px', alignItems: 'center', rowGap: 1 }}>
        <span className="pb-form__label">{mode === 'provider' ? 'Provider:' : 'Resource:'}</span>
        <PBSelect options={daybookProviders.map((p) => p.provider)} w={223} />
        <div className="pb-row">
          <span style={{ width: 56 }}>(required)</span>
          <span style={{ width: 33 }}>Show:</span>
        </div>
        <PBRadio name="wlshow" label="All Records" checked={show === 'all'} onChange={() => setShow('all')} />

        <span className="pb-form__label">Wait List:</span>
        <PBDropDownDataWindow
          w={223}
          columns={[{ key: 'name', header: 'Name', width: 210 }, { key: 'desc', header: 'Description' }]}
          rows={waitListNames}
          display="name"
        />
        <div className="pb-row">
          <span style={{ width: 93 }}>(optional)</span>
        </div>
        <div className="pb-row" style={{ gap: 24 }}>
          <PBRadio
            name="wlshow"
            label="Waiting Records (w/o outcome date)"
            checked={show === 'waiting'}
            onChange={() => setShow('waiting')}
          />
          <PBCheckbox label="Hide booked patients" />
        </div>
      </div>

      <div className="pb-row" style={{ padding: '2px 13px 4px 3px' }}>
        <span>Search For:</span><PBLookup w="100%" />
      </div>

      <div style={{ padding: '0 3px', height: 243, display: 'flex', ...GRID_VARS }}>
        <PBDataWindow columns={columns} rows={waitListRows} current={cur} onCurrentChange={setCur} />
      </div>

      <style href="mois-classic/waiting-list-tabs" precedence="medium">{TAB_CSS}</style>
      <div className="pb-wl-tabs" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 3px' }}>
        <PBTabs
          tabs={TABS}
          active={tab}
          onChange={setTab}
          tabWidth={TAB_WIDTH}
        >
          <div className="pb-wl-frame">
          {tab === 'Contact Information' && <ContactPage row={waitListRows[cur]} />}
          {tab === 'List Detail' && <ListDetailPage />}
          {tab === 'Procedure List' && (
            <>
              <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
                Procedure List
              </PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  flush
                  gutter={false}
                  rows={[]}
                  columns={[
                    { key: 'procedure', header: 'Procedure', width: 240 },
                    { key: 'requested', header: 'Requested', width: 96, align: 'center' },
                    { key: 'priority', header: 'Priority', width: 76, align: 'center' },
                    { key: 'note', header: 'Note' },
                  ]}
                  empty={false}
                />
              </div>
            </>
          )}
          {tab === 'Unavailable Date(s)' && (
            <>
              <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
                Unavailable Date(s)
              </PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  flush
                  gutter={false}
                  rows={[]}
                  columns={[
                    { key: 'from', header: 'From', width: 100, align: 'center' },
                    { key: 'to', header: 'To', width: 100, align: 'center' },
                    { key: 'reason', header: 'Reason' },
                    { key: 'by', header: 'Recorded By', width: 160 },
                  ]}
                  empty={false}
                />
              </div>
            </>
          )}
          {/* every contact made while the patient waits (art. 303841). No
              capture shows the tab open: its grid is modelled. */}
          {tab === 'Correspondence Log' && (
            <>
              <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
                Correspondence Log
              </PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  flush
                  gutter={false}
                  rows={[]}
                  columns={[
                    { key: 'date', header: 'Date', width: 100, align: 'center' },
                    { key: 'type', header: 'Type', width: 110 },
                    { key: 'note', header: 'Note' },
                    { key: 'by', header: 'By', width: 160 },
                  ]}
                  empty={false}
                />
              </div>
            </>
          )}
          {/* Appointment History: the tab is in the v02.31.23 strip, but no
              capture shows it open, so its page is left bare */}
          </div>
        </PBTabs>
      </div>
    </>
  )
}

/* the entry's own detail: which list, why, and how long it has waited */
function ListDetailPage() {
  return (
    <>
      <PBBand>Wait List Entry Detail</PBBand>
      <div style={{ display: 'flex', gap: 0, padding: '5px 8px', alignItems: 'flex-start' }}>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '96px 1fr', width: 420, flex: 'none' }}>
          <span className="pb-form__label pb-form__label--right">Wait List:</span>
          <PBDropDownDataWindow
            w={244}
            columns={[{ key: 'name', header: 'Name', width: 210 }, { key: 'desc', header: 'Description' }]}
            rows={waitListNames}
            display="name"
          />
          <span className="pb-form__label pb-form__label--right">Date Added:</span>
          <PBInput w={104} align="center" defaultValue="2019.01.14" />
          <span className="pb-form__label pb-form__label--right">Wait Time:</span>
          <div className="pb-row"><PBInput w={72} align="center" defaultValue="2767" /><span>days</span></div>
          <span className="pb-form__label pb-form__label--right">Priority:</span>
          <PBSelect options={['', 'ROUTINE', 'URGENT', 'EMERGENT']} w={130} />
          <span className="pb-form__label pb-form__label--right">Booked:</span>
          <PBCheckbox label="Appointment booked" checked />
          <span className="pb-form__label pb-form__label--right">Outcome Date:</span>
          <PBInput w={104} align="center" />
        </div>

        <span className="pb-vrule" />

        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '84px 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>Reason:</span>
          <PBLookup w="100%" />
          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>Note:</span>
          <PBTextArea rows={6} w="100%" />
        </div>
      </div>
    </>
  )
}

/* Contact Information, laid out off evidence/MATRIX-R1372-patient-name (DEV
   v02.31.23, 100 %), in px from the frame's left edge and the band's foot:
   left-aligned labels at 10 with fields at 92 — Patient Name a read-only
   field the face colour with the name in bold — and Sex / Province / Country
   right-aligned onto boxes at 296; Contact Information's labels end at 486
   with fields at 494, Pager and Fax right-aligned onto boxes at 681, and the
   preferred phone's box painted pale yellow (#fefecd). The registered-patient
   note and a 66 px Refresh sit under both blocks. */
const ROWS = [4, 28, 46, 65, 84, 103]
const at = (left: number, top: number, extra?: CSSProperties): CSSProperties => ({ position: 'absolute', left, top, ...extra })
const LABEL_H: CSSProperties = { lineHeight: '19px', whiteSpace: 'nowrap' }
const rightTo = (end: number, top: number): CSSProperties => at(0, top, { ...LABEL_H, width: end, textAlign: 'right' })
const PREFERRED: CSSProperties = { background: '#fefecd' }

function ContactPage({ row }: { row?: Wait }) {
  const name = row && row.last ? `${row.first} ${row.last}` : ''
  const [pref, setPref] = useState('Work')
  const phone = (label: string, top: number, value: string, underline = false): ReactNode => (
    <>
      <span style={{ ...rightTo(486, top), ...(underline ? { textDecoration: 'underline' } : {}) }}>{label}:</span>
      <span style={at(494, top)}><PBInput w={87} defaultValue={value} style={pref === label ? PREFERRED : undefined} /></span>
    </>
  )
  return (
    <>
      <PBBand>Patient Detail / Contact Information</PBBand>
      <div style={{ position: 'relative', height: 160, flex: 'none' }}>
        <span style={at(10, ROWS[0]!, LABEL_H)}>Patient Name:</span>
        <span style={at(92, ROWS[0]!)}><PBInput w={281} value={name} readOnly style={{ background: 'var(--pb-face)', fontWeight: 700 }} /></span>
        <span style={at(10, ROWS[1]!, LABEL_H)}>DoB:</span>
        <span style={at(92, ROWS[1]!)}><PBInput w={87} defaultValue="2021.01.04" /></span>
        <span style={rightTo(291, ROWS[1]!)}>Sex:</span>
        <span style={at(296, ROWS[1]!)}><PBSelect options={['F', 'M', 'X', 'U']} w={77} /></span>
        <span style={at(10, ROWS[2]!, LABEL_H)}>Address:</span>
        <span style={at(92, ROWS[2]!)}><PBInput w={281} defaultValue="1234 street" /></span>
        <span style={at(10, ROWS[3]!, LABEL_H)}>Address:</span>
        <span style={at(92, ROWS[3]!)}><PBInput w={281} /></span>
        <span style={at(10, ROWS[4]!, LABEL_H)}>City:</span>
        <span style={at(92, ROWS[4]!)}><PBInput w={125} defaultValue="PRINCE GEORGE" /></span>
        <span style={rightTo(291, ROWS[4]!)}>Province:</span>
        <span style={at(296, ROWS[4]!)}><PBInput w={77} defaultValue="BC" /></span>
        <span style={at(10, ROWS[5]!, LABEL_H)}>Postal Code:</span>
        <span style={at(92, ROWS[5]!)}><PBInput w={87} defaultValue="TEST" /></span>
        <span style={rightTo(291, ROWS[5]!)}>Country:</span>
        <span style={at(296, ROWS[5]!)}><PBInput w={77} defaultValue="CANADA" /></span>

        <b style={at(397, ROWS[0]!, LABEL_H)}>Contact Information</b>
        <span style={at(397, ROWS[0]! + 19, { width: 378, borderTop: '1px solid #c8c8c8' })} />
        {phone('Home', ROWS[1]!, '(250) 555-1234')}
        <span style={at(682, ROWS[1]!)}><PBCheckbox label="Leave Message" /></span>
        {phone('Work', ROWS[2]!, '(250) 555-3215', true)}
        <span style={rightTo(610, ROWS[2]!)}>Ext.:</span>
        <span style={at(615, ROWS[2]!)}><PBInput w={59} /></span>
        <span style={at(682, ROWS[2]!)}><PBCheckbox label="Leave Message" /></span>
        {phone('Cell', ROWS[3]!, '(250) 555-3215')}
        <span style={rightTo(675, ROWS[3]!)}>Pager:</span>
        <span style={at(681, ROWS[3]!)}><PBInput w={94} align="center" defaultValue="(   )   -" /></span>
        <span style={rightTo(486, ROWS[4]!)}>Pref&apos;d Phone:</span>
        <span style={at(494, ROWS[4]!)}><PBSelect options={['Work', 'Home', 'Cell']} w={86} value={pref} onChange={(e) => setPref(e.target.value)} /></span>
        <span style={rightTo(675, ROWS[4]!)}>Fax:</span>
        <span style={at(681, ROWS[4]!)}><PBInput w={94} /></span>
        <span style={rightTo(486, ROWS[5]!)}>eMail:</span>
        <span style={at(494, ROWS[5]!)}><PBInput w={281} defaultValue="test@test.com" /></span>

        <span style={at(10, 139, LABEL_H)}>
          ** Please note this is a registered patient.&nbsp; Any changes to the data must be made in the chart module.
        </span>
        <span style={at(707, 135)}><PBButton style={{ width: 66, height: 21 }}>Refresh</PBButton></span>
      </div>
    </>
  )
}
