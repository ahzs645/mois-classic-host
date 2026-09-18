import { useState } from 'react'
import { PBButton, PBCheckbox, PBInput, PBSlider, PBTextArea, PBWindow } from '../pb'

export function GoalDialog({ onClose }: { onClose: () => void }) {
  const [levels, setLevels] = useState({ commit: 6, confidence: 5, importance: 2 })

  return (
    <div className="pb-modal-layer">
      <PBWindow child controls={false} title="New Goal" onClose={onClose} style={{ width: 636, height: 500 }}>
        <div style={{ background: 'var(--pb-face)', padding: '6px 8px', flex: 'none' }}>
          <div className="pb-form pb-form--cols4" style={{ padding: 0, gridTemplateColumns: 'auto 1fr auto 1fr' }}>
            <span className="pb-form__label">Goal Type:</span>
            <PBCheckbox label="Quantitative Goal" />
            <span className="pb-form__label pb-form__label--right">Phase:</span>
            <PBInput w={140} defaultValue="INITIATION" />

            <span className="pb-form__label">Start Date:</span>
            <PBInput w={92} align="center" defaultValue="2026.08.12" />
            <span className="pb-form__label pb-form__label--right">End Date:</span>
            <PBInput w={100} align="center" />
          </div>
        </div>

        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }}>
          <div className="pb-form" style={{ gridTemplateColumns: '96px 1fr', alignItems: 'start', padding: '8px 10px' }}>
            <span className="pb-form__label" style={{ lineHeight: '19px' }}>Goal:</span>
            <PBInput w="100%" defaultValue="DEV AUDIT GOAL" />

            <span className="pb-form__label" style={{ lineHeight: '19px' }}>Detail:</span>
            <PBTextArea rows={4} w="100%" defaultValue="DEV AUDIT" />

            <span className="pb-form__label" style={{ lineHeight: '14px' }}>Expected<br />Outcome:</span>
            <PBTextArea rows={4} w="100%" defaultValue="DEV AUDIT" />
          </div>

          <div style={{ padding: '4px 10px 10px' }}>
            {([
              ['Commitment Level', 'Very Committed', 'commit'],
              ['Confidence Level', 'Very Confident', 'confidence'],
              ['Provider Importance Level', 'Very Important', 'importance'],
            ] as const).map(([title, high, key]) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 1 }}>{title}:</div>
                <div className="pb-row">
                  <span style={{ width: 96, color: 'var(--pb-text-dim)' }}>
                    {key === 'importance' ? 'Not Important' : ''}
                  </span>
                  <span style={{ flex: '1 1 auto' }}>
                    <div style={{ textAlign: 'right', marginBottom: -3 }}>{high}</div>
                    <PBSlider value={levels[key]} onChange={(v) => setLevels({ ...levels, [key]: v })} />
                  </span>
                  <span>Value</span>
                  <PBInput w={44} align="center" value={String(levels[key])} readOnly />
                  <span>(/10)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pb-footer">
          <span className="pb-footer__spacer" />
          <PBButton wide onClick={onClose}>Close</PBButton>
          <span className="pb-footer__spacer" />
        </div>
      </PBWindow>
    </div>
  )
}
