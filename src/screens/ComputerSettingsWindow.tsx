import { useState } from 'react'
import {
  AVAILABLE_PRINTERS, COMPUTER_NAME, COMPUTER_SETTINGS_KEY, DEFAULT_COMPUTER_SETTINGS, PRINTER_CONFIGS_KEY,
  PRINTER_CONFIGURATIONS, PRINTER_KINDS, PRINTER_PROFILES, PRINTER_PROFILES_KEY, STANDARD_CONFIGURATION,
  type ComputerSettings, type PrinterConfiguration, type PrinterKind, type PrinterProfile, type PrinterSet,
} from '../data/adminConfig'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { PBCheckbox, PBDataWindow, PBInput, PBLookup, PBSelect, pbSlug } from '../pb'
import { Btn, DetailWindow, FieldLabel, SectionHead } from './AdminExchangeKit'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'

/* ============================================================================
   Maintenance ▸ Computer Settings — the workstation's own printers — and
   the printer list its "…" buttons open.

   PROVENANCE
   · Computer Settings — 3768908 `f4f920fc…` (current build) and 303124
     `4a1733c3…`: a grey "Computer Settings" heading; Identification with
     Computer Name (LLPF39LCHX, read-only); Printer Settings headed
     "PRINTER  DEVICE (DEFAULT / CURRENT)" with, at its right, PRINTER
     PROFILE: a drop-down whose list is headed "Profile" (HOSPITAL, PRINCE
     GEORGE); then Report / Label (+ Character Based) / Form / Rx
     (+ Character Based) / Fax, each a field with "…" and a grey
     "Current: …" line under it; Configuration (list headed "Configuration
     Name": MAC, WEB CLIENT, STANDARD SETTINGS) at the right of Label; Other
     Settings: Scheduler Refresh "(time interval - in seconds - for
     refreshing the scheduler window)" and, at the right, "Will refresh the
     workstation settings when running in a Remote Citrix Session:"
     Refresh; Apply Changes / Cancel.
     Choosing a profile fills every printer from that profile (3768908:
     "select a different printer profile depending on which clinic they are
     working for the day"), then Apply Changes keeps it.
   · The printer list — 3076723: "Clicking the '...' beside each choice
     under PRINTER will give you a list of all printers available. Select
     the desired printer and click Set as default, if applicable. Then press
     Select Printer. You will be returned to the previous screen, choose
     'Apply Changes'." Every image in 3076723 is `missing-image`, so the
     window is INFERRED from that text: title "Select Printer", a list of
     Printer Name with the Windows default flagged, and Set as default /
     Select Printer / Cancel.
   · Maintenance ▸ Printer Diagnostics sits under Default Value Setting in
     `02ecfd3f…`; it is not part of these articles and is not built.

   Session: Apply Changes stores COMPUTER_SETTINGS_KEY (printers, profile,
   Scheduler Refresh, and the Windows default Set as default chose).

   Reported: `host.dialog` computer-settings / select-printer;
   `host.screen.profile` (the chosen profile's slug), `host.screen.printer`
   (the highlighted printer's slug in the list), `host.screen.saved`.
   ========================================================================= */

/** The printer list a "…" opens (INFERRED — see the header). */
export function PrinterPickerWindow({ current, printers, onSelect, onClose }: {
  current: string
  printers: string[]
  onSelect: (name: string) => void
  onClose: () => void
}) {
  const [settings, setSettings] = useSessionState<ComputerSettings>(COMPUTER_SETTINGS_KEY, DEFAULT_COMPUTER_SETTINGS)
  const [cur, setCur] = useState(() => Math.max(0, printers.indexOf(current)))
  const picked = printers[cur] ?? ''
  useScreenReport({ printer: pbSlug(picked) })
  const rows = printers.map((name) => ({ name, status: name === settings.windowsDefault ? 'Default' : '' }))
  return (
    <DetailWindow id="select-printer" title="Select Printer" width={460} height={360} zIndex={92} onClose={onClose}
      buttons={<>
        <Btn id="set-as-default" width={100} onClick={() => setSettings((s) => ({ ...s, windowsDefault: picked }))}>Set as default</Btn>
        <Btn id="select-printer" isDefault width={100} onClick={() => onSelect(picked)}>Select Printer</Btn>
        <Btn id="select-printer-cancel" width={80} onClick={onClose}>Cancel</Btn>
      </>}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 6 }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => onSelect(r.name)}
          rowTutorialId={(r) => `host.mois.row.printer-${pbSlug(r.name)}`}
          columns={[{ key: 'name', header: 'Printer Name', width: 300 }, { key: 'status', header: 'Status', width: 90, align: 'center' }]}
        />
      </div>
    </DetailWindow>
  )
}

