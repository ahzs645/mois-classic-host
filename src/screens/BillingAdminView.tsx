import { useState } from 'react'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBGroup, PBInput, PBLookup, PBRadio,
  PBSelect, PBTabs, PBViewHeader, pbSlug,
} from '../pb'
import { billingAdminView, type AdminField, type AdminView } from '../data/billingAdmin'

/* ============================================================================
   The fifteen PBF / LFP / PAS views under Billing.

   They are one screen shape repeated — header, command row, a row of
   captioned filter group boxes, a grid, sometimes a legend strip — so this
   renders them from `data/billingAdmin.ts`, where each view's provenance is
   recorded beside it. Two views are not grids: the PCPC calculator is
   parameters plus two action buttons, and the PAS folder is a text page.
   ========================================================================= */

function Field({ f }: { f: AdminField }) {
  if (f.kind === 'static') return <div style={{ padding: '2px 0' }}>{f.label}</div>
  if (f.kind === 'check') {
    return (
      <div style={{ padding: '2px 0' }}>
        <PBCheckbox label={f.label} checked={f.checked} />
        {f.hint && <div style={{ color: '#606060', paddingLeft: 18 }}>{f.hint}</div>}
      </div>
    )
  }
  if (f.kind === 'radio') {
    return (
      <div style={{ padding: '2px 0' }}>
        {f.label && <span className="pb-form__label" style={{ marginRight: 6 }}>{f.label}</span>}
        <span className="pb-row" style={{ gap: 12, display: 'inline-flex', flexWrap: 'wrap' }}>
          {f.options.map((o) => (
            <PBRadio key={o} name={`${pbSlug(f.label || 'opt')}-${pbSlug(o)}`} label={o} checked={o === f.value} />
          ))}
        </span>
      </div>
    )
  }
  return (
    <div className="pb-row" style={{ gap: 6, padding: '2px 0', alignItems: 'center', flexWrap: 'wrap' }}>
      <span className="pb-form__label">{f.label}</span>
      {f.kind === 'drop' && <PBSelect w={f.width} options={f.options} defaultValue={f.value} />}
      {f.kind === 'text' && <PBInput w={f.width} defaultValue={f.value} />}
      {f.kind === 'lookup' && <PBLookup w={f.width} name={pbSlug(f.label)} defaultValue={f.value} />}
      {f.hint && <span style={{ color: '#606060' }}>{f.hint}</span>}
    </div>
  )
}

export function BillingAdminView({ node }: { node: string }) {
  const view: AdminView | undefined = billingAdminView(node)
  const [tab, setTab] = useState('')
  const [cur, setCur] = useState(0)
  if (!view) return null

  return (
    <>
      <PBViewHeader title={view.header} />
      {view.commands.length > 0 && (
        <PBCommandRow commands={view.commands.map((label) => ({ label }))} />
      )}

      {view.body && (
        <div style={{ padding: '10px 12px', flex: 'none' }}>
          {view.body.map((line, i) => <div key={i} style={{ minHeight: 16 }}>{line}</div>)}
        </div>
      )}

      {view.groups && (
        <div className="pb-row" style={{ alignItems: 'flex-start', gap: 8, padding: '4px 6px', flex: 'none', flexWrap: 'wrap' }}>
          {view.groups.map((g, i) => (
            g.caption
              ? (
                <PBGroup key={i} title={g.caption}>
                  {g.fields.map((f, j) => <Field key={j} f={f} />)}
                </PBGroup>
              )
              : (
                <div key={i} style={{ flex: '1 1 auto' }}>
                  {g.fields.map((f, j) => <Field key={j} f={f} />)}
                </div>
              )
          ))}
        </div>
      )}


      {view.columns && view.tabs && (
        <PBTabs tabs={view.tabs} active={tab || view.tabs[0]!} onChange={setTab} justified>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              columns={view.columns}
              rows={view.rows ?? []}
              current={cur}
              onCurrentChange={setCur}
              empty="No records match those parameters."
            />
          </div>
        </PBTabs>
      )}

      {view.columns && !view.tabs && (
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
          <PBDataWindow
            columns={view.columns}
            rows={view.rows ?? []}
            current={cur}
            onCurrentChange={setCur}
            rowTutorialId={(r) => (
              r.last ? `host.mois.row.pbf-${pbSlug(String(r.last))}`
                : r.provider ? `host.mois.row.lfp-${pbSlug(String(r.provider).split(',')[0] ?? '')}`
                  : r.code ? `host.mois.row.lfp-${r.code}` : undefined
            )}
            empty="No records match those parameters."
          />
        </div>
      )}

      {view.footer && (
        <div style={{ background: '#c4c4c4', padding: '3px 8px', flex: 'none', color: '#202020' }}>
          {view.footer}
        </div>
      )}

      {view.actions && (
        <div className="pb-row" style={{ gap: 10, padding: '8px 12px', flex: 'none' }}>
          <PBCommandRow commands={view.actions.map((label) => ({ label }))} />
        </div>
      )}
    </>
  )
}
