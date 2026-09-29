import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  IMPORTED_DOCX_BODY, templateCounts, tagToken, useTemplateBodies,
  type DesignerStart, type TemplateBody, type TemplateLine, type TemplateRegion, type TemplateToken,
} from '../data/letterDocs'
import { TEMPLATE_PREVIEW } from '../data/letterSetup'
import { LW } from '../data/letterWriter'
import { nowStamp } from '../data/letterDocs'
import { pbSlug } from '../pb'

/* ============================================================================
   The page a letter TEMPLATE is designed on — the Letter Writer's template
   mode (303101 "Once the Letter Writer opens, you can begin creating your
   template").

   PROVENANCE: 303101 `d273caae…` (the blank page), `57c54992…` (database
   fields, "shown in brackets and highlighted in yellow"), `a885b995…` (tags
   `<HEALTH ISSUES>` / `<ALLERGIES>` under bold underlined headings), and
   304753's header steps ("Go to the tool bar and click 'Insert'; Select
   Header (you can click Header first page if you only want your header to
   appear on the first page); Enter in your clinic information").

   The model is a list of lines, each a run of tokens — plain text, a yellow
   `[Field]`, a yellow `<TAG>` — in one of three regions (header, body,
   footer). Word-processing is reduced to what the manual's steps need:

     - click into a line puts the caret there; Enter starts a new line;
     - Add Field puts `[Field]` at the caret;
     - Delete Field removes the field the caret is on ("Place your cursor in
       the yellow field and then pressing 'Delete Field'. (Delete and
       backspace functions will not operate on these fields from your
       keyboard)") — so Delete does NOT remove a field here;
     - Add Tag puts `<TAG>` on the line below the caret;
     - a tag is removed by highlighting it and pressing Delete (the rail's
       Remove Tag text) or Edit ▸ Cut;
     - Double-click on a field raises its prompt ("New: Double-Click field
       for prompt") — INFERRED as a message naming the field.

   Anchors: `host.mois.field.letter-body` (the page), `…template-line-<n>`,
   `…template-field-<slug>` / `…template-tag-<slug>` on the first token of
   that name, `…template-header` / `…template-footer` on the regions.
   ========================================================================= */

type Pos = { line: number; token: number }

const clone = (lines: TemplateLine[]) => lines.map((l) => ({ ...l, tokens: l.tokens.map((t) => ({ ...t })) }))
const blank = (region: TemplateRegion = 'body'): TemplateLine => ({ region, tokens: [] })

/** Where a new template's page starts (New Letter's three options). */
export function startingBody(start: DesignerStart | undefined, bodies: Record<string, TemplateBody>): TemplateBody {
  if (start?.option === 'file') return { ...IMPORTED_DOCX_BODY, importedFrom: start.file }
  if (start?.option === 'template' && start.from) return bodies[start.from] ?? { lines: [blank()] }
  if (start?.option === 'blank') return { lines: [blank()] }
  return bodies[start?.template ?? ''] ?? { lines: [blank()] }
}

export type TemplateDesign = ReturnType<typeof useTemplateDesign>