/** The Printer Settings block Printer Profile Detail and Computer Settings share. */
export function PrinterRows({ printers, onChange, configurations, current, prefix }: {
  printers: PrinterSet
  onChange: (next: PrinterSet) => void
  /** Configuration drop-down entries beside Label */
  configurations: string[]
  /** Computer Settings prints each printer's `Current:` under it */
  current?: PrinterSet
  prefix: string
}) {
  const [picking, setPicking] = useState<PrinterKind | null>(null)
  return (
    <div data-tutorial-id={`host.mois.group.${prefix}-printer-settings`}>
      {PRINTER_KINDS.map((kind) => (
        <div key={kind} style={{ borderBottom: '1px solid #c8c8c8', padding: '3px 6px' }}>
          <div className="pb-row" style={{ gap: 6 }}>
            <FieldLabel w={44}>{kind}:</FieldLabel>
            <PBLookup
              w={420}
              value={printers[kind]}
              name={`${prefix}-${kind}-printer`}
              fieldId={`host.mois.field.${prefix}-${pbSlug(kind)}-printer`}
              onChange={(v) => onChange({ ...printers, [kind]: v })}
              onDots={() => setPicking(kind)}
            />
            {kind === 'Label' && <PBCheckbox label="Character Based" checked={printers.labelChar} onChange={(v) => onChange({ ...printers, labelChar: v })} tutorialId={`host.mois.field.${prefix}-label-character-based`} />}
            {kind === 'Rx' && <PBCheckbox label="Character Based" checked={printers.rxChar} onChange={(v) => onChange({ ...printers, rxChar: v })} tutorialId={`host.mois.field.${prefix}-rx-character-based`} />}
            {kind === 'Label' && (
              <>
                <FieldLabel w={80} right>Configuration:</FieldLabel>
                <PBSelect w={180} options={[...new Set([...configurations, STANDARD_CONFIGURATION])]} value={printers.configuration}
                  onChange={(e) => onChange({ ...printers, configuration: e.target.value })} data-tutorial-id={`host.mois.field.${prefix}-configuration`} />
              </>
            )}
          </div>
          {current && <div style={{ paddingLeft: 50, color: '#8a8a8a' }}>Current:&nbsp; {current[kind]}</div>}
        </div>
      ))}
      {picking && (
        <PrinterPickerWindow
          current={printers[picking]}
          printers={AVAILABLE_PRINTERS}
          onClose={() => setPicking(null)}
          onSelect={(name) => { onChange({ ...printers, [picking]: name }); setPicking(null) }}
        />
      )}
    </div>
  )
}

export function ComputerSettingsWindow({ close }: AreaWindowProps) {
  const [settings, setSettings] = useSessionState<ComputerSettings>(COMPUTER_SETTINGS_KEY, DEFAULT_COMPUTER_SETTINGS)
  const [profiles] = useSessionState<PrinterProfile[]>(PRINTER_PROFILES_KEY, PRINTER_PROFILES)
  const [configs] = useSessionState<PrinterConfiguration[]>(PRINTER_CONFIGS_KEY, PRINTER_CONFIGURATIONS)
  const [printers, setPrinters] = useState<PrinterSet>(settings.printers)
  const [profile, setProfile] = useState(settings.profile)
  const [refresh, setRefresh] = useState(settings.refresh)
  useScreenReport({ profile: profile ? pbSlug(profile) : null })

  const pickProfile = (name: string) => {
    setProfile(name)
    const p = profiles.find((x) => x.name === name)
    if (p) setPrinters({ ...p.printers })
  }
  const apply = () => {
    setSettings((s) => ({ ...s, printers, profile, refresh }))
    close()
  }

  return (
    <DetailWindow id="computer-settings" title="Computer Settings" width={820} height={640} onClose={close}
      buttons={<>
        <Btn id="apply-changes" isDefault width={110} onClick={apply}>Apply Changes</Btn>
        <Btn id="computer-settings-cancel" width={100} onClick={close}>Cancel</Btn>
      </>}>
      <div style={{ background: 'linear-gradient(#8c8c8c, #6e6e6e)', color: '#fff', fontWeight: 700, fontSize: '1.25em', padding: '3px 6px', flex: 'none' }}>
        Computer Settings
      </div>
      <SectionHead>Identification</SectionHead>
      <div className="pb-row" style={{ gap: 8, padding: '4px 6px' }}>
        <FieldLabel w={96}>Computer Name:</FieldLabel>
        <PBInput w={250} value={COMPUTER_NAME} readOnly style={{ background: '#e8e8e8', fontWeight: 700 }} />
      </div>
      <SectionHead>Printer Settings</SectionHead>
      <div className="pb-row" style={{ gap: 8, padding: '4px 6px', fontWeight: 700, borderBottom: '1px solid #c8c8c8' }}>
        <span style={{ width: 50 }}>PRINTER</span>
        <span style={{ flex: '1 1 auto' }}>DEVICE (DEFAULT / CURRENT)</span>
        <span>PRINTER PROFILE:</span>
        <PBSelect
          w={220}
          options={[{ value: '', label: '' }, ...profiles.map((p) => p.name)]}
          value={profile}
          onChange={(e) => pickProfile(e.target.value)}
          data-tutorial-id="host.mois.field.printer-profile"
        />
      </div>
      <PrinterRows
        printers={printers}
        onChange={setPrinters}
        configurations={configs.filter((c) => c.type === 'Label Printer').map((c) => c.name)}
        current={settings.printers}
        prefix="computer"
      />
      <SectionHead>Other Settings</SectionHead>
      <div className="pb-row" style={{ gap: 8, padding: '6px 6px', alignItems: 'flex-start' }}>
        <FieldLabel w={100}>Scheduler Refresh:</FieldLabel>
        <PBInput w={100} align="center" value={refresh} onChange={(e) => setRefresh(e.target.value)} data-tutorial-id="host.mois.field.scheduler-refresh" />
        <span style={{ flex: '1 1 auto' }}>(time interval - in seconds - for refreshing the scheduler window).</span>
        <div style={{ width: 200, whiteSpace: 'normal', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>Will refresh the workstation settings when running in a Remote Citrix Session:</span>
          <Btn id="computer-settings-refresh" width={120}>Refresh</Btn>
        </div>
      </div>
    </DetailWindow>
  )
}

export const COMPUTER_SETTINGS_WINDOW = 'computer-settings'
registerAreaWindow(COMPUTER_SETTINGS_WINDOW, ComputerSettingsWindow)
