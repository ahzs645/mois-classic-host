import { useMemo, useState, type ReactNode } from 'react'
import { useChartExport } from '../data/chart-records'
import { TEMPLATE_CONCEPTS, useCarePlanTemplates, type TemplateElement } from '../data/carePlanTemplates'
import type { ChartScreen } from '../data/chartScreens'
import { deleteCarePlanTag, updateCarePlanTag, useChartSession, type CarePlanTag } from '../data/chartSession'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import {
  ELEMENT_CATEGORIES, ELEMENT_RULES, STANDARD_SECTIONS,
  addElements, addSections, chartCodes, deleteElement, deleteSection, effectiveSections, elementLabel,
  pinRecord, ruleText, updateElement, updateSection, useSummarySettings,
  type CarePlanElement, type SummarySection,
} from '../data/summarySettings'
import { useScreenReport } from '../host/screen-state'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBGroup, PBIdentityStrip, PBInput, PBMessageBox, PBRadio,
  PBSelect, PBTabs, PBViewHeader, pbSlug, usePBInstrumentation,
} from '../pb'
import { registerAreaWindow, useOpenWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Patient Chart ▸ Care Plan ▸ Summary Settings (art. 303514) — what the Care
   Plan Summary shows for this chart.

   PROVENANCE: b256251d0d8f (article 303115's capture of this folder,
   v02.19.04): the navy "Summary Settings" header with the chart identity on
   its right, New Record · Delete Record · Save · Refresh · Add from
   Template, the FIRST / MIDDLE / LAST / DoB strip, and two tabs — Care Plan
   Sections, Care Plan Elements. The Elements tab is not a grid: a pale band
   per section ("[-] MEASUREMENTS … Rank"), and under it one yellow line per
   element — ▲ ▼, the chart element (MEASURE), the code / description
   (WEIGHT), the rule or value in grey (INITIAL *RECORD(S): 1), the rank
   ("-") and a blue Edit link. The article's three captures of its own are
   not in the local manual.

   Care Plan Sections is a grid of Order · Section Label · Type (the
   article's "How it works" and the field audit's columns). The current
   row's Order is editable (it "controls the display order of the section"),
   and so is a USER section's label. INFERRED layout.

   Commands, per tab:
     New Record       Sections: the "Select Standard Sections" / custom
                      labels window (care-plan-new-section). Elements: Tag
                      Information to Care Plan with the rule options
                      (care-plan-element-new).
     Delete Record    Sections: refused while a section has elements (the
                      article's rule), else confirmed. Elements: removes the
                      element — tagged records included ("Tagged records must
                      be deleted from this window").
     Save / Refresh   edits apply as they are made (session-only, like every
                      chart write here); Save marks them saved, Refresh
                      re-reads the lists.
     Add from Template   the template chooser (care-plan-add-from-template),
                      reading the Administration ▸ Care Plan Templates list
                      (data/carePlanTemplates.ts).
   The article's Elements "Edit Record" is the capture's per-line Edit link
   (care-plan-element-edit: Section and Rank only — "In order to change the
   rules, you must delete the current records and re-add").

   The Care Plan Summary (screens/CarePlanSummaryView.tsx) reads the same
   sections and elements through data/summarySettings.ts.

   Anchors: tabs host.mois.tab.{care-plan-sections, care-plan-elements};
   section rows host.mois.row.care-plan-section-{slug}, the current row's
   host.mois.field.{section-order, section-label}; element lines
   host.mois.row.care-plan-element-{n}, their host.mois.command.{element-up-
   {n}, element-down-{n}, element-edit-{n}}, bands
   host.mois.group.care-plan-element-section-{slug}; prompts'
   host.mois.command.{summary-delete-yes, summary-delete-no,
   summary-message-ok}. The windows' anchors are listed with each below.
   Reported: host.screen.{rows, saved, carePlanSections, carePlanElements}.
   ========================================================================= */

/* --- one list of what the Elements tab shows: tags + elements --------------- */
type Item =
  | { kind: 'tag'; index: number; tag: CarePlanTag; section: string; rank: string }
  | { kind: 'element'; el: CarePlanElement; section: string; rank: string }

const rankNum = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? Number.MAX_SAFE_INTEGER : Number(v))

function itemsBySection(sections: SummarySection[], tags: CarePlanTag[], elements: CarePlanElement[]): { section: string; items: Item[] }[] {
  const all: Item[] = [
    ...tags.map((tag, index) => ({ kind: 'tag' as const, index, tag, section: tag.section || 'GENERAL', rank: tag.rank })),
    ...elements.map((el) => ({ kind: 'element' as const, el, section: el.section, rank: el.rank })),
  ]
  return sections
    .map((s) => ({
      section: s.label,
      items: all.map((it, i) => [it, i] as const).filter(([it]) => it.section === s.label)
        .sort(([a, i], [b, j]) => rankNum(a.rank) - rankNum(b.rank) || i - j).map(([it]) => it),
    }))
    .filter((g) => g.items.length)
}

const itemCategory = (it: Item) => (it.kind === 'tag' ? it.tag.category : it.el.category)
const itemLabel = (it: Item) => (it.kind === 'tag' ? it.tag.description : elementLabel(it.el))
const itemRule = (it: Item) => {
  if (it.kind === 'tag') return [it.tag.date, it.tag.detail].filter(Boolean).join('  ')
  if (it.el.rule === 'THIS RECORD' && it.el.pinned) return [it.el.pinned.date, it.el.pinned.value].filter(Boolean).join('  ')
  return ruleText(it.el)
}
const itemKey = (it: Item) => (it.kind === 'tag' ? `tag:${it.index}` : `el:${it.el.id}`)

function setItemRank(chart: string, it: Item, rank: string) {
  if (it.kind === 'tag') updateCarePlanTag(chart, it.index, { rank })
  else updateElement(chart, it.el.id, { rank })
}

/* ========================================================================== */
export function SummarySettingsView({ screen }: { screen: ChartScreen }) {
  const patient = usePatient()
  const chart = patient.chart
  const session = useChartSession(chart)
  const settings = useSummarySettings(chart)
  const openWindow = useOpenWindow()
  const host = usePBInstrumentation()
  const [tab, setTab] = useState('Care Plan Sections')
  const [secCur, setSecCur] = useState(0)
  const [elCur, setElCur] = useState<string | null>(null)
  const [saved, setSaved] = useState(true)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [prompt, setPrompt] = useState<null | 'section-has-elements' | 'delete-section' | 'delete-element'>(null)

  const sections = useMemo(() => effectiveSections(chart, session.tags), [chart, session.tags, settings])
  const groups = useMemo(() => itemsBySection(sections, session.tags, settings.elements), [sections, session.tags, settings.elements])
  const items = groups.flatMap((g) => g.items)
  const section = sections[Math.min(secCur, Math.max(0, sections.length - 1))]
  const current = items.find((it) => itemKey(it) === elCur) ?? items[0]
  const onElements = tab === 'Care Plan Elements'
  useScreenReport({
    rows: onElements ? items.length : sections.length, saved,
    carePlanSections: sections.length, carePlanElements: items.length,
  })
  const dirty = () => setSaved(false)

  const deleteRecord = () => {
    if (onElements) { if (current) setPrompt('delete-element'); return }
    if (!section) return
    setPrompt(items.some((it) => it.section === section.label) ? 'section-has-elements' : 'delete-section')
  }

  const commands = screen.commands.map((label) => label ? ({
    label,
    disabled: label === 'Delete Record' ? (onElements ? !current : !section) : false,
    onClick: label === 'New Record' ? () => { openWindow(onElements ? 'care-plan-element-new' : 'care-plan-new-section'); dirty() }
      : label === 'Delete Record' ? deleteRecord
      : label === 'Save' ? () => setSaved(true)
      : label === 'Refresh' ? () => { setCollapsed(new Set()); setSecCur(0); setElCur(null) }
      : label === 'Add from Template' ? () => { openWindow('care-plan-add-from-template'); dirty() }
      : undefined,
  }) : null)

  /* ▲ / ▼: renumber the section's lines 1..n in their shown order, swapped */
  const move = (list: Item[], i: number, delta: -1 | 1) => {
    const j = i + delta
    if (j < 0 || j >= list.length) return
    const order = [...list]
    ;[order[i], order[j]] = [order[j]!, order[i]!]
    order.forEach((it, k) => setItemRank(chart, it, String(k + 1)))
    dirty()
  }

  let n = -1
  return <>
    <PBViewHeader title="Summary Settings" right={<ChartHeaderIdentity />} />
    <PBCommandRow commands={commands} />
    <PBIdentityStrip fields={[
      { label: 'FIRST:', value: patient.first }, { label: 'MIDDLE:', value: patient.middle },
      { label: 'LAST:', value: patient.last }, { label: 'DoB:', value: patient.dob },
    ]} encounter="NO ENCOUNTER" />
    <div style={{ flex: 1, minHeight: 0, display: 'flex', padding: 3 }}>
      <PBTabs tabs={['Care Plan Sections', 'Care Plan Elements']} active={tab} onChange={setTab} compact face>
        {!onElements ? (
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 4 }}>
            <PBDataWindow
              rows={sections}
              current={secCur}
              onCurrentChange={setSecCur}
              rowTutorialId={(r) => `host.mois.row.care-plan-section-${pbSlug(r.label)}`}
              columns={[
                {
                  key: 'order', header: 'Order', width: 80, align: 'center',
                  render: (r, i) => (i === secCur
                    ? <PBInput w={60} align="center" value={r.order} data-tutorial-id="host.mois.field.section-order" onChange={(e) => {
                      /* a section a tag added on its own joins the stored list first */
                      if (!settings.sections.some((s) => s.label === r.label)) addSections(chart, [{ label: r.label, type: r.type }])
                      updateSection(chart, r.label, { order: e.target.value.replace(/[^\d]/g, '') }); dirty()
                    }} />
                    : r.order),
                },
                {
                  key: 'label', header: 'Section Label', width: 300,
                  render: (r, i) => (i === secCur && r.type === 'USER' && settings.sections.some((s) => s.label === r.label)
                    ? <PBInput w={280} defaultValue={r.label} data-tutorial-id="host.mois.field.section-label" onBlur={(e) => { const v = e.target.value.trim().toUpperCase(); if (v && v !== r.label) { updateSection(chart, r.label, { label: v }); dirty() } }} />
                    : r.label),
                },
                { key: 'type', header: 'Type', width: 130 },
                { key: 'pad', header: '' },
              ]}
              empty="No sections."
            />
          </div>
        ) : (
          <div className="pb-care-summary" data-tutorial-id="host.mois.group.care-plan-elements" style={{ overflow: 'auto' }}>
            {!groups.length && <div className="pb-dw__empty" style={{ padding: 18 }}>Nothing is on this chart's Care Plan yet. Tag a record, press New Record, or Add from Template.</div>}
            {groups.map((g, gi) => {
              const shut = collapsed.has(g.section)
              return (
                <div key={g.section} data-tutorial-id={`host.mois.group.care-plan-element-section-${pbSlug(g.section)}`}>
                  <div className="pb-row" style={{ height: 22, padding: '0 8px', gap: 8, fontWeight: 700, background: 'linear-gradient(#f4f4f4, #dcdcdc)', borderBottom: '1px solid #b0b0b0' }}>
                    <button
                      type="button"
                      aria-expanded={!shut}
                      style={{ width: 13, height: 13, lineHeight: '9px', padding: 0, fontSize: 11, border: '1px solid #808080', background: '#fff' }}
                      onClick={() => setCollapsed((c) => { const x = new Set(c); if (x.has(g.section)) x.delete(g.section); else x.add(g.section); return x })}
                    >
                      {shut ? '+' : '−'}
                    </button>
                    <span style={{ flex: '1 1 auto' }}>{g.section}</span>
                    {gi === 0 && <span style={{ width: 60, textAlign: 'center' }}>Rank</span>}
                  </div>
                  {!shut && g.items.map((it, i) => {
                    n += 1
                    const at = n
                    const isCur = current && itemKey(current) === itemKey(it)
                    return (
                      <div
                        key={itemKey(it)}
                        className="pb-row"
                        data-tutorial-id={`host.mois.row.care-plan-element-${at}`}
                        onMouseDown={() => setElCur(itemKey(it))}
                        style={{
                          height: 22, gap: 0, padding: '0 8px 0 4px', background: isCur ? '#fff59a' : '#ffffd0',
                          borderBottom: '1px solid #e8e2a8', outline: isCur ? '1px dotted #404040' : undefined, outlineOffset: -2,
                        }}
                      >
                        <Arrow id={`element-up-${at}`} glyph="▲" disabled={i === 0} onPress={() => move(g.items, i, -1)} />
                        <Arrow id={`element-down-${at}`} glyph="▼" disabled={i === g.items.length - 1} onPress={() => move(g.items, i, 1)} />
                        <span style={{ width: 118, paddingLeft: 8 }}>{itemCategory(it)}</span>
                        <span style={{ width: 300, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{itemLabel(it)}</span>
                        <span style={{ flex: '1 1 auto', color: '#808080', overflow: 'hidden', whiteSpace: 'nowrap' }}>{itemRule(it)}</span>
                        <span style={{ width: 60, textAlign: 'center' }}>{it.rank || '-'}</span>
                        <button
                          type="button"
                          className="pb-link"
                          style={{ width: 36, color: '#0000ff', textDecoration: 'underline' }}
                          data-tutorial-id={host?.anchor('command', `element-edit-${at}`)}
                          onClick={() => {
                            host?.report('command', { command: `element-edit-${at}` })
                            setElCur(itemKey(it))
                            openWindow('care-plan-element-edit', it.kind === 'tag' ? { tag: it.index } : { element: it.el.id })
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </PBTabs>
    </div>

    {prompt === 'section-has-elements' && (
      <PBMessageBox title="Delete Record" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.summary-message-ok' }]} onClose={() => setPrompt(null)}>
        This section has elements on the Care Plan. Remove them from the Care Plan, or move them to a different section, before deleting it.
      </PBMessageBox>
    )}
    {(prompt === 'delete-section' || prompt === 'delete-element') && (
      <PBMessageBox
        title="Delete Record" icon="question"
        buttons={[
          { label: 'Yes', value: 'yes', default: true, tutorialId: 'host.mois.command.summary-delete-yes' },
          { label: 'No', value: 'no', tutorialId: 'host.mois.command.summary-delete-no' },
        ]}
        onClose={(v) => {
          if (v === 'yes') {
            if (prompt === 'delete-section' && section) { deleteSection(chart, section.label); setSecCur(0) }
            if (prompt === 'delete-element' && current) {
              if (current.kind === 'tag') deleteCarePlanTag(chart, current.index)
              else deleteElement(chart, current.el.id)
              setElCur(null)
            }
            dirty()
          }
          setPrompt(null)
        }}
      >
        {prompt === 'delete-section' ? `Delete the section ${section?.label ?? ''}?` : 'Remove this element from the Care Plan Summary?'}
      </PBMessageBox>
    )}
  </>
}

function Arrow({ id, glyph, disabled, onPress }: { id: string; glyph: string; disabled?: boolean; onPress: () => void }) {
  const host = usePBInstrumentation()
  return (
    <button
      type="button"
      className="pb-btn pb-btn--sm"
      disabled={disabled}
      style={{ width: 18, minWidth: 0, height: 16, padding: 0, fontSize: 8, lineHeight: '14px', marginRight: 2 }}
      data-tutorial-id={host?.anchor('command', id)}
      onClick={() => { host?.report('command', { command: id }); onPress() }}
    >
      {glyph}
    </button>
  )
}

/* ============================================================================
   The windows. None is captured locally (the article's are missing); fields
   are the article's own lists, layouts INFERRED.
   ========================================================================= */

/* --- New Record on Care Plan Sections -------------------------------------
   "Select items from the 'Select Standard Sections' list. Enter custom
   section labels in the bottom half of the window and save."
   Anchors: host.mois.dialog.care-plan-new-section; tick boxes
   host.mois.field.standard-section-{slug}; host.mois.field.custom-section-{1..4};
   host.mois.command.{new-section-save, new-section-cancel}. */
function NewSectionWindow({ close }: AreaWindowProps) {
  const p = usePatient()
  const session = useChartSession(p.chart)
  const settings = useSummarySettings(p.chart)
  const have = useMemo(() => new Set(effectiveSections(p.chart, session.tags).map((s) => s.label)), [p.chart, session.tags, settings])
  const standard = STANDARD_SECTIONS.filter((s) => !have.has(s))
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [custom, setCustom] = useState(['', '', '', ''])
  useScreenReport({ dialog: 'care-plan-new-section', picked: picked.size })
  const save = () => {
    addSections(p.chart, [
      ...[...picked].map((label) => ({ label, type: 'SYSTEM' as const })),
      ...custom.filter((c) => c.trim()).map((label) => ({ label, type: 'USER' as const })),
    ])
    close()
  }
  return (
    <WorkspaceDialogFrame id="care-plan-new-section" title="Care Plan Section" width={420} height={430} onClose={close} controls={false}>
      <div style={{ padding: '8px 12px 0', flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        <PBGroup title="Select Standard Sections">
          <div style={{ height: 170, overflow: 'auto', background: '#fff', border: '1px solid #a0a0a0', padding: '2px 4px' }}>
            {standard.length ? standard.map((s) => (
              <div key={s} style={{ padding: '1px 0' }}>
                <PBCheckbox
                  label={s}
                  checked={picked.has(s)}
                  tutorialId={`host.mois.field.standard-section-${pbSlug(s)}`}
                  onChange={(v) => setPicked((x) => { const n = new Set(x); if (v) n.add(s); else n.delete(s); return n })}
                />
              </div>
            )) : <span style={{ color: 'var(--pb-text-dim)' }}>Every standard section is already on this Care Plan.</span>}
          </div>
        </PBGroup>
        <PBGroup title="Custom Section Labels">
          {custom.map((c, i) => (
            <div key={i} style={{ padding: '2px 0' }}>
              <PBInput
                w="100%" value={c}
                data-tutorial-id={`host.mois.field.custom-section-${i + 1}`}
                onChange={(e) => setCustom((x) => x.map((v, j) => (j === i ? e.target.value : v)))}
              />
            </div>
          ))}
        </PBGroup>
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 12, padding: '10px 0', flex: 'none' }}>
        <DialogButton id="new-section-save" width={80} isDefault onClick={save} disabled={!picked.size && !custom.some((c) => c.trim())}>Save</DialogButton>
        <DialogButton id="new-section-cancel" width={80} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- New Record on Care Plan Elements: Tag Information to Care Plan --------
   The article's "Tag Information to Care Plan Window Options": Category,
   Code, Concept, This Record Only, Rule, No. of Records, Record is Required,
   Section, Rank. The right-click Tag to Care Plan (304731 `fc801c1c…`,
   screens/TagToCarePlanDialog.tsx) is the same title with the record fixed;
   this is the variant that picks what to tag, and so carries the rule.
   Anchors: host.mois.dialog.care-plan-element-new; host.mois.field.element-
   {category, code, concept, this-record-only, rule-option, rule, records,
   required, section, rank}; host.mois.command.{element-new-ok,
   element-new-cancel}. */
function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pb-row" style={{ gap: 6, padding: '2px 0' }}>
      <span className="pb-form__label" style={{ width: 98 }}>{label}</span>
      {children}
    </div>
  )
}

function NewElementWindow({ close }: AreaWindowProps) {
  const p = usePatient()
  const data = useChartExport()
  const session = useChartSession(p.chart)
  const settings = useSummarySettings(p.chart)
  const sectionOptions = useMemo(() => {
    const have = effectiveSections(p.chart, session.tags).map((s) => s.label)
    return ['', ...have, ...STANDARD_SECTIONS.filter((s) => !have.includes(s))]
  }, [p.chart, session.tags, settings])
  const [category, setCategory] = useState('MEASURE')
  const [code, setCode] = useState('')
  const [concept, setConcept] = useState('')
  const [only, setOnly] = useState(false)
  const [rule, setRule] = useState('RECENT')
  const [records, setRecords] = useState('1')
  const [required, setRequired] = useState(false)
  const [section, setSection] = useState('MEASUREMENTS')
  const [rank, setRank] = useState('')
  const codes = useMemo(() => ['', ...chartCodes(data, category)], [data, category])
  const concepts = ['', ...(TEMPLATE_CONCEPTS[category] ?? [])]
  const measureOnly = rule === 'HIGHEST' || rule === 'LOWEST'
  useScreenReport({ dialog: 'care-plan-element-new' })

  const ok = () => {
    const identifiedBy = code ? 'Code' as const : 'Concept' as const
    const base = { category, identifiedBy, code: code.split(' - ')[0] ?? '', concept }
    addElements(p.chart, [{
      ...base,
      rule: only ? 'THIS RECORD' : rule,
      records: only ? '1' : records,
      required,
      section: section || 'GENERAL',
      rank,
      pinned: only ? pinRecord(data, base) : undefined,
    }])
    close()
  }

  return (
    <WorkspaceDialogFrame id="care-plan-element-new" title="Tag Information to Care Plan" width={470} height={440} onClose={close} controls={false}>
      <div style={{ padding: '8px 10px 0', display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 auto', ['--pb-text-head' as string]: '#000078' }}>
        <PBGroup title="Record Information">
          <Labelled label="Category:">
            <PBSelect w={180} options={ELEMENT_CATEGORIES} value={category} data-tutorial-id="host.mois.field.element-category"
              onChange={(e) => {
                const c = e.target.value
                setCategory(c); setCode(''); setConcept('')
                setSection(c === 'MEASURE' ? 'MEASUREMENTS' : c === 'CONSULT' ? 'CONSULTS' : 'GENERAL')
                if (c !== 'MEASURE' && (rule === 'HIGHEST' || rule === 'LOWEST')) setRule('RECENT')
              }} />
          </Labelled>
          <Labelled label="Code:">
            <PBSelect w={300} options={codes} value={code} data-tutorial-id="host.mois.field.element-code" onChange={(e) => { setCode(e.target.value); if (e.target.value) setConcept('') }} />
          </Labelled>
          <Labelled label="Concept:">
            <PBSelect w={300} options={concepts} value={concept} data-tutorial-id="host.mois.field.element-concept" onChange={(e) => { setConcept(e.target.value); if (e.target.value) setCode('') }} />
          </Labelled>
        </PBGroup>
        <PBGroup title="Tagging Rule">
          <Labelled label="">
            <PBRadio name="element-rule-kind" label="This Record Only" checked={only} tutorialId="host.mois.field.element-this-record-only" onChange={() => setOnly(true)} />
          </Labelled>
          <Labelled label="">
            <PBRadio name="element-rule-kind" label="Rule:" checked={!only} tutorialId="host.mois.field.element-rule-option" onChange={() => setOnly(false)} />
            <PBSelect
              w={120} disabled={only} value={rule} data-tutorial-id="host.mois.field.element-rule"
              options={ELEMENT_RULES.filter((r) => category === 'MEASURE' || (r !== 'HIGHEST' && r !== 'LOWEST')).map((r) => ({ value: r, label: r === 'RECENT' ? 'MOST RECENT' : r === 'INITIAL' ? 'INITIAL/FIRST' : `${r} VALUE` }))}
              onChange={(e) => setRule(e.target.value)}
            />
          </Labelled>
          <Labelled label="No. of Records:">
            <PBInput w={44} align="center" disabled={only} value={records} data-tutorial-id="host.mois.field.element-records" onChange={(e) => setRecords(e.target.value.replace(/\D/g, ''))} />
            {measureOnly && <span style={{ color: 'var(--pb-text-dim)' }}>(measures only)</span>}
          </Labelled>
          <Labelled label="">
            <PBCheckbox label="Record is Required" checked={required} tutorialId="host.mois.field.element-required" onChange={setRequired} />
          </Labelled>
        </PBGroup>
        <PBGroup title="Care Plan Location">
          <Labelled label="Section:">
            <PBSelect w={200} options={sectionOptions} value={section} data-tutorial-id="host.mois.field.element-section" onChange={(e) => setSection(e.target.value)} />
          </Labelled>
          <Labelled label="Rank:">
            <PBInput w={44} align="center" value={rank} data-tutorial-id="host.mois.field.element-rank" onChange={(e) => setRank(e.target.value.replace(/\D/g, ''))} />
          </Labelled>
        </PBGroup>
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 14, padding: '10px 0', flex: 'none' }}>
        <DialogButton id="element-new-ok" width={75} isDefault onClick={ok} disabled={!code && !concept}>Ok</DialogButton>
        <DialogButton id="element-new-cancel" width={75} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Edit (the Elements line's Edit link) ----------------------------------
   "Allows the user to change the section and/or rank of the record."
   Anchors: host.mois.dialog.care-plan-element-edit; host.mois.field.{element-
   edit-section, element-edit-rank}; host.mois.command.{element-edit-ok,
   element-edit-cancel}. */
function EditElementWindow({ args, close }: AreaWindowProps) {
  const p = usePatient()
  const session = useChartSession(p.chart)
  const settings = useSummarySettings(p.chart)
  const tagIndex = typeof args.tag === 'number' ? args.tag : -1
  const tag = tagIndex >= 0 ? session.tags[tagIndex] : undefined
  const el = typeof args.element === 'string' ? settings.elements.find((e) => e.id === args.element) : undefined
  const [section, setSection] = useState(tag ? (tag.section || 'GENERAL') : el?.section ?? '')
  const [rank, setRank] = useState(tag?.rank ?? el?.rank ?? '')
  const sectionOptions = useMemo(() => {
    const have = effectiveSections(p.chart, session.tags).map((s) => s.label)
    return [...have, ...STANDARD_SECTIONS.filter((s) => !have.includes(s))]
  }, [p.chart, session.tags, settings])
  useScreenReport({ dialog: 'care-plan-element-edit' })
  const ok = () => {
    if (tag) updateCarePlanTag(p.chart, tagIndex, { section, rank })
    else if (el) {
      updateElement(p.chart, el.id, { rank })
      if (section !== el.section) {
        if (!settings.sections.some((s) => s.label === section)) addSections(p.chart, [{ label: section, type: STANDARD_SECTIONS.includes(section) ? 'SYSTEM' : 'USER' }])
        updateElement(p.chart, el.id, { section })
      }
    }
    close()
  }
  const name = tag ? tag.description : el ? elementLabel(el) : ''
  return (
    <WorkspaceDialogFrame id="care-plan-element-edit" title="Care Plan Element" width={400} height={210} onClose={close} controls={false}>
      <div style={{ padding: '10px 12px 0', flex: '1 1 auto' }}>
        <PBGroup title="Care Plan Location">
          <Labelled label="Element:"><PBInput w={250} readOnly value={name} style={{ background: 'var(--pb-field-ro)' }} /></Labelled>
          <Labelled label="Section:">
            <PBSelect w={200} options={sectionOptions} value={section} data-tutorial-id="host.mois.field.element-edit-section" onChange={(e) => setSection(e.target.value)} />
          </Labelled>
          <Labelled label="Rank:">
            <PBInput w={44} align="center" value={rank} data-tutorial-id="host.mois.field.element-edit-rank" onChange={(e) => setRank(e.target.value.replace(/\D/g, ''))} />
          </Labelled>
        </PBGroup>
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 14, padding: '10px 0', flex: 'none' }}>
        <DialogButton id="element-edit-ok" width={75} isDefault onClick={ok} disabled={!tag && !el}>Ok</DialogButton>
        <DialogButton id="element-edit-cancel" width={75} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Add from Template -----------------------------------------------------
   "Select a Care Plan Template and choose the elements to apply to this
   patient's Care Plan Summary." The templates are Administration ▸ Care
   Plan Templates' (data/carePlanTemplates.ts); each ticked element becomes a
   relative element on this chart, its section added if the list lacks it.
   Anchors: host.mois.dialog.care-plan-add-from-template; template rows
   host.mois.row.care-plan-template-{slug}; element tick boxes
   host.mois.field.template-element-{n}; host.mois.command.{add-template-
   select-all, add-template-clear, add-template-ok, add-template-cancel}. */
function AddFromTemplateWindow({ close }: AreaWindowProps) {
  const p = usePatient()
  const templates = useCarePlanTemplates()
  const [cur, setCur] = useState(0)
  const template = templates[cur]
  const [off, setOff] = useState<Set<number>>(() => new Set())
  const elements = template?.elements ?? []
  useScreenReport({ dialog: 'care-plan-add-from-template', row: template ? pbSlug(template.desc) : null, picked: elements.length - off.size })
  const pick = (i: number) => { setCur(i); setOff(new Set()) }
  const ok = () => {
    const chosen = elements.filter((_, i) => !off.has(i))
    addElements(p.chart, chosen.map((e: TemplateElement) => ({
      category: e.category, identifiedBy: e.identifiedBy,
      code: e.identifiedBy === 'Code' ? e.identification : '', concept: e.identifiedBy === 'Concept' ? e.identification : '',
      rule: e.rule, records: e.records, required: false, section: e.section, rank: e.rank,
    })))
    close()
  }
  return (
    <WorkspaceDialogFrame id="care-plan-add-from-template" title="Add from Template" width={860} height={560} onClose={close} controls={false}>
      <div className="pb-band" style={{ flex: 'none' }}>Care Plan Templates</div>
      <div style={{ height: 150, flex: 'none', display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={templates}
          current={cur}
          onCurrentChange={pick}
          rowTutorialId={(t) => `host.mois.row.care-plan-template-${pbSlug(t.desc)}`}
          columns={[
            { key: 'desc', header: 'Description', width: 240 },
            { key: 'detail', header: 'Detail' },
          ]}
          empty="No Care Plan Templates. Create one under Administration ▸ Care Plan Templates."
        />
      </div>
      <div className="pb-band" style={{ flex: 'none' }}>
        <span>Element List</span>
        <span className="pb-band__spacer" />
        <DialogButton id="add-template-select-all" width={80} onClick={() => setOff(new Set())}>Select All</DialogButton>
        <DialogButton id="add-template-clear" width={80} onClick={() => setOff(new Set(elements.map((_, i) => i)))}>Clear</DialogButton>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={elements}
          columns={[
            { key: 'add', header: 'Add', width: 40, align: 'center', render: (_e, i) => <PBCheckbox checked={!off.has(i)} tutorialId={`host.mois.field.template-element-${i}`} onChange={(v) => setOff((x) => { const n = new Set(x); if (v) n.delete(i); else n.add(i); return n })} /> },
            { key: 'category', header: 'Item Category', width: 120 },
            { key: 'section', header: 'Care Plan Section', width: 140 },
            { key: 'rank', header: 'Rank', width: 50, align: 'center' },
            { key: 'identifiedBy', header: 'Identified By', width: 90, align: 'center' },
            { key: 'identification', header: 'Identification' },
            { key: 'rule', header: 'Rule', width: 80 },
            { key: 'records', header: 'No. of Records', width: 90, align: 'center' },
          ]}
          empty="This template has no elements."
        />
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 14, padding: '8px 0', flex: 'none' }}>
        <DialogButton id="add-template-ok" width={80} isDefault onClick={ok} disabled={!template || off.size === elements.length}>OK</DialogButton>
        <DialogButton id="add-template-cancel" width={80} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('care-plan-new-section', NewSectionWindow)
registerAreaWindow('care-plan-element-new', NewElementWindow)
registerAreaWindow('care-plan-element-edit', EditElementWindow)
registerAreaWindow('care-plan-add-from-template', AddFromTemplateWindow)
