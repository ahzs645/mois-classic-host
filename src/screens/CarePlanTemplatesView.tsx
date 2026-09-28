import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  SECTION_FOR_CATEGORY, TEMPLATE_CATEGORIES, TEMPLATE_CONCEPTS, TEMPLATE_RULES, TEMPLATE_SECTIONS,
  addCarePlanTemplate, blankTemplateElement, deleteCarePlanTemplate, updateCarePlanTemplate, useCarePlanTemplates,
  type CarePlanTemplate, type TemplateElement,
} from '../data/carePlanTemplates'
import { DESIGNER_COMMANDS, DESIGNER_COMMAND_WIDTH, designerScreen } from '../data/designerSection'
import { useScreenReport } from '../host/screen-state'
import {
  PBButton, PBCommandRow, PBDataWindow, PBInput, PBMessageBox, PBRadio, PBSelect, PBTextArea, PBViewHeader,
  PBWindow, pbSlug, usePBInstrumentation,
} from '../pb'
import { registerAreaWindow, useOpenWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DesktopLayer } from './StageWindow'

/* ============================================================================
   Administration ▸ Designer Section ▸ Care Plan Templates (art. 303115).

   The list is the Designer Section's shared window ("Skeleton L",
   screens/DesignerSectionView.tsx) with its rows from the template store
   (data/carePlanTemplates.ts) rather than a fixed list, so what is authored
   here is what Summary Settings ▸ Add from Template offers a chart.

   PROVENANCE:
     f158827a261d  "Care Plan Tag Template List" (v02.22.92): New Record ·
                   Delete Record · Edit Record · Close Window, a filter box
                   per column, Description · Detail, five templates. The
                   current build's row adds Find / Replace (user capture
                   2026-09-25 #49, DESIGNER_COMMANDS), which wins.
     a1d8149d2b6e  "Care Plan Tag Template Detail": navy "Care Plan Tag
                   Template" band; Description (grey, bold — fixed once the
                   template exists) and Detail; the "Element List" band over
                   New Row · Delete Row · Refresh; the grid Item Category ·
                   Care Plan Section · Rank · Identified By (Code / Concept
                   radios) · Identification · … · Rule · No. of Records; Save
                   Changes (F2) / Cancel.
     b256251d0d8f  Summary Settings' Add from Template, where a template is
                   applied (screens/SummarySettingsView.tsx).

   INFERRED: New Record has no captured dialog; it opens the detail window
   on a blank template whose Description is editable until it is saved.
   Delete Record asks first. Only the current element row is editable (the
   PowerBuilder habit: edit controls sit on the row with focus); its
   Identification offers the category's concepts, or takes a code.

   Anchors: list rows host.mois.row.{slug(description)}, filters
   host.mois.field.filter-{description, detail}; list commands
   host.mois.command.{new-record, delete-record, edit-record, close-window};
   the delete prompt's host.mois.command.{template-delete-yes,
   template-delete-no}. Detail: host.mois.dialog.care-plan-tag-template-
   detail; host.mois.field.{template-description, template-detail};
   element rows host.mois.row.template-element-{n}; the current row's
   host.mois.field.template-element-{category, section, rank,
   identified-by-code, identified-by-concept, identification, rule,
   records}; host.mois.command.{template-new-row, template-delete-row,
   template-refresh, template-save-changes, template-cancel}.
   Reported: host.screen.{rows, row, saved}, host.dialog.
   ========================================================================= */

const NODE = 'ad-careplan-templates'

