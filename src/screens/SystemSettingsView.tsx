import { useState } from 'react'
import { PBCommandRow, PBDataWindow, PBInput, PBViewHeader } from '../pb'

/* ============================================================================
   System Settings — Administration ▸ Configuration ▸ System Settings.

   Transcribed from `encounter_limit.PNG` on the MOIS help site, the capture
   the manual's "How to Limit the Number of Encounter Popup Windows" points at:
   a Save / Undo / Close Window command row, one APP SETTING band over a
   name / value / description grid, and a Description panel under it that
   prints the selected row's own description.

   The settings and their defaults are the capture's, in the capture's order.
   ========================================================================= */

type Setting = { name: string; value: string; desc: string }

const APP_SETTINGS: Setting[] = [
  { name: 'New Row Location', value: 'A', desc: '(A)fter current row / (B)efore current row' },
  { name: 'Idle Time-out', value: '60', desc: 'Idle Time-out period to shutdown MOIS (minutes)' },
  { name: 'Chart Lookup View', value: 'C', desc: 'A (note/provider), B (provider/location), C (note/Location)' },
  { name: 'D/E Distribution', value: 'ON', desc: 'Turns (ON) / (OFF) the auto distribution for the manual entry' },
  { name: 'Log-In Type', value: 'B', desc: '(B)lank or (W)indows User' },
  { name: 'Encounter Window Limit', value: '1', desc: 'Maximum number of encounters window that can be open' },
  { name: 'Flow Sheet Order', value: 'A', desc: '(A)scending or (D)escending from Left to Right.' },
  { name: 'Flow Sheet Period', value: '2', desc: 'Default Period Length in Years.' },
  { name: 'Document Locking', value: '5', desc: 'Number of days after a document is created that the content locks' },
  { name: 'Billing Ref Doc Alert', value: 'OFF', desc: 'Alert user if a bill is prepared without a referring doctor' },
  { name: 'Double Booking Alert', value: 'Off', desc: 'Alert user when double-booking occurs from the scheduler' },
  { name: 'Validate ICBC Claim No', value: 'YES', desc: 'Toggle the ICBC Claim validation (Y)es or (N)o.' },
  { name: 'Validate SIN No', value: 'YES', desc: 'Toggle the SIN No MOD validation (Y)es or (N)o.' },
  { name: 'Postal Code Service', value: 'YES', desc: 'Is the postal code service enabled (Y)es or (N)o' },
  { name: 'Eligibility Checking', value: 'YES', desc: 'Is the MSP Eligibility Checking service enabled (Y)es or (N)o' },
  { name: 'MOIS Viewer Mode', value: 'SI', desc: 'MOIS Viewer Mode: S (Standalone), I (Embedded), SI (both)' },
  { name: 'MOIS Viewer Types', value: 'TIF,JPG,JPE,PNG,BMP,GIF', desc: 'Supported file types for the MOIS Viewer' },
  { name: 'Spell Checker Disabled', value: 'NO', desc: 'Is the spell checker disabled: Letter Writer (LW), No (NO)' },
  { name: 'MAR Require Encounter', value: 'NO', desc: 'YES or NO are valid options - NO is the default.' },
  { name: 'MAR Admin Record User Lock', value: 'OFF', desc: 'ON or OFF are valid options - OFF is the default.' },
  { name: 'MAR Ordering', value: 'ON', desc: 'ON or OFF are valid options - ON is the default.' },
  { name: 'Require Reason to Delete', value: 'OFF', desc: '(ON/OFF) When ON, enforce that a reason is entered on a delete' },
  { name: 'OCR Enabled', value: 'Y', desc: 'Determines whether the OCR feature is available (Y/N)' },
  { name: 'Referral Mode', value: 'N', desc: 'Use (S)tandard or (N)ew Referral Mode (When CDX-E2E is on)' },
  { name: 'Electronic Interfaces Lookback', value: '90', desc: 'Default number of days to look back in Electronic Interfaces' },
]

/** The row the manual's encounter-window article sends a reader to. */
const ANCHORED = 'Encounter Window Limit'

// Only group headings were read during this visual pass. Uncaptured groups
// do not borrow APP SETTING values.
const SETTING_GROUPS = ['APP SETTING', 'APP SETTING - ADDRESS BOOK', 'APP SETTING - CARECONNECT',
  'APP SETTING - CPP RX', 'APP SETTING - DESKTOP PROVIDER', 'APP SETTING - HTML FORMS',
  'APP SETTING - MOIS WEB', 'APP SETTING - PATIENT SUMMARY', 'APP SETTING - PRINT PREVIEW',
  'APP SETTING - RX', 'APP SETTING - SRFAX', 'APP SETTING - TELEHEALTH',
  'APP SETTING - UPGRADES', 'APP SETTING - WORKSPACE', 'CHART', 'CLOUD - FILE REDIRECT',
  'GLOBAL', 'HELP MENU', 'INVOICE STATEMENT', 'LAB INTERFACE', 'LABEL PRINTING', 'LABEL PRINTING - NAME FORMAT']

export function SystemSettingsView() {
  const [cur, setCur] = useState(APP_SETTINGS.findIndex((s) => s.name === ANCHORED))
  const selected = APP_SETTINGS[cur]
  const [find, setFind] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set(SETTING_GROUPS.slice(1)))
  const rows = APP_SETTINGS.filter((row) => `${row.name} ${row.desc}`.toLowerCase().includes(find.toLowerCase()))
  return (
    <>
      <PBViewHeader title="System Settings" />
      <div className="pb-row" style={{ gap: 0, flex: 'none' }}>
        <PBCommandRow commands={[{ label: 'Save' }, { label: 'Undo' }, { label: 'Close Window' }]} />
        <label className="pb-row" style={{ flex: 1, gap: 3, paddingRight: 4 }}>Find:<PBInput aria-label="Find system setting" value={find} onChange={(event) => { setFind(event.target.value); setCollapsed(new Set()) }} style={{ flex: 1, minWidth: 0 }} /></label>
      </div>
      <div className="pb-system-settings-grid" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          head={false}
          hscroll
          rows={rows}
          current={rows.indexOf(selected)}
          onCurrentChange={(index) => setCur(APP_SETTINGS.indexOf(rows[index]))}
          groupBy={() => 'APP SETTING'}
          groups={find ? ['APP SETTING'] : SETTING_GROUPS}
          groupLabel={(id) => id}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          rowTutorialId={(row) => (
            row.name === ANCHORED ? 'host.mois.row.encounter-window-limit' : undefined
          )}
          columns={[
            { key: 'name', header: '', width: 252 },
            { key: 'value', header: '', width: 300, render: (r) => r === selected ? <PBInput w="100%" value={r.value} readOnly /> : r.value },
            { key: 'desc', header: '', width: 480 },
          ]}
        />
      </div>
      <div className="pb-row" style={{ alignItems: 'flex-start', padding: '4px 6px', gap: 8, flex: 'none' }}>
        <span className="pb-form__label" style={{ width: 96 }}>Description:</span>
        <div className="pb-field" style={{ flex: '1 1 auto', height: 56, padding: '2px 4px' }}>
          {selected?.desc}
        </div>
      </div>
      <div className="pb-row" style={{ padding: '0 6px 4px', gap: 40, flex: 'none' }}>
        <span className="pb-form__label">Record Created:</span>
        <span>SYSTEM</span>
        <span className="pb-form__label">Last Modified:</span>
      </div>
    </>
  )
}
