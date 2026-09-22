import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePatient, usePatientRoster } from '../data/patient-context'
import { patientEdits, updatePatient } from '../data/patient-edits'
import { type Patient, type ChartAddressEntry } from '../data/patients'
import { PBButton, PBInput, PBTextArea, PBCheckbox, PBRadio, PBWindow, PBGroup, PBBand, PBDataWindow } from '../pb'

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** Child dialogs cover the host desktop, including the tree, without clipping. */
export function DemographicModal({ title, onClose, children, width = 620, height }: {
  title: string; onClose: () => void; children: ReactNode; width?: number; height?: number
}) {
  const anchor = useRef<HTMLSpanElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const [layer, setLayer] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => { setLayer(anchor.current?.closest<HTMLElement>('.pb-desktop') ?? anchor.current?.parentElement ?? null) }, [])
  useEffect(() => {
    if (!layer) return
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.focus()
    return () => previous?.focus()
  }, [layer])
  return <><span hidden ref={anchor} />{layer && createPortal(<div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 90 }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
      style={{ width: `min(${width}px, 96%)` }} onKeyDown={e => {
        if (e.key === 'Escape') { e.stopPropagation(); onClose() }
        if (e.key === 'Tab') {
          const fields = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea, select, [tabindex="0"]') ?? [])]
          const first = fields[0], last = fields[fields.length - 1]
          if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last?.focus() }
          if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
        }
      }}>
      <PBWindow child controls={false} title={title} onClose={onClose} style={{ width: '100%', height, maxHeight: '90vh' }}>{children}</PBWindow>
    </div>
  </div>, layer)}</>
}

export function DialogButtons({ children }: { children: ReactNode }) {
  return <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: 16, flex: 'none' }}>{children}</div>
}

export function PatientPhotoDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const [photo, setPhoto] = useState(patient.photo ?? '')
  const [error, setError] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const request = useRef(0)
  useEffect(() => () => { request.current++ }, [])
  return <DemographicModal title="View Or Update Patient Photo" width={740} onClose={onClose}>
    <div style={{ padding: 12 }}><PBBand>Photo</PBBand>
      <div className="pb-row" style={{ alignItems: 'center', gap: 12, padding: 14 }}>
        <div style={{ width: '50%' }}>
          <div style={{ height: 250, border: '1px dashed #777', display: 'grid', placeItems: 'center' }}>
            {photo ? <img src={photo} alt="Patient photo" style={{ width: '100%', height: '100%', objectFit: 'contain', minHeight: 0 }} /> : 'No Photo Selected'}
          </div>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Patient photo file" onChange={async e => {
            const f = e.target.files?.[0]; if (!f) return
            const token = ++request.current
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024) { setError('Choose a PNG, JPEG or WebP image under 5 MB.'); return }
            const reader = new FileReader()
            reader.onload = () => { if (request.current === token) { setPhoto(String(reader.result)); setError('') } }
            reader.onerror = () => { if (request.current === token) setError('The image could not be read.') }
            reader.readAsDataURL(f)
          }} />
          <DialogButtons><PBButton onClick={() => { if (file.current) { file.current.value = ''; file.current.click() } }}>Update Photo</PBButton>
            <PBButton disabled={!photo} onClick={() => { request.current++; setPhoto('') }}>Remove Photo</PBButton></DialogButtons>
          {error && <span role="alert">{error}</span>}
        </div>
        <div style={{ lineHeight: 2, flex: 1 }}>
          <div>Chart No.:&nbsp; {patient.chart}</div><div>{patient.first} {patient.middle} {patient.last}</div>
          <div>{patient.address}</div><div>{patient.address2}</div><div>{patient.city}, {patient.province}&nbsp; {patient.postal}</div>
          <div>DOB: {patient.dob}&nbsp; Age: {patient.age}&nbsp; Gender: {patient.gender}</div>
          <div>Home: {patient.home}&nbsp; Work: {patient.work}&nbsp; Ext.: {patient.workExt}</div>
          <div>BCHN: {patient.bchn}</div><div>Insurance: {patient.insuranceBy} {patient.insurance} {patient.dep}</div>
        </div>
      </div></div>
    <DialogButtons><PBButton onClick={() => { updatePatient(patient.chart, { photo }); onClose() }}>Ok</PBButton><PBButton onClick={onClose}>Cancel</PBButton></DialogButtons>
  </DemographicModal>
}

