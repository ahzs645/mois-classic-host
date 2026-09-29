import { useState, type CSSProperties } from 'react'
import { date } from '../data/charts/relations'
import type { MoisRecord } from '../data/charts/types'
import { clockNow, type Phq9Answers } from '../data/measureEntry'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { DESKTOP_PROVIDER_DEFAULT } from '../data/session'
import { useScreenReport } from '../host/screen-state'
import { PBButton, PBCheckbox, PBDropField, PBInput, PBPatientBand, PBRadio, PBWindow } from '../pb'
import { NAVY } from './formKit'
import './legacy-dynamic-form.css'

/* ============================================================================
   PATIENT HEALTH QUESTIONNAIRE (v1) — dynamic form window 104.

   Opened by F4 (or the `…` right of the cell) in the Value field of a
   PHQ-9 TOTAL SCORE measure row (code 43894, quick code PHQ9) — on the
   Encounter Detail Window's Measurements tab (art. 303102) or on a New
   Record row in Measures (art. 302837 "Dynamic Measures Calculators"). It is
   the same shell as BLOOD PRESSURE MEASUREMENT (BloodPressureFormWindow.tsx):
   MOIS fills Form Date, "This form was created by" and Provider; Save Form
   writes the total score back into Value and stamps Last Modified with the
   user, and the window stays open until Close Form (302837 `bd504bb6…`).
   F4 in that Value later reopens the saved instance.

   PROVENANCE:
     · art. 303102 "Create a PHQ 9 Form", image `722c66136ce5…` (788×698 —
       the whole window, scrolled to the top): title "PATIENT HEALTH
       QUESTIONNAIRE  (v1)"; the blue patient band 22–90; Form Date / This
       form was created by / Provider / Allow other users to edit form
       90–137; `Last Modified: 2013.09.20 10:06 AIHS Admin`; the form box with
       the caption PATIENT HEALTH QUESTIONNAIRE left and an `All` column
       (x 588–765) on the right carrying a `...` per item; question 1 "Over
       the past 2 weeks, how often have you been bothered by any of the
       following problems?"; the answer grid — Not at all (0) | Several days
       (1) | More than half the days (2) | Nearly every day (3) — over items
       a–i, their wording verbatim; question 2 "If you checked off any
       problem on this questionnaire so far, how difficult have these
       problems made it for you to do your work, take care of things at home,
       or get along with other people?"; the navy footer with Save Form /
       Close Form.
     · field names and a saved instance: chart 87288 dform_header 10000484
       (id_dform_window 104, 2026/02/19, on measure 504118 = 19) and its
       dform_data — num_field_0001 … num_field_0009 are items a–i (labels
       verbatim), `num_fielde_0010` (MOIS's own spelling, field order 100)
       is question 2. The measure's str_report is the "PATIENT HEALTH
       QUESTIONNAIRE / a. … : 2" text Save Form writes below.
   INFERRED (below the capture's scroll): question 2's four answers (the
     published PHQ-9 wording: Not difficult at all / Somewhat difficult /
     Very difficult / Extremely difficult, scored 0–3 as the export's value
     2 implies) and the TOTAL SCORE line the article says "will calculate at
     the bottom". The `All` column's `...` are drawn but not wired: no
     capture or text says what they do.
   ========================================================================= */

const W = 788
const H = 698

export const PHQ9_ITEMS = [
  'a. Little interest or pleasure in doing things.',
  'b. Feeling down, depressed, or hopeless.',
  'c. Trouble falling/staying asleep, sleeping too much.',
  'd. Feeling tired or having little energy.',
  'e. Poor appetite or overeating.',
  'f. Feeling bad about yourself, or that you are a failure, or have let yourself or your family down.',
  'g. Trouble concentrating on things, such as reading the newspaper or watching TV.',
  'h. Moving or speaking so slowly that other people could have noticed. Or the opposite; being fidgety or restless that you have been moving around more than usual.',
  'i. Thoughts that you would be better off dead or of hurting yourself in some way.',
]
const ANSWERS = ['Not at all\n(0)', 'Several\ndays (1)', 'More than\nhalf the days\n(2)', 'Nearly every\nday (3)']
const DIFFICULTY = ['Not difficult at all', 'Somewhat difficult', 'Very difficult', 'Extremely difficult']