export function useTemplateDesign(name: string, start?: DesignerStart) {
  const [bodies, saveBody] = useTemplateBodies()
  const [initial] = useState(() => startingBody(start, bodies))
  const [lines, setLines] = useState<TemplateLine[]>(() => clone(initial.lines.length ? initial.lines : [blank()]))
  const [firstOnly, setFirstOnly] = useState({ header: !!initial.headerFirstPageOnly, footer: !!initial.footerFirstPageOnly })
  const [caret, setCaret] = useState<Pos>(() => ({ line: Math.max(0, initial.lines.length - 1), token: -1 }))
  const [selected, setSelected] = useState<Pos | null>(null)
  const [version, setVersion] = useState(0)
  const [saved, setSaved] = useState(false)
  const [prompt, setPrompt] = useState<string | null>(null)

  const edit = (next: TemplateLine[]) => { setLines(next); setVersion((v) => v + 1); setSaved(false) }
  const at = (p: Pos | null) => (p ? lines[p.line]?.tokens[p.token] : undefined)

  const insertToken = (tok: TemplateToken) => {
    const next = clone(lines)
    const line = next[Math.min(caret.line, next.length - 1)] ?? (next[next.push(blank()) - 1]!)
    const index = Math.min(caret.token + 1, line.tokens.length)
    line.tokens.splice(index, 0, tok)
    edit(next)
    setCaret({ line: next.indexOf(line), token: index })
    setSelected({ line: next.indexOf(line), token: index })
  }

  return {
    name,
    lines,
    version,
    caret,
    selected,
    saved,
    prompt,
    firstOnly,
    importedFrom: initial.importedFrom,
    counts: templateCounts({ lines }),
    setPrompt,
    place: (p: Pos) => { setCaret(p); setSelected(null) },
    select: (p: Pos) => { setCaret(p); setSelected(p) },
    setText: (p: Pos, s: string) => {
      const cur = lines[p.line]?.tokens[p.token]
      if (cur?.t === 'text' && cur.s === s) return
      const next = clone(lines)
      const line = next[p.line]
      if (!line) return
      if (p.token >= line.tokens.length) { if (s) line.tokens.push({ t: 'text', s }) } else line.tokens[p.token] = { t: 'text', s }
      edit(next)
    },
    newLine: (p: Pos) => {
      const next = clone(lines)
      const region = next[p.line]?.region ?? 'body'
      next.splice(p.line + 1, 0, blank(region))
      edit(next)
      setCaret({ line: p.line + 1, token: -1 })
    },
    addField: (source: string, field: string) => { if (field) insertToken({ t: 'field', s: field, source }) },
    /** Delete Field: the field the caret (or selection) is on */
    deleteField: (): boolean => {
      const p = at(selected)?.t === 'field' ? selected : at(caret)?.t === 'field' ? caret : null
      if (!p) return false
      const next = clone(lines)
      next[p.line]!.tokens.splice(p.token, 1)
      edit(next)
      setSelected(null)
      setCaret({ line: p.line, token: p.token - 1 })
      return true
    },
    /** Add Tag: on its own line below the caret's */
    addTag: (label: string) => {
      if (!label) return
      const next = clone(lines)
      const region = next[caret.line]?.region ?? 'body'
      const at = Math.min(caret.line + 1, next.length)
      next.splice(at, 0, { region, tokens: [{ t: 'tag', s: tagToken(label) }] })
      edit(next)
      setCaret({ line: at, token: 0 })
      setSelected({ line: at, token: 0 })
    },
    /** Edit ▸ Cut / Delete on a highlighted tag (fields refuse: see above) */
    removeSelected: (): 'tag' | 'field' | null => {
      const tok = at(selected)
      if (!selected || !tok) return null
      if (tok.t === 'field') return 'field'
      if (tok.t !== 'tag') return null
      const next = clone(lines)
      next[selected.line]!.tokens.splice(selected.token, 1)
      if (!next[selected.line]!.tokens.length && next.length > 1) next.splice(selected.line, 1)
      edit(next)
      setSelected(null)
      return 'tag'
    },
    /** Insert ▸ Header / First Page Header / Footer / First Page Footer */
    insertRegion: (region: 'header' | 'footer', first: boolean) => {
      setFirstOnly((f) => ({ ...f, [region]: first }))
      const has = lines.findIndex((l) => l.region === region)
      if (has >= 0) { setCaret({ line: has, token: -1 }); return }
      const next = clone(lines)
      if (region === 'header') next.unshift(blank('header'))
      else next.push(blank('footer'))
      edit(next)
      setCaret({ line: region === 'header' ? 0 : next.length - 1, token: -1 })
    },
    pageNumber: () => insertToken({ t: 'field', s: 'Page Number', source: 'General' }),
    /** File ▸ Load Template / File… replaces the page */
    load: (b: TemplateBody) => { edit(clone(b.lines.length ? b.lines : [blank()])); setCaret({ line: 0, token: -1 }) },
    loadTemplate: (from: string) => { const b = bodies[from]; edit(clone(b?.lines.length ? b.lines : [blank()])); setCaret({ line: 0, token: -1 }) },
    save: () => {
      saveBody(name, { lines, headerFirstPageOnly: firstOnly.header, footerFirstPageOnly: firstOnly.footer, importedFrom: initial.importedFrom, savedAt: nowStamp() })
      setSaved(true)
    },
  }
}

