import { useEffect, useRef, type RefObject } from 'react'
import type { PBMenuItem } from '../pb/components/chrome'
import { pbSlug } from '../pb'

/* ============================================================================
   host/hotkeys — MOIS's keyboard, for the frame.

   MOIS is a keyboard-first client: the manual leads with a hot key for
   nearly everything (F2 Save, F4 Prompt, Alt+1 Demographics, Ctrl+L Print
   Label…). Without this map every one of those keys fell through to the
   browser, and several of them do something there instead — Ctrl+D
   bookmarks the page, Ctrl+L focuses the address bar, Ctrl+1..9 switch
   browser tabs. Keys this map handles are `preventDefault`ed.

   Three layers, tried in order:

   1. **The menus.** Every accelerator printed beside a menu item (the
      `key` on a PBMenuItem) runs that item — so a folder's own Action menu
      (Demographics' Ctrl+D Print Demographics) works wherever that menu is
      the one on the bar, and nowhere else, which is MOIS's own scoping.
   2. **The commonly used hot keys** that have no menu entry: F2 Save,
      Shift+F2 Delete, F4 Prompt, F5 Refresh, Ctrl+1..9 the window's tabs.
   3. **Menu access**: Alt plus a menu's underlined letter drops that menu,
      and the item's own underlined letter then picks from it (Alt+V, M →
      Medication Administration). Only the letters the accelerator sheet
      shows are mapped.

   SOURCES: the MOIS Hot Keys sheet (art. 300924, `4a314c1f…png`) for the
   commonly used and navigation keys; the MOIS Accelerators sheet (art.
   300924, `b468b902…png`) for the menu and item letters; art. 304393 for
   "Alt + t opens Action" and Record ▸ Prompt = F4.

   The map listens while the MOIS frame or its tutorial card has focus, but
   not while a modal window is up: a dialog owns its own keys (the Advanced
   Gender window's F2, a window's Esc).
   ========================================================================= */

type MenuBarEntry = { label: string; menu?: PBMenuItem[] }

export type MoisHotkeyActions = {
  /** press a command-row button by slug; false when it is not on screen */
  command: (slug: string) => boolean
  /** report a semantic action the way the kit would have */
  report: (action: string, payload: Record<string, string>) => void
}

/** The underlined letter of each menu on the bar (Accelerators sheet).
    Help's H is taken by Alt+H Patient Summary, which wins in MOIS too. */
const MENU_LETTERS: Record<string, string> = {
  R: 'Record', M: 'Modules', V: 'Views', T: 'Action', U: 'Utilities', N: 'Print',
}

/** The underlined letter of an item, per menu — only those the sheet shows. */
const ITEM_LETTERS: Record<string, Record<string, string>> = {
  Record: {
    D: 'Delete', F: 'Find', N: 'Next', P: 'Previous', S: 'Save',
  },
  Modules: {
    P: 'Patient Chart', W: 'Workspace', S: 'Schedule', B: 'Billing',
    A: 'Administration', D: 'Data Exchange', R: 'Reports',
  },
  Views: {
    I: 'Interventions', L: 'Alerts', M: 'Medication Administration',
    Y: 'Facility Admissions', N: 'Notification', K: 'myhealthkey',
  },
  Action: {
    L: 'Print Label', I: 'Invoice Window', D: 'Print Demographics',
    F: 'Family Summary', K: 'Create Task', M: 'Create Message',
  },
  Utilities: {
    T: 'Paste Patient Text', F: 'Flow Sheet Review', C: 'Change Teleplan Password',
    E: 'MSP Eligibility Check',
  },
  Print: {
    P: 'Problem List for Patient', L: 'Cumulative Lab Data for Patient',
    R: 'Radiology Reports for Patient', C: 'Consultations for Patient',
    M: 'Medications for Patient',
  },
}

/** `KeyD` → `D`, `Digit1` → `1`, `F2` → `F2`; the layout-free name, so Alt
    on a Mac (which turns Alt+1 into ¡) still maps. */
function keyName(e: KeyboardEvent): string | null {
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3)
  if (/^Digit\d$/.test(e.code)) return e.code.slice(5)
  if (/^Numpad\d$/.test(e.code)) return e.code.slice(6)
  if (/^F\d{1,2}$/.test(e.code)) return e.code
  return null
}