export function CarePlanTemplatesView({ onClose }: { onClose?: () => void }) {
  const screen = designerScreen(NODE)
  const templates = useCarePlanTemplates()
  const openWindow = useOpenWindow()
  const [filter, setFilter] = useState<Record<string, string>>({})
  const [cur, setCur] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const rows = useMemo(() => templates.filter((t) => (['desc', 'detail'] as const).every((k) => {
    const term = filter[k]?.trim().toLowerCase()
    return !term || t[k].toLowerCase().includes(term)
  })), [templates, filter])
  const row = rows[Math.min(cur, Math.max(0, rows.length - 1))]
  useScreenReport({ rows: templates.length, row: row ? pbSlug(row.desc) : null })

  const open = (t?: CarePlanTemplate) => openWindow('care-plan-template-detail', t ? { template: t.id } : {})
  const columns = screen?.columns ?? [
    { key: 'desc', header: 'Description', width: 299, filter: true },
    { key: 'detail', header: 'Detail', width: 457, filter: true },
  ]

  return (
    <>
      <PBViewHeader title={screen?.header ?? 'Care Plan Tag Template List'} />
      <PBCommandRow
        commands={DESIGNER_COMMANDS.map((label) => ({
          label,
          width: DESIGNER_COMMAND_WIDTH[label],
          disabled: (label === 'Delete Record' || label === 'Edit Record') && !row,
          onClick: label === 'New Record' ? () => open()
            : label === 'Edit Record' ? () => { if (row) open(row) }
            : label === 'Delete Record' ? () => { if (row) setConfirm(true) }
            : label === 'Close Window' ? () => onClose?.()
            : undefined,
        }))}
      />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(t) => open(t)}
          style={{ ['--pb-dw-row-h' as string]: `${screen?.pitch ?? 19}px` }}
          columns={columns.map((c) => ({ key: c.key, header: c.header, width: c.width }))}
          filters={columns.map((c) => (
            <PBInput
              key={c.key}
              data-tutorial-id={`host.mois.field.filter-${pbSlug(c.header)}`}
              value={filter[c.key] ?? ''}
              onChange={(e) => { setFilter({ ...filter, [c.key]: e.target.value }); setCur(0) }}
            />
          ))}
          rowTutorialId={(t) => `host.mois.row.${pbSlug(t.desc.slice(0, 32))}`}
          empty="No rows retrieved."
        />
      </div>
      {confirm && row && (
        <PBMessageBox
          title="Delete Record" icon="question"
          buttons={[
            { label: 'Yes', value: 'yes', default: true, tutorialId: 'host.mois.command.template-delete-yes' },
            { label: 'No', value: 'no', tutorialId: 'host.mois.command.template-delete-no' },
          ]}
          onClose={(v) => { if (v === 'yes') { deleteCarePlanTemplate(row.id); setCur(0) } setConfirm(false) }}
        >
          Delete the Care Plan Template {row.desc}?
        </PBMessageBox>
      )}
    </>
  )
}

/* --- Care Plan Tag Template Detail ------------------------------------------ */
const BAND = '#dcd7d2'
const RULE = '#646464'

function StripButton({ id, label, width, onPress, disabled }: { id: string; label: string; width: number; onPress: () => void; disabled?: boolean }) {
  const host = usePBInstrumentation()
  return (
    <button
      type="button"
      className="pb-btn pb-btn--sm"
      style={{ width }}
      disabled={disabled}
      data-tutorial-id={host?.anchor('command', id)}
      onClick={() => { host?.report('command', { command: id }); onPress() }}
    >
      {label}
    </button>
  )
}

function FooterButton({ id, label, onPress }: { id: string; label: string; onPress: () => void }) {
  const host = usePBInstrumentation()
  return (
    <PBButton wide data-tutorial-id={host?.anchor('command', id)} onClick={() => { host?.report('command', { command: id }); onPress() }}>
      {label}
    </PBButton>
  )
}