const FIELD_STYLE = { background: LW.yellow, cursor: 'default' } as const

/** One token, read-only. */
function Token({ tok }: { tok: TemplateToken }) {
  if (tok.t === 'field') return <span style={FIELD_STYLE}>[{tok.s}]</span>
  if (tok.t === 'tag') return <span style={FIELD_STYLE}>&lt;{tok.s}&gt;</span>
  return <span style={{ whiteSpace: 'pre-wrap' }}>{tok.s}</span>
}

function lineStyle(l: TemplateLine) {
  return {
    minHeight: '1.4em',
    textAlign: l.align,
    fontWeight: l.bold ? 700 : undefined,
    textDecoration: l.underline ? 'underline' : undefined,
  } as const
}

/** The template read-only: Letter Template Detail's Letter Preview. */
export function TemplatePreview({ body }: { body?: TemplateBody }) {
  if (!body) return null
  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 7.5, lineHeight: 1.3, padding: '18px 22px' }}>
      {body.lines.map((l, i) => (l.rule
        ? <div key={i} style={{ borderTop: '1px solid #000', margin: '4px 0' }} />
        : <div key={i} style={lineStyle(l)}>{l.tokens.map((t, j) => <Token key={j} tok={t} />)}</div>))}
    </div>
  )
}

/** The sample template the pickers show (303589/e3be72c6454f): yellow
    populators, olive / yellow tags — Letter Setup's Letter Preview pane and
    the raw Letter Writer page (LetterWriterWindow; LetterFlow draws the same). */
export function TemplatePreviewLines() {
  return (
    <>
      {TEMPLATE_PREVIEW.map((p, i) => (
        <div key={i} style={{ marginBottom: p.gap ?? 0, minHeight: '1.4em' }}>
          {p.tokens.map((t, j) => (
            <span
              key={j}
              style={
                t.t === 'field'
                  ? { background: LW.yellow }
                  : t.t === 'tag'
                    ? { background: LW.yellow, color: '#6b6b00', fontWeight: 700 }
                    : undefined
              }
            >
              {t.s}
            </span>
          ))}
        </div>
      ))}
    </>
  )
}

function Region({ label, children, anchor }: { label: string; children: ReactNode; anchor: string }) {
  return (
    <div data-tutorial-id={anchor} style={{ position: 'relative', border: '1px dashed #7a9cc8', padding: '6px 4px 4px', margin: '0 0 10px' }}>
      <span style={{ position: 'absolute', top: -8, left: 6, background: '#fff', color: '#4a6a98', fontSize: 10, padding: '0 3px' }}>{label}</span>
      {children}
    </div>
  )
}

