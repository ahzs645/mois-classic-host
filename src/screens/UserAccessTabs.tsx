import { useState } from 'react'
import type { ReactNode } from 'react'
import { PBBand, PBCheckbox, PBDataWindow, PBRadio, pbSlug } from '../pb'
import {
  ACCESS_FOOTNOTE, ACCESS_LEVELS, MODULE_ACCESS_ROWS, MODULE_PANE_W,
  REPORT_ACCESS_FOLDERS, SPECIAL_FUNCTION_ROWS, UM_RED, WINDOW_ACCESS_ROWS, WINDOW_PANE_W,
  type ModuleAccessRow, type SpecialFunctionRow, type WindowAccessRow,
} from '../data/userManagement'

/* ============================================================================
   The three access tabs that both the Security Profile Settings window and
   the User Account window draw.

   They are the same three DataWindows at both levels; the only difference the
   corpus proves is that the *user*-level `Module / Window Access` tab carries
   an extra `Override` column in both of its panes (`1e9141017547` against the
   profile-level `a1bd18a6fdfa`). That is what `override` switches.

   `Special Functions` and `Report Access` are captured at PROFILE level only
   (`e361c4e01d11`, `9e179125c6d6`). `302650` punts on the user-level versions
   — "Refer to the corresponding title in the Security Profile section above"
   — so the User Account window does not render these two, rather than
   rendering the profile-level pane with an invented Override column bolted
   on.

   NOT MEASURED. The two pane widths (277 / 659) are the capture's. The column
   widths *inside* each pane are not: these grids have no filter strip to read
   them off and the captures give captions only. The figures below are laid
   out to the captions and to the pane widths, and are not presented as
   measurements.
   ========================================================================= */

/* --------------------------------------------------------------------------
   Module / Window Access
   ------------------------------------------------------------------------ */

