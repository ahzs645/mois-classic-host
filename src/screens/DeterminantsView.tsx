import { useState } from 'react'
import {
  PBBand, PBButton, PBCommandRow, PBDataWindow, PBGroupBox, PBIdentityStrip,
  PBInput, PBLookup, PBTabs, PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'
import { usePatient } from '../data/patient-context'
import { determinantTabs } from '../data/mois'

/* Determinants of Health — four domain tabs, each a current-status grid over
   a history grid with a detail panel underneath. Transcribed from the
   tdt_occupation / tdt_education evidence captures. */

const TABS = ['Employment', 'Education', 'Housing', 'Socioeconomic']

const statusColumns: PBColumn<Record<string, string>>[] = [
  { key: 'collected', header: 'Collected', width: 92 },
  { key: 'name', header: 'Name', width: 260 },
  { key: 'value', header: 'Most Recent Value', width: 220 },
  { key: 'units', header: 'Units', width: 74 },
  { key: 'flag', header: 'Flag', width: 56 },
  { key: 'ranges', header: 'Ref. Ranges' },
]

export function DeterminantsView() {
  const patient = usePatient()
  const [tab, setTab] = useState('Employment')
  const cfg = determinantTabs[tab]

  return (
    <>
      <PBViewHeader title="Determinants of Health" />
      <PBCommandRow
        commands={[
          { label: 'New Record' }, { label: 'Delete Record' },
          { label: 'Save', disabled: true }, { label: 'Undo', disabled: true }, { label: 'Refresh' },
        ]}
      />
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:' },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: '2025.01.01' },
        ]}
        encounter="NO ENCOUNTER"
      />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBTabs tabs={TABS} active={tab} onChange={setTab} compact>
          {/* current status, with the trend affordances PB puts in the band */}
          <PBBand
            right={<><button className="pb-link">Trend</button><button className="pb-link">Less…</button></>}
          >
            <PBButton size="sm" style={{ minWidth: 68, marginRight: 8 }}>Update</PBButton>
            {cfg.statusBand}
          </PBBand>
          <div style={{ height: 68, display: 'flex', padding: '0 6px 3px' }}>
            <PBDataWindow flush gutter={false} columns={statusColumns} rows={cfg.status} empty=" " />
          </div>

          <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
            {cfg.historyBand}
          </PBBand>
          <div className="pb-row" style={{ padding: '3px 6px', gap: 6 }}>
            <PBInput w={300} /><PBInput w={190} />
          </div>
          <div style={{ height: 150, display: 'flex', padding: '0 6px' }}>
            <PBDataWindow
              columns={cfg.columns as PBColumn<Record<string, string>>[]}
              rows={cfg.rows}
              empty={`No ${cfg.historyBand.toLowerCase()} on file.`}
            />
          </div>
          {cfg.total && (
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              {cfg.total.label}&nbsp;&nbsp;&nbsp;&nbsp;{cfg.total.value}
            </div>
          )}

          {/* the detail panel: domain fields on the left, notes on the right */}
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 6, padding: '2px 6px 6px' }}>
            <PBGroupBox title={cfg.detailBand} style={{ width: 430, flex: 'none' }}>
              <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '96px 1fr' }}>
                {cfg.fields.map((f) => (
                  <Field key={f.label} label={f.label} kind={f.kind} w={f.w} value={f.value} pair={f.pair} />
                ))}
              </div>
            </PBGroupBox>
            <PBGroupBox title="General Notes" style={{ flex: '1 1 auto', minWidth: 0 }}>
              <PBTextArea rows={7} w="100%" />
            </PBGroupBox>
          </div>
        </PBTabs>
      </div>
    </>
  )
}

function Field({
  label, kind, w, value, pair,
}: {
  label: string
  kind: 'text' | 'lookup'
  w?: number
  value?: string
  pair?: { label: string; w?: number }
}) {
  const control = kind === 'lookup'
    ? <PBLookup w={w ?? '100%'} defaultValue={value} />
    : <PBInput w={w ?? '100%'} defaultValue={value} />
  return (
    <>
      <span className="pb-form__label">{label}</span>
      {pair ? (
        <div className="pb-row">
          {control}
          <span style={{ marginLeft: 8 }}>{pair.label}</span>
          <PBInput w={pair.w ?? 120} />
        </div>
      ) : control}
    </>
  )
}
