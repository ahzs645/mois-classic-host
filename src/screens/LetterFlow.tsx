import { useState } from 'react'
import { recordsForNode, useChartExport } from '../data/chart-records'
import {
  LETTER_SETUP_COLUMNS, LETTER_SETUP_GLOSSARY,
  LETTER_SETUP_ROWS,
  LETTER_TEMPLATES, TEMPLATE_PICKER, TEMPLATE_PREVIEW, TEMPLATE_SEARCH_HELP,
  type LetterSetupRow, type LetterTemplate
} from '../data/letterSetup'
import {
  DEFAULT_TEMPLATE, DESKTOP_PROVIDER, TEMPLATE_TYPE, beginLetter, consultOrders, letterOrder, setLetterFlow, useLetterFlow,
  type LetterDocId,
} from '../data/letterFlow'
import { LW } from '../data/letterWriter'
import { usePatient } from '../data/patient-context'
import { useScreenReport } from '../host/screen-state'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBLookup, PBRadio, PBWindow,
  pbSlug,
} from '../pb'
import { LetterWriterWindow } from './LetterWriterWindow'
import { MasterProviderListDialog } from './MasterProviderListDialog'
import { OrderLinkingServiceDialog } from './OrderLinkingServiceDialog'

/**
 * How each Action item starts its letter. A referral opens Select
 * Consultation Order first (303589 `4ac477c4…`), an information request the
 * Send window (2961349 `dbab69f9…`); a consult note goes straight to the
 * template picker (303099 `79174325…`). The frame passes its two ways in.
 */
export function startLetter(
  doc: string | undefined,
  showTemplates: () => void,
  open: (id: string, args?: Record<string, unknown>) => boolean,
) {
  const kind = (['referral', 'consult', 'information-request', 'care-plan'].includes(doc ?? '') ? doc : 'referral') as LetterDocId
  beginLetter(kind)
  if (kind === 'referral' && open('select-consultation-order')) return
  if (kind === 'information-request' && open('send-information-request')) return
  showTemplates()
}

/* ============================================================================
   The two windows the Letter Writer opens behind.

   `Select Letter Template` picks the template; `Letter Setup` picks which of
   the patient's records the template's tags will pull in; `Continue (F2)` on
   Letter Setup is what opens the Letter Writer.

   Measurements and citations are in `data/letterSetup.ts`. Two things about
   them are worth repeating here:

   1. The template picker's group-header rows measure (165,203,247), NOT the
      #c8dcfa every data grid uses. That is not a quantisation artefact: the
      same palettised capture renders #c8dcfa elsewhere as (206,223,255).

   2. Letter Setup's only capture has no Patient Chart tree in frame, so its
      scale could not be calibrated the way every other capture was. It was
      INFERRED at ~1:1 from a 30px title bar and 22px push buttons, so its
      23px row pitch and its column widths are +/-25%, not measured.
   ========================================================================= */

/* Letter Setup's cyan caption. The kit paints a flat white Win10 title bar
   and its colour is not a token, so this one window carries its own rule
   rather than the kit growing a variant. React 19 hoists and de-duplicates it
   by `href`; React 18 leaves it in place, where it still applies.

   The template picker's own caption colour was never measured, so it keeps
   the kit's default rather than being guessed at. */
const SETUP_CAPTION = `
.pb-window--mois-lettersetup > .pb-titlebar { height: 30px; background: ${LW.titleBar}; }
`

/** the document type a template was authored with, as a letter kind */
function docForTemplate(t: LetterTemplate): LetterDocId | undefined {
  return (Object.keys(TEMPLATE_TYPE) as LetterDocId[]).find((doc) => TEMPLATE_TYPE[doc] === t.type)
}

/* ===========================================================================
   Select Letter Template
   ======================================================================== */
