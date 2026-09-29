import type { CSSProperties, ReactNode } from 'react'
import { PBButton, PBInput, pbSlug, usePBInstrumentation } from '../pb'

/* ============================================================================
   The form pieces every MOIS window lays itself out with, copied into some
   forty screens before this kit:
     - `NAVY`           — the navy inks, one named token per value in use;
     - `FormLabel` / `FormLine` — the label column and the label + control row;
     - `ReadOnlyField`  — the grey read-only edit box;
     - `SectionCaption` — the navy bold caption ruled off underneath;
     - `CaptionGroup`   — a block with such a caption (outlined, or a fieldset);
     - `DialogFooter`   — the centred button row along a window's foot.

   Each reproduces its copies' markup exactly — the same elements, classes,
   inline declarations and anchors — when given the props in its header
   (the migration guide for the next wave). Two things may differ and do not
   change a pixel: the order of declarations inside a `style`, and how the
   text of an element is split into text nodes. The DOM census (webforms
   lib/host-emulators/__tests__/mois-dom-census.test.tsx) sorts the former
   and serialises through the latter, so a faithful migration diffs clean.

   The defaults are the admin kit's (adminKit Line / NavyHead /
   CentredFooter); every other copy names its own values.
   ========================================================================= */

/* --- NAVY ------------------------------------------------------------------
   Four navies are painted, and they are not one colour: keep each call
   site's own. `NAVY_BOLD` is the scheduler's `{ color, fontWeight: 700 }`.

     win     #000080  Win32 navy — the kit's --pb-text-head, the classic
                      `pb-viewhead` gradient start; adminKit NavyHead,
                      ClinicEditorWindows Head/Group, ExchangeKit Heading
                      (81237c69, fcf7937c, 46924bab), OrgRoleWindows Group,
                      the report parameter windows' Section (ReportParameter,
                      ReportSpec, ReportBuilder/Tools, Audit, Access,
                      PatientsByProcedure, AmcareScorecard), QuickEntryEditors,
                      PrintEncounterNoteDialog, WcbFormWindow,
                      scheduler/SchedulerDialog + GroupBooking + AppointmentSeries
     caption #0a246a  the Windows 2000 active-caption navy — AdminExchangeKit
                      SectionHead, DocumentCenter's filter captions,
                      LaunchMode / myhealthkey "Patient Identification",
                      UserAgreement's Version Detail, CareConnect's title,
                      ClaimWizards' "Advanced Medical Reports" band (E2 stream;
                      no capture is cited for the value)
     billing #0b3d8c  the LFP / PBF window section captions — LfpViews
                      SectionHead (LFP - Setup `7280452f…`, Provider
                      Registration `7a6c86da…`), PbfViews section / box heads
     dform   #000094  the dynamic-form ink — Phq9FormWindow (art. 303102
                      `722c66136ce5…`), BloodPressureFormWindow (art. 303104
                      `62132587030c…`), MeasureCalculatorBodies               */
export const NAVY = {
  win: '#000080',
  caption: '#0a246a',
  billing: '#0b3d8c',
  dform: '#000094',
} as const

export type NavyInk = (typeof NAVY)[keyof typeof NAVY]

/** scheduler/SchedulerDialog's `NAVY` — bold navy caption text. */
export const NAVY_BOLD: CSSProperties = { color: NAVY.win, fontWeight: 700 }

/* --- FormLabel ---------------------------------------------------------------
   The label column: `<span className="pb-form__label" style={{ width, flex: 'none' }}>`.
   `minW` sets a min-width instead and drops `flex: none` (UMField);
   `flex={false}` drops it on its own; `className={false}` drops the class;
   `align` is textAlign, `color` the ink, `style` any extra declaration.

   Replaces the label-only copies:
     ExchangeKit Lbl                  — w={w}
     AdminExchangeKit FieldLabel      — w={w ?? 90} align={right ? 'right' : undefined}
     AdverseEventWindows:~141 Label   — w={w}
     TaskListView:~78 Label           — w={w ?? 70}
     billing/InvoiceView:~72 L        — w={w ?? 92}
     FavouriteMedicationListView:~53  — w={w ?? 96} style={{ alignSelf: 'flex-start', paddingTop: 2 }}
     ManualEntryView:~45 Label        — w={w} className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}
     PaperFormsView:~72 Label         — className={false} flex={false} style={{ lineHeight: '21px', whiteSpace: 'nowrap' }}
                                        align={right ? 'right' : 'left'}
   Not a fit: BloodPressureFormWindow's Label is an absolutely placed <div>
   on the form's canvas, not a label column.                              */
