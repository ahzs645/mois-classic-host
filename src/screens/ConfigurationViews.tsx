import { useState, type ReactNode } from 'react'
import {
  COMPUTER_PRINTERS, FIELD_AUDIT_KEY, FIELD_AUDIT_ROWS, PRINTER_CONFIGS_KEY, PRINTER_CONFIGURATIONS,
  PRINTER_PROFILES, PRINTER_PROFILES_KEY, PRINTER_TYPES,
  type FieldAuditRow, type PrinterConfiguration, type PrinterProfile,
} from '../data/adminConfig'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import {
  PBBand, PBCommandRow, PBDataWindow, PBInput, PBSelect, PBTextArea, PBViewHeader, pbSlug,
} from '../pb'
import { Btn, DetailWindow, FieldLabel, SectionHead, TopMessage } from './AdminExchangeKit'
import { PrinterRows } from './ComputerSettingsWindow'
import { registerFolderView, type FolderViewProps } from './folderViewRegistry'

/* ============================================================================
   Administration ▸ Configuration ▸ Field Audit Setup, Printer Configurations
   and Printer Profiles — three list folders and their record windows.

   PROVENANCE (full notes in data/adminConfig.ts)
   · Field Audit Setup List — 303163 `f9a9dc63…` (v02.19.04): Delete Record,
     Edit Record, Close Window; a filter box over each of Table Name / Field
     Name / Description. Edit Record or a double-click opens Field Audit
     Setup Detail (`f7a304f2…`): a navy "Field Audit Setup" heading, a
     "Field Description" band, Table Name and Field Name read-only,
     Description editable, Save Changes (F2) / Cancel. The article: the
     folder "allows you to edit or remove field auditing" — there is no New
     Record in the capture, and none here.
   · Printer Profile List — 3768908 `5e0a163c…` (New Record, Edit Record,
     Find / …, cut off), `9f4b3fe1…` (New Record, Delete Record, Edit Record,
     Close Window; Name / Description). The later capture's row is used.
     New Record → New Printer Profile (`ae65546f…`: a "New Printer Profile"
     band, Name, Description, Create Record / Cancel). A double-click or
     Edit Record → Printer Profile Detail (`063c4c8f…`, `820efdd6…`): navy
     "Printer Profile", Identification (Name, Desc.), Printer Settings
     (Report, Label + Character Based, Form, Rx + Character Based, Fax, each
     with "…"; Configuration beside Label), Save Changes (F2) / Cancel.
   · Printer Configuration List — 303124 `53ff7a7c…`, `e6dd7589…`: New
     Record, Delete Record, Edit Record, Close Window; Printer Type /
     Configuration Name / Description. New Printer Configuration: Printer
     Type (Label Printer / Rx Printer), Configuration Name, Description,
     Create Record / Cancel. The detail window a double-click opens ("double
     click on the row to customize your new entry … Customize the settings
     … Save Changes (F2)") has NO capture: its settings block is INFERRED
     from the LABEL PRINTING and RXPRINTER - WINDOWS System Settings bands,
     which are what such a configuration overrides.

   Each list's rows are this session's (`useSessionState`), so a profile or
   configuration created here is in Maintenance ▸ Computer Settings' drop-
   downs (screens/ComputerSettingsWindow.tsx).

   Reported: `host.screen.rows`, `host.screen.row` (the current row's slug),
   `host.screen.saved`, and `host.dialog` for the record window.
   ========================================================================= */

/* --- a list folder's shell: header, commands, per-column filters, grid ---- */
function ListFolder<T extends Record<string, any>>({
  title, commands, columns, rows, cur, setCur, onActivate, rowId, children,
}: {
  title: string
  commands: { label: string; onClick?: () => void; disabled?: boolean }[]
  columns: { key: string; header: string; width?: number | string }[]
  rows: T[]
  cur: number
  setCur: (i: number) => void
  onActivate: () => void
  rowId: (row: T) => string
  children?: ReactNode
}) {
  const [filter, setFilter] = useState<Record<string, string>>({})
  const shown = rows.filter((r) => columns.every((c) => !filter[c.key] || String(r[c.key] ?? '').toLowerCase().includes(filter[c.key]!.toLowerCase())))
  return (
    <>
      <PBViewHeader title={title} />
      <PBCommandRow commands={commands} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', position: 'relative' }}>
        <PBDataWindow<T>
          rows={shown}
          current={Math.min(cur, shown.length - 1)}
          onCurrentChange={setCur}
          onActivate={(_, i) => { setCur(i); onActivate() }}
          rowTutorialId={(r) => `host.mois.row.${rowId(r)}`}
          filters={columns.map((c) => (
            <PBInput key={c.key} w="100%" value={filter[c.key] ?? ''} aria-label={`Filter ${c.header}`}
              data-tutorial-id={`host.mois.field.filter-${pbSlug(c.header)}`}
              onChange={(e) => setFilter((f) => ({ ...f, [c.key]: e.target.value }))} />
          ))}
          columns={columns.map((c) => ({ key: c.key, header: c.header, width: c.width, headAlign: 'center' as const }))}
        />
      </div>
      {children}
    </>
  )
}

