import { Fragment, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBSelect, type PBSelectOption } from '../pb'
import { Line } from './adminKit'
import { ModalWindow, type ModalWindowProps } from './dialogKit'

/* ============================================================================
   The lookup windows: the "…" pick lists, the Advanced Lookup Service and
   the MOIS - Search Window.

   MOIS raises the same few windows from a hundred "…" buttons, and the
   screens grew a copy of each per caller. The copies differ only in sizes,
   gaps, the frame they sit in and their anchors — never in structure the
   captures disagree on — so those are the parameters here, and every piece
   renders the exact elements, classes and inline styles of the copy it
   replaces when given that copy's values. (Style objects keep the copies'
   key order, so even the serialised `style` attribute is the same.)

   This file only provides the pieces; the call sites migrate in a later
   wave. Each section's header is the migration guide for its copies.

   Instrumented buttons use PBButton's `command`: anchored
   `host.mois.command.<command>` and reported as `host.mois.command`, which
   is exactly what the copies' DialogButton / CmdButton / Btn / Cmd and
   ClaimPromptDialog's local CmdButton render. A copy that hand-wrote a
   literal `data-tutorial-id` without reporting (CodeLookupDialogs' Ok,
   ProviderSearchDialog's Select…) passes `tutorialId` instead, which PBButton
   stamps as given — so it keeps its anchor outside a host too, and still
   does not report.
   ========================================================================= */

/** Every PBDataWindow prop, for a grid a lookup window draws. */
export type LookupGridProps<T extends Record<string, any>> = Parameters<typeof PBDataWindow<T>>[0]

/* --- shared styles ---------------------------------------------------------
   The values the copies repeat, named so a migrated call site says which
   shape it is rather than restating it.                                    */

/** The Advanced Lookup Service body: padded column, the parts 6px apart. */
export const LOOKUP_BODY: CSSProperties = { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 6 }
/** …and the bordered list panel inside it (band, filter strip, grid). */
export const LOOKUP_PANEL: CSSProperties = { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }
/** The box most copies put a grid in so it fills what is left. */
export const GRID_BOX: CSSProperties = { flex: '1 1 auto', minHeight: 0, display: 'flex' }
/** The `style` of a grid that fills its column itself (`flush` lists). */
export const FILL_GRID: CSSProperties = { flex: '1 1 auto', minHeight: 0 }
/** The captured pager row: Home · PgUp | Ok · Cancel | PgDwn · End. */
export const PAGER_ROW: CSSProperties = { display: 'flex', alignItems: 'center', flex: 'none' }
/** The "Search For:" row under a lookup's band. */
export const SEARCH_ROW: CSSProperties = { gap: 4, padding: '2px 4px', flex: 'none' }
/** The salmon fill MOIS paints a lookup's search box (WCB `Area of Injury`,
    the incentive-code and delivery-location lookups). */
export const SALMON = '#f4caa8'

/** The button sizes the copies' own button components draw. */
export const SIZE = {
  /** WorkspaceDialogFrame's DialogButton (width 88 unless given) */
  dialog: (width = 88): CSSProperties => ({ width, minWidth: 0, height: 24 }),
  /** AdminExchangeKit's Btn (DetailWindow buttons) */
  detail: (width?: number): CSSProperties => ({ minWidth: 0, height: 23, ...(width ? { width } : { padding: '0 12px' }) }),
  /** adminKit's Cmd with `w` */
  cmd: (width: number): CSSProperties => ({ width, minWidth: 0 }),
  /** the 77-wide nav buttons of the WCB / reaction-agent lookups */
  lookupNav: { width: 77, minWidth: 0, height: 24 } as CSSProperties,
} as const

/* ============================================================================
   usePagedCursor — the current row of a paged lookup.

   Home / End go to the first / last row, PgUp / PgDwn move `page` rows
   (12 in the Advanced Lookup Service family, 20 in the JORG / WCB /
   reaction-agent / Master Provider lookups), always clamped to the list.
   `current` is the raw value PBDataWindow's `onCurrentChange` sets; `at` is
   it clamped to the rows now listed, which is what a grid shows and Ok
   picks. Reset it with `setCurrent(0)` when a filter changes.

   Behaviour note for the migration: the copies clamped slightly differently
   (MarActionWindows paged from the raw cursor, End with no rows went to -1);
   here every move pages from `at` and End on an empty list is 0. Nothing a
   window shows changes — `rows[at]` is undefined either way.
   ========================================================================= */
export type PagedCursor = {
  current: number
  at: number
  setCurrent: (index: number) => void
  moveTo: (index: number) => void
  step: (delta: number) => void
  home: () => void
  pgUp: () => void
  pgDn: () => void
  end: () => void
}

export function usePagedCursor(count: number, page = 12, initial: number | (() => number) = 0): PagedCursor {
  const [current, setCurrent] = useState(initial)
  const last = Math.max(0, count - 1)
  const at = Math.min(current, last)
  const moveTo = (index: number) => setCurrent(Math.max(0, Math.min(last, index)))
  return {
    current, at, setCurrent, moveTo,
    step: (delta) => moveTo(at + delta),
    home: () => moveTo(0),
    pgUp: () => moveTo(at - page),
    pgDn: () => moveTo(at + page),
    end: () => moveTo(last),
  }
}

