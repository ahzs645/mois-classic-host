import { Fragment, useState, type ReactNode } from 'react'
import { usePatient } from '../data/patient-context'
import { updatePatient } from '../data/patient-edits'
import type { ChartAddressEntry, ChartNameEntry, Patient } from '../data/patients'
import { genderDesignationColumns, genotypicGenderColumns, genotypicGenderRows, preferredGenderRows } from '../data/mois'
import { PBBand, PBInput, PBLookup, PBSelect, PBTextArea, PBCheckbox, PBDataWindow, PBDropDownDataWindow } from '../pb'
import { DemographicLookupDialog, type DemographicTerm } from './DemographicDialogs'
import { CmdButton } from './CmdButton'
import './patient-detail.css'

/* ============================================================================
   Demographics ▸ Patient Detail.

   PROVENANCE: the field audit's DEV captures of this tab, chart 87297
   (evidence/MATRIX-R0082-preferred-gender with the Preferred Gender list
   dropped, MATRIX-R0100-first, MATRIX-R0112-country; MOIS v02.31.23
   b250508). Every measurement below is read off those captures, which are
   painted at 100%:

   - Background Information is a stack of 19px rows in four runs — the three
     Ethnicity rows; the two genders and the four coded fields; Patient
     Adopted / Multi-Gestation; Relationship to Living Arrangements — each
     closed by a single #c9c9c9 hairline, then General Notes. The coded
     fields are 107px past the left edge; a lookup is 194px of field and a
     17px "…", a drop-down 194px (Relationship 115px).
   - Each Ethnicity row is a 55px whose-box (the capture's three read "Self")
     and the ethnicity picked through its "…", which MOIS prints grey: it is
     chosen from the list, never typed.
   - The two genders are drop-down DataWindows (Gender / Description), the
     same lists the Advanced Gender Designations window drops; the field
     shows the code. Their labels are painted yellow once a value is set.
   - Name History is a free-form record: First / Middle / Last at 140px,
     Expiry 82px and a 130 x 39 Note, the record count top right. MOIS prints
     it "1 or 1", not "1 of 1"; that is transcribed as painted.
   - Historical Contact Information pages one address at a time: a blue
     Expiry Date strip ("This is n of m records" at its right), then three
     right-aligned label columns, the second address line unlabelled, and a
     vertical scroll bar down the right edge that pages the records. The
     captures stop at Province / Cell; the Postal Code, Country, Ext. and Fax
     rows below them (the audit sheet's R0111, R0112, R0117) were never on
     screen and keep the widths of the rows above.                         */

/** the hairline MOIS closes each run of Background Information with */
const Rule = () => <div className="pb-patient-detail__rule" />

/** one Background Information row: 107px of label, then the control */
function BgRow({ label, flagged, children }: { label: ReactNode; flagged?: boolean; children: ReactNode }) {
  return <div className="pb-patient-detail__bgrow">
    <span className="pb-patient-detail__lbl"><span className={flagged ? 'pb-flag' : undefined}>{label}</span></span>{children}
  </div>
}

