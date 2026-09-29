import { useState } from 'react'
import { useChartExport } from '../data/chart-records'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { yearsOld } from '../data/reportParams'
import { rsLike } from '../data/reportSpecs/types'
import { useScreenReport } from '../host/screen-state'
import { PBBand, PBCheckbox, PBInput, PBLookup, PBSelect } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { ParamLine, ParamSection } from './reportKit'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Report: Clinical - Main - Patients by Procedure — the Selection Parameter
   window a double-click on the Report List's "Patients by Procedure" row
   opens (303122 `5bf91e6d…png`, v02.17):

   · Enter search string(s) for Procedure Description — three Contains boxes
     (the first salmon, required), then "OR…" and a Concept "…";
   · Date Range (INCLUSIVE) — Start Date to End Date;
   · Other Options: — Patients List ▸ Active Patients Only (ticked), Provider,
     Facility Code and Service Center drop-downs;
   · Ok / Cancel.

   Ok lists the patients whose imaging or procedure records match (Contains,
   `%`-aware), into the Print Preview laid out as 304049 `698852ae` (LIST OF
   PATIENTS WITH SELECTED PROCEDURES) — the list 303122 says to "review each patient" from. The
   stage's only chart with records behind it is the one open, so that is the
   chart the list can find.
   ========================================================================= */

function PatientsByProcedureParams({ close, open }: AreaWindowProps) {
  const data = useChartExport()
  const patient = usePatient()
  const [contains, setContains] = useState(['', '', ''])
  const [from, setFrom] = useState('2000.01.01')
  const [to, setTo] = useState(MOIS_TODAY)
  const [active, setActive] = useState(true)
  useScreenReport({ report: 'patients-by-procedure' })
  const ok = () => {
    const terms = contains.map((c) => c.trim().toUpperCase()).filter(Boolean)
    const inRange = (d?: string) => { const v = (d ?? '').slice(0, 10).replace(/\//g, '.'); return (!from || v >= from) && (!to || v <= to) }
    const hits = (data?.order ?? [])
      .filter((r) => ['IMAGING', 'XRAY', 'PROCEDURE'].includes(r.str_order_type ?? ''))
      .filter((r) => inRange(r.dtm_finish_date || r.dtm_ord_date))
      /* "Contains", with the `%` wildcard (304049: "For any report that has a
         CONTAINS argument … this single, wildcard character will find all
         entries") */
      .filter((r) => !terms.length || terms.some((t) => rsLike(t, `${r.str_description ?? ''} ${r.str_code_term ?? ''}`)))
    /* 304049 `698852ae`: LIST OF PATIENTS WITH SELECTED PROCEDURES */
    const age = yearsOld(patient.dob)
    open('print-preview', {
      title: 'Patients by Procedure',
      pages: [[
        '**MOIS TEST CLINIC**',
        '%TITLE%LIST OF PATIENTS WITH SELECTED PROCEDURES',
        `%SUB%${active ? 'ACTIVE ' : ''}Patients For Date between ${from} and ${to}`,
        `%SUB%Procedure Description Contains: ${terms.join(', ')}`,
        '%COLS:28,8,12,9,12,31%',
        '%TH%NAME|CHART NO.|DATE OF BIRTH|SEX AGE|DATE PERFORMED|DESCRIPTION',
        ...hits.map((r) => `%TR%${patient.last}, ${patient.first}|${patient.chart}|${patient.dob}|${patient.gender}  ${age}|${(r.dtm_finish_date || r.dtm_ord_date || '').slice(0, 10).replace(/\//g, '.')}|${r.str_description ?? r.str_code_term ?? ''}`),
        '',
        `Records Printed: ${hits.length}`,
        '',
        `Patients Printed: ${hits.length ? 1 : 0}`,
      ].join('\n')],
    })
  }
  return (
    <WorkspaceDialogFrame id="report-params-patients-by-procedure" title="Report: Clinical - Main - Patients by Procedure"
      width={640} height={505} controls={false} onClose={close}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: 12, background: 'var(--pb-face)' }}>
        <div style={{ flex: '1 1 auto', border: '1px solid var(--pb-border)', background: 'var(--pb-face)' }}>
          <PBBand>Selection Parameter</PBBand>
          <ParamSection>Enter search string(s) for Procedure Description</ParamSection>
          {contains.map((c, i) => (
            <ParamLine w={80} key={i} label="Contains:">
              <PBInput w={326} value={c} data-tutorial-id={i === 0 ? 'host.mois.field.rp-procedure-contains' : undefined}
                style={i === 0 ? { background: 'var(--pb-dw-flag, #f8c7a8)' } : undefined}
                onChange={(e) => setContains((all) => all.map((x, j) => (j === i ? e.target.value : x)))} />
            </ParamLine>
          ))}
          <ParamLine w={80} label="OR…"><span /></ParamLine>
          <ParamLine w={80} label="Concept:"><PBLookup w={326} /></ParamLine>
          <ParamSection>Date Range (INCLUSIVE)</ParamSection>
          <ParamLine w={80} label="Start Date:">
            <PBInput w={84} align="center" value={from} onChange={(e) => setFrom(e.target.value)} data-tutorial-id="host.mois.field.rp-procedure-from" />
            <span>to</span>
            <PBInput w={84} align="center" value={to} onChange={(e) => setTo(e.target.value)} />
          </ParamLine>
          <ParamSection>Other Options:</ParamSection>
          <ParamLine w={80} label="Patients List:"><PBCheckbox label="Active Patients Only" checked={active} onChange={setActive} /></ParamLine>
          <ParamLine w={80} label="Provider:"><PBSelect w={140} options={['']} /></ParamLine>
          <ParamLine w={80} label="Facility Code:"><PBSelect w={110} options={['']} /></ParamLine>
          <ParamLine w={80} label="Service Center:"><PBSelect w={140} options={['']} /></ParamLine>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 19, paddingTop: 10 }}>
          <DialogButton id="procedure-ok" isDefault onClick={ok}>Ok</DialogButton>
          <DialogButton id="procedure-cancel" onClick={close}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('report-params-patients-by-procedure', PatientsByProcedureParams)
