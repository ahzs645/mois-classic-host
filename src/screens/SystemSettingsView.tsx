import { useEffect, useMemo, useRef, useState } from 'react'
import { PBCommandRow, PBDataWindow, PBInput, PBViewHeader } from '../pb'
import { MOIS_TODAY } from '../data/patients'
import {
  LOCKOUT_ENDS_ROW, LOCKOUT_MESSAGE_ROW, LOCKOUT_RELEASED_KEY,
  SETTING_BANDS, SYSTEM_SETTINGS, SYSTEM_SETTINGS_KEY, settingRowId, settingSlug, type SystemSetting,
} from '../data/systemSettings'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'

/* ============================================================================
   System Settings — Administration ▸ Configuration ▸ System Settings.

   The window as article 303124 shows the current build (`00d2c33d…`): a
   Save / Undo / Close Window command row with a Find box beside it, then
   every band of settings, alphabetical and collapsed, each opened with its
   `+`. An open band lists name / value / description rows on alternating
   grey and white; the current row goes salmon and its value becomes an
   edit box (`0f26ee79…`). Under the grid, a Description panel repeats the
   current row's description, and the footer carries Record Created and
   Last Modified (`f10608fc…`: "Record Created: 13.04.26 09:12 AIHS - John
   Aitchison").

   The bands and rows are `data/systemSettings.ts`, each transcribed from
   303124's crop of that band.

   Behaviour, kept minimal but real:
     - typing in the current row's value box is an unsaved edit;
     - Save (F2) commits the edits and stamps Last Modified. Committed
       values live in the frame's session store (SYSTEM_SETTINGS_KEY), so
       they survive closing the window — which is what lets a saved LOCKOUT
       band lock the next login (303352; screens/LockoutWindows.tsx);
     - Undo throws away unsaved edits;
     - Close Window shuts the sheet (`onClose`), leaving the work area
       empty until System Settings is opened again from the tree.
   A grey (`locked`) value — a PROTECTED row — cannot be typed in: 303124,
   "these settings are only adjusted through the database".

   Reported to the frame (host.screen): `band` — the band last opened;
   `row` — the current row's anchor id; `draft` — an edit is waiting to be
   saved; `saved` — Save was pressed and no edit is pending.
   ========================================================================= */

