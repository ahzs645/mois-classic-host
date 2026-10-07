import { useScreenReport } from '../host/screen-state'
import { useMemo, useState, type ReactNode } from 'react'
import { PBBand, PBCheckbox, PBDataWindow, PBRadio, pbSlug, type PBTreeNode } from '../pb'
import { useSpecialFunctions } from '../data/accessSettings'
import {
  adminTree, billingTree, exchangeTree, patientChartTree, reportsTree, schedulerTree, workspaceTree,
} from '../data/mois'
import {
  ACCESS_FOOTNOTE, ACCESS_LEVELS, MODULE_ACCESS_ROWS, MODULE_PANE_W, SPECIAL_FUNCTION_ROWS,
  WINDOW_ACCESS_CHILDREN, WINDOW_ACCESS_LEVELS, WINDOW_ACCESS_WITHHELD,
  type ModuleAccessRow, type SpecialFunctionRow, type WindowAccessRow,
} from '../data/userManagement'

/* ============================================================================
   The access tabs that both the Security Profile Settings window and the
   User Account window draw.

   They are the same DataWindows at both levels; the user level adds an
   `Override` column — in both panes of `Module / Window Access` (capture 16,
   `1e9141017547`) and before `Execute` on `Special Functions` (capture 17).
   That is what `override` switches. Report Access is
   screens/ReportAccessPane.tsx.

   THE LOOK, off the 2026-10-02 TRAINING captures (03–07, 12, 16, 17; capture
   px ÷ 1.14). Each pane is a bordered box: the grey caption band, then a
   #C8DCFB header row whose captions are the soft #808080 of a disabled
   label, then flush 22px rows with no rules in either axis. The zebra runs
   the other way from the kit's: the row under the current one is grey
   (#E8E8E8), the next white. The kit has no prop for any of it, so it rides
   the scoped `pb-um-access` rules below (UM_ACCESS_CSS), which the launch
   chooser (screens/LaunchModeWindows.tsx) also uses.

   Column widths are laid out to where the capture puts each caption and
   tick box, measured from the pane's left edge, not to gridlines: these
   grids draw none. The gutter is 15px (17 capture px), not the kit's 13.
   ========================================================================= */

export const UM_ACCESS_CSS = `
.pb-um-pane { display: flex; flex-direction: column; min-height: 0; min-width: 0; border: 1px solid #a8a8a8; background: #fff; }
.pb-um-pane > .pb-band { min-height: 20px; border-bottom: 1px solid #918e8a; }
.pb-um-access { --pb-dw-row-h: 22px; --pb-dw-gutter-width: 15px; }
.pb-um-access .pb-dw { border: 0; }
.pb-um-access .pb-dw__table > thead > tr > th,
.pb-um-access .pb-dw__table > thead > tr > th:hover {
  height: 24px; background: #c8dcfb; color: #808080; border: 0; text-align: left;
}
.pb-um-access .pb-dw__table > thead > tr > th.pb-dw__c--center { text-align: center; }
.pb-um-access .pb-dw__table > tbody > tr:nth-child(odd) { background: var(--pb-dw-row); }
.pb-um-access .pb-dw__table > tbody > tr:nth-child(even) { background: var(--pb-dw-row-alt); }
.pb-um-access .pb-dw__table > tbody > tr.is-current { background: var(--pb-dw-select); }
`

/** Where a tab page puts its panes: 8px down, 7px in (03: the panes sit
    at 136 / 26 against the page's 128 / 19, scaled). */
export const PANE_PAD = '8px 7px 8px'

/** One pane: the caption band and a grid under it, in one bordered box. */
export function AccessPane({ title, width, className = 'pb-um-access', children, foot }: {
  title: string
  width?: number
  /** the grid's look; Report Access keeps the kit's zebra (ReportAccessPane) */
  className?: string
  children: ReactNode
  /** drawn inside the box under the grid (the Access Level footnote) */
  foot?: ReactNode
}) {
  return (
    <div
      className={`pb-um-pane ${className}`}
      style={width ? { width, flex: 'none' } : { flex: '1 1 auto' }}
    >
      <PBBand>{title}</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>{children}</div>
      {foot}
    </div>
  )
}

/* --------------------------------------------------------------------------
   Module / Window Access
   ------------------------------------------------------------------------ */

/** each module's navigator tree, which the right pane lists */
const MODULE_TREES: Record<string, PBTreeNode[]> = {
  'Patient Chart': patientChartTree,
  Workspace: workspaceTree,
  Scheduler: schedulerTree,
  Billing: billingTree,
  Administration: adminTree,
  'Data Exchange': exchangeTree,
  Reports: reportsTree,
}