/* ===========================================================================
   Field Audit Setup
   ======================================================================== */
function FieldAuditSetupView({ close }: FolderViewProps) {
  const [rows, setRows] = useSessionState<FieldAuditRow[]>(FIELD_AUDIT_KEY, FIELD_AUDIT_ROWS)
  const [cur, setCur] = useState(0)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const row = rows[cur]
  useScreenReport({ rows: rows.length, row: row ? `${row.table}-${row.field}` : null })
  return (
    <ListFolder
      title="Field Audit Setup List"
      commands={[
        { label: 'Delete Record', onClick: () => { if (row) setConfirm(true) } },
        { label: 'Edit Record', onClick: () => { if (row) setEditing(true) } },
        { label: 'Close Window', onClick: close },
      ]}
      columns={[{ key: 'table', header: 'Table Name', width: 170 }, { key: 'field', header: 'Field Name', width: 170 }, { key: 'description', header: 'Description', width: 440 }]}
      rows={rows} cur={cur} setCur={setCur}
      onActivate={() => setEditing(true)}
      rowId={(r) => `${pbSlug(r.table)}-${pbSlug(r.field)}`}
    >
      {editing && row && (
        <FieldAuditDetail
          row={row}
          onClose={() => setEditing(false)}
          onSave={(description) => { setRows((all) => all.map((r, i) => (i === cur ? { ...r, description } : r))); setEditing(false) }}
        />
      )}
      {confirm && (
        <TopMessage id="delete-field-audit" title="Delete Record" icon="question" buttons={['Yes', 'No']} prefix="delete-audit-"
          onClose={(b) => {
            setConfirm(false)
            if (b === 'Yes') { setRows((all) => all.filter((_, i) => i !== cur)); setCur(0) }
          }}>
          Are you sure you want to delete this record?
        </TopMessage>
      )}
    </ListFolder>
  )
}

function FieldAuditDetail({ row, onClose, onSave }: { row: FieldAuditRow; onClose: () => void; onSave: (d: string) => void }) {
  const [description, setDescription] = useState(row.description)
  return (
    <DetailWindow id="field-audit-setup-detail" title="Field Audit Setup Detail" heading="Field Audit Setup" width={410} onClose={onClose}
      buttons={<>
        <Btn id="field-audit-save" isDefault width={112} onClick={() => onSave(description)}>Save Changes (F2)</Btn>
        <Btn id="field-audit-cancel" width={104} onClick={onClose}>Cancel</Btn>
      </>}>
      <div className="pb-groupbox" style={{ margin: 10 }}>
        <PBBand>Field Description</PBBand>
        <div style={{ display: 'grid', gridTemplateColumns: '86px 1fr', gap: 4, padding: '8px 10px' }}>
          <FieldLabel>Table Name:</FieldLabel><PBInput w="100%" value={row.table} readOnly style={{ background: '#e8e8e8' }} />
          <FieldLabel>Field Name:</FieldLabel><PBInput w="100%" value={row.field} readOnly style={{ background: '#e8e8e8' }} />
          <FieldLabel>Description:</FieldLabel>
          <PBInput w="100%" value={description} onChange={(e) => setDescription(e.target.value)} data-tutorial-id="host.mois.field.field-audit-description" />
        </div>
      </div>
    </DetailWindow>
  )
}

/* ===========================================================================
   Printer Configurations
   ======================================================================== */
function PrinterConfigurationsView({ close }: FolderViewProps) {
  const [rows, setRows] = useSessionState<PrinterConfiguration[]>(PRINTER_CONFIGS_KEY, PRINTER_CONFIGURATIONS)
  const [cur, setCur] = useState(0)
  const [win, setWin] = useState<null | 'new' | 'edit'>(null)
  const row = rows[cur]
  useScreenReport({ rows: rows.length, row: row ? pbSlug(row.name) : null })
  return (
    <ListFolder
      title="Printer Configuration List"
      commands={[
        { label: 'New Record', onClick: () => setWin('new') },
        { label: 'Delete Record', onClick: () => { setRows((all) => all.filter((_, i) => i !== cur)); setCur(0) } },
        { label: 'Edit Record', onClick: () => { if (row) setWin('edit') } },
        { label: 'Close Window', onClick: close },
      ]}
      columns={[{ key: 'type', header: 'Printer Type', width: 120 }, { key: 'name', header: 'Configuration Name', width: 200 }, { key: 'description', header: 'Description', width: 420 }]}
      rows={rows} cur={cur} setCur={setCur}
      onActivate={() => setWin('edit')}
      rowId={(r) => `printer-config-${pbSlug(r.name)}`}
    >
      {win === 'new' && (
        <NewPrinterConfiguration
          onClose={() => setWin(null)}
          onCreate={(c) => { setRows((all) => [...all, c]); setCur(rows.length); setWin(null) }}
        />
      )}
      {win === 'edit' && row && (
        <PrinterConfigurationDetail
          row={row}
          onClose={() => setWin(null)}
          onSave={(next) => { setRows((all) => all.map((r, i) => (i === cur ? next : r))); setWin(null) }}
        />
      )}
    </ListFolder>
  )
}