export const EMPTY_PHQ9: Phq9Answers = { items: PHQ9_ITEMS.map(() => ''), difficulty: '' }

export type Phq9Result = {
  total: string
  answers: Phq9Answers
  /** the measure's Report text, as MOIS writes it */
  report: string
  /** H above the PHQ-9 TOTAL SCORE normal range (upper 10, the export's) */
  flag: string
  /** the Last Modified stamp Save Form put on the form */
  modified: string
}

export const phq9Total = (a: Phq9Answers) => a.items.reduce((sum, v) => sum + (v === '' ? 0 : Number(v)), 0)

export function phq9Report(a: Phq9Answers): string {
  const lines = PHQ9_ITEMS
    .map((label, i) => (a.items[i] === '' ? '' : `  ${label} : ${a.items[i]}`))
    .filter(Boolean)
  return ['PATIENT HEALTH QUESTIONNAIRE', ...lines].join('\r\n')
}

/** a saved instance (dform_header + dform_data) → its answers */
export function phq9From(header: MoisRecord | undefined, records: MoisRecord[] | undefined): Phq9Answers {
  const answers: Phq9Answers = { items: [...EMPTY_PHQ9.items], difficulty: '' }
  if (!header) return answers
  for (const row of records ?? []) {
    if (row.id_dform_header !== header.id_dform_header) continue
    const m = /^num_fielde?_(\d{4})$/.exec(row.str_field_name ?? '')
    if (!m) continue
    const n = Number(m[1])
    if (n >= 1 && n <= 9) answers.items[n - 1] = row.str_value ?? ''
    if (n === 10) answers.difficulty = row.str_value ?? ''
  }
  return answers
}

