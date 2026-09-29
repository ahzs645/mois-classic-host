import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { usePBInstrumentation } from '../instrumentation'

/* --- PBPatientBannerYellow ----------------------------------------------
   The compact two-line yellow strip on the encounter window.             */
export function PBPatientBannerYellow({
  name, bchn, home, work, cell, dob, sex, provider,
}: {
  name: string; bchn: string; home?: string; work?: string; cell?: string
  dob: string; sex: string; provider?: string
}) {
  return (
    <div className="pb-banner-yellow" style={{ display: 'block' }}>
      <div className="pb-row" style={{ gap: 0 }}>
        <span>NAME:&nbsp;</span><b>{name}</b>
        <span className="pb-row__spacer" />
        <span>DoB:&nbsp;</span><b>{dob}</b>
        <span style={{ width: 16 }} /><b>{sex}</b>
        <span style={{ width: 22 }} /><span>Service Provider:&nbsp;</span><b>{provider}</b>
        <span style={{ width: 8 }} />
      </div>
      <div className="pb-row" style={{ gap: 0 }}>
        <span>BCHN:&nbsp;</span><b>{bchn}</b>
        <span style={{ width: 30 }} />
        <span style={{ textDecoration: 'underline' }}>Home:&nbsp;</span><b style={{ textDecoration: 'underline' }}>{home}</b>
        <span style={{ width: 40 }} /><span>Work:&nbsp;</span><b>{work}</b>
        <span className="pb-row__spacer" />
        <span>Cell:&nbsp;</span><b>{cell}</b>
        <span style={{ width: 120 }} />
      </div>
    </div>
  )
}

/* --- PBPatientBannerBlue -------------------------------------------------
   The full two-band blue banner on child windows such as Patient Service
   Event. Each cell is an uppercase caption over a bold value.            */
export type PBBannerCell = { label: string; value: ReactNode; w?: number; plain?: boolean }

export function PBPatientBannerBlue({ top, bottom }: { top: PBBannerCell[]; bottom: PBBannerCell[] }) {
  const band = (cells: PBBannerCell[], cls: string) => (
    <div className={cls}>
      {cells.map((c, i) => (
        <div className="pb-banner-blue__cell" key={i} style={{ width: c.w, flex: c.w ? 'none' : '1 1 auto', minWidth: 0 }}>
          <span className="pb-banner-blue__label">{c.label}</span>
          <span className={`pb-banner-blue__value${c.plain ? ' pb-banner-blue__value--plain' : ''}`}>{c.value}</span>
        </div>
      ))}
    </div>
  )
  return (
    <div className="pb-banner-blue">
      {band(top, 'pb-banner-blue__top')}
      {band(bottom, 'pb-banner-blue__bottom')}
    </div>
  )
}

/* --- PBPatientBand -------------------------------------------------------
   The single blue patient band a record window or form opens with: CHART
   NO. / PATIENT (F/M/L) / DATE OF BIRTH / GENDER / PERSONAL HEALTH NO. /
   PREFERRED PHONE NUMBER, each a small caption over a bold value.

   Not PBPatientBannerBlue: the windows that paint this band do not use the
   pb-banner-blue classes (their gradients, sizes and padding are their own,
   several capture-measured), so a single-band mode of the two-band banner
   would change how they look. This draws their existing markup instead; the
   container's class, style (gradient included) and anchor are the caller's,
   and `layout` picks how the cells are laid:

     'stack'   <div style={{ width, flex: w ? 'none' : '1 1 auto', display: flex, column }}>
                 <span style={{ fontSize: 11 }}>CAPTION</span><strong style={{ fontSize: 13, whiteSpace: nowrap }}>value</strong>
     'placed'  the same pair in <span style={{ position: absolute, display: flex, column, left, top }}>
     'inline'  <span style={{ width, display: inline-flex, column }}><span style={{ fontSize: '0.92em' }}>CAPTION</span><b>value</b></span>
     'grid'    every caption <span style={labelStyle}>, then every value <b> — the
               container's grid template lays them out in two rows
     'caption' <span>CAPTION<strong>value</strong></span> (the container's class styles it)

   Replaces:
     QuickEntryWindows:~579  layout="stack" className="pb-row" anchor="host.mois.field.qe-chart-banner"
       style={{ background: 'linear-gradient(#2f8fd0, #1d6aa8)', color: '#fff', padding: '4px 8px', gap: 10, flex: 'none', margin: '6px 6px 0' }}
       cells w 90 / 230 / 240 / 70 / 150 / (none)
     Phq9FormWindow:~173     layout="placed" className="pb-legacy-dform__patient"
       style={{ position: 'relative', display: 'block', height: 68, flex: '0 0 auto', padding: 0, background: 'linear-gradient(#1871b5, #4ab2e7)' }}
       cells at (8,5) (93,5) (310,5) (93,37) (169,37) (310,37) — the capture's positions
     MarWindows:~126 MarBanner  layout="inline" className="pb-row"
       style={{ gap: 0, padding: '2px 6px', color: '#fff', background: 'linear-gradient(#27a7e0, #1583c4)' }}
       cells w 100 / 260 / 220 / 80 / (none); MarBanner's `flex: none` wrapper and children stay
     scheduler/AppointmentSeriesWindows:~683  layout="grid" labelStyle={{ color: '#fff', fontSize: 10 }}
       style={{ background: 'linear-gradient(var(--pb-banner-top-a, #2f6fb4), var(--pb-banner-top-b, #1c4f8c))', color: '#fff',
         padding: '4px 8px', flex: 'none', display: 'grid', gridTemplateColumns: '90px 210px 150px 70px 140px 1fr' }}
     LegacyDynamicFormWindow:~31  layout="caption" className="pb-legacy-dform__patient"  */