/* --- one button ----------------------------------------------------------- */

/** `'wide'` is PBButton's `wide`; a style object is the button's own style. */
export type KitButtonSize = 'wide' | CSSProperties

export type KitButtonSpec = {
  label?: ReactNode
  onClick?: () => void
  disabled?: boolean
  /** anchored `host.mois.command.<command>` and reported when pressed */
  command?: string
  /** a literal `data-tutorial-id`, stamped whether or not a host listens
      (wins over the anchor `command` would give, as PBButton does) */
  tutorialId?: string
  /** the default push button: `pb-btn--default` */
  isDefault?: boolean
  /** this button's own size, over the strip's */
  size?: KitButtonSize
}

function KitButton({ spec, size, label, onPress }: { spec: KitButtonSpec; size: KitButtonSize; label?: ReactNode; onPress?: () => void }) {
  const own = spec.size ?? size
  const press = spec.onClick ?? onPress
  return (
    <PBButton
      wide={own === 'wide'}
      command={spec.command}
      className={spec.isDefault ? 'pb-btn--default' : undefined}
      style={own === 'wide' ? undefined : own}
      disabled={spec.disabled}
      data-tutorial-id={spec.tutorialId}
      onClick={press ? () => press() : undefined}
    >
      {spec.label ?? label}
    </PBButton>
  )
}

/* ============================================================================
   LookupPager — the Advanced Lookup Service footer.

   PROVENANCE: `reference/advanced-lookup-service.png` — Home · PgUp at the
   left, Ok · Cancel in the middle, PgDwn · End at the right. Two layouts
   draw it:
     'spaced'   the buttons in one row, the middle pair pushed apart by two
                spacers and `pickGap` px between Ok and Cancel (the copies
                below, except…)
     'grouped'  three `pb-row` spans laid out `space-between` (Master
                Provider List, whose right group also carries Print Label)
   Pass `cursor` and the four nav buttons page it; a nav button given its
   own `onClick`, or a pager with no cursor, does what it is told (the
   PatientContactDialog pager is drawn unwired). `false` leaves a button out.

   MIGRATION (each copy → the props that reproduce it; `c` = usePagedCursor):
   · MarActionWindows ~471   cursor={c} (page 12)
                             style={{ ...PAGER_ROW, padding: '2px 0' }}
                             ok={{ command: 'mar-drug-ok', tutorialId: 'host.mois.command.mar-drug-ok', isDefault: true, disabled: !row, onClick }}
                             cancel={{ onClick: onClose }}
   · MedicationWindows ~120  as Mar, no padding (style omitted); ok command /
                             tutorialId `drug-lookup-ok`
   · AdvancedLookupDialog    cursor (page 12, initial = the open chart's index)
                             ok={{ command: 'lookup-ok', isDefault: true, disabled, onClick }}
                             cancel={{ command: 'lookup-cancel', onClick }}
   · ClaimPromptDialog recon ok={{ command: 'claim-ok', isDefault: true, … }} cancel={{ command: 'claim-cancel', … }}
   · CodeLookupDialogs ~603  ok={{ tutorialId: 'host.mois.command.pick-service-code', isDefault: true, disabled, onClick }} cancel={{ onClick }}
   · JorgLookupWindows ~77   cursor page 20; ok={{ isDefault: true, disabled, onClick }} cancel={{ onClick }}
   · WcbLookupWindows ~186   cursor page 20; className="pb-row"
                             style={{ gap: 0, padding: '10px 8px', flex: 'none' }}
                             navSize={SIZE.lookupNav} pickSize={SIZE.dialog(74)} pickGap={22}
                             ok={{ command: `${slug}-ok`, disabled, onClick }} (no isDefault — the
                             capture paints it greyed) cancel={{ command: `${slug}-cancel`, onClick }}
   · CodeListLookupWindows   as WCB but navSize={{ width: 77, minWidth: 0 }} pickSize={{ width: 74 }};
     ~175                    ok/cancel commands `reaction-agent-ok` / `-cancel`
   · MasterProviderList      layout="grouped" cursor page 20; className="pb-row"
                             style={{ gap: 0, padding: '8px 8px 8px', flex: 'none', justifyContent: 'space-between' }}
                             navSize={{ width: 75 }} pickSize={{ width: 92 }} pickGap={20} groupGap={2}
                             home/pgUp/pgDn/end={{ command: 'master-provider-home' … }} (each its slug)
                             ok={{ command: 'master-provider-ok', onClick }} cancel={{ command: 'master-provider-cancel', onClick }}
                             extra={[{ label: 'Print Label', command: 'master-provider-print-label', size: { width: 86 } }]}
   · PatientContactDialog    no cursor (unwired, as drawn); className="pb-row"
     ~241                    style={{ gap: 2, padding: '8px 0 4px', flex: 'none' }}
                             navSize={SIZE.dialog(76)} pickSize={SIZE.dialog(86)} pickGap={null}
                             home={{ command: 'provider-home' }} pgUp/pgDn/end likewise
                             ok={{ command: 'provider-ok', isDefault: true, onClick }} cancel={{ command: 'provider-cancel', onClick }}
   · scheduler/Provider-     home={false} end={false} spacer="class" className="pb-row"
     ScheduleSummary ~125    style={{ padding: '8px 0 2px', flex: 'none' }} navSize={{ width: 76 }}
                             pickSize={{ width: 76 }} pickGap={null}
                             pgUp={{ onClick: prevPage }} pgDn={{ onClick: nextPage }}
                             ok={{ label: 'Select', tutorialId: 'host.mois.command.select-day', onClick }} cancel={{ onClick }}
   ========================================================================= */