export type FormLabelProps = {
  children?: ReactNode
  w?: number | string
  minW?: number | string
  flex?: boolean
  className?: string | false
  align?: 'left' | 'center' | 'right'
  color?: string
  style?: CSSProperties
}

export function FormLabel({ children, w, minW, flex, className = 'pb-form__label', align, color, style }: FormLabelProps) {
  const s: CSSProperties = {}
  if (color !== undefined) s.color = color
  if (w !== undefined) s.width = w
  if (minW !== undefined) s.minWidth = minW
  if (flex ?? minW === undefined) s.flex = 'none'
  Object.assign(s, style)
  if (align !== undefined) s.textAlign = align
  return <span className={className || undefined} style={s}>{children}</span>
}

/* --- FormLine ------------------------------------------------------------------
   A label, then the control(s), on one line:
   `<div className="pb-row" style={{ gap, padding, alignItems, minHeight }}>` +
   FormLabel + children. `stack` wraps the children in a column span with
   that gap (the Access report's multi-control lines); `noLabel` draws the
   row without a label cell (InvoiceView's Row, whose labels are inside).
   Label props are FormLabel's, prefixed: labelClass, labelAlign, labelColor,
   labelStyle, labelFlex; `w` / `minW` are the label's width.

   Replaces:
     adminKit Line, ClinicEditorWindows:~133 Line (verbatim copy)
       — w={w ?? 92} padding="1px 0" align="center" minHeight={22} labelAlign={right ? 'right' : undefined} style={style}
     ReportParameterWindows:~81 Line — w={w ?? 90} padding="2px 10px" minHeight={21} style={style}
     reports/AuditReportWindows:~77 Line — w={90} padding="2px 10px" minHeight={21}
     PatientsByProcedureWindow:~37 Line — w={80} padding="2px 10px" minHeight={21}
     reports/AccessReportWindows:~169 Line — w={w ?? 90} gap={8} padding="1px 0" minHeight={22} align="flex-start"
       labelStyle={{ paddingTop: 3 }} labelAlign={align} stack={4}
     scheduler/AppointmentSeriesWindows:~166 Line — w={w ?? 92} minHeight={22} labelClass={false}
     PbfWindows:~80 Row — w={w ?? 92} padding="2px 0" labelClass={false} labelColor="#6d6d6d" style={style}
     MyHealthKeyChartView:~77 Line — w={w ?? 110} labelClass={false}
     UserManagementKit UMField — minW={w ?? 118} padding="1px 0"
     billing/ClaimWizards:~85 FRow — w={w ?? 110} padding="2px 0" align="center" labelClass={false}
     billing/InvoiceView:~76 Row — noLabel padding="1px 0" align="center" style={{ flex: 'none' }}
     billing/SentClaimWindows:~94 KV — w={w ?? 96} gap={8} className={false} style={{ display: 'flex', lineHeight: '18px' }}
       labelClass={false}, children <b>{value}</b>
     WcbFormWindow:~393 Line — w={142} className={false} labelClass={false} align={top ? 'flex-start' : 'center'}
       padding="4px 8px 4px 23px" minHeight={25} style={{ display: 'flex', borderTop: LIGHT_RULE }}
   (ExchangeKit Lbl / AdminExchangeKit FieldLabel / the local Labels are
   FormLabel, above.)                                                      */