/** The editable page. */
export function TemplateCanvas({ design, controlChars }: { design: TemplateDesign; controlChars?: boolean }) {
  const { lines, caret, selected, version } = design
  /* a highlighted tag takes the Delete key: the page keeps focus */
  const root = useRef<HTMLDivElement>(null)
  const seenField = new Set<string>()
  const seenTag = new Set<string>()
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Delete' && selected) {
      const tok = lines[selected.line]?.tokens[selected.token]
      if (tok && tok.t !== 'text') { e.preventDefault(); design.removeSelected() }
    }
  }
  const renderLine = (l: TemplateLine, i: number) => {
    if (l.rule) return <div key={`${i}-${version}`} style={{ borderTop: '1px solid #000', margin: '6px 0' }} data-tutorial-id={`host.mois.field.template-line-${i}`} onMouseDown={() => design.place({ line: i, token: -1 })} />
    const tail = l.tokens[l.tokens.length - 1]?.t === 'text' ? null : l.tokens.length
    return (
      <div
        key={`${i}-${version}`}
        data-tutorial-id={`host.mois.field.template-line-${i}`}
        style={{ ...lineStyle(l), background: caret.line === i ? 'rgba(204,228,247,.35)' : undefined }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) design.place({ line: i, token: l.tokens.length - 1 }) }}
      >
        {l.tokens.map((t, j) => {
          const isSel = selected?.line === i && selected.token === j
          if (t.t === 'text') {
            return (
              <span
                key={j}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                style={{ whiteSpace: 'pre-wrap', outline: 'none' }}
                onFocus={() => design.place({ line: i, token: j })}
                onBlur={(e) => design.setText({ line: i, token: j }, e.currentTarget.textContent ?? '')}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); design.setText({ line: i, token: j }, e.currentTarget.textContent ?? ''); design.newLine({ line: i, token: j }) } }}
              >
                {t.s}
              </span>
            )
          }
          const slug = pbSlug(t.s)
          const seen = t.t === 'field' ? seenField : seenTag
          const anchor = seen.has(slug) ? undefined : `host.mois.field.template-${t.t}-${slug}`
          seen.add(slug)
          return (
            <span
              key={j}
              data-tutorial-id={anchor}
              contentEditable={false}
              onMouseDown={(e) => { e.preventDefault(); root.current?.focus(); design.select({ line: i, token: j }) }}
              onDoubleClick={() => t.t === 'field' && design.setPrompt(t.s)}
              style={{ ...FIELD_STYLE, outline: isSel ? '1px solid #1d4f91' : undefined, boxShadow: isSel ? 'inset 0 0 0 999px rgba(29,79,145,.18)' : undefined }}
            >
              {t.t === 'field' ? `[${t.s}]` : `<${t.s}>`}
            </span>
          )
        })}
        {tail !== null && (
          <span
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            data-tutorial-id={l.tokens.length === 0 ? `host.mois.field.template-line-${i}-text` : undefined}
            style={{ whiteSpace: 'pre-wrap', outline: 'none', display: 'inline-block', minWidth: 12 }}
            onFocus={() => design.place({ line: i, token: l.tokens.length - 1 })}
            onBlur={(e) => { const s = e.currentTarget.textContent ?? ''; if (s) design.setText({ line: i, token: tail }, s) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const s = e.currentTarget.textContent ?? ''; if (s) design.setText({ line: i, token: tail }, s); design.newLine({ line: i, token: tail }) } }}
          />
        )}
        {controlChars && <span style={{ color: '#7a9cc8' }}>¶</span>}
      </div>
    )
  }
  const header = lines.map((l, i) => [l, i] as const).filter(([l]) => l.region === 'header')
  const bodyLines = lines.map((l, i) => [l, i] as const).filter(([l]) => l.region === 'body')
  const footer = lines.map((l, i) => [l, i] as const).filter(([l]) => l.region === 'footer')
  return (
    <div
      ref={root}
      tabIndex={0}
      onKeyDown={onKey}
      style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13, outline: 'none', minHeight: '100%' }}
    >
      {header.length > 0 && (
        <Region label={design.firstOnly.header ? 'First Page Header' : 'Header'} anchor="host.mois.field.template-header">
          {header.map(([l, i]) => renderLine(l, i))}
        </Region>
      )}
      {bodyLines.map(([l, i]) => renderLine(l, i))}
      {footer.length > 0 && (
        <Region label={design.firstOnly.footer ? 'First Page Footer' : 'Footer'} anchor="host.mois.field.template-footer">
          {footer.map(([l, i]) => renderLine(l, i))}
        </Region>
      )}
    </div>
  )
}