function NewPrinterConfiguration({ onClose, onCreate }: { onClose: () => void; onCreate: (c: PrinterConfiguration) => void }) {
  const [type, setType] = useState<string>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  return (
    <DetailWindow id="new-printer-configuration" title="New Printer Configuration" width={470} onClose={onClose}
      buttons={<>
        <Btn id="printer-config-create" isDefault width={100} disabled={!type || !name.trim()}
          onClick={() => onCreate({ type: type as PrinterConfiguration['type'], name: name.trim().toUpperCase(), description })}>Create Record</Btn>
        <Btn id="printer-config-cancel" width={90} onClick={onClose}>Cancel</Btn>
      </>}>
      <div className="pb-groupbox" style={{ margin: 10 }}>
        <PBBand>New Printer Configuration</PBBand>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 4, padding: '8px 10px' }}>
          <FieldLabel w={120}>Printer Type:</FieldLabel>
          <PBSelect w={200} options={[{ value: '', label: '' }, ...PRINTER_TYPES]} value={type} onChange={(e) => setType(e.target.value)} data-tutorial-id="host.mois.field.printer-type" />
          <FieldLabel w={120}>Configuration Name:</FieldLabel>
          <PBInput w="100%" value={name} onChange={(e) => setName(e.target.value)} data-tutorial-id="host.mois.field.configuration-name" />
          <FieldLabel w={120}>Description:</FieldLabel>
          <PBTextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} data-tutorial-id="host.mois.field.configuration-description" style={{ resize: 'none' }} />
        </div>
      </div>
    </DetailWindow>
  )
}

/* INFERRED layout — no capture of this window (see the header) */
function PrinterConfigurationDetail({ row, onClose, onSave }: { row: PrinterConfiguration; onClose: () => void; onSave: (c: PrinterConfiguration) => void }) {
  const [description, setDescription] = useState(row.description)
  const label = row.type === 'Label Printer'
  const fields = label
    ? [['Top Margin', '.25'], ['Bottom Margin', '.25'], ['Left Margin', '.25'], ['Right Margin', '.25'], ['Font Name', 'Arial'], ['Font Height', '8'], ['Label Width', '2.10']]
    : [['Length', '18000'], ['Width', '4.25'], ['Margin - Left', '0.2'], ['Margin - Right', '0.2'], ['Margin - Top', '0.2'], ['Margin - Bottom', '0.2'], ['Full Page', 'No']]
  return (
    <DetailWindow id="printer-configuration-detail" title="Printer Configuration Detail" heading="Printer Configuration" width={520} onClose={onClose}
      buttons={<>
        <Btn id="printer-config-save" isDefault width={112} onClick={() => onSave({ ...row, description })}>Save Changes (F2)</Btn>
        <Btn id="printer-config-detail-cancel" width={90} onClick={onClose}>Cancel</Btn>
      </>}>
      <SectionHead>Identification</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 4, padding: '6px 10px' }}>
        <FieldLabel w={120}>Printer Type:</FieldLabel><span>{row.type}</span>
        <FieldLabel w={120}>Configuration Name:</FieldLabel><span>{row.name}</span>
        <FieldLabel w={120}>Description:</FieldLabel><PBInput w="100%" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <SectionHead>{label ? 'Label Settings' : 'Prescription Settings'}</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 90px 1fr', gap: 4, padding: '6px 10px' }} data-tutorial-id="host.mois.group.configuration-settings">
        {fields.map(([name, value]) => (
          <div key={name} style={{ display: 'contents' }}>
            <FieldLabel w={120}>{name}:</FieldLabel>
            <PBInput w={80} defaultValue={value} data-tutorial-id={`host.mois.field.config-${pbSlug(name!)}`} />
            <span style={{ color: '#666' }}>{/Margin|Width/.test(name!) ? 'Inches (0.5 = half inch)' : ''}</span>
          </div>
        ))}
      </div>
    </DetailWindow>
  )
}

/* ===========================================================================
   Printer Profiles
   ======================================================================== */