export function ModuleWindowAccessTab({ override = false }: { override?: boolean }) {
  const [modRow, setModRow] = useState(0)
  const [winRow, setWinRow] = useState(0)
  const [level, setLevel] = useState<Record<number, string>>(
    Object.fromEntries(WINDOW_ACCESS_ROWS.map((r, i) => [i, r.level ?? ACCESS_LEVELS[1]!])),
  )

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="pb-row" style={{ alignItems: 'stretch', gap: 3, flex: '1 1 auto', minHeight: 0, padding: 3 }}>
        {/* --- left pane: Module Access, 277px measured --- */}
        <div style={{ width: MODULE_PANE_W, flex: 'none', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <PBBand>Module Access</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow<ModuleAccessRow>
              rows={MODULE_ACCESS_ROWS}
              current={modRow}
              onCurrentChange={setModRow}
              rowTutorialId={(r) => `host.mois.row.module-${pbSlug(r.module)}`}
              columns={[
                { key: 'module', header: 'Module', width: override ? 132 : 190 },
                ...(override
                  ? [{
                    key: 'override',
                    header: 'Override',
                    width: 58,
                    align: 'center' as const,
                    /* `303191` sends the learner to the Data Exchange row's
                       Override box, so every one of them is anchorable. The
                       anchor rides the input, not a wrapping cell. */
                    render: (r: ModuleAccessRow) => (
                      <PBCheckbox
                        checked={Boolean(r.override)}
                        tutorialId={`host.mois.cell.override-${pbSlug(r.module)}`}
                      />
                    ),
                  }]
                  : []),
                {
                  key: 'access',
                  header: 'Access',
                  width: 58,
                  align: 'center',
                  render: (r: ModuleAccessRow) => (
                    <PBCheckbox
                      checked={Boolean(r.access)}
                      tutorialId={`host.mois.cell.access-${pbSlug(r.module)}`}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>

        {/* --- right pane: Window / Tree Access, 659px measured --- */}
        <div style={{ width: WINDOW_PANE_W, flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <PBBand>Window / Tree Access</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow<WindowAccessRow>
              rows={WINDOW_ACCESS_ROWS}
              current={winRow}
              onCurrentChange={setWinRow}
              rowTutorialId={(r) => `host.mois.row.window-${pbSlug(r.node)}`}
              columns={[
                {
                  key: 'node',
                  header: 'Window / Tree Node',
                  width: 250,
                  headAlign: 'left',
                  /* the column is hierarchical: a child sits one indent in */
                  render: (r: WindowAccessRow) => (
                    <span style={{ paddingLeft: r.depth * 14 }}>{r.node}</span>
                  ),
                },
                ...(override
                  ? [{
                    key: 'override',
                    header: 'Override',
                    width: 86,
                    render: (r: WindowAccessRow, i: number) => (
                      <PBCheckbox
                        label="Override"
                        checked={Boolean(r.override)}
                        tutorialId={`host.mois.cell.window-override-${pbSlug(r.node)}-${i}`}
                      />
                    ),
                  }]
                  : []),
                {
                  key: 'access',
                  header: 'Access',
                  width: 76,
                  /* the capture prints the tick box AND the word "Access" */
                  render: (r: WindowAccessRow, i: number) => (
                    <PBCheckbox
                      label="Access"
                      checked={Boolean(r.access)}
                      tutorialId={`host.mois.cell.window-access-${pbSlug(r.node)}-${i}`}
                    />
                  ),
                },
                {
                  key: 'level',
                  header: 'Access Level*',
                  render: (r: WindowAccessRow, i: number) => (
                    <span className="pb-row" style={{ gap: 10 }}>
                      {ACCESS_LEVELS.map((lv) => (
                        <PBRadio
                          key={lv}
                          name={`wa-${i}`}
                          label={lv}
                          checked={(level[i] ?? r.level) === lv}
                          onChange={() => setLevel({ ...level, [i]: lv })}
                        />
                      ))}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* the footnote is drawn INSIDE the pane, under the right-hand grid */}
      <div style={{ flex: 'none', padding: '2px 6px 4px' }}>{ACCESS_FOOTNOTE}</div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Special Functions — profile level only
   ------------------------------------------------------------------------ */

/** The two BH-internal rows render entirely in #FF0000 — every cell. */
export function SpecialFunctionsTab() {
  const [cur, setCur] = useState(0)
  const red = (r: SpecialFunctionRow, text: ReactNode) =>
    (r.bh ? <span style={{ color: UM_RED }}>{text}</span> : text)

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PBBand>Function Access</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow<SpecialFunctionRow>
          rows={SPECIAL_FUNCTION_ROWS}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(r) => `host.mois.row.function-${pbSlug(r.fn)}`}
          columns={[
            {
              key: 'fn',
              header: 'Function',
              width: 260,
              headAlign: 'left',
              render: (r) => red(r, r.fn),
            },
            {
              key: 'desc',
              header: 'Description',
              headAlign: 'left',
              render: (r) => red(r, r.desc),
            },
            {
              key: 'execute',
              header: 'Execute',
              width: 96,
              /* the cell is a tick box AND the word "Execute", both of which
                 go red on a BH-internal row */
              render: (r) => (
                <span style={r.bh ? { color: UM_RED } : undefined}>
                  <PBCheckbox
                    label="Execute"
                    checked={Boolean(r.execute)}
                    tutorialId={`host.mois.cell.execute-${pbSlug(r.fn)}`}
                  />
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Report Access — profile level only

   A single-column expander tree on a #C8DCFA FULL-PANE background: the band
   colour is the pane, not a stripe. The capture scrolls, so the folder list
   below is the visible run and not the whole of it — no child report names
   are captured under any folder, so every folder opens on nothing.
   ------------------------------------------------------------------------ */

export function ReportAccessTab() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(REPORT_ACCESS_FOLDERS))

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PBBand>Report Access</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3, background: '#c8dcfa' }}>
        <PBDataWindow<{ folder: string }>
          rows={[]}
          groups={REPORT_ACCESS_FOLDERS}
          groupBy={(r) => r.folder}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          groupTutorialId={(g) => `host.mois.group.${pbSlug(g)}`}
          gutter={false}
          head={false}
          rules={false}
          style={{
            ['--pb-dw-group' as string]: '#c8dcfa',
            ['--pb-dw-row' as string]: '#c8dcfa',
            ['--pb-dw-row-alt' as string]: '#c8dcfa',
          }}
          columns={[{ key: 'folder', header: '' }]}
        />
      </div>
    </div>
  )
}