/** yy.mm.dd hh:mm, the footer's stamp format in `f10608fc…` */
function stamp(): string {
  const [y, m, d] = MOIS_TODAY.split('.')
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${y!.slice(2)}.${m}.${d}  ${hh}:${mm}`
}

export function SystemSettingsView({ onClose }: { onClose?: () => void }) {
  const [curId, setCurId] = useState<string | null>(null)
  const [find, setFind] = useState('')
  /* 00d2c33d: the window opens with every band shut */
  const [collapsed, setCollapsed] = useState(() => new Set(SETTING_BANDS))
  const [lastBand, setLastBand] = useState<string | null>(null)
  /* committed values (after Save) and pending edits, by row id */
  const [committed, setCommitted] = useSessionState<Record<string, string>>(SYSTEM_SETTINGS_KEY, {})
  const [, setReleased] = useSessionState<boolean>(LOCKOUT_RELEASED_KEY, false)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [modified, setModified] = useState('')
  const [saved, setSaved] = useState(false)

  const term = find.trim().toLowerCase()
  const rows = useMemo(
    () => (term ? SYSTEM_SETTINGS.filter((s) => `${s.name} ${s.desc}`.toLowerCase().includes(term)) : SYSTEM_SETTINGS),
    [term],
  )
  const bands = term ? SETTING_BANDS.filter((b) => rows.some((r) => r.band === b)) : SETTING_BANDS
  const selected = curId ? SYSTEM_SETTINGS.find((s) => settingRowId(s) === curId) ?? null : null
  const valueOf = (s: SystemSetting) => {
    const id = settingRowId(s)
    return edits[id] ?? committed[id] ?? s.value
  }
  const dirty = Object.keys(edits).length > 0

  useScreenReport({
    band: lastBand ? settingSlug(lastBand) : null,
    row: curId,
    saved: saved && !dirty,
    draft: dirty,
  })

  const gridRef = useRef<HTMLDivElement>(null)
  const onCollapsed = (next: Set<string>) => {
    /* the band whose `+` was just pressed open */
    const opened = [...collapsed].find((b) => !next.has(b))
    if (opened) setLastBand(opened)
    setCollapsed(next)
  }
  /* bring a band that has just been opened to the top of the grid, so its
     rows are on screen rather than below the fold */
  useEffect(() => {
    if (!lastBand) return
    const grid = gridRef.current
    const scroller = grid?.querySelector<HTMLElement>('.pb-dw__scroll')
    const bandRow = grid?.querySelector<HTMLElement>(`[data-tutorial-id="host.mois.group.${settingSlug(lastBand)}"]`)
    if (scroller && bandRow) scroller.scrollTop = bandRow.offsetTop
  }, [lastBand])

  const save = () => {
    if (dirty) {
      setCommitted((c) => ({ ...c, ...edits }))
      /* a newly saved lock is a new lock, whatever became of the last one */
      if (LOCKOUT_MESSAGE_ROW in edits || LOCKOUT_ENDS_ROW in edits) setReleased(false)
      setEdits({})
      setModified(stamp())
    }
    setSaved(true)
  }
  const undo = () => { setEdits({}) }

  return (
    <>
      <PBViewHeader title="System Settings" />
      <div className="pb-row" style={{ gap: 0, flex: 'none' }}>
        <PBCommandRow
          commands={[
            { label: 'Save', onClick: save },
            { label: 'Undo', onClick: undo },
            { label: 'Close Window', onClick: () => onClose?.() },
          ]}
        />
        <label className="pb-row" style={{ flex: 1, gap: 3, paddingRight: 4 }}>
          Find:
          <PBInput
            aria-label="Find system setting"
            value={find}
            onChange={(event) => { setFind(event.target.value) }}
            style={{ flex: 1, minWidth: 0 }}
          />
        </label>
      </div>
      <div ref={gridRef} className="pb-system-settings-grid" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow<SystemSetting>
          head={false}
          hscroll
          rows={rows}
          current={selected ? rows.indexOf(selected) : -1}
          onCurrentChange={(index) => {
            const row = rows[index]
            if (row) { setCurId(settingRowId(row)); setSaved(false) }
          }}
          groupBy={(r) => r.band}
          groups={bands}
          groupLabel={(id) => id}
          /* a Find shows the matching rows under open bands, the way
             `0f26ee79…` shows APP SETTING open over its one match */
          collapsed={term ? new Set() : collapsed}
          onCollapsedChange={onCollapsed}
          groupTutorialId={(g) => `host.mois.group.${settingSlug(g)}`}
          rowTutorialId={(r) => `host.mois.row.${settingRowId(r)}`}
          columns={[
            { key: 'name', header: '', width: 252 },
            {
              key: 'value',
              header: '',
              width: 300,
              render: (r) => {
                const value = valueOf(r)
                if (r === selected && !r.locked) {
                  return (
                    <PBInput
                      w="100%"
                      value={value}
                      aria-label={r.name}
                      data-tutorial-id="host.mois.field.setting-value"
                      onChange={(event) => {
                        const next = event.target.value
                        setEdits((e) => ({ ...e, [settingRowId(r)]: next }))
                        setSaved(false)
                      }}
                    />
                  )
                }
                return r.locked ? <span style={{ color: '#a0a0a0' }}>{value}</span> : value
              },
            },
            { key: 'desc', header: '', width: 480 },
          ]}
        />
      </div>
      <div className="pb-row" style={{ alignItems: 'flex-start', padding: '4px 6px', gap: 8, flex: 'none' }}>
        <span className="pb-form__label" style={{ width: 96 }}>Description:</span>
        <div className="pb-field" style={{ flex: '1 1 auto', height: 56, padding: '2px 4px' }} data-tutorial-id="host.mois.field.description">
          {selected?.desc}
        </div>
      </div>
      <div className="pb-row" style={{ padding: '0 6px 4px', gap: 40, flex: 'none' }} data-tutorial-id="host.mois.field.last-modified">
        <span className="pb-form__label">Record Created:</span>
        <span>SYSTEM</span>
        <span className="pb-form__label">Last Modified:</span>
        <span>{modified ? `${modified}  JALA2` : ''}</span>
      </div>
    </>
  )
}