export function MspEligibilityDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const [serviceDate, setServiceDate] = useState(today)
  const [attempted, setAttempted] = useState(false)
  const [source, setSource] = useState(false)
  return <DemographicModal title="MSP Eligibility Check" width={680} height={590} onClose={onClose}>
    <div style={{ padding: 12, display: 'grid', gap: 14 }}>
      <PBGroup title="Patient Information"><div>Patient:&nbsp; <strong>{patient.last}, {patient.first} {patient.middle}</strong></div>
        <div>PHN: <strong>{patient.bchn}</strong>&nbsp; DoB: <strong>{patient.dob}</strong>&nbsp; Gender: <strong>{patient.gender}</strong></div></PBGroup>
      <PBGroup title="MSP Login Information"><div className="pb-form" style={{ gridTemplateColumns: '80px 1fr auto' }}>
        <span>Username:</span><PBInput aria-label="MSP username" disabled value="" readOnly /><span />
        <span>Password:</span><PBInput aria-label="MSP password" type="password" disabled value="" readOnly />
        <PBButton disabled title="Requires a connected MSP service">Change Password...</PBButton>
        <span /><span>No MSP service connected.</span><PBCheckbox label="Save Settings" disabled checked={false} />
      </div></PBGroup>
      <PBGroup title="Eligibility For Date"><label>Date of Service:&nbsp; <PBInput aria-label="MSP date of service" value={serviceDate} onChange={e => setServiceDate(e.target.value)} /></label></PBGroup>
    </div>
    <div style={{ margin: '0 12px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PBBand right={<PBCheckbox label="Show Source Response" checked={source} onChange={e => setSource(e)} />}>Outcome</PBBand>
      <PBDataWindow style={{ flex: 1, background: 'white' }} gutter={false} rows={[]} columns={[{ key: 'result', header: 'Result', width: 180 }, { key: 'message', header: 'MSP Message' }]}
        empty={attempted ? 'Eligibility was not checked. Connect an MSP service to retrieve a result.' : ' '} />
      {source && <PBTextArea aria-label="MSP source response" value="" readOnly placeholder="No response received." />}
    </div>
    <DialogButtons><PBButton onClick={() => setAttempted(true)}>Check Eligibility</PBButton><PBButton onClick={onClose}>Close</PBButton></DialogButtons>
  </DemographicModal>
}

export type DemographicTerm = { term: string; category: string; code: string; system: string; alternates?: string[] }
// The only city code/alternate transcribed in the supplied lookup screenshot.
export const geographicTerms: DemographicTerm[] = [{ term: 'PRINCE GEORGE', category: 'CITY', code: 'JBLVS', system: 'PP-BC', alternates: ['PRG'] }]

export function DemographicLookupDialog({ title, value, rows: source, city, onPick, onClose }: {
  title: string; value: string; rows: DemographicTerm[]; city?: boolean; onPick: (row: DemographicTerm) => void; onClose: () => void
}) {
  const p = usePatient()
  const [search, setSearch] = useState(value)
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState('200')
  const [systems, setSystems] = useState(city ? ['PP-BC'] : [...new Set(source.map(r => r.system))])
  const [categories, setCategories] = useState(city ? ['CITY', 'COMMUNITY', 'DISTRICT MUNICIPALITY'] : [...new Set(source.map(r => r.category))])
  const [status, setStatus] = useState('Active')
  const [cur, setCur] = useState(0)
  const [savedSettings, setSavedSettings] = useState<{ systems: string[]; categories: string[] } | null>(null)
  const rows = source.filter(r => systems.includes(r.system) && categories.includes(r.category)
    && [r.term, ...(r.alternates ?? [])].some(t => t.toUpperCase().includes(search.toUpperCase()))
    && r.code.includes(code.toUpperCase()) && r.category.includes(category.toUpperCase()) && status !== 'Inactive').slice(0, Math.max(0, Number(limit) || 0))
  const selected = rows[Math.min(cur, Math.max(0, rows.length - 1))]
  const toggle = (list: string[], item: string) => list.includes(item) ? list.filter(x => x !== item) : [...list, item]
  return <DemographicModal title={`MOIS - Universal Search Window for Chart Number: ${p.chart} ${p.first} ${p.last} — ${title}`} width={1000} height={640} onClose={onClose}>
    <div className="pb-row" style={{ alignItems: 'stretch', padding: 4, gap: 4 }}>
      <div style={{ width: '25%' }}><PBBand>Select from Code System(s)</PBBand>
        {(city ? ['PP-BC', 'PP-AB', 'PP-MB'] : [...new Set(source.map(r => r.system))]).map(s => <div key={s}><PBCheckbox label={s.replace('PP-', '')} checked={systems.includes(s)} onChange={() => setSystems(toggle(systems, s))} /></div>)}</div>
      <div style={{ width: '26%' }}><PBBand>Filter to Reference Set(s)</PBBand>
        {(city ? ['CITY', 'COMMUNITY', 'DISTRICT MUNICIPALITY'] : [...new Set(source.map(r => r.category))]).map(c => <div key={c}><PBCheckbox label={c} checked={categories.includes(c)} onChange={() => setCategories(toggle(categories, c))} /></div>)}</div>
      <div style={{ flex: 1 }}><PBBand>Parameters: Code Systems</PBBand>
        <label>Code is <PBInput aria-label="Lookup code" value={code} onChange={e => setCode(e.target.value)} /></label><br />
        <label>Category is like <PBInput aria-label="Lookup category" value={category} onChange={e => setCategory(e.target.value)} /></label>
        <div className="pb-row">Status is {['Active', 'Inactive', 'Either'].map(s => <PBRadio key={s} name="lookup-status" label={s} checked={status === s} onChange={() => setStatus(s)} />)}</div>
        <label>Limit list to <PBInput aria-label="Lookup limit" w={64} value={limit} onChange={e => setLimit(e.target.value)} /> records</label>
      </div>
    </div>
    <div className="pb-row" style={{ padding: 4 }}><span>Search For:</span><PBInput aria-label={`${title} search`} style={{ flex: 1 }} value={search} onChange={e => { setSearch(e.target.value); setCur(0) }} /><PBButton onClick={() => setCur(0)}>Search</PBButton></div>
    <div style={{ display: 'flex', flex: 1, minHeight: 0, padding: 4 }}><PBDataWindow style={{ flex: 1, background: 'white' }} rows={rows} current={cur} onCurrentChange={setCur} onActivate={onPick}
      columns={[{ key: 'term', header: 'Term' }, { key: 'category', header: 'Category', width: 170 }, { key: 'code', header: 'Code', width: 90 }, { key: 'system', header: 'Code System', width: 120 }]}
      empty="No matching entries in the available lookup data." /></div>
    <div style={{ padding: 6 }}>Rows: {rows.length}</div><PBBand>Alternate Terms [{selected?.alternates?.length ?? 0}]</PBBand>
    <div style={{ background: 'white', padding: 6, minHeight: 54 }}>{selected?.alternates?.join(', ')}</div>
    <DialogButtons><PBButton onClick={() => setSavedSettings({ systems, categories })}>Save My Default Settings</PBButton>
      <PBButton onClick={() => { setSystems(savedSettings?.systems ?? (city ? ['PP-BC'] : [...new Set(source.map(r => r.system))])); setCategories(savedSettings?.categories ?? (city ? ['CITY', 'COMMUNITY', 'DISTRICT MUNICIPALITY'] : [...new Set(source.map(r => r.category))])); setSearch(''); setCode(''); setCategory(''); setStatus('Active'); setLimit('200') }}>Restore Settings</PBButton>
      <PBButton disabled={!selected} onClick={() => selected && onPick(selected)}>Select</PBButton><PBButton onClick={onClose}>Cancel</PBButton></DialogButtons>
  </DemographicModal>
}

export function AddressExpiryDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const [expiry, setExpiry] = useState(today)
  const [error, setError] = useState('')
  return <DemographicModal title="Address Expiry Date" width={420} onClose={onClose}>
    <div style={{ padding: 20, textAlign: 'center' }}><strong>Would you like to archive the patient's current address?</strong>
      <p>If yes, please select an expiry date:</p><label>Expiry Date:&nbsp; <PBInput aria-label="Address expiry date" w={105} value={expiry} onChange={e => setExpiry(e.target.value)} /></label>
      {error && <p role="alert">{error}</p>}</div>
    <DialogButtons><PBButton onClick={() => {
      const iso = expiry.replace(/[/.]/g, '-')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(iso)) || new Date(iso).toISOString().slice(0, 10) !== iso) { setError('Enter a valid date as YYYY.MM.DD.'); return }
      updatePatient(patient.chart, { addressHistory: [{ ...addressOf(patient), expiry }, ...(patient.addressHistory ?? [])] }); onClose()
    }}>Ok</PBButton><PBButton onClick={onClose}>Cancel</PBButton></DialogButtons>
  </DemographicModal>
}

