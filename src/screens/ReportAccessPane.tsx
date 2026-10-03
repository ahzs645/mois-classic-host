import { useState } from 'react'
import { useScreenReport } from '../host/screen-state'
import { REPORT_FOLDERS, reportRows, type ReportRow } from '../data/reportCatalogue'
import { PBDataWindow, pbSlug } from '../pb'
import { CmdCheck } from './reportKit'
import { AccessPane, PANE_PAD, UM_ACCESS_CSS } from './UserAccessTabs'

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
   expanded — Sales Tax Report with both boxes ticked on the current row,
   yellow in that build where the live one's is the usual salmon (09);
   Detailed Activity Report and Aging Report with Override clear and
   Access / Print ticked in black, i.e. blocked off; Apply Changes / Cancel
   under it) and 302650 `9e179125` (profile level, the folders only).
   The folder and report names are the Report List's (data/reportCatalogue).

   INFERRED: which reports a profile grants by default is not captured; here
   every report is granted except the two folders a clinical profile would
   not normally see (Security / Access Audit, MSP Billing). The profile-level
   rows (under an expanded folder) are not captured either; they are the
   user-level rows without the Override column.

   THE LOOK, off the 2026-10-02 TRAINING captures 08 / 09 (profile) and 18
   (user), capture px ÷ 1.14. A bordered pane under the grey `Report Access`
   band, no header row. Each folder is a 30px #C8DCFB band (34 capture px)
   with its 9px expander box centred where the current-row arrow sits and
   the caption in bold, flush with the report names under it; the blue is
   the bands', not the pane's — under the last folder the grid is white
   (18). A report row is 22px: the name, the description from 250px, and
   `☐ Access / Print` with its box 825px in (970 capture px); at user level
   `☐ Override` sits before it. 09 lists Accounts - General as Sales Tax
   Report, Aging Report, Detailed Activity Report — not the Report List's
   order — so REPORT_ORDER puts them that way here.

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

/** where Report Access orders a folder's reports unlike the Report List (09) */
const REPORT_ORDER: Record<string, string[]> = {
  'Accounts - General': ['Sales Tax Report', 'Aging Report', 'Detailed Activity Report'],
}
const rank = (r: ReportRow) => REPORT_ORDER[r.folder]?.indexOf(r.name) ?? -1
const ACCESS_ROWS: ReportRow[] = REPORT_FOLDERS.flatMap((f) => reportRows
  .filter((r) => r.folder === f)
  .map((r, i) => ({ r, i }))
  .sort((a, b) => (rank(a.r) === -1 || rank(b.r) === -1 ? a.i - b.i : rank(a.r) - rank(b.r)))
  .map(({ r }) => r))

/* the kit's group band is a 20px gradient with a rule under it; these bands
   are flat, 30px, ruleless, and the gutter is wide enough (26px) to put the
   arrow and the box where 09 does */
const REPORT_CSS = `
.pb-um-report { --pb-dw-row-h: 22px; --pb-dw-gutter-width: 26px; }
.pb-um-report .pb-dw { border: 0; }
.pb-um-report .pb-dw__table > tbody > tr.pb-dw__group,
.pb-um-report .pb-dw__table > tbody > tr.pb-dw__group:nth-child(odd) { background: #c8dcfb; }
.pb-um-report .pb-dw__table > tbody > tr.pb-dw__group td { height: 30px; padding-left: 3px; border-bottom: 0; }
.pb-um-report .pb-dw__table > tbody > tr.pb-dw__group td.pb-dw__gutter { text-align: left; }
.pb-um-report .pb-dw__table > tbody > tr.pb-dw__group .pb-dw__groupbox { margin-left: 12px; vertical-align: middle; }
`

/** what the Security Profile grants a report, before any user override */
export const profileGrants = (r: ReportRow): boolean => !NOT_GRANTED.has(r.folder)

export function ReportAccessPane({ override = false }: { override?: boolean }) {
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
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: PANE_PAD }}>
      <style>{UM_ACCESS_CSS}{REPORT_CSS}</style>
      <AccessPane title="Report Access" className="pb-um-report">
        <PBDataWindow<ReportRow>
          rows={ACCESS_ROWS}
          current={cur}
          onCurrentChange={setCur}
          groups={[...REPORT_FOLDERS]}
          groupBy={(r) => r.folder}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          groupTutorialId={(g) => `host.mois.group.${pbSlug(g)}`}
          rowTutorialId={(r) => `host.mois.row.report-access-${keyOf(r)}`}
          head={false}
          rules={false}
          columns={[
            { key: 'name', header: '', width: 221 },
            { key: 'desc', header: '', render: (r) => r.desc ?? '' },
            ...(override ? [{
              key: 'override', header: '', width: 82,
              render: (r: ReportRow) => (
                <CmdCheck
                  id={`report-override-${keyOf(r)}`}
                  label="Override"
                  checked={overrides[keyOf(r)] === true}
                  onChange={(v) => tick('override', r, v)}
                />
              ),
            }] : []),
            {
              key: 'access', header: '', width: 113,
              render: (r: ReportRow) => (
                <CmdCheck
                  id={`report-access-${keyOf(r)}`}
                  label="Access / Print"
                  checked={granted(r)}
                  disabled={override && overrides[keyOf(r)] !== true}
                  onChange={(v) => tick('access', r, v)}
                />
              ),
            },
          ]}
        />
      </AccessPane>
    </div>
  )
}