export type LookupPagerProps = {
  cursor?: PagedCursor
  home?: KitButtonSpec | false
  pgUp?: KitButtonSpec | false
  ok?: KitButtonSpec | false
  cancel?: KitButtonSpec | false
  /** buttons before PgDwn in the right group (Print Label) */
  extra?: KitButtonSpec[]
  pgDn?: KitButtonSpec | false
  end?: KitButtonSpec | false
  /** Home / PgUp / PgDwn / End (and `extra`); default PBButton `wide` */
  navSize?: KitButtonSize
  /** Ok / Cancel; default PBButton `wide` */
  pickSize?: KitButtonSize
  /** px between Ok and Cancel (a spacer span in 'spaced', the group gap in
      'grouped'); `null` puts them side by side */
  pickGap?: number | null
  /** 'flex' = `<span style={{ flex: '1 1 auto' }} />`, 'class' = `<span className="pb-row__spacer" />` */
  spacer?: 'flex' | 'class'
  layout?: 'spaced' | 'grouped'
  /** 'grouped': the gap inside the left and right groups */
  groupGap?: number
  className?: string
  style?: CSSProperties
}

export function LookupPager({
  cursor, home, pgUp, ok, cancel, extra = [], pgDn, end,
  navSize = 'wide', pickSize = 'wide', pickGap = 14, spacer = 'flex', layout = 'spaced', groupGap = 2,
  className, style = PAGER_ROW,
}: LookupPagerProps) {
  const nav = (spec: KitButtonSpec | false | undefined, label: string, move?: () => void) =>
    spec === false ? null : <KitButton spec={spec ?? {}} size={navSize} label={label} onPress={move} />
  const pick = (spec: KitButtonSpec | false | undefined, label: string) =>
    spec === false ? null : <KitButton spec={spec ?? {}} size={pickSize} label={label} />
  const h = nav(home, 'Home', cursor?.home)
  const u = nav(pgUp, 'PgUp', cursor?.pgUp)
  const o = pick(ok, 'Ok')
  const c = pick(cancel, 'Cancel')
  const x = extra.map((spec, i) => <KitButton key={i} spec={spec} size={navSize} />)
  const d = nav(pgDn, 'PgDwn', cursor?.pgDn)
  const e = nav(end, 'End', cursor?.end)

  if (layout === 'grouped') {
    return (
      <div className={className} style={style}>
        <span className="pb-row" style={{ gap: groupGap }}>{h}{u}</span>
        <span className="pb-row" style={{ gap: pickGap ?? undefined }}>{o}{c}</span>
        <span className="pb-row" style={{ gap: groupGap }}>{x}{d}{e}</span>
      </div>
    )
  }
  const gap = spacer === 'class' ? <span className="pb-row__spacer" /> : <span style={{ flex: '1 1 auto' }} />
  return (
    <div className={className} style={style}>
      {h}{u}
      {gap}
      {o}{o && c && pickGap != null && <span style={{ width: pickGap }} />}{c}
      {gap}
      {x}{d}{e}
    </div>
  )
}

/* ============================================================================
   PickButtons — a strip of push buttons (Ok / Cancel, Select / Cancel).

   The strip's element is the copy's own: `className` (usually "pb-row",
   "pb-footer" for Health Issues, none for the Billing prompts) and `style`
   are required reading of the copy, not defaults. Where a frame draws the
   strip itself (DetailWindow's `buttons`, StageWindow's `footer`), keep the
   copy's own buttons instead — this would add a wrapper.
   ========================================================================= */
export function PickButtons({ buttons, size = 'wide', className, style }: {
  buttons: KitButtonSpec[]
  size?: KitButtonSize
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={className} style={style}>
      {buttons.map((spec, i) => <KitButton key={i} spec={spec} size={size} />)}
    </div>
  )
}

/* ============================================================================
   LookupBand — a list's caption band.
     'plain'  PBBand                                   (most lists)
     'bold'   PBBand with the caption in <b>           (WCB, incentive codes)
     'ruled'  PBBand in `.pb-band--ruled`, ruled off   (Advanced Lookup Service)
              from a filter strip under it
     'grey'   the hand-drawn etched caption            (Service Delivery Location)
     'lite'   Encounter Lite's pale-blue caption       (Chart Advance Search List)
   `right` is PBBand's right-hand content ('plain' / 'bold' / 'ruled').
   ========================================================================= */
