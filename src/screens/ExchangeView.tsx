import type { ReactElement } from 'react'
import { manualEntryFolder } from '../data/exchange'
import { AttachFilesView, ScanFilesView } from './AttachmentUtilityViews'
import { ExportChartsView, ExportLogsView, ImportChartsView, ImportLogsView } from './ChartExchangeViews'
import {
  InboxDistributionView, InterfaceAuditView, LabResultsView, MatchingHistoryView,
  SendReceiveView, SetupRegistrationView,
} from './InterfaceExchangeViews'
import { ManualEntryView } from './ManualEntryView'
import { AutoUpdateView, PrepareBillsView, ReconcileRemittanceView, TeleplanView } from './MspExchangeViews'

/* ============================================================================
   Data Exchange — one work-area view per folder.

   Every Data Exchange folder is its own window in MOIS (303388: "These
   buttons will change depending on the folder that is selected"), so the
   module does not share the Patient Chart's section window. This is the
   switch the frame routes every node below to; each view cites its capture.
   The screens sit outside the chart, so none draws a patient banner.

   Inbound and Outbound Messages keep their own routes (CdxMessageViews).
   Administration ▸ Auto-Update Utilities is here too: it is the other half
   of the MSP code-list job (303502, 303084).
   ========================================================================= */

/** What a Data Exchange screen can ask the frame to do. */
export type ExchangeGo = {
  /** open a tree node (Open Chart, the Setup / Registration link) */
  node: (id: string) => void
  /** open a frame window by id (Order Linking Service, Add Attachment) */
  open: (id: string, args?: Record<string, unknown>) => boolean
  /** raise the frame's Record Navigator (a Quality Review Tear Off) */
  tearOff?: () => void
}

const SCREENS: Record<string, (go: ExchangeGo) => ReactElement> = {
  'dx-prepare-bills': () => <PrepareBillsView />,
  'dx-teleplan': () => <TeleplanView />,
  'dx-remittance': () => <ReconcileRemittanceView />,
  'dx-sendreceive': (go) => <SendReceiveView go={go} />,
  'dx-lab-results': (go) => <LabResultsView onTearOff={go.tearOff} />,
  'dx-distribution': () => <InboxDistributionView />,
  'dx-setup': () => <SetupRegistrationView />,
  'dx-matching': () => <MatchingHistoryView />,
  'dx-audit': () => <InterfaceAuditView />,
  'dx-scan': () => <ScanFilesView />,
  'dx-attach-files': (go) => <AttachFilesView go={go} />,
  'dx-export-charts': () => <ExportChartsView />,
  'dx-export-logs': () => <ExportLogsView />,
  'dx-import-charts': () => <ImportChartsView />,
  'dx-import-logs': () => <ImportLogsView />,
  'ad-auto-update': () => <AutoUpdateView />,
}

const MANUAL_NODES = [
  'dx-measures', 'dx-imaging', 'dx-consults', 'dx-procedures', 'dx-documents', 'dx-admissions', 'dx-orders',
]

/** Every tree node this view draws, for the frame's route table. */
export const EXCHANGE_NODES = [...MANUAL_NODES, ...Object.keys(SCREENS)]

export function ExchangeView({ node, go }: { node: string; go: ExchangeGo }) {
  const folder = manualEntryFolder(node)
  if (folder) return <ManualEntryView key={node} folder={folder} go={go} />
  return SCREENS[node]?.(go) ?? null
}