export function FormLine({
  label, children, w, minW, labelFlex, labelClass, labelAlign, labelColor, labelStyle,
  gap = 6, padding, align, minHeight, className = 'pb-row', style, stack, noLabel,
}: {
  label?: ReactNode
  children?: ReactNode
  w?: number | string
  minW?: number | string
  labelFlex?: boolean
  labelClass?: string | false
  labelAlign?: 'left' | 'center' | 'right'
  labelColor?: string
  labelStyle?: CSSProperties
  gap?: number
  padding?: number | string
  /** the row's alignItems */
  align?: CSSProperties['alignItems']
  minHeight?: number
  /** the row's class; `false` for none (then pass `display: 'flex'` in style) */
  className?: string | false
  style?: CSSProperties
  /** wrap the controls in a column span with this gap */
  stack?: number
  noLabel?: boolean
}) {
  const s: CSSProperties = { gap }
  if (padding !== undefined) s.padding = padding
  if (align !== undefined) s.alignItems = align
  if (minHeight !== undefined) s.minHeight = minHeight
  Object.assign(s, style)
  return (
    <div className={className || undefined} style={s}>
      {!noLabel && (
        <FormLabel w={w} minW={minW} flex={labelFlex} className={labelClass} align={labelAlign} color={labelColor} style={labelStyle}>
          {label}
        </FormLabel>
      )}
      {stack !== undefined ? <span style={{ display: 'flex', flexDirection: 'column', gap: stack }}>{children}</span> : children}
    </div>
  )
}

/* --- ReadOnlyField -------------------------------------------------------------
   The grey read-only edit box MOIS fills itself: PbfWindows:~88 `RO`
   (w={w ?? 110}, bold). ClinicEditorWindows' LOCKED / IDENT faces are the
   same idea in another grey (#e8e8e8 bold / #e4e4e4 bold) — pass `face`.  */
export function ReadOnlyField({ value, w = 110, bold, face = '#e8e8e8', anchor }: {
  value: string; w?: number | string; bold?: boolean; face?: string
  /** the box's own anchor (`host.mois.field.…`) */
  anchor?: string
}) {
  return <PBInput w={w} readOnly value={value} style={{ background: face, fontWeight: bold ? 700 : undefined }} data-tutorial-id={anchor} />
}

/* --- SectionCaption ----------------------------------------------------------
   A navy bold caption with a rule under it — "Clinic Identification".
   `<div style={{ color, fontWeight: 700, padding, borderBottom: 1px solid rule }}>`,
   defaults NAVY.win / '6px 8px 3px' / '#a0a0a0'. `rule={false}` drops the
   rule, `ruleTop` adds one above, `fixed` adds `flex: none`. `inner` moves
   the ink onto an inner element (`'span'`: color + bold, `'b'`: color).
   `row` gives the div `pb-row`; `right` sits at the right after a
   `pb-row__spacer`, or — with `grow` — after the caption in a
   `flex: 1 1 auto` span (the span is drawn with or without `right`).

   Replaces:
     adminKit NavyHead                    — fixed
     ClinicEditorWindows:~145 Head        — fixed style={style}
     AdminExchangeKit SectionHead         — color={NAVY.caption} padding="6px 6px 3px" rule="#b8b8b8" fixed row grow right={right}
     ExchangeKit Heading                  — inner="span" padding="6px 10px 3px" rule="#b8b8b8" style={{ margin: '0 0 6px', ...style }}
     LfpViews:~63 SectionHead             — inner="b" color={NAVY.billing} padding="6px 10px 2px" rule="#b8b8b8" fixed row right={right}
     ReportParameterWindows:~74 Section,
     ReportSpecWindow:~171 Section,
     PatientsByProcedureWindow:~32 Section — padding="5px 8px 3px" ruleTop="#a0a0a0" style={{ marginTop: 4 }}
     reports/AuditReportWindows:~73 Section — padding="5px 8px 3px" style={{ marginTop: 2 }}
     reports/AccessReportWindows:~166 Section — padding="4px 8px 3px"
     AmcareScorecardView:~104 Section     — padding="10px 10px 4px"
   (the group-with-caption copies are CaptionGroup, below)                 */
