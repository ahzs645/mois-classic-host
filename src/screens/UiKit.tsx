import { useState } from 'react'
import {
  PBBand, PBButton, PBCaption, PBCheckbox, PBCommandRow, PBDataWindow, PBDropField,
  PBGroupBox, PBInput, PBLookup, PBMenuBar, PBPatientBannerBlue, PBPatientBannerYellow,
  PBMessageBox, PBRadio, PBSection, PBSelect, PBSlider, PBSpinner, PBStatusBar,
  PBSummaryBand, PBTabs, PBTextArea, PBTree, PBViewHeader, PBWindow,
  IconFolder, IconIdCard, type PBRowStatus, type PBTreeNode,
} from '../pb'
import { THEMES, type PBTheme } from '../data/mois'

/* A gallery of every control in the kit, laid out the way a PowerBuilder
   style guide would be. Reachable at #kit. */

const tree: PBTreeNode[] = [
  { id: 'a', label: 'Parent Node', icon: <IconIdCard />, children: [
    { id: 'a1', label: 'Child One', icon: <IconFolder /> },
    { id: 'a2', label: 'Child Two', icon: <IconFolder />, children: [
      { id: 'a2a', label: 'Grandchild', icon: <IconFolder /> },
    ]},
    { id: 'a3', label: 'Child Three', icon: <IconFolder /> },
  ]},
]

const swatches: [string, string][] = [
  ['--pb-navy', 'view header'],
  ['--pb-band', 'section band'],
  ['--pb-face', 'dialog face'],
  ['--pb-dw-header', 'grid header'],
  ['--pb-dw-select', 'current row'],
  ['--pb-dw-alert', 'status row'],
  ['--pb-yellow', 'patient banner'],
  ['--pb-banner-bottom', 'banner lower'],
  ['--pb-summary-band', 'summary strip'],
  ['--pb-link', 'hyperlink'],
]