function TemplateDetailWindow({ args, close }: AreaWindowProps) {
  const host = usePBInstrumentation()
  const templates = useCarePlanTemplates()
  const [id, setId] = useState(typeof args.template === 'string' ? args.template : '')
  const stored = templates.find((t) => t.id === id)
  const [desc, setDesc] = useState(stored?.desc ?? '')
  const [detail, setDetail] = useState(stored?.detail ?? '')
  const [elements, setElements] = useState<TemplateElement[]>(() => stored?.elements.map((e) => ({ ...e })) ?? [])
  const [cur, setCur] = useState(0)
  const [saved, setSaved] = useState(Boolean(stored))
  const title = 'Care Plan Tag Template Detail'
  useScreenReport({ dialog: pbSlug(title), rows: elements.length, saved })

  const edit = (i: number, patch: Partial<TemplateElement>) => {
    setElements((list) => list.map((e, j) => (j === i ? { ...e, ...patch } : e)))
    setSaved(false)
  }
  const save = () => {
    const d = desc.trim().toUpperCase()
    if (!d) return
    const clean = elements.filter((e) => e.identification.trim())
    if (id) updateCarePlanTemplate(id, { desc: d, detail, elements: clean })
    else setId(addCarePlanTemplate({ desc: d, detail, elements: clean }))
    setDesc(d)
    setSaved(true)
  }
  /* F2 is Save Changes */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'F2') { e.preventDefault(); save() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const refresh = () => {
    const t = templates.find((x) => x.id === id)
    setElements(t?.elements.map((e) => ({ ...e })) ?? [])
    setCur(0)
    setSaved(Boolean(t))
  }

  const cell = (i: number, render: () => ReactNode, text: string) => (i === cur ? render() : text)
  const concepts = (e: TemplateElement) => {
    const list = TEMPLATE_CONCEPTS[e.category] ?? []
    return ['', ...list, ...(e.identification && !list.includes(e.identification) ? [e.identification] : [])]
  }
  const sections = (e: TemplateElement) => [...TEMPLATE_SECTIONS, ...(TEMPLATE_SECTIONS.includes(e.section as never) ? [] : [e.section])]

  return (
    <DesktopLayer>
      <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 60, gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)' }}>
        <div data-tutorial-id={host?.anchor('dialog', pbSlug(title))} style={{ maxWidth: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <PBWindow child controls={false} title={title} onClose={close} style={{ width: 1019, height: 866, maxWidth: '100%', flex: '0 1 auto', minHeight: 0 }}>
            <div className="pb-viewhead"><span className="pb-viewhead__title">Care Plan Tag Template</span></div>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)', overflow: 'hidden' }}>
              <div style={{ flex: 'none', background: '#f0f0f0', padding: '5px 8px', height: 113 }}>
                <div className="pb-row" style={{ gap: 6 }}>
                  <span className="pb-form__label" style={{ width: 76 }}>Description:</span>
                  <PBInput
                    w={326} value={desc} readOnly={Boolean(id)}
                    style={id ? { background: '#e8e8e8', fontWeight: 700 } : undefined}
                    data-tutorial-id="host.mois.field.template-description"
                    onChange={(e) => { setDesc(e.target.value); setSaved(false) }}
                  />
                </div>
                <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start', marginTop: 4 }}>
                  <span className="pb-form__label" style={{ width: 76 }}>Detail:</span>
                  <PBTextArea rows={3} w={326} value={detail} data-tutorial-id="host.mois.field.template-detail" onChange={(e) => { setDetail(e.target.value); setSaved(false) }} />
                </div>
              </div>

              <div className="pb-band" style={{ background: BAND, height: 20, minHeight: 20, borderTop: `1px solid ${RULE}` }}>Element List</div>
              <div className="pb-row" style={{ background: BAND, height: 20, gap: 0, padding: '0 1px', flex: 'none', borderBottom: `1px solid ${RULE}` }}>
                <StripButton id="template-new-row" label="New Row" width={82} onPress={() => { setElements((l) => [...l, blankTemplateElement()]); setCur(elements.length); setSaved(false) }} />
                <StripButton id="template-delete-row" label="Delete Row" width={81} disabled={!elements.length} onPress={() => { setElements((l) => l.filter((_, j) => j !== cur)); setCur(Math.max(0, cur - 1)); setSaved(false) }} />
                <StripButton id="template-refresh" label="Refresh" width={81} onPress={refresh} />
              </div>

              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  rows={elements}
                  current={cur}
                  onCurrentChange={setCur}
                  rowTutorialId={(_e, i) => `host.mois.row.template-element-${i}`}
                  style={{ ['--pb-dw-row-h' as string]: '19px' }}
                  empty=" "
                  columns={[
                    {
                      key: 'category', header: 'Item Category', width: 106,
                      render: (e, i) => cell(i, () => (
                        <PBSelect w={100} options={TEMPLATE_CATEGORIES} value={e.category} data-tutorial-id="host.mois.field.template-element-category"
                          onChange={(ev) => edit(i, { category: ev.target.value, section: SECTION_FOR_CATEGORY[ev.target.value] ?? e.section, identification: '' })} />
                      ), e.category),
                    },
                    {
                      key: 'section', header: 'Care Plan Section', width: 120,
                      render: (e, i) => cell(i, () => (
                        <PBSelect w={114} options={sections(e)} value={e.section} data-tutorial-id="host.mois.field.template-element-section" onChange={(ev) => edit(i, { section: ev.target.value })} />
                      ), e.section),
                    },
                    {
                      key: 'rank', header: 'Rank', width: 47, align: 'center',
                      render: (e, i) => cell(i, () => (
                        <PBInput w={40} align="center" value={e.rank} data-tutorial-id="host.mois.field.template-element-rank" onChange={(ev) => edit(i, { rank: ev.target.value.replace(/\D/g, '') })} />
                      ), e.rank),
                    },
                    {
                      key: 'identifiedBy', header: 'Identified By', width: 137, align: 'center',
                      render: (e, i) => (
                        <span className="pb-row" style={{ gap: 8, justifyContent: 'center' }}>
                          {(['Code', 'Concept'] as const).map((o) => (
                            <PBRadio
                              key={o}
                              name={`cpt-identified-by-${i}`}
                              label={o}
                              checked={e.identifiedBy === o}
                              tutorialId={i === cur ? `host.mois.field.template-element-identified-by-${o.toLowerCase()}` : undefined}
                              onChange={() => { setCur(i); edit(i, { identifiedBy: o, identification: '' }) }}
                            />
                          ))}
                        </span>
                      ),
                    },
                    {
                      key: 'identification', header: 'Identification', width: 278,
                      render: (e, i) => cell(i, () => (e.identifiedBy === 'Concept'
                        ? <PBSelect w={270} options={concepts(e)} value={e.identification} data-tutorial-id="host.mois.field.template-element-identification" onChange={(ev) => edit(i, { identification: ev.target.value })} />
                        : <PBInput w={270} value={e.identification} data-tutorial-id="host.mois.field.template-element-identification" onChange={(ev) => edit(i, { identification: ev.target.value.toUpperCase() })} />
                      ), e.identification),
                    },
                    { key: 'dots', header: '', dots: true, width: 21 },
                    {
                      key: 'rule', header: 'Rule', width: 93,
                      render: (e, i) => cell(i, () => (
                        <PBSelect w={88} options={TEMPLATE_RULES.filter((r) => e.category === 'MEASURE' || (r !== 'HIGHEST' && r !== 'LOWEST'))} value={e.rule} data-tutorial-id="host.mois.field.template-element-rule" onChange={(ev) => edit(i, { rule: ev.target.value })} />
                      ), e.rule),
                    },
                    {
                      key: 'records', header: 'No. of Records', width: 86, align: 'center',
                      render: (e, i) => cell(i, () => (
                        <PBInput w={40} align="center" value={e.records} data-tutorial-id="host.mois.field.template-element-records" onChange={(ev) => edit(i, { records: ev.target.value.replace(/\D/g, '') })} />
                      ), e.records),
                    },
                  ]}
                />
              </div>
            </div>
            <div className="pb-footer">
              <span className="pb-footer__spacer" />
              <FooterButton id="template-save-changes" label="Save Changes (F2)" onPress={save} />
              <FooterButton id="template-cancel" label="Cancel" onPress={close} />
              <span className="pb-footer__spacer" />
            </div>
          </PBWindow>
        </div>
      </div>
    </DesktopLayer>
  )
}

registerAreaWindow('care-plan-template-detail', TemplateDetailWindow)
