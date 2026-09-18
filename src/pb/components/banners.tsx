import type { ReactNode } from 'react'

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
   field set and the trailing encounter block vary.                        */
export function PBIdentityStrip({
  fields, encounter, onEncounterLookup,
}: {
  /** `w` is the painted column width; the last field does not need one */
  fields: { label: string; value?: ReactNode; w?: number }[]
  /** omit for screens that have no active-encounter block */
  encounter?: ReactNode
  onEncounterLookup?: () => void
}) {
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
          <span className="pb-identity__enc-value">{encounter}</span>
          <span style={{ width: 6 }} />
          <button className="pb-dw__dots" onClick={onEncounterLookup}>…</button>
        </span>
      )}
    </div>
  )
}