export function LookupBand({ children, variant = 'plain', right }: {
  children: ReactNode
  variant?: 'plain' | 'bold' | 'ruled' | 'grey' | 'lite'
  right?: ReactNode
}) {
  if (variant === 'grey') return <div style={{ background: 'linear-gradient(#ecebe8, #d8d5d0)', fontWeight: 700, padding: '3px 6px' }}>{children}</div>
  if (variant === 'lite') return <div style={{ background: '#a8cdf0', fontWeight: 700, padding: '3px 8px' }}>{children}</div>
  const band = <PBBand right={right}>{variant === 'bold' ? <b>{children}</b> : children}</PBBand>
  return variant === 'ruled' ? <div className="pb-band--ruled">{band}</div> : band
}

/* ============================================================================
   SearchForRow — "Search For:" and its box.

   The caption is blue (`var(--pb-link)`) in the captured lookups and plain
   in the inferred ones (`link={false}`). `salmon` fills the box the way the
   WCB / incentive-code / delivery-location captures do; `input` replaces
   the box outright (the PBLookup copies), `after` follows it (Status ▾, the
   "…" button).
   ========================================================================= */
export function SearchForRow({
  label = 'Search For:', link = true, value, onChange, onKeyDown, field, width = '100%', salmon, inputStyle,
  ariaLabel, autoFocus, placeholder, input, after, style = SEARCH_ROW,
}: {
  label?: ReactNode
  link?: boolean
  value?: string
  onChange?: (value: string) => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  /** anchors the box `host.mois.field.<field>` */
  field?: string
  width?: number | string
  salmon?: boolean
  /** the box's style (PBInput puts `width` first) */
  inputStyle?: CSSProperties
  ariaLabel?: string
  autoFocus?: boolean
  placeholder?: string
  input?: ReactNode
  after?: ReactNode
  style?: CSSProperties
}) {
  const boxStyle = salmon ? { ...inputStyle, background: SALMON } : inputStyle
  return (
    <div className="pb-row" style={style}>
      <span style={link ? { color: 'var(--pb-link)' } : undefined}>{label}</span>
      {input ?? (
        <PBInput
          w={width}
          aria-label={ariaLabel}
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          onKeyDown={onKeyDown}
          style={boxStyle}
          data-tutorial-id={field ? `host.mois.field.${field}` : undefined}
        />
      )}
      {after}
    </div>
  )
}

/** The white description pane under a lookup's list ("ALL Patient charts."). */
export function LookupNote({ height, preWrap, style, children }: {
  height: number
  /** keep the text's own line breaks (Advanced Lookup, JORG, reconciliation) */
  preWrap?: boolean
  style?: CSSProperties
  children?: ReactNode
}) {
  return (
    <div className="pb-field" style={{ height, flex: 'none', padding: '3px 5px', ...(preWrap ? { whiteSpace: 'pre-wrap' } : null), background: '#fff', ...style }}>
      {children}
    </div>
  )
}

