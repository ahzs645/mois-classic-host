import { useState } from 'react'
import { usePatient } from '../data/patient-context'
import { updatePatient } from '../data/patient-edits'
import type { ChartAddressEntry, ChartNameEntry, Patient } from '../data/patients'
import { PBBand, PBButton, PBInput, PBLookup, PBSelect, PBTextArea, PBCheckbox, PBDataWindow } from '../pb'
import { DemographicLookupDialog, type DemographicTerm } from './DemographicDialogs'
import { CmdButton } from './CmdButton'
import './patient-detail.css'

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
  const textField = (key: keyof Patient, label: string, options?: string[]) => {
    const value = String(patient[key] ?? '')
    return <label className="pb-patient-detail__field" key={key}><span>{label}:</span>{options
      ? <PBSelect aria-label={label} options={[...new Set(['', ...options, value])]} value={value} onChange={e => change({ [key]: e.target.value })} />
      : <PBLookup name={`patient-detail-${key}`} w="100%" value={value} onChange={v => change({ [key]: v })}
        onDots={() => setLookup({ label, value, options: value ? [value] : [], pick: v => change({ [key]: v }) })} />}</label>
  }
  return <div className="pb-patient-detail" data-tutorial-id="host.mois.patient-detail">
    <div className="pb-patient-detail__upper">
      <div className="pb-groupbox pb-patient-detail__background"><PBBand>Background Information</PBBand>
        <div style={{ padding: 6 }}>
          {/* self, father, mother — the order art. 301177 (`13d38c58…png`,
              `e3b55814…png`) and the header comment in DemographicsView give */}
          {(['self', 'father', 'mother'] as const).map(who => {
            const ethnicity = patient.ethnicity?.[who] ?? {}
            const set = (patch: Partial<typeof ethnicity>) => change({ ethnicity: { ...patient.ethnicity, [who]: { ...ethnicity, ...patch } } })
            return <div className="pb-row" key={who} style={{ marginBottom: 4 }}><span>Ethnicity:</span>
              <PBInput aria-label={`${who} ethnicity type`} w={54} value={ethnicity.type ?? ''} onChange={e => set({ type: e.target.value })} />
              <PBLookup name={`ethnicity-${who}`} w="100%" value={ethnicity.race ?? ''} onChange={race => set({ race })}
                onDots={() => setLookup({ label: `${who} ethnicity`, value: ethnicity.race ?? '', options: ['CANADIAN INDIAN (FIRST NATIONS)', 'LATIN AMERICAN HISPANIC', 'INUIT'], pick: race => set({ race }) })} />
              <PBCheckbox label="Self ID'd" checked={ethnicity.selfIdd ?? false} onChange={e => set({ selfIdd: e })} />
            </div>
          })}
          <div className="pb-row" style={{ margin: '8px 0' }}>
            {(['preferred', 'genotypic'] as const).map(kind => <label key={kind} style={{ display: 'flex', gap: 4 }}>
              <span className={patient.genderDesignations?.[kind] ? 'pb-flag' : undefined}>{kind === 'preferred' ? 'Preferred' : 'Genotypic'} Gender:</span>
              <PBSelect aria-label={`${kind} gender`} w={48} options={['', 'M', 'F', ...(kind === 'preferred' ? ['N'] : ['XO', 'XXY', 'XYY'])]}
                value={patient.genderDesignations?.[kind] ?? ''} onChange={e => change({ genderDesignations: { ...patient.genderDesignations, [kind]: e.target.value } })} />
            </label>)}
          </div>
          {textField('countryOrigin', 'Country Origin')}{textField('firstLanguage', 'First Language')}
          <label className="pb-patient-detail__field"><span>Religion:</span><PBInput aria-label="Religion" value={patient.religion ?? ''} onChange={e => change({ religion: e.target.value })} /></label>
          {textField('firstNationStatus', 'First Nation Status', ['Status Indian', 'Non-Status', 'Not Applicable'])}
          <div className="pb-row" style={{ margin: '8px 0' }}><span>Patient Adopted:</span><PBCheckbox label="Yes" checked={patient.adopted ?? false} onChange={e => change({ adopted: e })} />
            <span>Multi-Gestation:</span><PBCheckbox label="Yes" checked={patient.multiGestation ?? false} onChange={e => change({ multiGestation: e })} /></div>
          {textField('relationshipStatus', 'Relationship', ['Married', 'Single', 'Separated', 'Common Law', 'Widowed'])}
          {textField('educationLevel', 'Education Level', ['University - bachelor degree', 'POST SECONDARY CERTIFICATE', 'SECONDARY', 'NONE'])}
          {textField('socioeconomic', 'Socioeconomic')}{textField('livingArrangements', 'Living Arrangements')}
          <label className="pb-patient-detail__field"><span>General Notes:</span><PBTextArea aria-label="Patient detail general notes" rows={4} value={patient.generalNotes ?? ''} onChange={e => change({ generalNotes: e.target.value })} /></label>
        </div>
      </div>
      <div className="pb-patient-detail__histories">
        <div className="pb-groupbox" data-tutorial-id="host.mois.field.status-history" style={{ flex: '0 0 34%', minHeight: 100, display: 'flex', flexDirection: 'column' }}>
          <PBBand>Status History</PBBand><PBDataWindow style={{ flex: 1 }} gutter={false} rows={patient.statusHistory ?? []}
            columns={[{ key: 'code', header: 'Status Code', width: 100 }, { key: 'effective', header: 'Effective', width: 100 }, { key: 'note', header: 'Note' }]} empty=" " />
        </div>
        <div className="pb-groupbox" data-tutorial-id="host.mois.field.name-history" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <PBBand right={<><CmdButton command="new-name-history" size="sm" aria-label="New name history" onClick={() => { change({ nameHistory: [{}, ...names] }); setNameIndex(0) }}>New</CmdButton>
            <CmdButton command="delete-name-history" size="sm" aria-label="Delete name history" disabled={!names.length} onClick={() => change({ nameHistory: names.filter((_, i) => i !== ni) })}>Delete</CmdButton></>}>Name History</PBBand>
          {names.map((n, i) => <div key={i} className={`pb-patient-detail__name ${i === ni ? 'is-current' : ''}`} onFocus={() => setNameIndex(i)} onMouseDown={() => setNameIndex(i)}>
            {(['first', 'middle', 'last'] as const).map(field => <label className={`pb-patient-detail__name-${field}`} key={field}><span>{field}:</span><PBInput aria-label={`Name history ${i + 1} ${field}`} value={n[field] ?? ''} onChange={e => changeName(i, field, e.target.value)} /></label>)}
            <label className="pb-patient-detail__name-expiry"><span>Expiry:</span><PBInput aria-label={`Name history ${i + 1} expiry`} value={n.expiry ?? ''} onChange={e => changeName(i, 'expiry', e.target.value)} /></label>
            <label className="pb-patient-detail__name-note"><span>Note:</span><PBTextArea aria-label={`Name history ${i + 1} note`} value={n.note ?? ''} onChange={e => changeName(i, 'note', e.target.value)} /></label>
            <span className="pb-patient-detail__name-count">{i + 1} of {names.length}</span>
          </div>)}
        </div>
      </div>
    </div>
    <div className="pb-groupbox pb-patient-detail__addresses" data-tutorial-id="host.mois.field.address-history">
      <PBBand right={<><PBButton size="sm" aria-label="New historical address" onClick={() => { change({ addressHistory: [{}, ...addresses] }); setAddressIndex(0) }}>New</PBButton>
        <PBButton size="sm" aria-label="Delete historical address" disabled={!addresses.length} onClick={() => change({ addressHistory: addresses.filter((_, i) => i !== ai) })}>Delete</PBButton></>}>Historical Contact Information</PBBand>
      <div className="pb-row" style={{ padding: '3px 8px', background: 'var(--pb-dw-header)' }}><strong>Expiry Date:</strong>
        <PBInput aria-label="Historical address expiry" w={100} disabled={!addresses.length} value={addr.expiry ?? ''} onChange={e => changeAddress('expiry', e.target.value)} />
        <span className="pb-row__spacer" /><strong>This is {addresses.length ? ai + 1 : 0} of {addresses.length} records</strong>
        <PBButton aria-label="Previous historical address" disabled={ai === 0} onClick={() => setAddressIndex(ai - 1)}>↑</PBButton>
        <PBButton aria-label="Next historical address" disabled={ai >= addresses.length - 1} onClick={() => setAddressIndex(ai + 1)}>↓</PBButton></div>
      <div className="pb-patient-detail__contact-grid">
        {([
          [['address', 'Address'], ['address2', 'Address'], ['city', 'City'], ['province', 'Province'], ['postal', 'Postal Code'], ['country', 'Country']],
          [['home', 'Home'], ['work', 'Work'], ['other', 'Other'], ['cell', 'Cell'], ['ext', 'Ext.'], ['fax', 'Fax']],
          [['emailHome', 'eMail (H)'], ['emailWork', 'eMail (W)'], ['note', 'Note']],
        ] as [keyof ChartAddressEntry, string][][]).map((fields, index) => <div key={index}>{fields.map(([field, label]) => <label className="pb-patient-detail__field" key={field}><span>{label}:</span>
          {field === 'note' ? <PBTextArea aria-label={`Historical ${label}`} disabled={!addresses.length} value={addr[field] ?? ''} onChange={e => changeAddress(field, e.target.value)} rows={4} />
            : <PBInput aria-label={`Historical ${field}`} disabled={!addresses.length} value={addr[field] ?? ''} onChange={e => changeAddress(field, e.target.value)} />}</label>)}</div>)}
      </div>
    </div>
    {lookup && <DemographicLookupDialog title={lookup.label} value={lookup.value}
      rows={[...new Set([...lookup.options, lookup.value].filter(Boolean))].map(term => ({ term, category: lookup.label.toUpperCase(), code: '', system: 'MOIS' } satisfies DemographicTerm))}
      onPick={r => { lookup.pick(r.term); setLookup(null) }} onClose={() => setLookup(null)} />}
  </div>
}