export type SectionCaptionProps = {
  children?: ReactNode
  color?: string
  /** `false`: no padding at all (the Chart Exchange captions) */
  padding?: number | string | false
  rule?: string | false
  ruleTop?: string
  fixed?: boolean
  inner?: 'span' | 'b'
  row?: boolean
  grow?: boolean
  right?: ReactNode
  style?: CSSProperties
  /** data-tutorial-id on the caption */
  anchor?: string
}

export function SectionCaption({
  children, color = NAVY.win, padding = '6px 8px 3px', rule = '#a0a0a0', ruleTop, fixed, inner, row, grow, right, style, anchor,
}: SectionCaptionProps) {
  const s: CSSProperties = {}
  if (!inner) { s.color = color; s.fontWeight = 700 }
  if (ruleTop) s.borderTop = `1px solid ${ruleTop}`
  if (rule) s.borderBottom = `1px solid ${rule}`
  if (padding !== false) s.padding = padding
  if (fixed) s.flex = 'none'
  Object.assign(s, style)
  const text = inner === 'span' ? <span style={{ color, fontWeight: 700 }}>{children}</span>
    : inner === 'b' ? <b style={{ color }}>{children}</b>
      : children
  return (
    <div className={row ? 'pb-row' : undefined} data-tutorial-id={anchor} style={s}>
      {grow ? <><span style={{ flex: '1 1 auto' }}>{text}</span>{right}</> : text}
      {!grow && right && <><span className="pb-row__spacer" />{right}</>}
    </div>
  )
}

/* --- CaptionGroup ------------------------------------------------------------
   A block of fields under a navy caption, in one of two frames:

   'box' (default): `<div style={{ border: 1px solid border, boxShadow, padding, minWidth: 0 }}>`
     + a SectionCaption (`caption` props; default padding '0 0 6px', no rule)
     + children. `fill` makes it a flex column that can shrink (a grid
     inside); `shrink={false}` drops `minWidth: 0`.
       OrgRoleWindows:~215 Group             — style={style}
       ClinicEditorWindows:~533 Group        — fill={fill} style={style}
       scheduler/AppointmentSeriesWindows:~157 Group — anchor={id} border="#c8c8c8"
         shadow="inset 1px 1px 0 #fff" padding="4px 8px 8px" shrink={false} style={style}
         caption={{ padding: '2px 0 4px', rule: '#d8d8d8', style: { marginBottom: 4 } }}

   'fieldset': `<fieldset className="pb-fieldset" style>` +
     `<legend className="pb-fieldset__legend" style={legendStyle ?? NAVY_BOLD}>` +
     `<div style={bodyStyle}>` — not PBGroup, whose body div carries the
     pb-fieldset__body class these do not.
       scheduler/QuickRegistration:~23 Group — style={{ margin: '0 0 6px' }}
         bodyStyle={{ display: 'grid', gridTemplateColumns: '92px 1fr', rowGap: 3, alignItems: 'center', padding: '2px 4px' }}
       scheduler/PreSlotWizard:~61 Section   — style={{ margin: '0 0 6px' }} bodyStyle={{ padding: '2px 6px' }}
         title={<><span style={{ color: '#c00000', marginRight: 4 }}>{n}.</span>{title}</>}   */
export function CaptionGroup({
  title, children, frame = 'box', border = '#d4d4d4', shadow, padding = '4px 10px 8px', shrink = true, fill,
  caption, legendStyle, bodyStyle, bodyClassName, anchor, style,
}: {
  title: ReactNode
  children?: ReactNode
  frame?: 'box' | 'fieldset'
  border?: string
  shadow?: string
  padding?: number | string
  shrink?: boolean
  fill?: boolean
  caption?: Omit<SectionCaptionProps, 'children'>
  legendStyle?: CSSProperties
  bodyStyle?: CSSProperties
  /** 'fieldset': the body's class (PatientContactDialog's `pb-fieldset__body`) */
  bodyClassName?: string
  anchor?: string
  style?: CSSProperties
}) {
  if (frame === 'fieldset') {
    return (
      <fieldset className="pb-fieldset" data-tutorial-id={anchor} style={style}>
        <legend className="pb-fieldset__legend" style={legendStyle ?? NAVY_BOLD}>{title}</legend>
        <div className={bodyClassName} style={bodyStyle}>{children}</div>
      </fieldset>
    )
  }
  const s: CSSProperties = { border: `1px solid ${border}` }
  if (shadow) s.boxShadow = shadow
  s.padding = padding
  if (shrink) s.minWidth = 0
  if (fill) Object.assign(s, { display: 'flex', flexDirection: 'column', minHeight: 0 })
  Object.assign(s, style)
  return (
    <div data-tutorial-id={anchor} style={s}>
      <SectionCaption padding="0 0 6px" rule={false} {...caption}>{title}</SectionCaption>
      {children}
    </div>
  )
}