/* ============================================================================
   PickListWindow — a pick list: frame, optional band / search, the grid,
   the buttons.

   The copies agree on the order of the parts and disagree on which boxes
   wrap them, so each box is a style (omit it and there is no element):

     frame( top
            <div style={body}>             body   — padded column
              lead
              <div style={panel}>          panel  — bordered list panel
                band · search (searchFirst: search · band)
                <div style={gridBox}>      gridBox — `null`: the grid bare
                  <PBDataWindow {...grid} />
                belowGrid
              below
              footer        (footerInside)
              after         (footerInside)
          , footer )        (otherwise)

   `window` draws the frame most copies hand-wrote — the plain modal layer and
   a child PBWindow without min/max (ModalWindow; `id` anchors it
   `host.mois.dialog.<id>`). `frame` hosts it in any other frame instead:
   `(content, footer) => <WorkspaceDialogFrame …>{content}{footer}</…>`,
   `<DemographicModal …>`, `<StageWindow footer={footer} …>`,
   `<DetailWindow buttons={footer} …>`, or a hand-written layer when
   something must sit beside the window in it.

   MIGRATION (W = WorkspaceDialogFrame, D = DemographicModal, DW = DetailWindow;
   `frame` repeats each copy's own frame props verbatim):
   · DemographicClaimLookupDialog:52  frame D 620×520; body={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 8px 0' }}
       panel={{ border: '1px solid #a0a0a0', background: '#fff', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
       band=<LookupBand variant="bold"> search=<SearchForRow salmon inputStyle={{ flex: '1 1 auto' }} ariaLabel field onKeyDown />
       grid flush rules="white"; footer=<PickButtons className="pb-row" style={{ justifyContent: 'center', gap: 22, padding: '10px 8px', flex: 'none' }} size={SIZE.dialog(74)} />
   · ExternalServiceWindows:216  frame D 520×500; panel={{ margin: '8px 8px 0', border: '1px solid #9a9a9a', background: '#fff', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}
       band=<LookupBand variant="grey"> search=<SearchForRow salmon style={{ gap: 4, padding: '2px 4px' }} field="delivery-location-search" />
       footer = the copy's CentredFooter + Cmd, unchanged
   · DeterminantWindows:138  frame W 460×380; search=<SearchForRow link={false} width={300} style={{ gap: 6, padding: '8px 10px 4px', flex: 'none' }} />
       gridBox={{ ...GRID_BOX, margin: '0 10px', border: '1px solid var(--pb-border)' }}; grid flush
       footer PickButtons "pb-row" {{ gap: 14, padding: '10px 0', justifyContent: 'center', flex: 'none' }} size={SIZE.dialog()}
   · GroupVisitView:278  frame W 480×320 zIndex 90; gridBox={{ ...GRID_BOX, margin: 8 }}
       footer PickButtons "pb-row" {{ gap: 8, padding: '0 0 10px', justifyContent: 'center', flex: 'none' }} size={SIZE.dialog(75)}
   · DemographicsView:854  frame D 600×380; body={{ padding: 10, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}
       band=<LookupBand> grid gutter={false}; footer = the copy's DialogButtons + CmdButton (or PickButtons "pb-row" {{ justifyContent: 'center', gap: 10, padding: 16, flex: 'none' }} size "wide")
   · EncounterWindow:1355 (ProviderSearchDialog — a pick list captioned "MOIS - Search Window", not the search window below)
       window={{ id: 'provider-search', zIndex: 95, windowStyle: { width: 'min(880px, 100%)', height: 'min(600px, 100%)' } }}
       band=<LookupBand> search=<SearchForRow style={{ gap: 4, padding: '3px 4px', flex: 'none' }} input={<PBLookup …/>} />
       gridBox={{ ...GRID_BOX, padding: '0 4px' }}; footer PickButtons "pb-row" {{ justifyContent: 'center', gap: 14, padding: '8px 0 10px', flex: 'none' }}
       size={{ minWidth: 108 }} ok={{ label: 'Select', tutorialId: 'host.mois.command.select-provider', … }}
   · HealthIssuesPicker:78  window={{ id: 'health-issues', portal: 'inline', zIndex: 90, windowStyle: { width: 'min(1150px, calc(100% - 16px))', height: 'min(740px, calc(100% - 16px))' } }}
       top = the blue banner; gridBox={{ ...GRID_BOX, padding: '2px 3px 0', background: 'var(--pb-face)' }}
       footer PickButtons className="pb-footer" style={{ justifyContent: 'center', gap: 14 }} size={{ minWidth: 86 }} commands 'select' / 'cancel'
   · LaunchModeWindows:188 / :621 / :688 / :716  frame DW (buttons={footer}; footer = the copies' Btn nodes)
       :188 gridBox={{ ...GRID_BOX, padding: 8 }} gutter={false} · :621 band=<LookupBand variant="lite">, gridBox default
       :688 search = the copy's own row (no caption), gridBox={{ flex: '1 1 55%', minHeight: 0, display: 'flex', padding: '0 6px' }}, below = the <pre> preview
       :716 gridBox={{ flex: '1 1 auto', display: 'flex', padding: 6 }} (no minHeight — as drawn)
   · GoalWindows:277  frame W 720×420; gridBox={{ ...GRID_BOX, padding: 4 }}
       footer PickButtons "pb-row" {{ justifyContent: 'center', gap: 12, padding: '8px 0', flex: 'none' }} size={SIZE.dialog(80)}
   · QuickEntryEditors:70 CodePrompt  frame W 460×360 zIndex 97; search=<SearchForRow label="Find:" link={false} style={{ padding: '8px 10px 4px', flex: 'none' }} field={`${id}-find`} />
       gridBox={{ ...GRID_BOX, padding: '0 10px' }}; footer PickButtons "pb-row" {{ justifyContent: 'center', gap: 10, padding: '8px 0', flex: 'none' }} size={SIZE.dialog(75)}
   · PreferenceWindows:384  window={{ id: 'preference-lookup', zIndex: 90, windowStyle: { width: 520, height: 400, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' } }}
       body={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)', padding: '8px 10px 0' }}
       searchFirst search=<SearchForRow link={false} autoFocus style={{ paddingBottom: 4 }} /> band=<LookupBand>
       footer PickButtons "pb-row" {{ justifyContent: 'center', gap: 10, padding: '10px 0', flex: 'none', background: 'var(--pb-face)' }} size={SIZE.dialog(75)}
   · billing/InvoiceWindows:257, billing/UnsentClaimWindows:42  frame W; body=LOOKUP_BODY panel=LOOKUP_PANEL
       band=<LookupBand variant="ruled"> gridBox={null} grid flush rules="white" style={FILL_GRID}
       footerInside footer=<PickButtons style={{ display: 'flex', justifyContent: 'center', gap: 12, flex: 'none' }} size={SIZE.dialog()} /> (no className)
   · billing/InvoiceWindows:347, :398, UnsentClaimWindows:89  as :257 without panel / band; grid style={FILL_GRID}, not flush
   And the Advanced Lookup Service windows, with a LookupPager footer:
   · AdvancedLookupDialog  window={{ id: 'chart-lookup', zIndex, windowStyle: { width: 'min(1120px, calc(100vw - 60px))', height: 'min(620px, calc(100vh - 80px))' } }}
       body=LOOKUP_BODY panel=LOOKUP_PANEL band ruled gridBox={null} grid flush rules="white" style={FILL_GRID}
       below=<LookupNote height={64} preWrap> footerInside
   · ClaimPromptDialog  as Advanced (window id `claim-${prompt}`, width by prompt); lead = the 'chart' identity row;
       band ruled with `right`; below = <LookupNote height={74} preWrap style={{ overflow: 'auto' }}> for recon;
       footer recon: LookupPager · else PickButtons style={{ display: 'flex', justifyContent: 'center', flex: 'none' }} [claim-select]
   · CodeLookupDialogs service code  window id 'service-code-lookup' zIndex 95, { width: 'min(1000px, 100%)', height: 'min(720px, 100%)' };
       search=<SearchForRow style={{ gap: 4, padding: '3px 4px', flex: 'none' }} input={<PBLookup/>} after={Status ▾} /> inside the panel;
       below=<LookupNote height={96}>; footerInside; after = the Source / Save on Close strip
   · JorgLookupWindows JORG List  window id 'jorg-list' { width: 'min(839px, calc(100% - 24px))', height: 'min(630px, calc(100% - 24px))' }; as Advanced
   · WcbLookupWindows  window={{ id: slug, layerStyle: LAYER, windowStyle: { width: 'min(673px, 100%)', height: 'min(673px, 100%)' } }}
       body={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 8px 0', gap: 0 }} panel={{ ...PANEL, flex: '1 1 auto', minHeight: 0 }}
       band bold; search salmon inputStyle={{ flex: '1 1 auto' }} after = the "…"; belowGrid = Synonyms + note; footer (outside body) LookupPager
   · CodeListLookupWindows  frame = the copy's hand-written layer (SynonymEntry sits in the layer beside the window,
       which ModalWindow cannot hold); band / search = the copy's own nodes (Row Count, validation-tinted inputgroup);
       belowGrid = Synonyms + description; footer LookupPager
   ========================================================================= */