export function SelectLetterTemplateDialog({
  onSelect, onClose,
}: {
  onSelect?: (template: LetterTemplate) => void
  onClose?: () => void
}) {
  const flow = useLetterFlow()
  const [search, setSearch] = useState('')
  /* the Action item that opened the picker preselects a template of its own
     document type — Create Consult Note lands on a consult template */
  const [cur, setCur] = useState(() => Math.max(0, LETTER_TEMPLATES.findIndex((t) => t.name === (flow.template || DEFAULT_TEMPLATE[flow.doc]))))
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  /* 303099 / 304756: after the template, a consult note's Letter Writer asks
     whether the letter fulfils an Order; Yes lists the chart's orders */
  const [prompt, setPrompt] = useState<null | 'ask' | 'link'>(null)
  /* Every template is authored with a document type (303101: "select the
     document type"), and the type travels with the letter: the header's
     Type, its LOINC and the title band are the template's type, whichever
     Action item started the run. A consult template picked after Create
     Referral Note makes a consult note, and gets the consult's Order prompt. */
  const choose = (t: LetterTemplate) => {
    const doc = docForTemplate(t) ?? flow.doc
    setLetterFlow({ template: t.name, doc })
    if (doc === 'consult') setPrompt('ask')
    else onSelect?.(t)
  }

  /* "begin typing the name that the letter starts with. If you want to search
     anywhere in the name, add a * to the beginning (wildcard search)" */
  const q = search.trim().toUpperCase()
  const rows = !q
    ? LETTER_TEMPLATES
    : LETTER_TEMPLATES.filter((t) => (
      q.startsWith('*')
        ? t.name.toUpperCase().includes(q.slice(1))
        : t.name.toUpperCase().startsWith(q)
    ))

  const picked = rows[cur] ?? rows[0]
  /* the document type and the highlighted template, so a lesson can grade
     "a consult template is picked" rather than just "the picker is open" */
  useScreenReport({ letterDoc: flow.doc, letterTemplate: pbSlug(picked?.name ?? '') })

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        controls={false}
        title="Select Letter Template"
        onClose={onClose}
        style={{
          width: `min(${TEMPLATE_PICKER.width}px, calc(100vw - 40px))`,
          height: `min(${TEMPLATE_PICKER.height}px, calc(100vh - 60px))`,
        }}
      >
        <div
          data-tutorial-id="host.mois.dialog.select-letter-template"
          style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
        >
        <div className="pb-row" style={{ gap: 6, padding: '6px 8px', flex: 'none' }}>
          <span className="pb-form__label">Search:</span>
          {/* the edit runs x~65-375 */}
          <PBInput
            w={310}
            value={search}
            title={TEMPLATE_SEARCH_HELP}
            data-tutorial-id="host.mois.field.search"
            onChange={(e) => { setSearch(e.target.value); setCur(0) }}
          />
        </div>

        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 6, padding: '0 8px 6px' }}>
          {/* ---- the two-level list --------------------------------------
              `Recent` first, then `Letter`; the same template appears under
              both, which is what "this window shows the most recently used
              letters at the top" means.                                   */}
          <div style={{ width: TEMPLATE_PICKER.listW, flex: 'none', display: 'flex', minHeight: 0 }}>
            <PBDataWindow
              rows={rows}
              current={cur}
              onCurrentChange={setCur}
              onActivate={(t) => choose(t)}
              groupBy={(t: LetterTemplate) => t.group}
              groupLabel={(group) => group}
              groupTutorialId={(group) => `host.mois.group.${pbSlug(group)}`}
              collapsed={collapsed}
              onCollapsedChange={setCollapsed}
              rowTutorialId={(t) => `host.mois.row.${pbSlug(t.name)}`}
              /* the picker has no column-header row: the first band sits under
                 the Search field */
              head={false}
              style={{
                ['--pb-dw-row-h' as string]: `${TEMPLATE_PICKER.rowPitch}px`,
                ['--pb-dw-group' as string]: TEMPLATE_PICKER.groupFill,
                ['--pb-dw-row' as string]: TEMPLATE_PICKER.rowFill,
                ['--pb-dw-row-alt' as string]: TEMPLATE_PICKER.rowAltFill,
                ['--pb-dw-select' as string]: TEMPLATE_PICKER.selectFill,
              }}
              columns={[{ key: 'name', header: '' }]}
              empty="No templates match that search."
            />
          </div>

          {/* ---- Letter Preview -------------------------------------------
              The template as authored: #ffff9c populators, and olive/yellow
              tags for the sections its Letter Setup will offer.           */}
          <div
            className="pb-groupbox"
            style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <PBBand>Letter Preview</PBBand>
            <div
              data-tutorial-id="host.mois.field.letter-preview"
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'auto',
                background: '#ffffff',
                padding: '12px 16px',
                lineHeight: 1.35,
              }}
            >
              {picked && <div style={{ fontWeight: 700, marginBottom: 10 }}>{picked.name}</div>}
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
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 19, padding: '0 0 10px', flex: 'none' }}>
          <PBButton
            className="pb-btn--default"
            style={{ width: 92 }}
            data-tutorial-id="host.mois.command.select"
            onClick={() => picked && choose(picked)}
          >
            Select (F2)
          </PBButton>
          <PBButton style={{ width: 92 }} data-tutorial-id="host.mois.command.cancel" onClick={onClose}>
            Cancel
          </PBButton>
        </div>
        </div>
      </PBWindow>
      {prompt && picked && (
        <LinkToOrderPrompt
          stage={prompt}
          onAnswer={(yes) => (yes ? setPrompt('link') : onSelect?.(picked))}
          onLinked={(orderId) => { setLetterFlow({ orderId }); onSelect?.(picked) }}
          onCancel={() => setPrompt(null)}
        />
      )}
    </div>
  )
}