/* --- DialogFooter ------------------------------------------------------------
   The centred button row along a window's foot, in one of three frames:

   'row' (default): `<div className="pb-row" style={{ justifyContent: 'center', gap, padding, height,
     flex: 'none', borderTop: 1px solid border, background }}>` — `fixed={false}`
     drops `flex: none`; `plain` drops the class and sets `display: flex`.
   'grid': adminKit's CentredFooter — `display: grid; 1fr auto 1fr` with
     `left` parked in the first cell and the buttons in a `pb-row` span.
   'pb': the kit's `.pb-footer` bar — `[left] spacer buttons spacer` (the
     class supplies gap 8, padding 7px 9px, the face); `spacers={false}`
     leaves the spacers out.

   The buttons are `children`, or `buttons` specs drawn as PBButton with
   `command=` (anchored `host.mois.command.<command>`, reported on press);
   `report: false` keeps the anchor and does not report (the copies that
   never did). `footerButtons()` builds the specs for a list of labels.

   Replaces:
     adminKit CentredFooter        — frame="grid" left={left} gap={8} padding="8px 9px" border="#c9c9c9" background="var(--pb-face)"
     ClinicEditorWindows:~159 Footer — frame="grid" left={left} gap={8} padding="8px 9px" border="#c9c9c9"
     AdminExchangeKit DetailWindow's row — gap={10} padding="8px 0 10px" border="#c8c8c8"
     adminKit ProfileFooter        — gap={13} height={60} background="#f0f0f0"   (capture-measured; keep)
     DemographicDialogs DialogButtons — gap={10} padding={16}
     UserAccountWindow:~164 — frame="pb" buttons={footerButtons(NEW_USER_BUTTONS, { wide: true,
         onPress: (b) => (b === 'Create User' ? onCreate(draft) : onClose()) })}
     UserAccountWindow:~378, UserManagementView:~387 — frame="pb" buttons={footerButtons(list, { wide: true, onPress: onClose })}
     UserAccountWindow:~720 — … footerButtons(['Ok', 'Cancel'], { prefix: 'backlog-', wide: true, onPress: onClose })
     UserAccountWindow:~768 — … { prefix: 'select-users-', … }
     UserAccountWindow:~1055 — … footerButtons(CHANGE_PASSWORD.buttons, { wide: true, report: false, onPress: onClose })
     UserManagementView:~472 — … footerButtons(['Apply Changes', 'Cancel'], { wide: true, onPress: onClose })
     the inline centred rows, e.g.
       `<div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '10px 0', flex: 'none' }}>`
                                   — gap={10} padding="10px 0"
       ReportSpecWindow:~259 `<div style={{ display: 'flex', …, gap: 19, padding: '4px 0 10px', flex: 'none' }}>`
                                   — plain gap={19} padding="4px 0 10px"
       CodeListLookupWindows:~217 (no flex: none) — fixed={false} gap={8} padding={10}
       `.pb-footer` with a style (MyUserAccountWindow:~301, HealthIssuesPicker:~137)
                                   — frame="pb" spacers={false} style={{ justifyContent: 'center', gap, padding }}
     The `<span className="pb-row" style={{ gap: 8, justifyContent: 'center' }}>`
     cells inside grids (ScorecardWindow, CarePlanTemplatesView,
     DesignerDetailWindow, UserAccountWindow:~615) are grid cells, not
     footers — `el="span"` fixed={false} gap={8} covers them if wanted.   */
