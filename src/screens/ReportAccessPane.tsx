import { useState } from 'react'
import { useScreenReport } from '../host/screen-state'
import { REPORT_FOLDERS, reportRows, type ReportRow } from '../data/reportCatalogue'
import { PBBand, PBCheckbox, PBDataWindow, pbSlug, usePBInstrumentation } from '../pb'

/* ============================================================================
   Report Access — the tab that decides which reports a user (or a Security
   Profile) may run.

   WHAT IT IS. One DataWindow: the sixteen report folders as #C8DCFA group
   bands with a +/- box, and under an expanded folder one row per report —
   Name, Description, then the ticks. At the USER level (User Account ▸
   Report Access) each row carries `☐ Override` and `☐ Access / Print`; the
   Access / Print box is "blocked off" — drawn with the profile's value and
   not editable — until Override is ticked (304021: "Give access to
   appropriate reports by checking the 'Access/Print' box; if this box is
   blocked off, you must first click 'Override'"). At the PROFILE level
   (Security Profile Settings ▸ Report Access) there is no Override column
   and Access / Print is always editable.

   PROVENANCE: 304021 `9ca90685` (user level, v02.17: Accounts - General
   expanded — Sales Tax Report with both boxes ticked on the yellow current
   row, Detailed Activity Report and Aging Report with Override clear and
   Access / Print ticked in black, i.e. blocked off; Apply Changes / Cancel
   under it) and 302650 `9e179125` (profile level, the folders only).
   The folder and report names are the Report List's (data/reportCatalogue).

   INFERRED: which reports a profile grants by default is not captured; here
   every report is granted except the two folders a clinical profile would
   not normally see (Security / Access Audit, MSP Billing). The profile-level
   rows (under an expanded folder) are not captured either; they are the
   user-level rows without the Override column.

   ANCHORS: folder band `host.mois.group.<folder>`; row
   `host.mois.row.report-access-<folder>-<report>`; ticks
   `host.mois.command.report-override-<folder>-<report>` and
   `host.mois.command.report-access-<folder>-<report>`. `host.screen` reports
   `reportAccessCell` (the last box toggled, e.g.
   `access-accounts-general-sales-tax-report`), `reportAccessChecked`, and
   `reportOverrides` (how many rows are overridden).
   ========================================================================= */

const NOT_GRANTED = new Set(['Security / Access Audit', 'MSP Billing'])
const keyOf = (r: ReportRow) => `${pbSlug(r.folder)}-${pbSlug(r.name)}`

/** what the Security Profile grants a report, before any user override */
export const profileGrants = (r: ReportRow): boolean => !NOT_GRANTED.has(r.folder)

export function ReportAccessPane({ override = false }: { override?: boolean }) {
  const host = usePBInstrumentation()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(REPORT_FOLDERS))
  const [cur, setCur] = useState(-1)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [access, setAccess] = useState<Record<string, boolean>>({})
  const [last, setLast] = useState<{ cell: string; checked: boolean } | null>(null)
  useScreenReport({
    ...(last ? { reportAccessCell: last.cell, reportAccessChecked: last.checked } : {}),
    reportOverrides: Object.values(overrides).filter(Boolean).length,
  })

  const granted = (r: ReportRow) => access[keyOf(r)] ?? profileGrants(r)
  const tick = (kind: 'override' | 'access', r: ReportRow, v: boolean) => {
    const cell = `${kind}-${keyOf(r)}`
    host?.report('command', { command: `report-${cell}` })
    if (kind === 'override') {
      setOverrides((o) => ({ ...o, [keyOf(r)]: v }))
      /* clearing an override drops the user's own value back to the profile's */
      if (!v) setAccess((a) => { const n = { ...a }; delete n[keyOf(r)]; return n })
    } else {
      setAccess((a) => ({ ...a, [keyOf(r)]: v }))
    }
    setLast({ cell, checked: v })
  }

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: 3, border: '1px solid #a0a0a0' }}>
      <PBBand>Report Access</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
        <PBDataWindow<ReportRow>
          rows={reportRows}
          current={cur}
          onCurrentChange={setCur}
          groups={[...REPORT_FOLDERS]}
          groupBy={(r) => r.folder}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          groupTutorialId={(g) => `host.mois.group.${pbSlug(g)}`}
          rowTutorialId={(r) => `host.mois.row.report-access-${keyOf(r)}`}
          head={false}
          style={{
            ['--pb-dw-group' as string]: '#c8dcfa',
            ['--pb-dw-select' as string]: '#ffffc8',
          }}
          columns={[
            { key: 'name', header: '', width: 220 },
            { key: 'desc', header: '', render: (r) => r.desc ?? '' },
            ...(override ? [{
              key: 'override', header: '', width: 104,
              render: (r: ReportRow) => {
                const id = `report-override-${keyOf(r)}`
                return (
                  <PBCheckbox
                    label="Override"
                    checked={overrides[keyOf(r)] === true}
                    tutorialId={host?.anchor('command', id)}
                    onChange={(v) => tick('override', r, v)}
                  />
                )
              },
            }] : []),
            {
              key: 'access', header: '', width: 124,
              render: (r: ReportRow) => {
                const id = `report-access-${keyOf(r)}`
                const blocked = override && overrides[keyOf(r)] !== true
                return (
                  <PBCheckbox
                    label="Access / Print"
                    checked={granted(r)}
                    disabled={blocked}
                    tutorialId={host?.anchor('command', id)}
                    onChange={(v) => tick('access', r, v)}
                  />
                )
              },
            },
          ]}
        />
      </div>
    </div>
  )
}
