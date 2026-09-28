import { useMemo, useState } from 'react'
import { useChartExport } from '../data/chart-records'
import type { MoisChartExport, MoisRecord } from '../data/charts'
import { DESKTOP_PROVIDER } from '../data/letterFlow'
import { usePatient, type ChartPatient } from '../data/patient-context'
import { CLINIC, PAGE_WIDTH, columns, dash, identityBlock, labelled } from '../data/printPages'
import type { PrintReport } from '../data/printReports'
import { useScreenReport } from '../host/screen-state'
import { PBBand, PBCheckbox, PBDataWindow, PBTabs, pbSlug } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { RichtextReportWindow } from './PrintFlow'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Creating a Referral Letter in Standard Mode (303589, the last section).

   With APP SETTING Referral Mode = S, Order Detail's Print (303589
   `2301b448…`) opens the Referral Note selection window and its Preview…
   the letter as a Richtext Report.

     referral-note-report   `64192c9f…` — "Referral Note": the yellow patient
                            block (CHART · FIRST · MIDDLE · LAST · DoB · sex ·
                            PHN), the Order line (type, date, Code: [code]
                            description) with the Referral Text under it, two
                            rows of tabs — Encounter · Document · Message ·
                            Task · Other over Procedure · Measure ·
                            Intervention · Image · Consult · Admission, each
                            with its record count — a "<Section> List" grid
                            whose first two columns are Include and Detail
                            ticks, the Current Row Detail block, and Preview
                            Report Only... / Preview... / Cancel.
                            "Checking the 'Include' checkbox adds the title
                            and value of the item … Check the 'Detail'
                            checkbox if you would like to include additional
                            information entered in the record detail."
     (preview)              `48bca7f3…` — "Richtext Report: Report": the
                            clinic block centred, FOR PATIENT:, the booking
                            line, CC:, REFERRAL: date and RE:, the recipient
                            and the Referral Text, the author, the Referral
                            Report footnote ("A summary of this patient 's
                            current problems, allergies, medication and
                            selected investigations is included below"), then
                            PROBLEM LIST, REACTION RISK and the ticked
                            sections. Print / Print and Attach / Cancel are the
                            shared Richtext Report window's (PrintFlow.tsx).

   The grid's columns past Include · Detail · Date follow the Procedure tab
   the capture shows (Performed By · Description · Ordered By · Facility ·
   Diag. Code · Att.); the other tabs' columns are INFERRED as the same
   shape filled from their own folders.
   ========================================================================= */

type Tab = { label: string; rows: MoisRecord[]; date: string; by: string; desc: string }

const TOP = ['Encounter', 'Document', 'Message', 'Task', 'Other']
const BOTTOM = ['Procedure', 'Measure', 'Intervention', 'Image', 'Consult', 'Admission']

function tabsFor(data: MoisChartExport | null): Record<string, Tab> {
  const orders = (type: (t?: string) => boolean) => (data?.order ?? []).filter((o) => type(o.str_order_type))
  return {
    Encounter: { label: 'Encounter', rows: data?.encounter ?? [], date: 'dtm_appoint', by: 'lkp_provider', desc: 'str_appt_note' },
    Document: { label: 'Document', rows: data?.document ?? [], date: 'dtm_date', by: 'str_author', desc: 'str_note' },
    Message: { label: 'Message', rows: [], date: '', by: '', desc: '' },
    Task: { label: 'Task', rows: [], date: '', by: '', desc: '' },
    Other: { label: 'Other', rows: [], date: '', by: '', desc: '' },
    Procedure: { label: 'Procedure', rows: orders((t) => t === 'PROCEDURE'), date: 'dtm_ord_date', by: 'str_performed_by', desc: 'str_description' },
    Measure: { label: 'Measure', rows: data?.measure ?? [], date: 'dtm_collect_date', by: 'str_order_by', desc: 'str_description' },
    Intervention: { label: 'Intervention', rows: data?.intervention ?? [], date: 'dtm_performed', by: 'str_performed_by', desc: 'str_description' },
    Image: { label: 'Image', rows: orders((t) => t === 'IMAGING' || t === 'XRAY'), date: 'dtm_ord_date', by: 'str_performed_by', desc: 'str_description' },
    Consult: { label: 'Consult', rows: orders((t) => t === 'CONSULTATION'), date: 'dtm_ord_date', by: 'str_performed_by', desc: 'str_description' },
    Admission: { label: 'Admission', rows: data?.admission ?? [], date: 'dtm_discharge', by: 'str_facility', desc: 'str_description' },
  }
}

const rowKey = (tab: string, i: number) => `${tab}:${i}`

/** 303589 `48bca7f3…`: the Standard Mode referral as printed. */
function referralPage(p: ChartPatient, data: MoisChartExport | null, order: MoisRecord | undefined, text: string, tabs: Record<string, Tab>, include: Set<string>, detail: Set<string>): string {
  const centre = (s: string) => ' '.repeat(Math.max(0, Math.floor((PAGE_WIDTH - s.length) / 2))) + s
  const out: string[] = [
    `%G%${' '.repeat(PAGE_WIDTH - 6)}Page **1**`,
    '%RULE%',
    centre(CLINIC), centre('1100 - 6th AVENUE'), centre('PRINCE GEORGE, B.C.,  V2L 3M6'), centre('250.564.2644'), centre('250.564.2655'),
    '',
    '%S%FOR PATIENT:',
    '%RULE%',
    ...identityBlock(p).filter(Boolean),
    '',
    'BOOKING RESPONSIBILITY:           DATE:            TIME: :          PATIENT NOTIFIED:',
    '',
    'CC:',
    '',
    `REFERRAL:${dash(order?.dtm_ord_date).replace(/-/g, '/')}`,
    `RE:      ${order?.str_description ?? ''}`,
    '',
    order?.str_performed_by ?? '',
    ...labelled('', text, 9),
    '',
    order?.str_order_by ?? DESKTOP_PROVIDER,
    '',
    "A summary of this patient 's current problems, allergies, medication and selected",
    'investigations is included below',
    '',
    '%S%PROBLEM LIST',
    '%U%START      RESOLVE     PROBLEM',
    ...(data?.health_issue ?? []).flatMap((r) => columns([[dash(r.dtm_start), 11], [dash(r.dtm_resolve), 12], [r.str_problem_name ?? '', 70]])),
    '',
    '%S%REACTION RISK',
    '%U%START      SUBSTANCE                                      REACTION(S)',
    ...(data?.allergy ?? []).flatMap((r) => columns([[dash(r.dtm_start), 11], [r.str_substance ?? '', 47], [r.str_reactions ?? '', 35]])),
  ]
  for (const name of [...TOP, ...BOTTOM]) {
    const t = tabs[name]!
    const picked = t.rows.map((r, i) => [r, i] as const).filter(([, i]) => include.has(rowKey(name, i)))
    if (!picked.length) continue
    out.push('', `%S%${name.toUpperCase()}`, `%U%DATE       BY                  DESCRIPTION`)
    picked.forEach(([r, i]) => {
      out.push(...columns([[dash(r[t.date]), 11], [r[t.by] ?? '', 20], [r[t.desc] ?? r.str_code_term ?? '', 62]]))
      if (detail.has(rowKey(name, i))) out.push(...labelled('   Report:', r.str_report ?? r.str_note ?? r.str_comment, 11))
    })
  }
  return out.join('\n')
}

function ReferralNoteReportWindow({ args, close }: AreaWindowProps) {
  const p = usePatient()
  const data = useChartExport()
  const orderId = typeof args.orderId === 'string' ? args.orderId : null
  const order = (data?.order ?? []).find((o) => o.id_order === orderId)
  const text = typeof args.text === 'string' ? args.text : order?.str_note ?? ''
  const tabs = useMemo(() => tabsFor(data), [data])
  const [tab, setTab] = useState('Procedure')
  const [include, setInclude] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<Set<string>>(new Set())
  const [cur, setCur] = useState(0)
  const [preview, setPreview] = useState<'full' | 'report-only' | null>(null)
  useScreenReport({ dialog: preview ? 'print-report' : 'referral-note-report', referralIncluded: include.size, referralDetail: detail.size })
  const t = tabs[tab]!
  const toggle = (set: Set<string>, key: string, on: boolean) => { const n = new Set(set); if (on) n.add(key); else n.delete(key); return n }
  const caption = (name: string) => `${name}${tabs[name]!.rows.length || ['Encounter', 'Document', 'Message', 'Task'].includes(name) ? ` (${tabs[name]!.rows.length})` : ''}`
  const rows = t.rows.map((r, i) => ({
    i, date: (r[t.date] ?? '').split(' ')[0]!.replace(/\//g, '.'), by: r[t.by] ?? '', desc: r[t.desc] ?? r.str_code_term ?? '',
    ordered: r.str_order_by ?? '', facility: r.str_facility ?? '', diag: r.str_icd ?? r.str_code ?? '', att: r.num_attachments && r.num_attachments !== '0' ? r.num_attachments : '-',
  }))
  const current = rows[cur]

  const report: PrintReport | null = preview ? {
    menu: 'Standard Mode Referral',
    title: 'Referral Note',
    fields: [],
    reportTitle: 'Report',
    captured: true,
    build: ({ patient, data: d }) => referralPage(patient, d, order, text, tabs, preview === 'full' ? include : new Set(), preview === 'full' ? detail : new Set()),
  } : null
  if (report) return <RichtextReportWindow report={report} onClose={() => setPreview(null)} />

  return (
    <WorkspaceDialogFrame id="referral-note-report" title="Referral Note" width={967} height={700} onClose={close}>
      <div style={{ background: '#ffffc0', padding: '3px 10px', borderBottom: '1px solid #9a9a9a', flex: 'none' }}>
        <div className="pb-row" style={{ gap: 0 }}>
          <span>CHART:&nbsp;</span><b style={{ width: 70 }}>{p.chart}</b>
          <span>FIRST:&nbsp;</span><b style={{ width: 140 }}>{p.first}</b>
          <span>MIDDLE:&nbsp;</span><b style={{ width: 120 }}>{p.middle}</b>
          <span>LAST:&nbsp;</span><b style={{ width: 150 }}>{p.last}</b>
          <span>DoB:&nbsp;</span><b style={{ width: 90 }}>{p.dob}</b><b style={{ width: 30 }}>{p.sex}</b>
          <span>PHN:&nbsp;</span><b>{[p.insuranceBy, p.bchn ?? p.insurance, p.dep].filter(Boolean).join(' ')}</b>
        </div>
      </div>
      <div data-tutorial-id="host.mois.group.referral-order" style={{ background: '#fff', padding: '4px 10px', height: 72, overflow: 'auto', flex: 'none', borderBottom: '1px solid #9a9a9a' }}>
        <div className="pb-row" style={{ gap: 14 }}>
          <b style={{ color: '#000080' }}>Order:</b><span>{order?.str_order_type ?? 'CONSULTATION'}</span>
          <span>{(order?.dtm_ord_date ?? '').replace(/\//g, '.')}</span>
          <span>Code: <b>[{order?.str_code ?? ''}]</b></span><b>{order?.str_description ?? ''}</b>
        </div>
        <div style={{ paddingLeft: 60, whiteSpace: 'pre-wrap' }}>{text}</div>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '6px 10px 0' }}>
        {/* two rows of tabs; the picked row sits nearest the page */}
        <div className="pb-row" style={{ gap: 0, flex: 'none' }}>
          {TOP.map((name) => (
            <button key={name} type="button" className="pb-tab" data-tutorial-id={`host.mois.tab.referral-${pbSlug(name)}`}
              onClick={() => { setTab(name); setCur(0) }}
              style={{ flex: 1, padding: '2px 0', border: '1px solid #9a9a9a', background: tab === name ? '#fff' : 'var(--pb-face)', fontWeight: tab === name ? 700 : 400 }}>
              {caption(name)}
            </button>
          ))}
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBTabs tabs={BOTTOM.map(caption)} active={BOTTOM.includes(tab) ? caption(tab) : ''} onChange={(c) => { setTab(BOTTOM.find((b) => c.startsWith(b)) ?? 'Procedure'); setCur(0) }} compact>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: 3 }}>
              <PBBand>{tab} List</PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  rows={rows}
                  current={cur}
                  onCurrentChange={setCur}
                  rowFill={(r) => (include.has(rowKey(tab, r.i)) ? '#d4fdc8' : undefined)}
                  rowTutorialId={(r) => `host.mois.row.referral-${pbSlug(tab)}-${r.i}`}
                  columns={[
                    {
                      key: 'include', header: 'Include', width: 50, align: 'center',
                      render: (r) => <PBCheckbox checked={include.has(rowKey(tab, r.i))} tutorialId={r.i === 0 ? `host.mois.cell.include-${pbSlug(tab)}-first` : undefined} onChange={(on) => setInclude((s) => toggle(s, rowKey(tab, r.i), on))} />,
                    },
                    {
                      key: 'detail', header: 'Detail', width: 46, align: 'center',
                      render: (r) => <PBCheckbox checked={detail.has(rowKey(tab, r.i))} tutorialId={r.i === 0 ? `host.mois.cell.detail-${pbSlug(tab)}-first` : undefined} onChange={(on) => setDetail((s) => toggle(s, rowKey(tab, r.i), on))} />,
                    },
                    { key: 'date', header: 'Date', width: 80, align: 'center' },
                    { key: 'by', header: tab === 'Procedure' ? 'Performed By' : 'By', width: 150 },
                    { key: 'desc', header: 'Description', width: 300 },
                    { key: 'ordered', header: 'Ordered By', width: 100 },
                    { key: 'facility', header: 'Facility', width: 90 },
                    { key: 'diag', header: 'Diag. Code', width: 64 },
                    { key: 'att', header: 'Att.', width: 30, align: 'center' },
                  ]}
                  empty={`No ${tab.toLowerCase()} records.`}
                />
              </div>
              <div className="pb-row" style={{ alignItems: 'flex-start', gap: 6, padding: '4px 0', flex: 'none', height: 120 }}>
                <b style={{ width: 54 }}>Current Row Detail:</b>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                  <div className="pb-row" style={{ gap: 2 }}>
                    <span className="pb-field" style={{ width: 70, background: '#e8ffe0' }}>{current?.date ?? ''}</span>
                    <span className="pb-field" style={{ width: 100, background: '#e8ffe0' }}>{current?.by ?? ''}</span>
                    <span className="pb-field" style={{ flex: 1, background: '#e8ffe0' }}>{current?.desc ?? ''}</span>
                  </div>
                  <div className="pb-field" style={{ flex: 1, background: '#fff', whiteSpace: 'pre-wrap', overflow: 'auto' }}>
                    {t.rows[current?.i ?? -1]?.str_report ?? t.rows[current?.i ?? -1]?.str_note ?? ''}
                  </div>
                </div>
              </div>
            </div>
          </PBTabs>
        </div>
      </div>
      <div className="pb-row" style={{ gap: 6, padding: '10px', flex: 'none' }}>
        <DialogButton id="preview-report-only" width={116} onClick={() => setPreview('report-only')}>Preview Report Only...</DialogButton>
        <span className="pb-row__spacer" />
        <DialogButton id="referral-preview" width={88} isDefault onClick={() => setPreview('full')}>Preview...</DialogButton>
        <DialogButton id="referral-note-cancel" width={70} onClick={close}>Cancel</DialogButton>
        <span className="pb-row__spacer" />
        <span style={{ width: 116 }} />
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('referral-note-report', ReferralNoteReportWindow)
