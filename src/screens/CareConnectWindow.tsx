import { usePatient } from '../data/patient-context'
import {
  CARECONNECT_ENABLED_ROW, CARECONNECT_URL_ROW, isYes, useSystemSetting,
} from '../data/systemSettings'
import { useScreenReport } from '../host/screen-state'
import { Btn, DetailWindow, TopMessage } from './AdminExchangeKit'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'

/* ============================================================================
   Utilities ▸ Launch CareConnect — 3318194 "Launch Care Connect".

   PROVENANCE: `30bf032e…` (current build, Patient Chart ▸ Demographic):
   Utilities lists "Launch CareConnect" under MSP Eligibility Check. The item
   is on the menu only while System Settings ▸ APP SETTING - CARECONNECT ▸
   Enabled is Y (`197c5a32…`: "perhaps it isn't enabled in your instance …
   To enable Launch CareConnect … don't forget to click Save"); data/mois.tsx
   reads that row.

   CareConnect is the province's eHealth viewer, an EXTERNAL web application
   MOIS opens in the browser at APP SETTING - CARECONNECT ▸ URL for the open
   chart. The emulator does not reproduce it: this window is a PLACEHOLDER,
   drawn as a plain browser frame and labelled as such, so a lesson can
   show that the launch happened and what it was launched with. Everything
   inside it is INFERRED.

   Opened by id with CareConnect disabled, it says so instead (a lesson
   replaying the action out of order still lands somewhere honest).

   Reported: `host.dialog` launch-careconnect (or careconnect-disabled);
   `host.screen.careconnect` launched / disabled.
   ========================================================================= */

function LaunchCareConnect({ close }: AreaWindowProps) {
  const enabled = isYes(useSystemSetting(CARECONNECT_ENABLED_ROW))
  const url = useSystemSetting(CARECONNECT_URL_ROW)
  const patient = usePatient()
  useScreenReport({ careconnect: enabled ? 'launched' : 'disabled' })

  if (!enabled) {
    return (
      <TopMessage id="careconnect-disabled" title="CareConnect" icon="warn" buttons={['OK']} prefix="careconnect-" onClose={close}>
        {'CareConnect is not enabled.\nSee System Settings - APP SETTING - CARECONNECT.'}
      </TopMessage>
    )
  }
  return (
    <DetailWindow id="launch-careconnect" title="CareConnect - External Viewer (placeholder)" width={900} height={600} onClose={close}
      buttons={<Btn id="careconnect-close" width={90} onClick={close}>Close</Btn>}>
      <div className="pb-row" style={{ gap: 6, padding: '4px 8px', background: '#f2f2f2', borderBottom: '1px solid #c8c8c8', flex: 'none' }}>
        <span style={{ color: '#888' }}>◀ ▶ ⟳</span>
        <span className="pb-field" style={{ flex: '1 1 auto', padding: '1px 6px' }} data-tutorial-id="host.mois.field.careconnect-url">{url || '(no URL set)'}</span>
      </div>
      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ maxWidth: 520, textAlign: 'center', whiteSpace: 'normal', border: '2px dashed #c0c0c0', padding: '24px 28px', color: '#444' }}
          data-tutorial-id="host.mois.group.careconnect-placeholder">
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0a246a', marginBottom: 8 }}>CareConnect</div>
          <div style={{ marginBottom: 10 }}>
            <b>Training placeholder.</b> CareConnect is an external eHealth viewer that MOIS opens in your
            web browser. It is not part of MOIS and is not reproduced in this emulator.
          </div>
          {patient.chart ? (
            <div>
              MOIS would open CareConnect for chart <b>{patient.chart}</b>
              {patient.bchn || patient.insurance ? <> (PHN <b>{patient.bchn ?? patient.insurance}</b>)</> : null}.
            </div>
          ) : (
            <div>No chart is open: CareConnect opens to its search page.</div>
          )}
        </div>
      </div>
    </DetailWindow>
  )
}

registerAreaWindow('launch-careconnect', LaunchCareConnect)