export function addressOf(p: Patient): ChartAddressEntry {
  return { address: p.address, address2: p.address2, city: p.city, province: p.province, postal: p.postal, country: p.country,
    home: p.home, work: p.work, cell: p.cell, other: p.pager, ext: p.workExt, fax: p.fax, emailHome: p.emailHome, emailWork: p.emailWork }
}

export function AddressWizardDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState<Patient[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const roster = usePatientRoster()
  const available = roster.filter(p => p.chart !== patient.chart && !members.some(m => m.chart === p.chart)
    && `${p.chart} ${p.last} ${p.first}`.toLowerCase().includes(search.toLowerCase()))
  const [current, setCurrent] = useState(0)
  const columns = [{ key: 'chart', header: 'Chart', width: 60 }, { key: 'last', header: 'Last Name', width: 95 }, { key: 'first', header: 'First Name', width: 90 },
    { key: 'middle', header: 'Middle Name', width: 90 }, { key: 'address', header: 'Address', width: 130 }, { key: 'address2', header: 'Address', width: 110 },
    { key: 'city', header: 'City', width: 100 }, { key: 'province', header: 'Province', width: 60 }, { key: 'country', header: 'Country', width: 70 }, { key: 'postal', header: 'Postal Code', width: 80 }]
  return <DemographicModal title="Change Address Wizard" width={1000} height={620} onClose={onClose}>
    <div style={{ padding: 14 }}><PBBand>Current Patient Data</PBBand><div className="pb-row" style={{ alignItems: 'stretch', gap: 18, padding: 12 }}>
      <PBGroup title="Patient" style={{ flex: 1 }}><div className="pb-form" style={{ gridTemplateColumns: '85px 1fr' }}>
        <span>Chart No.:</span><PBInput w={100} value={patient.chart} readOnly />
        <span>Patient Name:</span><div className="pb-row"><PBInput w="40%" value={patient.last} readOnly /><PBInput w="30%" value={patient.first} readOnly /><PBInput w="30%" value={patient.middle} readOnly /></div>
      </div></PBGroup>
      <PBGroup title="Current Address" style={{ flex: 1 }}><div className="pb-form" style={{ gridTemplateColumns: '70px 1fr' }}>
        <span>Address:</span><PBInput value={patient.address ?? ''} readOnly /><span>Address:</span><PBInput value={patient.address2 ?? ''} readOnly />
        <span>City:</span><div className="pb-row"><PBInput w="55%" value={patient.city ?? ''} readOnly /><span>Province:</span><PBInput w="25%" value={patient.province ?? ''} readOnly /></div>
        <span>Postal Code:</span><div className="pb-row"><PBInput w="55%" value={patient.postal ?? ''} readOnly /><span>Country:</span><PBInput w="25%" value={patient.country ?? ''} readOnly /></div>
        <span>Home:</span><PBInput w={115} value={patient.home ?? ''} readOnly />
      </div></PBGroup>
    </div></div>
    <div style={{ margin: '0 14px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <PBBand>{adding ? 'Find / Add Patient to List' : "Family Members / Other (pre-loaded from the patient's Family Hx list)"}</PBBand>
      {adding && <label>Search: <PBInput aria-label="Find address recipient" value={search} onChange={e => { setSearch(e.target.value); setCurrent(0) }} /></label>}
      <PBDataWindow style={{ flex: 1, background: 'white' }} hscroll rowFill={p => !adding && selected.includes(p.chart) ? '#a0e79b' : undefined} rows={(adding ? available : members).map(p => ({ ...p, ...patientEdits(p.chart) }))} columns={adding ? columns : [
        { key: 'update', header: 'Update', width: 55, render: (p: Patient) => <PBCheckbox label={`Update chart ${p.chart}`} checked={selected.includes(p.chart)} onChange={() => setSelected(v => v.includes(p.chart) ? v.filter(c => c !== p.chart) : [...v, p.chart])} /> }, ...columns,
      ]} current={current} onCurrentChange={setCurrent} empty="No linked family charts with address records are available. Use Find / Add Patient to select recipients." />
    </div>
    <DialogButtons>{adding ? <><PBButton disabled={!available[current]} onClick={() => {
      const p = available[current]; if (!p) return; setMembers(v => [...v, p]); setSelected(v => [...v, p.chart]); setAdding(false); setCurrent(0)
    }}>Add Patient</PBButton><PBButton onClick={() => setAdding(false)}>Back</PBButton></> : <>
      <PBButton onClick={() => { setAdding(true); setCurrent(0) }}>Find / Add Patient to List</PBButton>
      <PBButton disabled={!selected.length} onClick={() => {
        for (const chart of selected) updatePatient(chart, { address: patient.address, address2: patient.address2, city: patient.city, province: patient.province, country: patient.country, postal: patient.postal, home: patient.home })
        onClose()
      }}>Update</PBButton></>}<PBButton onClick={onClose}>Cancel</PBButton></DialogButtons>
  </DemographicModal>
}