/* ===========================================================================
   Letter Setup
   ======================================================================== */
export function LetterSetupWindow({
  onContinue, onClose,
}: {
  onContinue?: () => void
  onClose?: () => void
}) {
  const patient = usePatient()
  const data = useChartExport()
  const flow = useLetterFlow()
  /* each section counts the open chart's own records. FACILITY ADMISSION and
     LT MEDS have no export behind them on the reference chart, so they read
     `-` like any other empty section. */
  const nodes: Record<string, string> = { ENCOUNTERS: 'encounters', 'HEALTH ISSUES': 'conditions', IMAGES: 'imaging', 'LT MEDS': 'ltm', MEASURES: 'measures', PROCEDURE: 'procedures', ALLERGIES: 'allergy', DOCUMENTS: 'documents', 'FAMILY HX': 'famhx' }
  const count = (section: string) => section === 'CONSULT' ? consultOrders(data).length : recordsForNode(data, nodes[section] ?? '').length
  const [rows, setRows] = useState<LetterSetupRow[]>(() => LETTER_SETUP_ROWS.map(row => {
    const available = row.disabled ? 0 : count(row.section)
    /* Select All takes every record (Selected = Available); Choose takes none
       until Choose Records picks some — 304687 `08364fcebd64` */
    return { ...row, available, selected: row.action === 'all' ? available : 0, attachAvailable: 0, attachSelected: 0, tooltip: undefined }
  }))
  const order = letterOrder(data, flow.orderId)
  const [author, setAuthor] = useState(flow.author || DESKTOP_PROVIDER)
  const [recipient, setRecipient] = useState(flow.recipient || order?.str_performed_by || '')
  /* which field's "…" has the Master Provider List open */
  const [lookup, setLookup] = useState<null | 'author' | 'recipient'>(null)
  /* the template chosen one window back is still the letter's: report it so
     a lesson can grade the choice after the picker has closed; and the two
     providers the letter is between, as slugs, so a lesson can grade a pick
     from the Master Provider List */
  useScreenReport({
    letterDoc: flow.doc,
    ...(flow.template ? { letterTemplate: pbSlug(flow.template) } : {}),
    letterAuthor: pbSlug(author),
    letterRecipient: pbSlug(recipient),
  })
  const p = { ...patient, phn: [patient.insuranceBy, patient.bchn ?? patient.insurance].filter(Boolean).join(' '), phnSuffix: patient.dep ?? '' }
  const shown = (n: number) => (n ? String(n) : '-')

  const setAction = (section: string, action: 'all' | 'choose') =>
    setRows((v) => v.map((r) => (r.section === section ? { ...r, action, selected: action === 'all' ? r.available : 0 } : r)))
  const proceed = () => {
    setLetterFlow({ author, recipient, selected: Object.fromEntries(rows.map((r) => [r.section, r.selected])) })
    onContinue?.()
  }

  const C = LETTER_SETUP_COLUMNS

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <style href="mois-classic/letter-setup" precedence="medium">{SETUP_CAPTION}</style>
      <PBWindow
        child
        controls={false}
        title="Letter Setup"
        className="pb-window--mois-lettersetup"
        onClose={onClose}
        style={{
          width: `min(${C.width}px, calc(100vw - 40px))`,
          height: `min(${C.height}px, calc(100vh - 60px))`,
        }}
      >
        <div
          data-tutorial-id="host.mois.dialog.letter-setup"
          style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
        >
        {/* window face down to the rule at y=43, then the banner from y=44 */}
        <div style={{ height: 13, flex: 'none' }} />
        <div style={{ height: 1, background: LW.rule, flex: 'none' }} />

        {/* --- #ffffc0 patient banner ----------------------------------- */}
        <div
          className="pb-banner-yellow"
          data-tutorial-id="host.mois.field.patient-banner"
          style={{ display: 'block', background: '#ffffc0', flex: 'none' }}
        >
          <div className="pb-row" style={{ gap: 0 }}>
            <span>FIRST:&nbsp;</span><b>{p.first}</b>
            <span style={{ width: 24 }} /><span>MIDDLE:&nbsp;</span><b>{p.middle}</b>
            <span style={{ width: 24 }} /><span>LAST:&nbsp;</span><b>{p.last}</b>
            <span style={{ width: 24 }} /><span>DoB:&nbsp;</span><b>{p.dob}</b>
            <span style={{ width: 16 }} /><b>{p.sex}</b>
          </div>
          <div className="pb-row" style={{ gap: 0 }}>
            <span>PHN:&nbsp;</span><b>{p.phn}</b>
            <span style={{ width: 12 }} /><b>{p.phnSuffix}</b>
            <span style={{ width: 24 }} /><span>Home:&nbsp;</span><b>{p.home}</b>
            <span style={{ width: 24 }} /><span>Work:&nbsp;</span><b>{p.work}</b>
            <span style={{ width: 24 }} />
            {/* `Cell:` is a blue underlined link in the capture */}
            <button className="pb-link" data-tutorial-id="host.mois.field.cell">Cell:</button>
            <span>&nbsp;</span><b>{p.cell}</b>
          </div>
        </div>

        {/* --- Letter Details ------------------------------------------- */}
        <div className="pb-band" data-tutorial-id="host.mois.group.letter-details">
          <span>Letter Details</span>
        </div>
        <div style={{ padding: '5px 10px', flex: 'none' }}>
          <div className="pb-row" style={{ gap: 6, marginBottom: 3 }}>
            <span className="pb-form__label" style={{ width: 110 }}>Author:</span>
            {/* both ellipses open the Master Provider List lookup (304687:
                Paste Provider Data "Opens the Master Provider List to select
                a provider"; the window is 304741 `6127fb5936f2…`), and Ok
                puts the chosen provider in the field */}
            <PBLookup w={300} name="Author" value={author} onChange={setAuthor} onDots={() => setLookup('author')} />
          </div>
          <div className="pb-row" style={{ gap: 6 }}>
            <span className="pb-form__label" style={{ width: 110 }}>Primary Recipient:</span>
            <PBLookup w={300} name="Primary Recipient" value={recipient} onChange={setRecipient} onDots={() => setLookup('recipient')} />
          </div>
        </div>

        {/* --- Patient Records ------------------------------------------- */}
        <div className="pb-band" data-tutorial-id="host.mois.group.patient-records">
          <span>Patient Records</span>
        </div>

        {/* The two-tier header (`Records` and `Attachments` each spanning an
            Available/Selected pair) is why this grid is a table of its own
            rather than a PBDataWindow: the kit's grid has one header row. It
            uses the kit's own classes, so it is the same DataWindow. */}
        <div
          className="pb-dw"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            margin: '3px 5px',
            ['--pb-dw-row-h' as string]: `${C.rowPitch}px`,
          }}
        >
          <div className="pb-dw__scroll">
            <table className="pb-dw__table">
              <colgroup>
                <col style={{ width: C.section }} />
                <col style={{ width: C.recordsAvailable }} />
                <col style={{ width: C.recordsSelected }} />
                <col style={{ width: C.action }} />
                <col style={{ width: C.attachAvailable }} />
                <col style={{ width: C.attachSelected }} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} title={LETTER_SETUP_GLOSSARY.Section}>Section</th>
                  <th colSpan={2}>Records</th>
                  <th rowSpan={2}>Action</th>
                  <th colSpan={2}>Attachments</th>
                </tr>
                <tr>
                  <th title={LETTER_SETUP_GLOSSARY.Available}>Available</th>
                  <th title={LETTER_SETUP_GLOSSARY.Selected}>Selected</th>
                  <th title={LETTER_SETUP_GLOSSARY.Available}>Available</th>
                  <th title={LETTER_SETUP_GLOSSARY.Selected}>Selected</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const dim = r.disabled ? { color: '#808080' } : undefined
                  return (
                    <tr key={r.section}>
                      <td
                        style={dim}
                        /* the row runs the full window width, so the anchor
                           goes on the Section cell */
                        data-tutorial-id={`host.mois.cell.section-${pbSlug(r.section)}`}
                        /* the capture catches this tooltip live on LT MEDS,
                           where Selected is one short of Available */
                        title={r.tooltip}
                      >
                        {r.section}
                      </td>
                      <td className="pb-dw__c--center" style={dim}>{shown(r.available)}</td>
                      <td className="pb-dw__c--center" style={dim}>{shown(r.selected)}</td>
                      <td style={dim}>
                        {r.actionText ? r.actionText : (
                          <span className="pb-row" style={{ gap: 12 }}>
                            <PBRadio
                              name={`act-${pbSlug(r.section)}`}
                              label={<span title={LETTER_SETUP_GLOSSARY['Select All']}>Select All</span>}
                              checked={r.action === 'all'}
                              onChange={() => setAction(r.section, 'all')}
                            />
                            <PBRadio
                              name={`act-${pbSlug(r.section)}`}
                              label={<span title={LETTER_SETUP_GLOSSARY.Choose}>Choose</span>}
                              checked={r.action === 'choose'}
                              onChange={() => setAction(r.section, 'choose')}
                            />
                            {r.action === 'choose' && (
                              <button
                                className="pb-link"
                                data-tutorial-id={`host.mois.command.choose-records-${pbSlug(r.section)}`}
                              >
                                Choose Records
                              </button>
                            )}
                            {r.action === 'all' && r.stoppedRecords && (
                              /* only HEALTH ISSUES and LT MEDS offer this,
                                 and it is unchecked by default */
                              <PBCheckbox label="Include Stopped Records" />
                            )}
                          </span>
                        )}
                      </td>
                      <td className="pb-dw__c--center" style={dim}>{shown(r.attachAvailable)}</td>
                      <td className="pb-dw__c--center" style={dim}>{shown(r.attachSelected)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Measured butted, not gapped: Continue x 360-452 (92), Cancel
            x 452-551 (99), both 22px tall. */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, padding: '6px 0 10px', flex: 'none' }}>
          <PBButton
            className="pb-btn--default"
            style={{ width: 92, height: 22 }}
            data-tutorial-id="host.mois.command.continue"
            onClick={proceed}
          >
            Continue (F2)
          </PBButton>
          <PBButton
            style={{ width: 99, height: 22 }}
            data-tutorial-id="host.mois.command.cancel"
            onClick={onClose}
          >
            Cancel
          </PBButton>
        </div>
        </div>
      </PBWindow>
      {lookup && (
        <MasterProviderListDialog
          onClose={() => setLookup(null)}
          onPick={(name) => {
            if (lookup === 'author') setAuthor(name)
            else setRecipient(name)
            setLookup(null)
          }}
        />
      )}
    </div>
  )
}