/** A module's Window / Tree Node rows: its tree, depth-first, indented. */
export function windowAccessRows(module: string): WindowAccessRow[] {
  const levels = WINDOW_ACCESS_LEVELS[module] ?? {}
  const rows: WindowAccessRow[] = []
  const row = (node: string, depth: number) => rows.push({
    node,
    depth,
    access: !WINDOW_ACCESS_WITHHELD.includes(node),
    level: levels[node] ?? 'Read/Write',
  })
  const walk = (nodes: PBTreeNode[], depth: number) => {
    for (const n of nodes) {
      const label = String(n.label)
      row(label, depth)
      const extra = WINDOW_ACCESS_CHILDREN[label]
      if (extra) extra.forEach((c) => row(c, depth + 1))
      else if (n.children) walk(n.children, depth + 1)
    }
  }
  walk(MODULE_TREES[module] ?? [], 0)
  return rows
}

export function ModuleWindowAccessTab({ override = false, pad = PANE_PAD }: { override?: boolean; pad?: string }) {
  const [modRow, setModRow] = useState(0)
  const module = MODULE_ACCESS_ROWS[modRow]?.module ?? MODULE_ACCESS_ROWS[0]!.module
  /* the right pane follows the module selected on the left */
  const windowRows = useMemo(() => windowAccessRows(module), [module])
  /* the Override / Access ticks, per module, as the learner leaves them;
     the last one toggled is reported as host.screen.cell / .checked */
  const [ticks, setTicks] = useState<Record<string, boolean>>(() => Object.fromEntries(
    MODULE_ACCESS_ROWS.flatMap((r) => [[`override-${pbSlug(r.module)}`, Boolean(r.override)], [`access-${pbSlug(r.module)}`, Boolean(r.access)]]),
  ))
  const [last, setLast] = useState<string | null>(null)
  useScreenReport(last ? { cell: last, checked: Boolean(ticks[last]) } : {})
  const tick = (cell: string) => (v: boolean) => { setTicks((t) => ({ ...t, [cell]: v })); setLast(cell) }
  const [winRow, setWinRow] = useState(0)
  /* by module and row, so each module's tree keeps its own levels */
  const [level, setLevel] = useState<Record<string, string>>({})
  const key = (i: number) => `${pbSlug(module)}:${i}`

  return (
    <div className="pb-row" style={{ alignItems: 'stretch', gap: 3, flex: '1 1 auto', minHeight: 0, padding: pad }}>
      <style>{UM_ACCESS_CSS}</style>
      {/* --- left pane: Module Access, 313 capture px --- */}
      <AccessPane title="Module Access" width={MODULE_PANE_W}>
        <PBDataWindow<ModuleAccessRow>
          rows={MODULE_ACCESS_ROWS}
          current={modRow}
          onCurrentChange={(i) => { setModRow(i); setWinRow(0) }}
          rules={false}
          rowTutorialId={(r) => `host.mois.row.module-${pbSlug(r.module)}`}
          columns={[
            /* 03: "Module" sits over the names; 16: the Override box centres
               on 239 capture px, Access on 300 */
            { key: 'module', header: 'Module', width: override ? 143 : 187, headAlign: 'left' },
            ...(override
              ? [{
                key: 'override',
                header: 'Override',
                width: 54,
                align: 'center' as const,
                /* `303191` sends the learner to the Data Exchange row's
                   Override box, so every one of them is anchorable. The
                   anchor rides the input, not a wrapping cell. */
                render: (r: ModuleAccessRow) => (
                  <PBCheckbox
                    checked={Boolean(ticks[`override-${pbSlug(r.module)}`])}
                    onChange={tick(`override-${pbSlug(r.module)}`)}
                    tutorialId={`host.mois.cell.override-${pbSlug(r.module)}`}
                  />
                ),
              }]
              : []),
            {
              key: 'access',
              header: 'Access',
              width: override ? 54 : 72,
              align: 'center',
              render: (r: ModuleAccessRow) => (
                <PBCheckbox
                  checked={Boolean(ticks[`access-${pbSlug(r.module)}`])}
                  onChange={tick(`access-${pbSlug(r.module)}`)}
                  tutorialId={`host.mois.cell.access-${pbSlug(r.module)}`}
                />
              ),
            },
          ]}
        />
      </AccessPane>

      {/* --- right pane: Window / Tree Access, 767 capture px --- */}
      <AccessPane
        title="Window / Tree Access"
        /* the footnote is drawn INSIDE the pane, under the grid (03–05) */
        foot={<div style={{ flex: 'none', height: 28, padding: '8px 19px 0', background: '#fff' }}>{ACCESS_FOOTNOTE}</div>}
      >
        <PBDataWindow<WindowAccessRow>
          key={module}
          rows={windowRows}
          current={winRow}
          onCurrentChange={setWinRow}
          rules={false}
          rowTutorialId={(r) => `host.mois.row.window-${pbSlug(r.node)}`}
          columns={[
            {
              key: 'node',
              header: 'Window / Tree Node',
              /* the Access box sits 339px into the pane (733 capture px);
                 at user level the Override box takes 268 (651) */
              width: override ? 251 : 317,
              headAlign: 'left',
              /* the column is hierarchical: each level one 22px indent in */
              render: (r: WindowAccessRow) => (
                <span style={{ paddingLeft: r.depth * 22 }}>{r.node}</span>
              ),
            },
            ...(override
              ? [{
                key: 'override',
                header: '',
                width: 71,
                render: (r: WindowAccessRow, i: number) => (
                  <PBCheckbox
                    label="Override"
                    checked={Boolean(ticks[`window-override-${key(i)}`] ?? r.override)}
                    onChange={tick(`window-override-${key(i)}`)}
                    tutorialId={`host.mois.cell.window-override-${pbSlug(r.node)}-${i}`}
                  />
                ),
              }]
              : []),
            {
              key: 'access',
              header: 'Access',
              width: 76,
              headAlign: 'left',
              /* the capture prints the tick box AND the word "Access" */
              render: (r: WindowAccessRow, i: number) => (
                <PBCheckbox
                  label="Access"
                  checked={ticks[`window-access-${key(i)}`] ?? Boolean(r.access)}
                  onChange={tick(`window-access-${key(i)}`)}
                  tutorialId={`host.mois.cell.window-access-${pbSlug(r.node)}-${i}`}
                />
              ),
            },
            {
              key: 'level',
              header: 'Access Level*',
              headAlign: 'center',
              /* three radios on an 83px pitch (95 capture px) */
              render: (r: WindowAccessRow, i: number) => (
                <span className="pb-row" style={{ gap: 0 }}>
                  {ACCESS_LEVELS.map((lv) => (
                    <span key={lv} style={{ width: 83, flex: 'none' }}>
                      <PBRadio
                        name={`wa-${key(i)}`}
                        label={lv}
                        checked={(level[key(i)] ?? r.level) === lv}
                        onChange={() => setLevel({ ...level, [key(i)]: lv })}
                      />
                    </span>
                  ))}
                </span>
              ),
            },
          ]}
        />
      </AccessPane>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Special Functions

   06 / 07 (profile): Function | Description | ☐ Execute, the Execute column
   uncaptioned. 17 (user): ☐ Override before ☐ Execute.
   ------------------------------------------------------------------------ */

export function SpecialFunctionsTab({ override = false, pad = PANE_PAD }: { override?: boolean; pad?: string }) {
  const [cur, setCur] = useState(0)
  /* the Execute ticks persist for the frame, so a chart window can check
     one (data/accessSettings.ts: Make Private Notes, Break Glass Private
     Notes, Can create controlled prescriptions — 3799750, 303227) */
  const [executes, setExecute] = useSpecialFunctions()
  /* a user's overrides live with this window, as the Module Access ones do */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [last, setLast] = useState<{ cell: string; checked: boolean } | null>(null)
  useScreenReport(last ? { cell: last.cell, checked: last.checked } : {})

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: pad }}>
      <style>{UM_ACCESS_CSS}</style>
      <AccessPane title="Function Access">
        <PBDataWindow<SpecialFunctionRow>
          rows={SPECIAL_FUNCTION_ROWS}
          current={cur}
          onCurrentChange={setCur}
          rules={false}
          rowTutorialId={(r) => `host.mois.row.function-${pbSlug(r.fn)}`}
          columns={[
            /* Description starts 391 capture px in, Execute's box 972 (06);
               at user level Override's box is at 890 (17) */
            { key: 'fn', header: 'Function', width: 298, headAlign: 'left' },
            { key: 'desc', header: 'Description', headAlign: 'left' },
            ...(override
              ? [{
                key: 'override',
                header: '',
                width: 72,
                render: (r: SpecialFunctionRow) => (
                  <PBCheckbox
                    label="Override"
                    checked={Boolean(overrides[r.fn])}
                    onChange={(v) => { setOverrides((o) => ({ ...o, [r.fn]: v })); setLast({ cell: `override-${pbSlug(r.fn)}`, checked: v }) }}
                    tutorialId={`host.mois.cell.function-override-${pbSlug(r.fn)}`}
                  />
                ),
              }]
              : []),
            {
              key: 'execute',
              header: '',
              /* to the pane's edge: the kit's scrollbar overlays the grid,
                 where the capture's takes 17px of it */
              width: 129,
              render: (r) => (
                <PBCheckbox
                  label="Execute"
                  checked={Boolean(executes[r.fn])}
                  onChange={(v) => { setExecute(r.fn, v); setLast({ cell: `execute-${pbSlug(r.fn)}`, checked: v }) }}
                  tutorialId={`host.mois.cell.execute-${pbSlug(r.fn)}`}
                />
              ),
            },
          ]}
        />
      </AccessPane>
    </div>
  )
}
