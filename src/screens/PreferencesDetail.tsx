import type { MoisRecord } from '../data/charts'
import { date } from '../data/charts/relations'
import { PBCheckbox, PBInput, PBRadio, PBTextArea } from '../pb'
import { PreferenceChoice } from './PreferenceChoice'
import './preferences-detail.css'

/** Preferences detail, from the 2026-09-22 08:01:33 capture.
 * Values belong to the selected exported preference; absent fields stay blank. */
// Lookup choices transcribed from the supplied MOIS dropdown captures.
const FORMS = ['IN PERSON', 'PAPER', 'PHONE', 'VERBAL']
const REASONS = ['GUILLAIN BARRE SYNDROME', 'ABORIGINAL ANCESTRY', 'ALREADY IMMUNE', 'FAM HX CONGENITAL IMMUNO',
  'IMMUNITY LAB EVIDENCE', 'IMMUNITY PREVIOUS DISEASE', 'INELIGIBLE FOR VACCINE', 'INVALID DOSE',
  'INVOLUNTARY ADMISSION', 'MATURE MINOR-SENSITIVE', 'NO VALID CONSENT', 'NOT SEXUALLY ACTIVE', 'OTHER',
  'PARENT DIRECTED SCHEDULING', 'SELF CHOICE']

export function PreferencesDetail({ record, records = [], onChange }: {
  record?: MoisRecord; records?: MoisRecord[]; onChange: (field: string, value: string) => void
}) {
  const value = (field: string) => record?.[field] ?? ''
  const input = (field: string, label: string) => <PBInput w="100%" aria-label={label} value={value(field)} readOnly />
  const area = (field: string, label: string) => <PBTextArea w="100%" aria-label={label} value={value(field)} readOnly />
  const options = (field: string) => field === 'str_form' ? FORMS : field === 'str_reason_code' ? REASONS
    : records.filter(r => field !== 'str_instruction_code' || (r.str_classification === record?.str_classification
      && r.str_type === record?.str_type && r.str_preference === record?.str_preference))
      .map(r => r[field] ?? '').filter(Boolean)
  const choice = (field: string, label: string) => <PreferenceChoice label={label} value={value(field)}
    options={options(field)} disabled={!record} onChange={v => onChange(field, v)} />
  const codeType = value('str_code_type').toUpperCase()
  return <div className="pb-preference-detail" data-tutorial-id="host.mois.preference-detail">
    <div className="pb-preference-detail__subject">
      <strong>Subject:</strong><span>{[value('str_type'), value('str_classification')].filter(Boolean).join(' - ')}</span>
      <span>Identified By:</span>
      <div className="pb-row pb-preference-detail__radios">
        {['Concept', 'Code', 'Free Text'].map(label => <PBRadio key={label} name="preference-identified-by" label={label} checked={codeType === label.toUpperCase()} />)}
      </div>
      <span>{codeType === 'CONCEPT' ? 'Concept:' : 'Code Desc.:'}</span>
      {input('str_description', 'Preference code description')}
      <span /><span>Subject Detail:</span>
      <span />{area('str_detail', 'Preference subject detail')}
    </div>
    <div className="pb-preference-detail__other">
      <strong>Other:</strong>
      <div className="pb-preference-detail__dates">
        <label>Start Date:<PBInput w="100%" aria-label="Preference start date" value={date(record?.dtm_start)} readOnly /></label>
        <label>End Date:<PBInput w="100%" aria-label="Preference end date" value={date(record?.dtm_end)} readOnly /></label>
      </div>
      <div className="pb-preference-detail__flags">
        <PBCheckbox label="Mark as Sensitive" checked={value('str_sensitive') === 'Y'} />
        <PBCheckbox label="Show on Demographics" checked={value('str_include_demo') === 'Y'} />
      </div>
      <span />
      <label>Form:{choice('str_form', 'Preference form')}</label>
      <label>By:{choice('str_by', 'Preference by')}</label>
    </div>
    <div className="pb-preference-detail__instruction">
      <strong>Instruction:</strong>{choice('str_instruction_code', 'Preference instruction')}
      <span /><span>Detail:</span>
      <span />{area('str_instruction', 'Preference instruction detail')}
    </div>
    <div className="pb-preference-detail__reason">
      <strong>Reason:</strong>{choice('str_reason_code', 'Preference reason')}
      <span /><span>Detail:</span>
      <span />{area('str_reason', 'Preference reason detail')}
    </div>
  </div>
}