export type PickListWindowProps<T extends Record<string, any>> = {
  /** host the window in another frame; wins over `window` */
  frame?: (content: ReactNode, footer: ReactNode) => ReactNode
  /** the plain modal-layer window (ModalWindow's props) */
  window?: Omit<ModalWindowProps, 'children'>
  /** above the body, under the title bar (Health Issues' patient banner) */
  top?: ReactNode
  body?: CSSProperties
  /** inside the body, before the panel (the claim prompt's identity row) */
  lead?: ReactNode
  panel?: CSSProperties
  band?: ReactNode
  search?: ReactNode
  /** the search row above the band (Preference Lookup) */
  searchFirst?: boolean
  grid: LookupGridProps<T>
  /** the box around the grid; default GRID_BOX, `null` for none */
  gridBox?: CSSProperties | null
  /** inside the panel, under the grid */
  belowGrid?: ReactNode
  /** inside the body, under the panel */
  below?: ReactNode
  footer?: ReactNode
  /** the footer inside the body (the Advanced Lookup family) */
  footerInside?: boolean
  /** inside the body, after an inside footer (Source / Save on Close) */
  after?: ReactNode
}

export function PickListWindow<T extends Record<string, any>>({
  frame, window, top, body, lead, panel, band, search, searchFirst, grid, gridBox = GRID_BOX,
  belowGrid, below, footer, footerInside, after,
}: PickListWindowProps<T>) {
  const list = <PBDataWindow<T> {...grid} />
  const listed = (
    <>
      {searchFirst && search}
      {band}
      {!searchFirst && search}
      {gridBox === null ? list : <div style={gridBox}>{list}</div>}
      {belowGrid}
    </>
  )
  const inner = (
    <>
      {lead}
      {panel ? <div style={panel}>{listed}</div> : listed}
      {below}
      {footerInside && footer}
      {footerInside && after}
    </>
  )
  const content = <>{top}{body ? <div style={body}>{inner}</div> : inner}</>
  const outside = footerInside ? null : footer
  if (frame) return <>{frame(content, outside)}</>
  if (window) return <ModalWindow {...window}>{content}{outside}</ModalWindow>
  return <>{content}{outside}</>
}