/* ===========================================================================
   "Is this letter being created in fulfillment of an Order?"

   303099 `4bb2668b…`: after the template, MOIS opens the Letter Writer on the
   raw template (its yellow populators still unfilled) and asks, in a `Link
   to Order` box with Yes / No. Yes lists the chart's orders in the Order
   Linking Service (`bc06d7ac…`); Link fills the primary recipient and the
   diagnostic code from the Order. Either answer then goes on to Letter Setup.
   ======================================================================== */
function LinkToOrderPrompt({
  stage, onAnswer, onLinked, onCancel,
}: {
  stage: 'ask' | 'link'
  onAnswer: (yes: boolean) => void
  onLinked: (orderId: string | null) => void
  onCancel: () => void
}) {
  const data = useChartExport()
  useScreenReport({ letterPrompt: stage === 'ask' ? 'link-to-order' : 'order-linking-service' })
  const dot = (v?: string) => (v ?? '').replace(/\//g, '.')
  return (
    <>
      <LetterWriterWindow raw onClose={onCancel} />
      {stage === 'ask' && (
        <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 95 }}>
          <PBWindow child controls={false} title="Link to Order" onClose={onCancel} style={{ width: 347, height: 132 }}>
            <div data-tutorial-id="host.mois.dialog.link-to-order" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', background: '#fff' }}>
              <div className="pb-row" style={{ gap: 14, padding: '16px 18px', flex: '1 1 auto', alignItems: 'center' }}>
                <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
                  <circle cx="16" cy="16" r="14" fill="#1f5fbf" />
                  <text x="16" y="23" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff">?</text>
                </svg>
                <span>Is this letter being created in fulfillment of an Order?</span>
              </div>
              <div className="pb-row" style={{ justifyContent: 'flex-end', gap: 8, padding: '8px 10px', background: 'var(--pb-face)', flex: 'none' }}>
                <PBButton style={{ width: 75 }} data-tutorial-id="host.mois.command.letter-order-yes" onClick={() => onAnswer(true)}>Yes</PBButton>
                <PBButton style={{ width: 75 }} data-tutorial-id="host.mois.command.letter-order-no" onClick={() => onAnswer(false)}>No</PBButton>
              </div>
            </div>
          </PBWindow>
        </div>
      )}
      {stage === 'link' && (
        <div style={{ position: 'relative', zIndex: 95 }}>
          <OrderLinkingServiceDialog
            onLink={(row) => {
              const hit = consultOrders(data).find((r) => dot(r.dtm_ord_date) === row.date && (r.str_description ?? '') === row.description)
              onLinked(hit?.id_order ?? null)
            }}
            onClose={onCancel}
          />
        </div>
      )}
    </>
  )
}
