import {
  auditAnswer, dictionaryEntry, labelKey, resolveDictionaryEntry,
  type AuditAnswer, type DictionaryEntry, type FieldAuditContext,
} from '../data/dataDictionary'

/* ============================================================================
   host/field-audit — Ctrl+Shift+A: which database column is this field?

   In MOIS, putting the cursor in a field (or a grid cell) and pressing
   Ctrl+Shift+A asks the MOIS Audit Service about that one column. For a
   column nobody registered — nearly all of them — MOIS answers "Audit
   Information Not Available" and names the Table Name and Field Name the
   control writes, then offers to register it. That dialog is how the 2026-08
   field audit read the storage of 600-odd fields off the live system
   (data/dataDictionary.ts).

   This file reads, off the DOM, everything the dictionary lookup needs about
   the control the cursor is in:
   - an explicit `data-mois-audit-id` on the control or around it (a grid
     column's `auditId`) — the entry it names wins outright;
   - otherwise the caption (the label beside the field, the column header
     over the cell), the selected tabs around it, the pop-out window holding
     it and the group box it sits in, which `resolveDictionaryEntry` matches
     against the workbook's path for the open navigator node.
   ========================================================================= */

const FORM_CONTROL = 'input, textarea, select'

/* The control Ctrl+Shift+A is about. A text box keeps focus, but a grid
   cell is only clicked — DataWindow cells are not focusable here — and
   Safari does not focus a check box on click either, so the last control
   the pointer or the cursor went into is remembered. */
let lastTarget: Element | null = null

/** Remember where the cursor went (a `focusin` / `pointerdown` target). */
export function noteAuditTarget(target: EventTarget | null) {
  const control = auditTargetOf(target)
  if (control) lastTarget = control
}

/** The control a click or a focus landed on, as Ctrl+Shift+A sees it: a
    check box's input (from its label), a form control, a grid cell or
    header, or anything that names its entry; null for the audit's own boxes. */
export function auditTargetOf(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null
  const control = target.closest('label.pb-check')?.querySelector('input')
    ?? (target.matches(FORM_CONTROL) ? target : null)
    ?? target.closest('.pb-dw td:not(.pb-dw__gutter), .pb-dw th:not(.pb-dw__gutter)')
    ?? target.closest('[data-mois-audit-id]')
  return control && !control.closest('[data-field-audit]') ? control : null
}

/** The control the cursor is in now, else the last one it was in. */
export function currentAuditTarget(root: Element | null): Element | null {
  const active = typeof document === 'undefined' ? null : document.activeElement
  if (active && root?.contains(active) && active.matches(FORM_CONTROL)) return active
  return lastTarget?.isConnected && root?.contains(lastTarget) ? lastTarget : null
}

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

/* --- the caption ------------------------------------------------------------ */

const isCaption = (el: Element | null): boolean => {
  const caption = text(el)
  return !!caption && (/:$/.test(caption) || !!el?.classList.contains('pb-form__label'))
}
const controlsIn = (el: Element): Element[] => (el.matches(FORM_CONTROL) ? [el] : [...el.querySelectorAll(FORM_CONTROL)])
  .filter((c) => (c as HTMLInputElement).type !== 'button' && (c as HTMLInputElement).type !== 'hidden')

export type ControlCaption = {
  /** the caption painted for the control, without its colon; '' when none */
  caption: string
  /** the caption before that one on the same line (`Perform By` before `Date:`) */
  lead?: string
  /** how many controls under the same caption come before this one */
  part: number
}

/** The caption MOIS paints for a control: the label before it, found by
    walking back over its siblings — and up through its row, at most three
    boxes — past the other boxes that share the caption (`Ref. Ranges:` over
    the lower and upper bound, `Date:` over the date and the time). A text
    between two boxes that is not a caption (`to`) is passed over. A check
    box's caption is its own label. */
export function controlCaption(control: Element): ControlCaption {
  const check = control.closest('label.pb-check')
  if (check) return { caption: text(check.querySelector('.pb-check__label')), part: 0 }
  return captionBefore(control)
}

/** The walk itself, from any box — a radio group's caption is the one
    before its first option's label. */
