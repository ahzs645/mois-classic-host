import type { ReactNode } from 'react'
import { PBButton, PBCheckbox, PBInput, PBLookup, PBSelect, PBWindow } from '../../pb'
import { currentRow, schedulerStore, useSchedulerStore } from '../../data/schedulerStore'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { NAVY } from './SchedulerDialog'

/* ============================================================================
   Quick Patient Registration Form — the row menu's (or Utilities')
   Quick Registration, on an appointment saved with a name and no chart.

   Transcribed from art. 303855 `3b78bf9c…`: four groups — Patient
   Identification (Chart No. greyed, Name F/M/L, Alias F/L, Birth Date,
   Gender with its "…", Insurance by, Insurance No., Dependant No. 00, Status
   Code, Status Date), Contact Information (two Address lines, City,
   Province BC, Postal Code, Country CANADA, Home / Work with Leave Message,
   Ext., Cell, Pager, Preferred Phone, Fax, two eMails), Office Information
   (Facility, Location, Service, Service Provider) and Connections (Referring,
   Primary Care) — then Register (F2) and Cancel. The name arrives from the
   appointment. "Register (F2) to create a new chart for this patient. A
   chart number will now be shown on the Day Book."
   ========================================================================= */

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset className="pb-fieldset" style={{ margin: '0 0 6px' }}>
    <legend className="pb-fieldset__legend" style={NAVY}>{title}</legend>
    <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', rowGap: 3, alignItems: 'center', padding: '2px 4px' }}>{children}</div>
  </fieldset>
)
const L = ({ children }: { children: ReactNode }) => <span>{children}</span>

function QuickRegistration({ close }: AreaWindowProps) {
  useSchedulerStore()
  const row = currentRow()
  const register = () => {
    if (row && !row.chart) schedulerStore.register(row.key)
    close()
  }
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 85 }}>
      <PBWindow
        child
        controls={false}
        title="Quick Patient Registration Form"
        tutorialId="host.mois.dialog.quick-registration"
        onClose={close}
        style={{ width: 430, height: 660, maxWidth: '100%', maxHeight: '100%' }}
      >
        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '8px 10px', background: 'var(--pb-face)' }}>
          <Group title="Patient Identification">
            <L>Chart No.:</L><PBInput w={94} readOnly style={{ background: 'var(--pb-field-ro)' }} />
            <L>Name (F/M/L):</L>
            <span className="pb-row" style={{ gap: 3 }}>
              <PBInput w={94} defaultValue={row?.first ?? ''} style={{ background: '#ffd0b0' }} />
              <PBInput w={84} />
              <PBInput w={94} defaultValue={row?.last ?? ''} />
            </span>
            <L>Alias (F/L):</L><span className="pb-row" style={{ gap: 90 }}><PBInput w={94} /><PBInput w={94} /></span>
            <L>Birth Date:</L><span className="pb-row" style={{ gap: 6 }}><PBInput w={94} /><span style={{ marginLeft: 24 }}>Gender:</span><PBSelect w={60} options={['', 'M', 'F', 'X', 'U']} /><PBButton size="sm">...</PBButton></span>
            <L>Insurance by:</L><PBSelect w={62} options={['', 'BC', 'IN', 'PP', 'WC']} />
            <L>Insurance No.:</L><span className="pb-row" style={{ gap: 6 }}><PBInput w={94} /><span style={{ marginLeft: 8 }}>Dependant No.:</span><PBInput w={44} defaultValue="00" /></span>
            <L>Status Code:</L><span className="pb-row" style={{ gap: 6 }}><PBSelect w={62} options={['', 'A', 'I', 'D', 'M', 'LU']} /><span style={{ marginLeft: 38 }}>Status Date:</span><PBInput w={94} /></span>
          </Group>
          <Group title="Contact Information">
            <L>Address:</L><PBInput w={280} />
            <L>Address:</L><PBInput w={280} />
            <L>City:</L><span className="pb-row" style={{ gap: 6 }}><PBInput w={124} /><span>Province:</span><PBInput w={94} defaultValue="BC" /></span>
            <L>Postal Code:</L><span className="pb-row" style={{ gap: 6 }}><PBInput w={84} /><span style={{ marginLeft: 38 }}>Country:</span><PBInput w={94} defaultValue="CANADA" /></span>
            <L>Home:</L><span className="pb-row" style={{ gap: 6 }}><PBInput w={84} /><span style={{ marginLeft: 94 }}><PBCheckbox label="Leave Message" /></span></span>
            <L>Work:</L><span className="pb-row" style={{ gap: 6 }}><PBInput w={84} /><span>Ext.:</span><PBInput w={56} /><PBCheckbox label="Leave Message" /></span>
            <L>Cell:</L><span className="pb-row" style={{ gap: 6 }}><PBInput w={84} /><span style={{ marginLeft: 38 }}>Pager:</span><PBInput w={94} /></span>
            <L>Preferred Phone:</L><span className="pb-row" style={{ gap: 6 }}><PBSelect w={84} options={['', 'Home', 'Work', 'Cell']} /><span style={{ marginLeft: 50 }}>Fax:</span><PBInput w={94} /></span>
            <L>eMail (Home):</L><PBInput w={280} />
            <L>eMail (Work):</L><PBInput w={280} />
          </Group>
          <Group title="Office Information">
            <L>Facility:</L><PBSelect w={180} options={['']} />
            <L>Location:</L><PBSelect w={180} options={['', 'PRINCE GEORGE CLINIC']} />
            <L>Service:</L><PBSelect w={180} options={['']} />
            <L>Service Provider:</L><PBSelect w={180} options={['', 'TECHNICAL SUPPORT', 'BEARDWOOD, WALTER']} />
          </Group>
          <Group title="Connections">
            <L>Referring:</L><PBLookup w={240} />
            <L>Primary Care:</L><PBLookup w={240} />
          </Group>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '6px 0 8px', flex: 'none', background: 'var(--pb-face)' }}>
          <PBButton style={{ minWidth: 90 }} className="pb-btn--default" data-tutorial-id="host.mois.command.register" onClick={register}>Register (F2)</PBButton>
          <PBButton style={{ minWidth: 76 }} onClick={close}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

registerAreaWindow('quick-registration', QuickRegistration)
