import { useState } from 'react'
import { PBButton, PBInput, PBWindow } from '../pb'

/* ============================================================================
   MOIS sign-in — a branded splash panel above the credential fields.
   Transcribed from encounter-detail-summary.png (the filename is misleading;
   the capture is the login dialog, not an encounter tab).
   ========================================================================= */

/* The splash artwork is a faint hexagonal grid of clinical pictograms behind
   a wordmark; drawn rather than traced so the kit stays asset-free. */
function SplashArt() {
  const cells = [
    [0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [1, 3], [2, 3],
  ]
  return (
    <svg viewBox="0 0 220 300" className="pb-login__art" aria-hidden="true">
      {cells.map(([cx, cy], i) => {
        const x = 26 + cx * 52 + (cy % 2 ? 26 : 0)
        const y = 34 + cy * 60
        const pts = Array.from({ length: 6 }, (_, k) => {
          const a = (Math.PI / 3) * k - Math.PI / 6
          return `${x + 28 * Math.cos(a)},${y + 28 * Math.sin(a)}`
        }).join(' ')
        return (
          <g key={i}>
            <polygon points={pts} fill="#eaf3fa" stroke="#cfe3f2" strokeDasharray="3 3" />
            <circle cx={x} cy={y} r="8" fill="none" stroke="#8fc0e2" strokeWidth="1.6" />
            <path d={`M${x - 4} ${y} h8 M${x} ${y - 4} v8`} stroke="#8fc0e2" strokeWidth="1.6" />
          </g>
        )
      })}
    </svg>
  )
}

export function LoginDialog({ onClose }: { onClose: () => void }) {
  const [user, setUser] = useState('JALA2')

  return (
    <div className="pb-modal-layer" style={{ zIndex: 80, background: 'rgba(0,0,0,.18)' }}>
      <PBWindow child controls={false} title="MOIS: TRAINING" onClose={onClose} style={{ width: 752 }}>
        <div className="pb-login__splash">
          <SplashArt />

          <div className="pb-login__brand">
            <svg viewBox="0 0 300 150" className="pb-login__mark">
              <ellipse cx="150" cy="75" rx="128" ry="62" fill="none" stroke="#9cc9e8" strokeWidth="13" />
              <text x="150" y="92" textAnchor="middle" className="pb-login__wordmark">MOIS</text>
              <text x="268" y="120" className="pb-login__tm">TM</text>
            </svg>
          </div>

          <div className="pb-login__meta">
            <div className="pb-login__devby">Developed by:</div>
            <div className="pb-login__bright">
              <span>Bright<br />Health</span>
              <svg viewBox="0 0 34 34" width="34" height="34">
                {[[0, 0, '#f0a01e'], [1, 0, '#f0c31e'], [0, 1, '#e8731e'], [1, 1, '#f0a01e']]
                  .map(([cx, cy, fill], i) => (
                    <circle key={i} cx={6 + (cx as number) * 15} cy={6 + (cy as number) * 15} r="6" fill={fill as string} />
                  ))}
              </svg>
            </div>
            <div className="pb-login__version">2.31.23 - Spring 2025</div>
            <div className="pb-login__build">Build 3960 (250508)</div>
            <div className="pb-login__build">© Bright Health Solutions Society, 2026. All rights reserved.</div>
            <div className="pb-login__contact">250 564 2644&nbsp; ·&nbsp; brighthealth.ca</div>
          </div>
        </div>

        <div className="pb-login__form">
          <div className="pb-form" style={{ padding: 0, gridTemplateColumns: 'auto auto', justifyContent: 'center', gap: '6px 8px' }}>
            <span className="pb-form__label pb-form__label--right">User Name:</span>
            <PBInput w={206} value={user} onChange={(e) => setUser(e.target.value)} />
            <span className="pb-form__label pb-form__label--right">Password:</span>
            <div className="pb-row">
              <PBInput w={206} type="password" />
              <PBButton wide style={{ marginLeft: 8 }}>Change Password</PBButton>
            </div>
          </div>
        </div>

        <div className="pb-footer" style={{ justifyContent: 'center', gap: 14, paddingBottom: 12 }}>
          <PBButton wide onClick={onClose}>Ok</PBButton>
          <PBButton wide onClick={onClose}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}