function PrinterProfilesView({ close }: FolderViewProps) {
  const [rows, setRows] = useSessionState<PrinterProfile[]>(PRINTER_PROFILES_KEY, PRINTER_PROFILES)
  const [cur, setCur] = useState(0)
  const [win, setWin] = useState<null | 'new' | 'edit'>(null)
  const row = rows[cur]
  useScreenReport({ rows: rows.length, row: row ? pbSlug(row.name) : null })
  return (
    <ListFolder
      title="Printer Profile List"
      commands={[
        { label: 'New Record', onClick: () => setWin('new') },
        { label: 'Delete Record', onClick: () => { setRows((all) => all.filter((_, i) => i !== cur)); setCur(0) } },
        { label: 'Edit Record', onClick: () => { if (row) setWin('edit') } },
        { label: 'Close Window', onClick: close },
      ]}
      columns={[{ key: 'name', header: 'Name', width: 300 }, { key: 'description', header: 'Description', width: 480 }]}
      rows={rows} cur={cur} setCur={setCur}
      onActivate={() => setWin('edit')}
      rowId={(r) => `printer-profile-${pbSlug(r.name)}`}
    >
      {win === 'new' && (
        <NewPrinterProfile
          onClose={() => setWin(null)}
          onCreate={(name, description) => {
            /* 3768908: "Create Record" and then "Select Entry to update
               profile (Double Click on row)" — the new row is the current one */
            setRows((all) => [...all, { name, description, printers: { ...COMPUTER_PRINTERS } }])
            setCur(rows.length)
            setWin(null)
          }}
        />
      )}
      {win === 'edit' && row && (
        <PrinterProfileDetail
          profile={row}
          onClose={() => setWin(null)}
          onSave={(next) => { setRows((all) => all.map((r, i) => (i === cur ? next : r))); setWin(null) }}
        />
      )}
    </ListFolder>
  )
}

function NewPrinterProfile({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, description: string) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  return (
    <DetailWindow id="new-printer-profile" title="New Printer Profile" width={520} onClose={onClose}
      buttons={<>
        <Btn id="printer-profile-create" isDefault width={100} disabled={!name.trim()} onClick={() => onCreate(name.trim().toUpperCase(), description)}>Create Record</Btn>
        <Btn id="printer-profile-new-cancel" width={90} onClick={onClose}>Cancel</Btn>
      </>}>
      <div className="pb-groupbox" style={{ margin: 10 }}>
        <PBBand>New Printer Profile</PBBand>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 4, padding: '8px 10px' }}>
          <FieldLabel w={100}>Name:</FieldLabel>
          <PBInput w="100%" value={name} onChange={(e) => setName(e.target.value)} data-tutorial-id="host.mois.field.profile-name" />
          <FieldLabel w={100}>Description:</FieldLabel>
          <PBTextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} data-tutorial-id="host.mois.field.profile-description" style={{ resize: 'none' }} />
        </div>
      </div>
    </DetailWindow>
  )
}

function PrinterProfileDetail({ profile, onClose, onSave }: { profile: PrinterProfile; onClose: () => void; onSave: (p: PrinterProfile) => void }) {
  const [name, setName] = useState(profile.name)
  const [description, setDescription] = useState(profile.description)
  const [printers, setPrinters] = useState(profile.printers)
  const [configs] = useSessionState<PrinterConfiguration[]>(PRINTER_CONFIGS_KEY, PRINTER_CONFIGURATIONS)
  return (
    <DetailWindow id="printer-profile-detail" title="Printer Profile Detail" heading="Printer Profile" width={900} height={560} onClose={onClose}
      buttons={<>
        <Btn id="printer-profile-save" isDefault width={120} onClick={() => onSave({ name, description, printers })}>Save Changes (F2)</Btn>
        <Btn id="printer-profile-cancel" width={100} onClick={onClose}>Cancel</Btn>
      </>}>
      <SectionHead>Identification</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '50px 440px', gap: 4, padding: '6px 6px' }}>
        <FieldLabel w={50}>Name:</FieldLabel><PBInput w="100%" value={name} onChange={(e) => setName(e.target.value)} data-tutorial-id="host.mois.field.printer-profile-name" />
        <FieldLabel w={50}>Desc.:</FieldLabel><PBTextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: 'none' }} />
      </div>
      <SectionHead>Printer Settings</SectionHead>
      <PrinterRows printers={printers} onChange={setPrinters} configurations={configs.map((c) => c.name)} prefix="profile" />
    </DetailWindow>
  )
}

export const CONFIGURATION_FOLDER_NODES = ['ad-field-audit', 'ad-printer-configs', 'ad-printer-profiles']

registerFolderView(['ad-field-audit'], FieldAuditSetupView)
registerFolderView(['ad-printer-configs'], PrinterConfigurationsView)
registerFolderView(['ad-printer-profiles'], PrinterProfilesView)