export function PatientDetailPage() {
  const patient = usePatient()
  const [addressIndex, setAddressIndex] = useState(0)
  const [nameIndex, setNameIndex] = useState(0)
  const [lookup, setLookup] = useState<{ label: string; value: string; options: string[]; pick: (value: string) => void } | null>(null)
  const change = (patch: Partial<Patient>) => updatePatient(patient.chart, patch)
  const addresses = patient.addressHistory ?? []
  const names = patient.nameHistory ?? []
  const ai = Math.min(addressIndex, Math.max(0, addresses.length - 1))
  const ni = Math.min(nameIndex, Math.max(0, names.length - 1))
  const addr = addresses[ai] ?? {}
  const changeAddress = (field: keyof ChartAddressEntry, value: string) => change({ addressHistory: addresses.map((a, i) => i === ai ? { ...a, [field]: value } : a) })
  const changeName = (index: number, field: keyof ChartNameEntry, value: string) => change({ nameHistory: names.map((n, i) => i === index ? { ...n, [field]: value } : n) })
  /** a coded field: a 194px drop-down, or a 211px lookup ("…" included) */
  const coded = (key: keyof Patient, label: string, options?: string[], w = 194) => {
    const value = String(patient[key] ?? '')
    return <BgRow label={`${label}:`} key={key}>{options
      ? <PBSelect aria-label={label} w={w} options={[...new Set(['', ...options, value])]} value={value} onChange={e => change({ [key]: e.target.value })} />
      : <PBLookup name={`patient-detail-${key}`} w={211} value={value} onChange={v => change({ [key]: v })}
        onDots={() => setLookup({ label, value, options: value ? [value] : [], pick: v => change({ [key]: v }) })} />}</BgRow>
  }
  const gender = (kind: 'preferred' | 'genotypic') => {
    const rows = kind === 'preferred' ? preferredGenderRows : genotypicGenderRows
    const value = patient.genderDesignations?.[kind] ?? ''
    return <PBDropDownDataWindow w={59} listW={kind === 'preferred' ? 176 : 224} value={value} display="gender"
      rows={rows} columns={kind === 'preferred' ? genderDesignationColumns : genotypicGenderColumns}
      tutorialId={`host.mois.field.patient-detail-${kind}-gender`}
      onSelect={r => change({ genderDesignations: { ...patient.genderDesignations, [kind]: r.gender } })} />
  }
  return <div className="pb-patient-detail" data-tutorial-id="host.mois.patient-detail">
    <div className="pb-patient-detail__upper">
      <div className="pb-groupbox pb-patient-detail__background"><PBBand>Background Information</PBBand>
        <div className="pb-patient-detail__bg">
          {/* self, father, mother — the order art. 301177 (`13d38c58…png`,
              `e3b55814…png`) and the header comment in DemographicsView give */}
          {(['self', 'father', 'mother'] as const).map(who => {
            const ethnicity = patient.ethnicity?.[who] ?? {}
            const set = (patch: Partial<typeof ethnicity>) => change({ ethnicity: { ...patient.ethnicity, [who]: { ...ethnicity, ...patch } } })
            return <div className="pb-patient-detail__ethnicity" key={who}><span>Ethnicity:</span>
              <PBInput aria-label={`${who} ethnicity type`} w={55} value={ethnicity.type ?? ''} onChange={e => set({ type: e.target.value })} />
              <span className="pb-patient-detail__race">
                <PBLookup name={`ethnicity-${who}`} w={154} value={ethnicity.race ?? ''} readOnly
                  onDots={() => setLookup({ label: `${who} ethnicity`, value: ethnicity.race ?? '', options: ['CANADIAN INDIAN (FIRST NATIONS)', 'LATIN AMERICAN HISPANIC', 'INUIT'], pick: race => set({ race }) })} />
              </span>
              <PBCheckbox label="Self ID'd" checked={ethnicity.selfIdd ?? false} onChange={e => set({ selfIdd: e })} />
            </div>
          })}
          <Rule />
          <div className="pb-patient-detail__genders">
            <span className="pb-patient-detail__lbl"><span className={patient.genderDesignations?.preferred ? 'pb-flag' : undefined}>Preferred Gender:</span></span>
            {gender('preferred')}
            <span className="pb-patient-detail__lbl pb-patient-detail__lbl--genotypic"><span className={patient.genderDesignations?.genotypic ? 'pb-flag' : undefined}>Genotypic Gender:</span></span>
            {gender('genotypic')}
          </div>
          {coded('countryOrigin', 'Country Origin')}{coded('firstLanguage', 'First Language')}
          <BgRow label="Religion:"><PBInput aria-label="Religion" w={194} value={patient.religion ?? ''} onChange={e => change({ religion: e.target.value })} /></BgRow>
          {coded('firstNationStatus', 'First Nation Status', ['Status Indian', 'Non-Status', 'Not Applicable'])}
          <Rule />
          <BgRow label="Patient Adopted:">
            <PBCheckbox label="Yes" checked={patient.adopted ?? false} onChange={e => change({ adopted: e })} />
            <span className="pb-patient-detail__gestation">Multi-Gestation:</span>
            <PBCheckbox label="Yes" checked={patient.multiGestation ?? false} onChange={e => change({ multiGestation: e })} />
          </BgRow>
          <Rule />
          {coded('relationshipStatus', 'Relationship', ['Married', 'Single', 'Separated', 'Common Law', 'Widowed'], 115)}
          {coded('educationLevel', 'Education Level', ['University - bachelor degree', 'POST SECONDARY CERTIFICATE', 'SECONDARY', 'NONE'])}
          {coded('socioeconomic', 'Socioeconomic')}{coded('livingArrangements', 'Living Arrangements')}
          <Rule />
          {/* tdt_chart.str_note, the column the Demographics tab's General Notes
              also shows — painted in the fixed-pitch face there and here */}
          <div className="pb-patient-detail__bgrow pb-patient-detail__notes"><span className="pb-patient-detail__lbl">General Notes:</span>
            <PBTextArea aria-label="Patient detail general notes" rows={4} value={patient.generalNotes ?? ''} onChange={e => change({ generalNotes: e.target.value })} /></div>
        </div>
      </div>
      <div className="pb-patient-detail__histories">
        <div className="pb-groupbox pb-patient-detail__status" data-tutorial-id="host.mois.field.status-history">
          <PBBand>Status History</PBBand><PBDataWindow style={{ flex: 1 }} rows={patient.statusHistory ?? []}
            columns={[{ key: 'code', header: 'Status Code', width: 82 }, { key: 'effective', header: 'Effective', width: 75, align: 'center' }, { key: 'note', header: 'Note', width: 207 }]} empty=" " />
        </div>
        <div className="pb-groupbox pb-patient-detail__names" data-tutorial-id="host.mois.field.name-history">
          <PBBand right={<><CmdButton command="new-name-history" size="sm" aria-label="New name history" onClick={() => { change({ nameHistory: [{}, ...names] }); setNameIndex(0) }}>New</CmdButton>
            <CmdButton command="delete-name-history" size="sm" aria-label="Delete name history" disabled={!names.length} onClick={() => change({ nameHistory: names.filter((_, i) => i !== ni) })}>Delete</CmdButton></>}>Name History</PBBand>
          {names.map((n, i) => <div key={i} className={`pb-patient-detail__name ${i === ni ? 'is-current' : ''}`} onFocus={() => setNameIndex(i)} onMouseDown={() => setNameIndex(i)}>
            {(['first', 'middle', 'last'] as const).map(field => <label className={`pb-patient-detail__name-${field}`} key={field}><span>{field}:</span><PBInput aria-label={`Name history ${i + 1} ${field}`} value={n[field] ?? ''} onChange={e => changeName(i, field, e.target.value)} /></label>)}
            <label className="pb-patient-detail__name-expiry"><span>Expiry:</span><PBInput aria-label={`Name history ${i + 1} expiry`} value={n.expiry ?? ''} onChange={e => changeName(i, 'expiry', e.target.value)} /></label>
            <label className="pb-patient-detail__name-note"><span>Note:</span><PBTextArea aria-label={`Name history ${i + 1} note`} value={n.note ?? ''} onChange={e => changeName(i, 'note', e.target.value)} /></label>
            <span className="pb-patient-detail__name-count">{i + 1} or {names.length}</span>
          </div>)}
        </div>
      </div>
    </div>
    <div className="pb-groupbox pb-patient-detail__addresses" data-tutorial-id="host.mois.field.address-history">
      <PBBand right={<><CmdButton command="new-historical-address" size="sm" aria-label="New historical address" onClick={() => { change({ addressHistory: [{}, ...addresses] }); setAddressIndex(0) }}>New</CmdButton>
        <CmdButton command="delete-historical-address" size="sm" aria-label="Delete historical address" disabled={!addresses.length} onClick={() => change({ addressHistory: addresses.filter((_, i) => i !== ai) })}>Delete</CmdButton></>}>Historical Contact Information</PBBand>
      <div className="pb-patient-detail__record">
        <div className="pb-patient-detail__record-body">
          <div className="pb-patient-detail__expiry"><strong>Expiry Date:</strong>
            <PBInput aria-label="Historical address expiry" w={89} align="center" disabled={!addresses.length} value={addr.expiry ?? ''} onChange={e => changeAddress('expiry', e.target.value)} />
            <span className="pb-row__spacer" /><strong>This is {addresses.length ? ai + 1 : 0} of {addresses.length} records</strong></div>
          <div className="pb-patient-detail__contact-grid">
            {([
              [['address', 'Address:'], ['address2', ''], ['city', 'City:'], ['province', 'Province:'], ['postal', 'Postal Code:'], ['country', 'Country:']],
              [['home', 'Home:'], ['work', 'Work:'], ['other', 'Other:'], ['cell', 'Cell:'], ['ext', 'Ext.:'], ['fax', 'Fax:']],
              [['emailHome', 'eMail (H):'], ['emailWork', 'eMail (W):'], ['note', 'Note:']],
            ] as [keyof ChartAddressEntry, string][][]).map((fields, col) => fields.map(([field, label], row) => <Fragment key={field}>
              <span className="pb-patient-detail__clabel" style={{ gridColumn: col * 2 + 1, gridRow: row + 1 }}>{label}</span>
              {field === 'note'
                ? <PBTextArea aria-label={`Historical ${label.replace(':', '')}`} disabled={!addresses.length} value={addr[field] ?? ''} onChange={e => changeAddress(field, e.target.value)}
                  style={{ gridColumn: col * 2 + 2, gridRow: `${row + 1} / span 4`, width: '100%', height: '100%' }} />
                : <PBInput aria-label={`Historical ${field}`} disabled={!addresses.length} value={addr[field] ?? ''} onChange={e => changeAddress(field, e.target.value)}
                  className={`pb-patient-detail__c-${field}`} style={{ gridColumn: col * 2 + 2, gridRow: row + 1 }} />}
            </Fragment>))}
          </div>
        </div>
        {/* the record pager is the DataWindow's own vertical scroll bar */}
        <div className="pb-patient-detail__vscroll">
          <button type="button" aria-label="Previous historical address" disabled={ai === 0} onClick={() => setAddressIndex(ai - 1)}>
            <svg width="9" height="5" viewBox="0 0 9 5" aria-hidden><path d="M0.5 4.5 4.5 0.5 8.5 4.5" fill="none" stroke="currentColor" /></svg>
          </button>
          <span className="pb-patient-detail__vscroll-track">
            {addresses.length > 1 && <span className="pb-patient-detail__vscroll-thumb" style={{ top: `${(ai / addresses.length) * 100}%`, height: `${100 / addresses.length}%` }} />}
          </span>
          <button type="button" aria-label="Next historical address" disabled={ai >= addresses.length - 1} onClick={() => setAddressIndex(ai + 1)}>
            <svg width="9" height="5" viewBox="0 0 9 5" aria-hidden><path d="M0.5 0.5 4.5 4.5 8.5 0.5" fill="none" stroke="currentColor" /></svg>
          </button>
        </div>
      </div>
    </div>
    {lookup && <DemographicLookupDialog title={lookup.label} value={lookup.value}
      rows={[...new Set([...lookup.options, lookup.value].filter(Boolean))].map(term => ({ term, category: lookup.label.toUpperCase(), code: '', system: 'MOIS' } satisfies DemographicTerm))}
      onPick={r => { lookup.pick(r.term); setLookup(null) }} onClose={() => setLookup(null)} />}
  </div>
}