export type PBPatientBandCell = { label: ReactNode; value: ReactNode; w?: number; left?: number; top?: number }

export function PBPatientBand({
  cells, layout = 'stack', className, style, anchor, labelStyle,
}: {
  cells: PBPatientBandCell[]
  layout?: 'stack' | 'placed' | 'inline' | 'grid' | 'caption'
  className?: string
  style?: CSSProperties
  /** data-tutorial-id on the band */
  anchor?: string
  /** the caption style of the 'grid' layout */
  labelStyle?: CSSProperties
}) {
  const pair = (c: PBPatientBandCell) => (
    <><span style={{ fontSize: 11 }}>{c.label}</span><strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{c.value}</strong></>
  )
  return (
    <div className={className} data-tutorial-id={anchor} style={style}>
      {layout === 'grid' ? (
        <>
          {cells.map((c, i) => <span key={`l${i}`} style={labelStyle}>{c.label}</span>)}
          {cells.map((c, i) => <b key={`v${i}`}>{c.value}</b>)}
        </>
      ) : cells.map((c, i) => {
        if (layout === 'placed') {
          return <span key={i} style={{ position: 'absolute', display: 'flex', flexDirection: 'column', left: c.left, top: c.top }}>{pair(c)}</span>
        }
        if (layout === 'inline') {
          return (
            <span key={i} style={{ width: c.w, display: 'inline-flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.92em' }}>{c.label}</span><b>{c.value}</b>
            </span>
          )
        }
        if (layout === 'caption') return <span key={i}>{c.label}<strong>{c.value}</strong></span>
        return <div key={i} style={{ width: c.w, flex: c.w ? 'none' : '1 1 auto', display: 'flex', flexDirection: 'column' }}>{pair(c)}</div>
      })}
    </div>
  )
}

/* --- PBSummaryBand -------------------------------------------------------- */
export function PBSummaryBand({ title, links }: { title: ReactNode; links?: string[] }) {
  return (
    <div className="pb-summaryband">
      <span>{title}</span>
      <span className="pb-summaryband__spacer" />
      {links?.map((l) => <button key={l} className="pb-link">{l}</button>)}
    </div>
  )
}

/* --- PBIdentityStrip -----------------------------------------------------
   Every chart view carries the same line under its command row. Only the
   field set and the trailing encounter block vary.

   The Active ENC# block is the frame's, not the screen's: "Choose a specific
   Encounter and make it the Active Encounter by pressing on the ellipses"
   (303793 `7e1fd910…png`), and it follows an open Encounter Detail Window.
   A host supplies both through PBActiveEncounterContext; a screen that
   passes the "NO ENCOUNTER" placeholder then shows the frame's encounter,
   and its "…" opens the frame's picker unless the screen passes its own
   `onEncounterLookup`. The "…" is anchored host.mois.lookup.active-encounter. */
export const PBActiveEncounterContext = createContext<{ encounter: string | null; onLookup?: () => void } | null>(null)

export function PBIdentityStrip({
  fields, encounter, onEncounterLookup,
}: {
  /** `w` is the painted column width; the last field does not need one */
  fields: { label: string; value?: ReactNode; w?: number }[]
  /** omit for screens that have no active-encounter block */
  encounter?: ReactNode
  onEncounterLookup?: () => void
}) {
  const active = useContext(PBActiveEncounterContext)
  const host = usePBInstrumentation()
  const shown = encounter === 'NO ENCOUNTER' && active?.encounter ? active.encounter : encounter
  const lookup = onEncounterLookup ?? active?.onLookup
  return (
    <div className="pb-identity">
      {fields.map((f, i) => (
        <span className="pb-identity__field" key={i} style={{ width: f.w }}>
          <span>{f.label}&nbsp;</span>
          <b>{f.value}</b>
        </span>
      ))}
      {encounter !== undefined && (
        <span className="pb-identity__enc">
          <span>Active ENC#:&nbsp;</span>
          <span className="pb-identity__enc-value" data-tutorial-id={host?.anchor('field', 'active-encounter')}
            style={shown !== encounter ? { color: '#000' } : undefined}>{shown}</span>
          <span style={{ width: 6 }} />
          <button className="pb-dw__dots" data-tutorial-id={host?.anchor('lookup', 'active-encounter')}
            onClick={() => { host?.report('lookup', { field: 'active-encounter' }); lookup?.() }}>…</button>
        </span>
      )}
    </div>
  )
}