function captionBefore(control: Element): ControlCaption {
  let node: Element | null = control.closest('.pb-inputgroup') ?? control
  for (let depth = 0; node?.parentElement && depth < 3; depth += 1) {
    const own = controlsIn(node)
    let before = Math.max(0, own.indexOf(control))
    for (let prev = node.previousElementSibling; prev; prev = prev.previousElementSibling) {
      if (isCaption(prev)) {
        let lead: string | undefined
        for (let back = prev.previousElementSibling; back; back = back.previousElementSibling) {
          if (isCaption(back)) { lead = text(back).replace(/:$/, ''); break }
        }
        return { caption: text(prev).replace(/:$/, ''), lead, part: before }
      }
      before += controlsIn(prev).length
    }
    node = node.parentElement
  }
  return { caption: '', part: 0 }
}

/* A DataWindow's table, walked with selectors rather than the table API
   (rows / cells / cellIndex), which not every DOM a test runs in has. */
const cellsOf = (row: Element | null | undefined): Element[] => (row ? [...row.querySelectorAll(':scope > th, :scope > td')] : [])
const headRowOf = (table: Element | null | undefined): Element | null =>
  [...(table?.querySelectorAll(':scope > thead > tr') ?? [])].at(-1) ?? null
const bodyRowsOf = (table: Element | null | undefined): Element[] => [...(table?.querySelectorAll(':scope > tbody > tr') ?? [])]

/** A grid cell's column header: the header row's cell in the same column. */
function columnHeader(cell: Element): Element | null {
  const index = cellsOf(cell.parentElement).indexOf(cell)
  return cellsOf(headRowOf(cell.closest('table')))[index] ?? null
}

/** A header drawn as a glyph (the paper clip) has no text; its title or
    aria-label names it. */
function headerCaption(th: Element | null): string {
  if (!th) return ''
  return text(th) || th.getAttribute('title') || th.querySelector('[aria-label]')?.getAttribute('aria-label') || ''
}

/* --- where it sits ------------------------------------------------------------ */

/** The selected tab of every tab strip around the control, outermost first. */
function selectedTabs(control: Element): string[] {
  const tabs: string[] = []
  for (let page = control.closest('.pb-tabs__page'); page; page = page.parentElement?.closest('.pb-tabs__page') ?? null) {
    const strip = page.parentElement?.querySelector(':scope > .pb-tabs__strip')
    const active = strip?.querySelector('.pb-tabs__tab.is-active')
    if (active) tabs.unshift(text(active))
  }
  return tabs
}

/** The title of the window raised over the frame (a modal or an MDI child)
    that holds the control; none for the work area itself. */
function windowTitle(control: Element): string | undefined {
  const win = control.closest('.pb-window--child')
  if (!win) return undefined
  const title = text(win.querySelector(':scope > .pb-titlebar .pb-titlebar__text'))
  return title || undefined
}

/** The anchor slug of that window (`host.mois.window.encounter` → `encounter`). */
function windowNames(control: Element): string[] | undefined {
  const id = control.closest('.pb-window--child')?.getAttribute('data-tutorial-id')
  const slug = id?.split('.').at(-1)
  return slug ? [slug.replace(/-/g, ' ')] : undefined
}

/** The nearest group box or band caption over the control. */
function headingOf(control: Element): string | undefined {
  const fieldset = control.closest('fieldset.pb-fieldset')
  if (fieldset) return text(fieldset.querySelector(':scope > legend')) || undefined
  const group = control.closest('.pb-groupbox')
  if (group) return text(group.firstElementChild) || undefined
  return undefined
}

/** The page a control is painted on: its tab page, the window raised over
    the frame, else the work area. */
function pageOf(control: Element): Element | null {
  return control.closest('.pb-tabs__page, .pb-window--child, [data-tutorial-id="host.mois.workarea"]')
}

/** A control's own caption, and what stands for it in page order: a grid
    cell is its column, so the header. */
export function captionUnit(control: Element): { unit: Element; caption: string } {
  const cell = control.closest('td, th')
  if (cell && control.closest('.pb-dw') && !control.matches(FORM_CONTROL)) {
    const header = cell.tagName === 'TH' ? cell : columnHeader(cell)
    return { unit: header ?? cell, caption: headerCaption(header) }
  }
  return { unit: control, caption: controlCaption(control).caption }
}