/** `2026/02/19 10:20:56` → `2026.02.19 10:20` */
const stamp = (v?: string) => (v ? v.replace(/\//g, '.').replace(/(\d\d:\d\d):\d\d$/, '$1') : '')

const cell: CSSProperties = { border: '1px solid #b8b8b8', padding: '3px 5px', verticalAlign: 'top' }
const answerCell: CSSProperties = { ...cell, textAlign: 'center', verticalAlign: 'middle', width: 72 }

export function Phq9FormWindow({ header, records, initial, modified, onSave, onClose }: {
  /** a saved instance to show (dform_header record) — omitted for a new questionnaire */
  header?: MoisRecord
  records?: MoisRecord[]   // dform_data rows
  /** answers saved earlier this session, which win over the export's */
  initial?: Phq9Answers
  /** the Last Modified stamp of a form saved earlier this session */
  modified?: string
  onSave: (result: Phq9Result) => void   // Save Form
  onClose: () => void                    // Close Form
}) {
  const patient = usePatient()
  const [answers, setAnswers] = useState<Phq9Answers>(() => initial ?? phq9From(header, records))
  const [formDate, setFormDate] = useState(header ? date(header.dtm_form) : MOIS_TODAY)
  const [createdBy, setCreatedBy] = useState(header ? header.stp_user_create ?? '' : DESKTOP_PROVIDER_DEFAULT)
  const [provider, setProvider] = useState(
    header ? (header.id_provider && header.id_provider !== '-1' ? header.id_provider : '') : DESKTOP_PROVIDER_DEFAULT,
  )
  const [allowOthers, setAllowOthers] = useState(header ? header.str_lock_to_user !== 'Y' : true)
  const [lastModified, setLastModified] = useState(
    modified ?? (header?.stp_date_modify ? `${stamp(header.stp_date_modify)}  ${header.stp_user_modify ?? ''}` : ''),
  )

  const total = phq9Total(answers)
  const answered = answers.items.filter((v) => v !== '').length
  useScreenReport({ phq9Answered: answered, phq9Difficulty: answers.difficulty !== '', phq9Saved: lastModified !== '' })

  const setItem = (i: number, v: string) => setAnswers((a) => ({ ...a, items: a.items.map((x, j) => (j === i ? v : x)) }))

  const save = () => {
    const stampText = `${MOIS_TODAY} ${clockNow()}  ${createdBy}`
    setLastModified(stampText)
    onSave({ total: String(total), answers, report: phq9Report(answers), flag: total > 10 ? 'H' : '-', modified: stampText })
  }

  const phoneKind = patient.preferredPhone ?? 'Home'
  const phone = phoneKind === 'Cell' ? patient.cell : phoneKind === 'Work' ? patient.work : patient.home
  const name = [patient.first, patient.middle, patient.last].filter(Boolean).join(' ').toUpperCase()

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 97 }}>
      <PBWindow
        child
        controls={false}
        title="PATIENT HEALTH QUESTIONNAIRE  (v1)"
        onClose={onClose}
        tutorialId="host.mois.dialog.phq9-form"
        className="pb-legacy-dform"
        style={{ width: W, height: H, maxWidth: '100%', maxHeight: '100%', ['--pb-titlebar-h' as string]: '22px' }}
      >
        {/* the blue patient band, 22–90 */}
        <PBPatientBand
          layout="placed"
          className="pb-legacy-dform__patient"
          style={{ position: 'relative', display: 'block', height: 68, flex: '0 0 auto', padding: 0, background: 'linear-gradient(#1871b5, #4ab2e7)' }}
          cells={[
            { label: 'CHART NO.', value: patient.chart, left: 8, top: 5 },
            { label: 'PATIENT (F/M/L)', value: name, left: 93, top: 5 },
            { label: 'DATE OF BIRTH', value: <>{patient.dob}&nbsp;&nbsp;{patient.age}</>, left: 310, top: 5 },
            { label: 'GENDER', value: patient.sex, left: 93, top: 37 },
            {
              label: 'PERSONAL HEALTH NO.', left: 169, top: 37,
              value: patient.bchn ? <>{patient.insuranceBy ?? 'BC'}&nbsp;&nbsp;{patient.bchn}</> : '',
            },
            {
              label: 'PREFERRED PHONE NUMBER', left: 310, top: 37,
              value: <>
                {phone ?? ''}
                {phone && <span style={{ display: 'inline', minWidth: 0, fontWeight: 400, fontSize: 11, marginLeft: 8 }}>{phoneKind} Phone</span>}
              </>,
            },
          ]}
        />

        {/* metadata strip, 90–137, then Last Modified */}
        <div style={{ position: 'relative', height: 47, flex: '0 0 auto', background: '#fff', borderBottom: '1px solid #4ab2e7' }}>
          <span style={{ position: 'absolute', left: 15, top: 9 }}>Form Date:</span>
          <PBInput value={formDate} onChange={(e) => setFormDate(e.target.value)} align="center" w={77} style={{ position: 'absolute', left: 85, top: 5 }} />
          <span style={{ position: 'absolute', left: 206, top: 9 }}>This form was created by:</span>
          <span style={{ position: 'absolute', left: 340, top: 5 }}><PBDropField value={createdBy} onChange={setCreatedBy} w={175} /></span>
          <span style={{ position: 'absolute', left: 15, top: 29 }}>Provider:</span>
          <span style={{ position: 'absolute', left: 85, top: 25 }}><PBDropField value={provider} onChange={setProvider} w={175} /></span>
          <span style={{ position: 'absolute', left: 340, top: 26 }}>
            <PBCheckbox label="Allow other users to edit form" checked={allowOthers} onChange={setAllowOthers} />
          </span>
        </div>
        <div
          data-tutorial-id="host.mois.field.phq9-last-modified"
          style={{ height: 25, flex: '0 0 auto', display: 'flex', alignItems: 'center', padding: '0 14px', background: '#fff', borderBottom: '1px solid #000' }}
        >
          Last Modified:{lastModified && <span style={{ marginLeft: 6 }}>{lastModified}</span>}
        </div>

        {/* the form, scrolling */}
        <div className="pb-legacy-dform__body" style={{ padding: 0, overflowY: 'scroll', overflowX: 'hidden' }}>
          <div style={{ display: 'flex', margin: '0 0 0 6px', width: 758, border: '1px solid #000', borderTop: 0, background: '#fff' }}>
            <div style={{ width: 580, flex: 'none', padding: '0 0 12px' }}>
              <div style={{ color: NAVY.dform, fontSize: 13, padding: '8px 8px 4px', borderBottom: `1px solid ${NAVY.dform}` }}>PATIENT HEALTH QUESTIONNAIRE</div>
              <div style={{ padding: '6px 6px 4px', fontSize: 13 }}>
                1. Over the past 2 weeks, how often have you been bothered by any of the following problems?
              </div>
              <table style={{ borderCollapse: 'collapse', margin: '0 6px', width: 548, tableLayout: 'fixed' }}>
                <colgroup><col style={{ width: 258 }} /><col /><col /><col /><col /></colgroup>
                <thead>
                  <tr>
                    <th style={cell} />
                    {ANSWERS.map((a) => (
                      <th key={a} style={{ ...answerCell, fontWeight: 400, whiteSpace: 'pre-line', lineHeight: '13px' }}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PHQ9_ITEMS.map((label, i) => {
                    const letter = label[0]!
                    return (
                      <tr key={label} style={{ height: i === 7 ? 62 : 37 }}>
                        <td style={cell}>{label}</td>
                        {[0, 1, 2, 3].map((score) => (
                          <td key={score} style={answerCell}>
                            <PBRadio
                              name={`phq9-${letter}`}
                              checked={answers.items[i] === String(score)}
                              onChange={() => setItem(i, String(score))}
                              tutorialId={`host.mois.field.phq9-${letter}-${score}`}
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div style={{ padding: '10px 6px 4px', fontSize: 13 }}>
                2. If you checked off any problem on this questionnaire so far, how difficult have these problems made it for
                you to do your work, take care of things at home, or get along with other people?
              </div>
              <table style={{ borderCollapse: 'collapse', margin: '0 6px', width: 548, tableLayout: 'fixed' }}>
                <tbody>
                  <tr style={{ height: 34 }}>
                    {DIFFICULTY.map((label, score) => (
                      <td key={label} style={{ ...cell, verticalAlign: 'middle' }}>
                        <PBRadio
                          name="phq9-difficulty"
                          label={label}
                          checked={answers.difficulty === String(score)}
                          onChange={() => setAnswers((a) => ({ ...a, difficulty: String(score) }))}
                          tutorialId={`host.mois.field.phq9-difficulty-${score}`}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              {/* the score MOIS calculates at the bottom (303102) */}
              <div className="pb-row" style={{ gap: 8, padding: '12px 6px 0' }}>
                <span style={{ color: NAVY.dform, fontSize: 13 }}>TOTAL SCORE:</span>
                <PBInput w={52} align="center" value={String(total)} readOnly data-tutorial-id="host.mois.field.phq9-total" />
                <span>(0 - 27)</span>
              </div>
            </div>

            {/* the `All` column: a `...` beside each item (not wired — see header) */}
            <div style={{ flex: '1 1 auto', borderLeft: `1px solid ${NAVY.dform}` }}>
              <div style={{ color: NAVY.dform, fontSize: 13, textAlign: 'center', padding: '8px 0 4px', borderBottom: `1px solid ${NAVY.dform}` }}>All</div>
              <div style={{ height: 22 + 48 }} />
              {PHQ9_ITEMS.map((label, i) => (
                <div key={label} style={{ height: i === 7 ? 62 : 37, textAlign: 'center', color: NAVY.dform }}>...</div>
              ))}
            </div>
          </div>
        </div>

        <div className="pb-legacy-dform__footer" style={{ height: 38, flex: '0 0 auto', alignItems: 'center', gap: 5, padding: '0 6px', background: '#005594' }}>
          <PBButton style={{ width: 93, height: 25, minWidth: 0 }} data-tutorial-id="host.mois.command.save-form" onClick={save}>
            Save Form
          </PBButton>
          <PBButton style={{ width: 93, height: 25, minWidth: 0 }} data-tutorial-id="host.mois.command.close-form" onClick={onClose}>
            Close Form
          </PBButton>
        </div>
      </PBWindow>
    </div>
  )
}