/* ============================================================================
   MoisSearchWindow — "MOIS - Search Window", the user / provider / org picker.

   One MOIS window, captured three times and transcribed three ways; the
   transcriptions are kept as the criteria block's layouts so each copy
   migrates without a pixel moving (reconciling them against the captures is
   a separate, visible change):
     'rows'   UserSearchWindow (AdminPickerWindows, #70, ~1150×840): a
              light-blue strip of four captions over label + box rows,
              ☑ Users ☑ Providers, ☐ Limit…, ☑ Active ☐ Inactive
     'form'   PrivateNoteWindows' search (`15469d8b…`): the same four
              columns, a `pb-form` of Name / Group / Provider / Members of,
              four Include ticks in grids
     'grid'   WorkspaceWindows' Reassign / Copy Items user picker (303758):
              one five-column grid, bold captions, uncontrolled boxes
     'name'   OrgRoleWindows' MemberSearchWindow (INFERRED): "Search for:"
              and one Name box on the light-blue strip
   Every copy then draws the grid in a box and its own buttons.

   NOT this window: DirectorySearchWindow.tsx. MOIS captions it "MOIS -
   Search Window" too, but its capture (the Dynamic Form header's Provider
   drop-down, 2026-09-25) is a different window — "Include Type(s):"
   Providers / Org. Roles / Organizations with no Users, no Provider box or
   Membership column, Associated User / Members · Group · Active ·
   Practition No. · Payee No. · Payment Type columns, and "Save Filter as My
   Default" beside Ok / Cancel — drawn from its own stylesheet. It stays its
   own component. Nor is EncounterWindow's ProviderSearchDialog (a Provider
   List pick list; see PickListWindow).

   MIGRATION:
   · AdminPickerWindows:202 UserSearchWindow  frame D ("MOIS - Search Window" 1000×730, dialog 'user-search');
       criteria={{ layout: 'rows', fields: [Name, Group, Provider] with anchor `host.mois.field.search-${slug}`,
       membersOf: { anchor: 'host.mois.field.search-members-of', … }, include: Users / Providers (tutorialIds
       include-users / include-providers), membership: { label: 'Limit to My Active Memberships', … },
       status: Active / Inactive (status-active / status-inactive) }}
       gridBox={{ ...GRID_BOX, margin: '6px 8px 0', border: '1px solid #8a8a8a', background: '#fff' }}
       footer=<PickButtons className="pb-row" style={{ justifyContent: 'center', gap: 8, padding: '10px 0', flex: 'none' }} size={{ width: 74 }} /> (user-search-ok / -cancel)
   · PrivateNoteWindows:203  frame StageWindow (id 'mois-search-window', 1290×560, bodyStyle {{ padding: 6, background: '#fff' }}, footer={footer});
       criteria={{ layout: 'form', inputWidth: 290, fields (Name anchor 'host.mois.field.search-name'), membersOf: { options } (uncontrolled),
       include: 4 ticks (tutorialIds search-include-<slug>), membership, status }}
       gridBox={{ ...GRID_BOX, marginTop: 4 }} grid flush style={FILL_GRID}; footer = the copy's spacer + FooterButtons
   · WorkspaceWindows:191  frame W (id 'search-window', 900×560, zIndex 85); criteria={{ layout: 'grid', fields
       (no value: uncontrolled), membersOf: { options: USER_GROUPS }, include: 4 ticks checked, membership, status: [Active checked] }}
       gridBox={{ margin: '4px 8px 0', display: 'flex', flex: '1 1 auto', minHeight: 0 }}
       footer PickButtons "pb-row" {{ gap: 8, padding: '10px 0', justifyContent: 'center', flex: 'none' }} size={SIZE.dialog(75)}
   · OrgRoleWindows:629 MemberSearchWindow  frame D (620×520, 'member-search'); criteria={{ layout: 'name',
       fields: [{ label: 'Name:', anchor: 'host.mois.field.member-search-name', … }] }}
       gridBox={{ ...GRID_BOX, margin: '4px 8px', border: '1px solid #8a8a8a', background: '#fff' }}; footer = CentredFooter + Cmd
   ========================================================================= */
export const MOIS_SEARCH_TITLE = 'MOIS - Search Window'

export type SearchTextField = {
  label: string
  /** omitted: an uncontrolled box (the Workspace picker's) */
  value?: string
  onChange?: (value: string) => void
  /** the box's full `data-tutorial-id` */
  anchor?: string
}
export type SearchSelectField = {
  label?: string
  options: readonly PBSelectOption[]
  value?: string
  onChange?: (value: string) => void
  anchor?: string
}
export type SearchTick = {
  label: ReactNode
  checked?: boolean
  onChange?: (value: boolean) => void
  tutorialId?: string
}

export type MoisSearchCriteriaProps = {
  layout: 'rows' | 'form' | 'grid' | 'name'
  /** Name / Group / Provider ('name': just Name) */
  fields: SearchTextField[]
  membersOf?: SearchSelectField
  include?: SearchTick[]
  /** ☐ Limit to My Active Memberships */
  membership?: SearchTick
  status?: SearchTick[]
  /** the four caption columns ('rows' / 'form') */
  columns?: string
  /** the boxes' width */
  inputWidth?: number
  /** the outer box's style, over the layout's */
  box?: CSSProperties
}

const CRITERIA: Record<MoisSearchCriteriaProps['layout'], { box: CSSProperties; columns: string; inputWidth: number }> = {
  rows: { box: { margin: '6px 8px 0', border: '1px solid #8a8a8a', background: '#fff', flex: 'none' }, columns: '500px 135px 230px 1fr', inputWidth: 220 },
  form: { box: { border: '1px solid #c8c8c8', flex: 'none' }, columns: '1fr 180px 300px 150px', inputWidth: 290 },
  grid: {
    box: { margin: '8px 8px 0', padding: '4px 8px', display: 'grid', gridTemplateColumns: '80px 220px 1fr 1fr 1fr', rowGap: 4, columnGap: 8, background: '#fff', border: '1px solid #a0a0a0', flex: 'none' },
    columns: '80px 220px 1fr 1fr 1fr', inputWidth: 210,
  },
  name: { box: { padding: '6px 10px', background: 'linear-gradient(#e6effb, #d2e1f5)', flex: 'none' }, columns: '', inputWidth: 260 },
}