/** How many controls before this one on its page carry the same caption. */
function occurrenceOf(control: Element): number {
  const page = pageOf(control)
  if (!page) return 0
  const own = captionUnit(control)
  const key = labelKey(own.caption)
  if (!key) return 0
  let count = 0
  for (const other of auditableControls(page)) {
    const it = captionUnit(other)
    if (it.unit === own.unit) break
    if (pageOf(other) === page && labelKey(it.caption) === key) count += 1
  }
  return count
}

export type FieldAuditTarget = {
  /** the context the dictionary was searched with */
  context: FieldAuditContext
  /** the entry, if the dictionary has one for this control */
  entry?: DictionaryEntry
  /** how it was found: an explicit `data-mois-audit-id`, its caption, or a
      looser reading of the caption (an abbreviation, a typo) */
  via?: 'id' | 'caption' | 'loose'
  ambiguous?: boolean
  /** which part of a composite (a date + time pair) the control is */
  part: number
}

/** Everything the dictionary knows about a control on screen under `node`. */
export function describeAuditTarget(control: Element, node: string): FieldAuditTarget {
  const cell = control.closest('td, th')
  const inGrid = !!cell && !!control.closest('.pb-dw') && !control.matches(FORM_CONTROL)
  const header = inGrid && cell ? (cell.tagName === 'TH' ? cell : columnHeader(cell)) : null
  const own = inGrid ? { caption: headerCaption(header), part: 0 } : controlCaption(control)
  /* a radio's option label first, then the caption over its group (a check
     box is a column of its own, so it has no such fallback) */
  const radio = !inGrid && (control as HTMLInputElement).type === 'radio' ? control.closest('label.pb-check') : null
  const group = radio ? captionBefore(radio) : null
  const context: FieldAuditContext = {
    node,
    caption: own.caption,
    lead: own.lead,
    part: own.part,
    alternates: group?.caption && group.caption !== own.caption ? [group.caption] : undefined,
    occurrence: occurrenceOf(control),
    tabs: selectedTabs(control),
    window: windowTitle(control),
    windowNames: windowNames(control),
    heading: headingOf(control),
    gridCell: inGrid,
  }

  const explicit = control.closest('[data-mois-audit-id]')?.getAttribute('data-mois-audit-id')
    ?? header?.getAttribute('data-mois-audit-id')
  const named = explicit ? dictionaryEntry(explicit) : undefined
  if (named) return { context, entry: named, via: 'id', part: 0 }
  const resolved = resolveDictionaryEntry(context)
  return resolved
    ? { context, entry: resolved.entry, via: resolved.loose ? 'loose' : 'caption', ambiguous: resolved.ambiguous, part: resolved.part }
    : { context, part: own.part }
}

/** What MOIS shows for a control (`kind: 'none'` when it shows nothing). */
export function auditAnswerFor(target: FieldAuditTarget, registered?: ReadonlySet<string>): AuditAnswer {
  return target.entry ? auditAnswer(target.entry, target.part, registered) : { kind: 'none' }
}

/** Every control on screen Ctrl+Shift+A can be asked about: the form
    controls, and one cell per grid column (the first row's, else the
    header), in the order the screen paints them. */
export function auditableControls(root: Element): Element[] {
  const out: Element[] = []
  for (const el of root.querySelectorAll(`${FORM_CONTROL}, .pb-dw`)) {
    if (el.closest('[data-field-audit]')) continue
    if (!el.classList.contains('pb-dw')) {
      if ((el as HTMLInputElement).type !== 'button' && (el as HTMLInputElement).type !== 'hidden') out.push(el)
      continue
    }
    const table = el.querySelector('table')
    const head = cellsOf(headRowOf(table))
    const row = bodyRowsOf(table).map(cellsOf).find((cells) => cells.length === head.length)
    for (const [index, cell] of head.entries()) {
      if (cell.classList.contains('pb-dw__gutter')) continue
      out.push(row?.[index] ?? cell)
    }
  }
  return out
}

/** The control on screen whose dictionary entry is `entry`, for replaying a
    recorded Ctrl+Shift+A. */
export function findControlForEntry(root: Element, node: string, entry: string): Element | null {
  return auditableControls(root).find((el) => describeAuditTarget(el, node).entry?.id === entry) ?? null
}

/** The `host.mois.field.{field}` slug around a control, if it has one. */
export function fieldSlugOf(control: Element): string {
  const id = control.closest('[data-tutorial-id^="host.mois.field."]')?.getAttribute('data-tutorial-id')
  return id ? id.slice('host.mois.field.'.length) : ''
}