export type FooterButtonSpec = {
  label: ReactNode
  /** anchor `host.mois.command.<command>` */
  command?: string
  onClick?: () => void
  disabled?: boolean
  wide?: boolean
  /** the default button (`pb-btn--default`) */
  primary?: boolean
  width?: number
  style?: CSSProperties
  /** false: anchor the button but do not report the press */
  report?: boolean
}

export function footerButtons(labels: readonly string[], { prefix = '', onPress, wide, report }: {
  /** prefixes each anchor: `<prefix><slug of label>` */
  prefix?: string
  onPress?: (label: string) => void
  wide?: boolean
  report?: boolean
} = {}): FooterButtonSpec[] {
  return labels.map((label) => ({ label, command: `${prefix}${pbSlug(label)}`, wide, report, onClick: onPress && (() => onPress(label)) }))
}

function FooterButton({ b }: { b: FooterButtonSpec }) {
  const host = usePBInstrumentation()
  const style = b.width !== undefined ? { width: b.width, minWidth: 0, ...b.style } : b.style
  const common = {
    wide: b.wide,
    className: b.primary ? 'pb-btn--default' : undefined,
    disabled: b.disabled,
    style,
    onClick: b.onClick && (() => b.onClick!()),
  }
  return b.report === false
    ? <PBButton {...common} data-tutorial-id={b.command ? host?.anchor('command', b.command) : undefined}>{b.label}</PBButton>
    : <PBButton {...common} command={b.command}>{b.label}</PBButton>
}

export function DialogFooter({
  children, buttons, frame = 'row', left, gap, padding, height, border, background, fixed = true, plain, spacers = true, el = 'div', anchor, style,
  justify = 'center',
}: {
  children?: ReactNode
  buttons?: FooterButtonSpec[]
  frame?: 'row' | 'grid' | 'pb'
  /** 'grid' / 'pb': a control parked at the left */
  left?: ReactNode
  gap?: number
  padding?: number | string
  height?: number
  /** colour of a 1px top rule */
  border?: string
  background?: string
  /** 'row': add `flex: none` (default) */
  fixed?: boolean
  /** 'row': no `pb-row` class, `display: flex` instead */
  plain?: boolean
  /** 'pb': the two `pb-footer__spacer`s either side of the buttons */
  spacers?: boolean
  /** 'row': the element — a span for a centred cell inside a grid */
  el?: 'div' | 'span'
  /** 'row': how the buttons sit — centred (default), another alignment, or
      `false` for none at all (NotificationServiceWindows' left-set row) */
  justify?: CSSProperties['justifyContent'] | false
  anchor?: string
  style?: CSSProperties
}) {
  const content = <>{buttons?.map((b, i) => <FooterButton key={typeof b.label === 'string' ? b.label : i} b={b} />)}{children}</>
  const opt: CSSProperties = {}
  if (padding !== undefined) opt.padding = padding
  if (height !== undefined) opt.height = height
  if (border) opt.borderTop = `1px solid ${border}`
  if (background) opt.background = background

  if (frame === 'grid') {
    const s: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', ...opt, flex: 'none', ...style }
    return (
      <div data-tutorial-id={anchor} style={s}>
        <span>{left}</span>
        <span className="pb-row" style={{ gap }}>{content}</span>
        <span />
      </div>
    )
  }

  if (frame === 'pb') {
    const s: CSSProperties = { ...(gap !== undefined ? { gap } : null), ...opt, ...style }
    return (
      <div className="pb-footer" data-tutorial-id={anchor} style={Object.keys(s).length ? s : undefined}>
        {left}
        {spacers && <span className="pb-footer__spacer" />}
        {content}
        {spacers && <span className="pb-footer__spacer" />}
      </div>
    )
  }

  const s: CSSProperties = plain ? { display: 'flex' } : {}
  if (justify !== false) s.justifyContent = justify
  if (gap !== undefined) s.gap = gap
  Object.assign(s, opt)
  if (fixed) s.flex = 'none'
  Object.assign(s, style)
  const Tag = el
  return <Tag className={plain ? undefined : 'pb-row'} data-tutorial-id={anchor} style={s}>{content}</Tag>
}
