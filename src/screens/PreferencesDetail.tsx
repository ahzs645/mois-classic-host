import type { MoisRecord } from '../data/charts'
import { date } from '../data/charts/relations'
import { PREFERENCE_BY, PREFERENCE_FORMS, PREFERENCE_REASONS } from '../data/preferenceVocab'
import { yn } from '../data/text'
import { PBCheckbox, PBInput, PBRadio, PBTextArea } from '../pb'
import { PreferenceChoice } from './PreferenceChoice'
import './preferences-detail.css'

/** Preferences detail, from the 2026-09-22 08:01:33 capture.
 * Values belong to the selected exported preference; absent fields stay blank.
 * Type, Subject and Instruction are read-only once a preference exists; the
 * Detail boxes, dates, flags, Reason, Form and By stay editable ("You can add
 * more comments, if needed, by editing the Detail fields", art. 300925). The
 * drop lists are data/preferenceVocab.ts's, shared with New Preference. */
// Lookup choices transcribed from the supplied MOIS dropdown captures.
const FORMS = PREFERENCE_FORMS
const REASONS = PREFERENCE_REASONS
const slash = (v: string) => v.replace(/\./g, '/')

export function PreferencesDetail({ record, records = [], onChange }: {
  record?: MoisRecord; records?: MoisRecord[]; onChange: (field: string, value: string) => void
}) {
  const value = (field: string) => record?.[field] ?? ''
  const input = (field: string, label: string) => <PBInput w="100%" aria-label={label} value={value(field)} readOnly />
  const area = (field: string, label: string, anchor: string) => <PBTextArea w="100%" aria-label={label} value={value(field)}
    readOnly={!record} data-tutorial-id={`host.mois.field.${anchor}`} onChange={e => onChange(field, e.target.value)} />
  const options = (field: string) => field === 'str_form' ? FORMS : field === 'str_reason_code' ? REASONS
    : field === 'str_by' ? [...new Set([...PREFERENCE_BY, ...records.map(r => r.str_by ?? '').filter(Boolean)])]
    : records.filter(r => field !== 'str_instruction_code' || (r.str_classification === record?.str_classification
      && r.str_type === record?.str_type && r.str_preference === record?.str_preference))
      .map(r => r[field] ?? '').filter(Boolean)
  const choice = (field: string, label: string, anchor: string, readOnly = false) => <PreferenceChoice label={label} value={value(field)}
    options={options(field)} disabled={!record} readOnly={readOnly} tutorialId={anchor} onChange={v => onChange(field, v)} />
  const codeType = value('str_code_type').toUpperCase()
  return <div className="pb-preference-detail" data-tutorial-id="host.mois.preference-detail">
    <div className="pb-preference-detail__subject">
      <strong>Subject:</strong><span>{[value('str_type'), value('str_classification')].filter(Boolean).join(' - ')}</span>
      <span>Identified By:</span>
      <div className="pb-row pb-preference-detail__radios">
        {['Concept', 'Code', 'Free Text'].map(label => <PBRadio key={label} name="preference-identified-by" label={label} checked={codeType === label.toUpperCase()} />)}
      </div>
      <span>{codeType === 'CONCEPT' ? 'Concept:' : codeType === 'FREE TEXT' ? 'Description:' : 'Code Desc.:'}</span>
      {input('str_description', 'Preference code description')}
      <span /><span>Subject Detail:</span>
      <span />{area('str_detail', 'Preference subject detail', 'preference-subject-detail')}
    </div>
    <div className="pb-preference-detail__other">
      <strong>Other:</strong>
      <div className="pb-preference-detail__dates">
        <label>Start Date:<PBInput w="100%" aria-label="Preference start date" value={date(record?.dtm_start)} readOnly={!record}
          data-tutorial-id="host.mois.field.preference-start-date" onChange={e => onChange('dtm_start', slash(e.target.value))} /></label>
        <label>End Date:<PBInput w="100%" aria-label="Preference end date" value={date(record?.dtm_end)} readOnly={!record}
          data-tutorial-id="host.mois.field.preference-end-date" onChange={e => onChange('dtm_end', slash(e.target.value))} /></label>
      </div>
      <div className="pb-preference-detail__flags">
        <PBCheckbox label="Mark as Sensitive" checked={value('str_sensitive') === 'Y'} disabled={!record}
          tutorialId="host.mois.field.preference-sensitive" onChange={v => onChange('str_sensitive', yn(v))} />
        <PBCheckbox label="Show on Demographics" checked={value('str_include_demo') === 'Y'} disabled={!record}
          tutorialId="host.mois.field.preference-show-on-demographics" onChange={v => onChange('str_include_demo', yn(v))} />
      </div>
      <span />
      <label>Form:{choice('str_form', 'Preference form', 'preference-form')}</label>
      <label>By:{choice('str_by', 'Preference by', 'preference-by')}</label>
    </div>
    <div className="pb-preference-detail__instruction">
      <strong>Instruction:</strong>{choice('str_instruction_code', 'Preference instruction', 'preference-instruction', true)}
      <span /><span>Detail:</span>
      <span />{area('str_instruction', 'Preference instruction detail', 'preference-instruction-detail')}
    </div>
    <div className="pb-preference-detail__reason">
      <strong>Reason:</strong>{choice('str_reason_code', 'Preference reason', 'preference-reason')}
      <span /><span>Detail:</span>
      <span />{area('str_reason', 'Preference reason detail', 'preference-reason-detail')}
    </div>
  </div>
}
