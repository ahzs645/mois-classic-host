import { useState, type ReactNode } from 'react'
import type { MoisRecord } from '../data/charts'
import { RESPONSE_DOC_TYPES, useSessionDocDistributions } from '../data/letterDocs'
import { usePatient } from '../data/patient-context'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { PBDataWindow, PBDropDownDataWindow, PBMessageBox, pbSlug, type PBColumn, type PBCommand } from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import { useFiledEforms } from './PhsaEformWindows'

/* ============================================================================
   Patient Chart ▸ Documents — Distribute, and what it needs (303445).

   "As of MOIS 2.22, you can distribute a Paper Form as a stand-alone
   document through CDX … navigate to the record in the Patient Chart -
   Documents folder. Find your Paper Form you would like to distribute and
   change the 'Document Type' to 'Miscellaneous' … Then select 'Distribute'.
   The reason the Document Type must be changed is that there is not
   currently a LOINC code for 'Paper Form' so it first needs to be changed to
   a 'Misc' type to go through CDX." (`f09c792c…`: the Document Type cell of
   the current row edited to MISC, Recipient and Diagnosis filled below.)

   And 2961349 "Sending a Notification": "Documents · New Record ·
   Distribute → Send Window opens · Select document type of Notification".

   So, on the Documents folder only:
     - the current row's Document Type cell is a drop-down (MISC, NOTE,
       NOTIFICATION, PATIENT SUMMARY, PAPER FORM …); the pick is kept for the
       session, per record;
     - Distribute opens the Send window (screens/LetterResponseWindows.tsx,
       `send-document`) on the record — MISC for a record whose type was
       changed, NOTIFICATION for a New Record — and refuses a record still
       typed PAPER FORM with a message box (its wording is INFERRED from
       the article's reason);
     - the Distribution tab lists what was sent (303445 `8d2d2fb0…`: Date ·
       Method · Recipient Type · Name · Location · Status).

   - the PHSA eFORMs filed this session (stream C2, `useFiledEforms`) list
     as Documents rows, after the exported ones (appended, so the grid's
     row → record mapping is untouched).

   ClinicalReportView calls this hook for every node; it is inert off
   Documents.
   ========================================================================= */

const DOC_TYPES = ['PAPER FORM', ...RESPONSE_DOC_TYPES.map((t) => t.type), 'REFERRAL', 'CONSULTATION', 'ENCOUNTER', 'INFORMATION REQUEST', 'WEBFORM']

export function useDocumentsDistribution({ node, record, records, cur }: { node: string; record: MoisRecord | undefined; records: (MoisRecord | undefined)[]; cur: number }) {
  const active = node === 'documents'
  const p = usePatient()
  const open = useOpenWindow()
  const [types, setTypes] = useSessionState<Record<string, string>>(`documents:types:${p.chart}`, {})
  const [sent] = useSessionDocDistributions()
  const [refusal, setRefusal] = useState<string | null>(null)
  const [eforms] = useFiledEforms()
  const id = record?.id_document ?? ''
  const typeOf = (r: MoisRecord | undefined, fallback = '') => (r?.id_document ? types[r.id_document] : undefined) ?? r?.str_doc_type ?? fallback
  const mine = sent.filter((d) => d.chart === p.chart && d.documentId === id)
  useScreenReport(active ? { documentType: pbSlug(typeOf(record)), documentDistributions: mine.length } : {})

  const distribute = () => {
    const type = typeOf(record)
    if (!record) { open('send-document', { mode: 'document', docType: 'NOTIFICATION' }); return }
    if (type === 'PAPER FORM') { setRefusal(type); return }
    const known = RESPONSE_DOC_TYPES.some((t) => t.type === type)
    open('send-document', { mode: 'document', documentId: id, docType: known ? type : 'MISC', recipient: record.str_recipient ?? '' })
  }

  return {
    active,
    /** the grid's rows, with this session's filed eFORMs after them */
    rows: <R extends Record<string, string>>(rows: R[]): R[] => (!active ? rows : [
      ...rows,
      ...eforms.map((e) => ({ date: e.date, author: e.author, type: e.type, note: e.note, s: '', m: '', link: '', clip: '1', status: e.status } as unknown as R)),
    ]),
    commands: (cmds: PBCommand[]): PBCommand[] => (!active ? cmds : cmds.map((c) => (c && c.label === 'Distribute' ? { ...c, disabled: false, onClick: distribute } : c))),
    /** the current row's Document Type becomes a drop-down */
    columns: <T extends Record<string, string>>(cols: PBColumn<T>[]): PBColumn<T>[] => (!active ? cols : cols.map((c) => (c.key !== 'type' ? c : {
      ...c,
      render: (r: T, i: number) => (i === cur && record
        ? (
          <PBDropDownDataWindow
            w="100%"
            listW={300}
            value={typeOf(record, r.type)}
            tutorialId="host.mois.field.document-type"
            columns={[{ key: 'type', header: 'Document Type', width: 200 }]}
            rows={DOC_TYPES.map((t) => ({ type: t }))}
            onSelect={(pick) => setTypes((all) => ({ ...all, [id]: pick.type }))}
          />
        )
        : typeOf(records[i], r.type)),
    }))),
    tabs: (tabs: string[] | undefined) => (!active || !tabs ? tabs : tabs.map((t) => (t.startsWith('Distribution') ? `Distribution (${mine.reduce((n, d) => n + d.rows.length, 0)})` : t))),
    /** the Distribution tab's page, or null for any other tab */
    page: (tab: string): ReactNode => (!active || !tab.startsWith('Distribution') ? null : (
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          head="grey"
          zebra={false}
          rows={mine.flatMap((d) => d.rows.map((r) => ({ date: d.date, method: r.method, type: r.type, name: r.name, location: '', status: r.status })))}
          columns={[
            { key: 'date', header: 'Date', width: 120 },
            { key: 'method', header: 'Method', width: 70 },
            { key: 'type', header: 'Recipient Type', width: 150 },
            { key: 'name', header: 'Name', width: 200 },
            { key: 'location', header: 'Location', width: 150 },
            { key: 'status', header: 'Status' },
          ]}
          empty="This document has not been distributed."
        />
      </div>
    )),
    windows: refusal && (
      <PBMessageBox title="Distribute" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.distribute-refused-ok' }]} onClose={() => setRefusal(null)}>
        A {refusal} cannot be distributed through CDX: there is no LOINC code for it. Change the Document Type to MISC, enter the recipient, and Distribute again.
      </PBMessageBox>
    ),
  }
}