/** `Ctrl+Shift+R` in the order MOIS prints it. */
function comboOf(e: KeyboardEvent, key: string): string {
  return [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', key].filter(Boolean).join('+')
}

const norm = (combo: string) => combo.replace(/\s+/g, '').toUpperCase()

type Found = { top: string; item: PBMenuItem }

function findByKey(bar: MenuBarEntry[], combo: string): Found | null {
  const want = norm(combo)
  const walk = (top: string, items: PBMenuItem[] = []): Found | null => {
    for (const item of items) {
      if (item.menu) {
        const inner = walk(top, item.menu)
        if (inner) return inner
      } else if (item.key && norm(item.key) === want) return { top, item }
    }
    return null
  }
  for (const entry of bar) {
    const found = walk(entry.label, entry.menu)
    if (found) return found
  }
  return null
}

function findByLabel(bar: MenuBarEntry[], top: string, label: string): Found | null {
  const entry = bar.find((m) => m.label === top)
  const walk = (items: PBMenuItem[] = []): PBMenuItem | null => {
    for (const item of items) {
      if (item.label === label && !item.menu) return item
      const inner = item.menu ? walk(item.menu) : null
      if (inner) return inner
    }
    return null
  }
  const item = walk(entry?.menu)
  return item ? { top, item } : null
}

/* The lookup field the cursor was last in. Record ▸ Prompt is chosen from a
   menu, and by then focus has moved to the menu, so F4's "the field you are
   in" has to be remembered rather than read off document.activeElement. */
let lastLookupGroup: Element | null = null
/* …and the edit field it was last in, for Maintenance ▸ Default Value
   Setting, which reads "the field you left the cursor in" (art. 304679). */
let lastField: HTMLInputElement | null = null

/** The caption MOIS paints beside a field: its own aria-label, else the label
    text in the cell before it (`Chart No.:` → `Chart No.`). */
function captionOf(input: HTMLElement): string {
  const own = input.getAttribute('aria-label')
  let node: Element | null = input.closest('.pb-inputgroup') ?? input
  for (let depth = 0; node && depth < 3; depth += 1) {
    let prev = node.previousElementSibling
    while (prev && !(prev.textContent ?? '').trim()) prev = prev.previousElementSibling
    const text = prev?.textContent?.trim()
    if (text && /:$/.test(text)) return text.replace(/:$/, '')
    node = node.parentElement
  }
  return own ?? ''
}

/** The field the cursor is (or last was) in, and what it holds. */
export function lastFieldInfo(): { field: string; value: string } {
  const active = typeof document === 'undefined' ? null : document.activeElement
  const input = active instanceof HTMLInputElement ? active : (lastField?.isConnected ? lastField : null)
  return input ? { field: captionOf(input), value: input.value } : { field: '', value: '' }
}

/** F4 / Record ▸ Prompt: press the "…" of the field the cursor is (or last
    was) in. False when the cursor is in no field with a list behind it —
    MOIS then does nothing either. */
export function promptCurrentField(): boolean {
  const active = typeof document === 'undefined' ? null : document.activeElement
  const group = active?.closest('.pb-inputgroup') ?? (lastLookupGroup?.isConnected ? lastLookupGroup : null)
  const dots = group?.querySelector<HTMLButtonElement>('.pb-inputgroup__btn--dots')
  if (!dots || dots.disabled) return false
  dots.click()
  return true
}

export function useMoisHotkeys(
  rootRef: RefObject<HTMLElement | null>,
  bar: MenuBarEntry[],
  actions: MoisHotkeyActions,
) {
  /* the listener is attached once; it reads the current menus through refs */
  const barRef = useRef(bar)
  barRef.current = bar
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  useEffect(() => {
    if (typeof document === 'undefined') return
    /* the last pointer-down landed inside the frame: a click on the grey
       desktop leaves focus on <body>, and the frame should still own the
       keyboard after it */
    let frameActive = false
    /* a menu dropped by Alt+letter, waiting for its item's letter */
    let pending: string | null = null

    const root = () => rootRef.current
    const launcher = (top: string) =>
      [...(root()?.querySelectorAll<HTMLElement>('[data-tutorial-id]') ?? [])]
        .find((el) => el.getAttribute('data-tutorial-id') === `host.mois.menu.${pbSlug(top)}`)

    const run = ({ top, item }: Found) => {
      if (item.disabled) return
      if (item.label) actionsRef.current.report('host.mois.menu', { menu: pbSlug(top), item: pbSlug(item.label) })
      item.onSelect?.()
    }

    const onFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement && root()?.contains(e.target) && !e.target.closest('.pb-modal-layer')) lastField = e.target
      const group = (e.target as Element | null)?.closest?.('.pb-inputgroup')
      if (group && root()?.contains(group)) lastLookupGroup = group
      else if (root()?.contains(e.target as Node) && (e.target as Element).closest?.('.pb-menubar, .pb-menu') == null) lastLookupGroup = null
    }

    /** Ctrl+n: the n-th tab of the focused child window, else the work area. */
    const tab = (n: number, target: EventTarget | null) => {
      const frame = root()
      const child = target instanceof Element && frame?.contains(target)
        ? target.closest('.pb-window--child')
        : [...(frame?.querySelectorAll('.pb-window--child') ?? [])].at(-1)
      const area = child ?? frame?.querySelector('[data-tutorial-id="host.mois.workarea"]')
      const strip = area?.querySelector('.pb-tabs')
      if (!strip) return false
      const tabs = [...strip.querySelectorAll<HTMLElement>('.pb-tabs__tab')].filter((t) => t.closest('.pb-tabs') === strip)
      const selectedTab = tabs[n - 1]
      if (!selectedTab) return false
      selectedTab.click()
      return true
    }

    const onPointerDown = (e: PointerEvent) => {
      frameActive = !!root()?.contains(e.target as Node)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const frame = root()
      if (!frame || e.defaultPrevented) return
      const target = e.target as Node | null
      const inTutorialCard = target instanceof Element &&
        !!target.closest('[data-tutorial-surface]')
      const inFrame = (target && frame.contains(target)) || inTutorialCard
        || ((target === document.body || target === document.documentElement) && frameActive)
      if (!inFrame) return
      /* a modal window owns the keyboard (Esc, its own F2) */
      if (frame.querySelector('.pb-modal-layer')) { pending = null; return }
      const key = keyName(e)
      if (!key) { if (e.key === 'Escape') pending = null; return }
      const consume = () => { e.preventDefault(); e.stopPropagation() }

      /* 3b. the item letter of a menu Alt+letter dropped */
      if (pending && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const top = pending
        pending = null
        const label = ITEM_LETTERS[top]?.[key]
        const found = label ? findByLabel(barRef.current, top, label) : null
        if (found) {
          consume()
          /* close the dropped menu the way a pick does, then run the item */
          launcher(top)?.click()
          run(found)
        }
        return
      }
      pending = null

      const combo = comboOf(e, key)
      /* plain letters and digits are typing, never commands */
      if (!e.ctrlKey && !e.altKey && !/^F\d/.test(key)) return

      /* 1. an accelerator on the menus the bar is showing */
      const found = findByKey(barRef.current, combo)
      if (found) { consume(); run(found); return }

      /* 2. the commonly used hot keys with no menu entry */
      const { command } = actionsRef.current
      switch (combo) {
        case 'F2': consume(); command('save'); return
        case 'Shift+F2': consume(); command('delete-record'); return
        case 'F4': consume(); promptCurrentField(); return
        case 'F5': consume(); command('refresh'); return
        default: break
      }
      if (e.ctrlKey && !e.altKey && !e.shiftKey && /^[1-9]$/.test(key)) {
        consume()
        tab(Number(key), e.target)
        return
      }

      /* 3a. Alt + a menu's letter drops that menu */
      if (e.altKey && !e.ctrlKey && !e.shiftKey && MENU_LETTERS[key]) {
        const top = MENU_LETTERS[key]
        const button = launcher(top)
        if (button) {
          consume()
          if (button.getAttribute('aria-expanded') !== 'true') button.click()
          pending = top
        }
      }
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [rootRef])
}