const CAPTIONS = ['Search for:', 'Include:', 'Membership', 'Record Status:'] as const

export function MoisSearchCriteria({ layout, fields, membersOf, include = [], membership, status = [], columns, inputWidth, box }: MoisSearchCriteriaProps) {
  const preset = CRITERIA[layout]
  const cols = columns ?? preset.columns
  const w = inputWidth ?? preset.inputWidth
  const boxStyle = box ? { ...preset.box, ...box } : preset.box
  const text = (f: SearchTextField) => (
    <PBInput w={w} value={f.value} onChange={f.onChange ? (e) => f.onChange!(e.target.value) : undefined} data-tutorial-id={f.anchor} />
  )
  const select = (f: SearchSelectField) => (
    <PBSelect w={w} options={f.options} value={f.value} onChange={f.onChange ? (e) => f.onChange!(e.target.value) : undefined} data-tutorial-id={f.anchor} />
  )
  const tick = (t: SearchTick) => <PBCheckbox label={t.label} checked={t.checked} onChange={t.onChange} tutorialId={t.tutorialId} />
  const membersLabel = membersOf?.label ?? 'Members of:'

  if (layout === 'name') {
    return (
      <div style={boxStyle}>
        Search for:
        {fields.map((f) => <Line key={f.label} label={f.label} w={60}>{text(f)}</Line>)}
      </div>
    )
  }

  if (layout === 'grid') {
    const rows = [...fields.map((f) => ({ label: f.label, control: text(f) })), ...(membersOf ? [{ label: membersLabel, control: select(membersOf) }] : [])]
    return (
      <div style={boxStyle}>
        <b style={{ gridColumn: 'span 2' }}>{CAPTIONS[0]}</b><b>{CAPTIONS[1]}</b><b>{CAPTIONS[2]}</b><b>{CAPTIONS[3]}</b>
        {rows.map((r, i) => (
          <Fragment key={r.label}>
            <span>{r.label}</span>{r.control}
            {include[i] ? tick(include[i]) : <span />}
            {i === 0 && membership ? tick(membership) : <span />}
            {status[i] ? tick(status[i]) : <span />}
          </Fragment>
        ))}
      </div>
    )
  }

  if (layout === 'form') {
    return (
      <div style={boxStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, background: 'linear-gradient(#e8f0fb, #fff)', padding: '2px 8px' }}>
          {CAPTIONS.map((c) => <span key={c}>{c}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: cols, padding: 8, gap: 4, alignItems: 'start' }}>
          <div className="pb-form" style={{ gridTemplateColumns: `90px ${w}px`, gap: 4 }}>
            {fields.map((f) => <Fragment key={f.label}><span>{f.label}</span>{text(f)}</Fragment>)}
            {membersOf && <><span>{membersLabel}</span>{select(membersOf)}</>}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>{include.map((t, i) => <Fragment key={i}>{tick(t)}</Fragment>)}</div>
          <div>{membership && tick(membership)}</div>
          <div style={{ display: 'grid', gap: 6 }}>{status.map((t, i) => <Fragment key={i}>{tick(t)}</Fragment>)}</div>
        </div>
      </div>
    )
  }

  /* 'rows' — the captured #70 layout */
  const stack = (ticks: SearchTick[]) => ticks.map((t, i) => <div key={i} style={i ? { paddingTop: 4 } : undefined}>{tick(t)}</div>)
  return (
    <div style={boxStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, background: 'linear-gradient(#e6effb, #d2e1f5)', padding: '3px 5px' }}>
        {CAPTIONS.map((c) => <span key={c} style={{ fontWeight: 400, color: '#000' }}>{c}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '6px 5px 8px', alignItems: 'start' }}>
        <div>
          {fields.map((f) => (
            <div key={f.label} className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
              <span className="pb-form__label" style={{ width: 72 }}>{f.label}</span>
              {text(f)}
            </div>
          ))}
          {membersOf && (
            <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
              <span className="pb-form__label" style={{ width: 72 }}>{membersLabel}</span>
              {select(membersOf)}
            </div>
          )}
        </div>
        <div>{stack(include)}</div>
        <div>{membership && tick(membership)}</div>
        <div>{stack(status)}</div>
      </div>
    </div>
  )
}

export function MoisSearchWindow<T extends Record<string, any>>({ frame, criteria, gridBox = GRID_BOX, grid, footer }: {
  /** the copy's frame: `(content, footer) => <DemographicModal title={MOIS_SEARCH_TITLE} …>{content}{footer}</…>` */
  frame: (content: ReactNode, footer: ReactNode) => ReactNode
  criteria: MoisSearchCriteriaProps
  gridBox?: CSSProperties
  grid: LookupGridProps<T>
  footer?: ReactNode
}) {
  return (
    <>
      {frame(
        <>
          <MoisSearchCriteria {...criteria} />
          <div style={gridBox}><PBDataWindow<T> {...grid} /></div>
        </>,
        footer,
      )}
    </>
  )
}