export function UiKit() {
  const [tab, setTab] = useState('Controls')
  const [expanded, setExpanded] = useState(new Set(['a', 'a2']))
  const [sel, setSel] = useState('a2')
  const [radio, setRadio] = useState('One')
  const [slider, setSlider] = useState(6)
  const [spin, setSpin] = useState(4)
  const [theme, setTheme] = useState<PBTheme>('')
  const [msg, setMsg] = useState<'info' | 'warn' | 'error' | 'question' | null>(null)
  const [answer, setAnswer] = useState('')

  const toggle = (id: string) => {
    const n = new Set(expanded); n.has(id) ? n.delete(id) : n.add(id); setExpanded(n)
  }

  return (
    <div className={`pb-root ${theme}`.trim()}>
      <div className="pb-desktop" style={{ overflow: 'auto', padding: 20 }}>
        <PBWindow title="pb — PowerBuilder Classic UI Kit" style={{ maxWidth: 1180, margin: '0 auto', minHeight: 760 }}>
          <PBMenuBar items={[
            { label: 'File', menu: [{ label: 'Close' }] },
            { label: 'View', menu: [{ label: 'Controls' }, { label: 'DataWindow' }, { label: 'Colours' }] },
            { label: 'Help', menu: [{ label: 'About…' }] },
          ]} />
          <PBViewHeader
            title="Component Gallery"
            meta="every control in the kit"
            right={
              <span className="pb-row" style={{ color: '#fff' }}>
                Appearance:
                <PBSelect
                  options={THEMES.map((t) => t.label)}
                  w={280}
                  value={THEMES.find((t) => t.id === theme)!.label}
                  onChange={(e) =>
                    setTheme(THEMES.find((t) => t.label === e.target.value)!.id)
                  }
                />
              </span>
            }
          />
          <PBCommandRow commands={[
            { label: 'New' }, { label: 'Save' }, { label: 'Delete', disabled: true },
            null, { label: 'Refresh' }, { label: 'Print' },
          ]} />

          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 4 }}>
            <PBTabs tabs={['Controls', 'DataWindow', 'Banners', 'Colours']} active={tab} onChange={setTab} face>
              {tab === 'Controls' && (
                <div style={{ display: 'flex', gap: 8, padding: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <PBGroupBox title="Text Entry" style={{ width: 420 }}>
                    <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '112px 1fr' }}>
                      <span className="pb-form__label">Single line:</span>
                      <PBInput defaultValue="ordinary edit field" />
                      <span className="pb-form__label">Protected:</span>
                      <PBInput defaultValue="grey fill, black text" readOnly />
                      <span className="pb-form__label pb-form__label--dim">Disabled:</span>
                      <PBInput defaultValue="pale fill, grey text" disabled />
                      <span className="pb-form__label">Centred:</span>
                      <PBInput w={92} align="center" defaultValue="2026.08.10" />
                      <span className="pb-form__label">Lookup:</span>
                      <PBLookup defaultValue="press the … button" />
                      <span className="pb-form__label">Drop field:</span>
                      <PBDropField defaultValue="editable DDDW" />
                      <span className="pb-form__label">Select:</span>
                      <PBSelect options={['One Time', 'Initiation', 'Maintenance']} w={160} />
                      <span className="pb-form__label" style={{ alignSelf: 'start' }}>Multi line:</span>
                      <PBTextArea rows={3} />
                    </div>
                  </PBGroupBox>

                  <PBGroupBox title="Choices &amp; Commands" style={{ width: 330 }}>
                    <div className="pb-stack">
                      <PBCaption>Checkboxes</PBCaption>
                      <div className="pb-row pb-row--gap-lg">
                        <PBCheckbox label="Checked" checked />
                        <PBCheckbox label="Unchecked" />
                        <PBCheckbox label="Disabled" disabled />
                      </div>
                      <PBCaption>Radio buttons</PBCaption>
                      <div className="pb-row pb-row--gap-lg">
                        {['One', 'Two', 'Three'].map((r) => (
                          <PBRadio key={r} name="kit" label={r} checked={radio === r} onChange={() => setRadio(r)} />
                        ))}
                      </div>
                      <PBCaption>Push buttons</PBCaption>
                      <div className="pb-row">
                        <PBButton>Normal</PBButton>
                        <PBButton wide>Wide button</PBButton>
                        <PBButton disabled>Disabled</PBButton>
                      </div>
                      <div className="pb-row"><PBButton size="sm">Small</PBButton><button className="pb-link">Hyperlink</button></div>
                      <PBCaption>Trackbar</PBCaption>
                      <div className="pb-row">
                        <PBSlider value={slider} onChange={setSlider} style={{ width: 180 }} />
                        <PBInput w={40} align="center" value={String(slider)} readOnly />
                        <span>(/10)</span>
                      </div>
                      <PBCaption>Spinner</PBCaption>
                      <div className="pb-row">
                        <PBSpinner value={spin} min={0} max={99} onChange={setSpin} w={78} />
                        <span style={{ color: 'var(--pb-text-dim)' }}>XP.css chevrons</span>
                      </div>
                      <PBCaption>Message boxes</PBCaption>
                      <div className="pb-row pb-row--wrap">
                        {(['info', 'question', 'warn', 'error'] as const).map((k) => (
                          <PBButton key={k} size="sm" onClick={() => setMsg(k)}>{k}</PBButton>
                        ))}
                        {answer && <span style={{ color: 'var(--pb-text-dim)' }}>→ {answer}</span>}
                      </div>
                    </div>
                  </PBGroupBox>

                  <PBGroupBox title="Form sections" style={{ width: 330 }} pad={false}>
                    <PBSection title="Enrollment">
                      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '84px 1fr' }}>
                        <span className="pb-form__label">Start Date:</span>
                        <PBInput w={100} align="center" defaultValue="2026.08.12" />
                      </div>
                    </PBSection>
                    <PBSection title="Coverage">
                      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '84px 1fr' }}>
                        <span className="pb-form__label">Deductible:</span>
                        <PBInput w={100} align="right" defaultValue="0.00" />
                      </div>
                    </PBSection>
                  </PBGroupBox>

                  <PBGroupBox title="TreeView" pad={false} style={{ width: 240, height: 250, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 2 }}>
                      <PBTree nodes={tree} selected={sel} onSelect={setSel} expanded={expanded} onToggle={toggle} />
                    </div>
                  </PBGroupBox>
                </div>
              )}

              {tab === 'DataWindow' && (
                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: '1 1 auto' }}>
                  <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
                    Detail Band — click a row to move the current-row arrow
                  </PBBand>
                  <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                    <PBDataWindow
                      columns={[
                        { key: 'date', header: 'Date', width: 88, align: 'center' },
                        { key: 'code', header: 'Code', width: 72, align: 'center' },
                        { key: 'desc', header: 'Description' },
                        { key: 'd', header: '', dots: true },
                        { key: 'qty', header: 'Qty', width: 48, align: 'right' },
                        { key: 'amount', header: 'Amount', width: 76, align: 'right' },
                        { key: 'st', header: 'ST', width: 34, align: 'center' },
                      ]}
                      rows={[
                        { date: '2026.07.10', code: '00120', desc: 'OFFICE VISIT — COMPLETE', qty: '1', amount: '48.20', st: 'IP', s: 'normal' },
                        { date: '2026.07.09', code: '13020', desc: 'COUNSELLING — 20 MIN', qty: '1', amount: '62.50', st: 'PD', s: 'ok' },
                        { date: '2026.07.08', code: '00100', desc: 'REJECTED — INVALID PAYOR', qty: '1', amount: '0.00', st: 'RJ', s: 'alert' },
                        { date: '2026.07.05', code: '14050', desc: 'CHRONIC DISEASE MANAGEMENT', qty: '1', amount: '125.00', st: 'PD', s: 'ok' },
                        { date: '2026.07.02', code: '00120', desc: 'OFFICE VISIT — COMPLETE', qty: '1', amount: '48.20', st: 'IP', s: 'normal' },
                        { date: '2026.07.01', code: '00121', desc: 'OFFICE VISIT — PARTIAL', qty: '2', amount: '31.40', st: 'IP', s: 'normal' },
                      ]}
                      rowStatus={(r) => r.s as PBRowStatus}
                    />
                  </div>
                  <PBBand>Group bands — click a box to collapse</PBBand>
                  <div style={{ height: 150, display: 'flex' }}>
                    <PBDataWindow
                      groupBy={(r) => r.group}
                      rowStatus={() => 'highlight'}
                      columns={[
                        { key: 'start', header: 'Start', width: 86, align: 'center' },
                        { key: 'desc', header: 'Description', render: (r) => <button className="pb-link">{r.desc}</button> },
                        { key: 'phase', header: 'Phase', width: 96, align: 'center' },
                        { key: 'by', header: 'Linked By', width: 140 },
                      ]}
                      rows={[
                        { group: 'GOALS', start: '2026.08.12', desc: 'DEV AUDIT GOAL', phase: 'INITIATION', by: 'JALIL, AHMAD' },
                        { group: 'GOALS', start: '2026.07.30', desc: 'REDUCE BP BELOW 130/80', phase: 'MAINTENANCE', by: 'SMITH, DALENE' },
                        { group: 'ACTIONS', start: '2026.07.22', desc: 'WEEKLY WEIGH-IN', phase: 'ONE TIME', by: 'GRUBB, HELENA' },
                      ]}
                    />
                  </div>
                  <PBSummaryBand title="Billing — CLAIM SUMMARY" links={['Change View', 'Summary/Detail', 'Hide']} />
                </div>
              )}

              {tab === 'Banners' && (
                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <PBCaption>Compact yellow banner (encounter window)</PBCaption>
                    <PBPatientBannerYellow
                      name="PATCH AADAMS" bchn="AB *7996654321 00" home="250.765.3212"
                      dob="1986.12.19" sex="M"
                    />
                  </div>
                  <div>
                    <PBCaption>Full blue banner (child windows)</PBCaption>
                    <PBPatientBannerBlue
                      top={[
                        { label: 'CHART NO.', value: '3924', w: 92 },
                        { label: 'PATIENT (F/M/L)', value: 'PATCH JULIAN AADAMS', w: 236 },
                        { label: 'DATE OF BIRTH', value: '1986.12.19  39 YR OLD', w: 208 },
                        { label: 'GENDER', value: 'M', w: 74 },
                        { label: 'BC HEALTH NO.', value: 'AB *7996654321 00' },
                      ]}
                      bottom={[
                        { label: 'DATE', value: '2026.08.10', w: 92 },
                        { label: 'TIME', value: '14 : 00', w: 70 },
                        { label: 'VISIT', value: 'R', w: 52 },
                        { label: 'ATTENDING', value: 'FAKERRY, FAKER', w: 152 },
                        { label: 'SERVICE LOCATION', value: 'ACROPOLIS MANOR' },
                      ]}
                    />
                  </div>
                  <div>
                    <PBCaption>Navy view header and grey section band</PBCaption>
                    <PBViewHeader title="Order" meta="Record 1 of 6" />
                    <PBBand right={<PBButton size="sm">New</PBButton>}>Office Notes</PBBand>
                  </div>
                </div>
              )}

              {tab === 'Colours' && (
                <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(208px,1fr))', gap: 6 }}>
                  {swatches.map(([token, use]) => (
                    <div key={token} className="pb-row" style={{ border: '1px solid var(--pb-border)', background: '#fff', padding: 3 }}>
                      <span style={{ width: 34, height: 26, background: `var(${token})`, border: '1px solid #999', flex: 'none' }} />
                      <span className="pb-stack" style={{ gap: 0 }}>
                        <b>{token}</b>
                        <span style={{ color: 'var(--pb-text-dim)' }}>{use}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </PBTabs>
          </div>

          <PBStatusBar cells={[
            { text: 'Ready.', width: 120 },
            {
              text: (
                <button className="pb-link" onClick={() => { window.location.hash = '' }}>
                  Back to MOIS
                </button>
              ),
              grow: true,
            },
            { label: 'Kit: ', value: 'pb 0.1.0', width: 140 },
          ]} />
        </PBWindow>

        {msg && (
          <PBMessageBox
            title={msg === 'error' ? 'MOIS' : 'Register Table - Field'}
            icon={msg}
            buttons={
              msg === 'question' || msg === 'info'
                ? [{ label: 'Yes', value: 'Yes', default: true }, { label: 'No', value: 'No' }]
                : [{ label: 'OK', value: 'OK', default: true }]
            }
            onClose={(v) => { setMsg(null); setAnswer(v) }}
          >
            {msg === 'error'
              ? 'The record could not be saved. Another user has changed it since it was retrieved.'
              : 'Would you like to register this field with the MOIS Data Audit Service?'}
          </PBMessageBox>
        )}
      </div>
    </div>
  )
}
