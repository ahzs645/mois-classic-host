/* Side-effect imports: the hand-built Reports-module windows that do not fit
   the generic Selection Parameter form (screens/ReportSpecWindow.tsx). Each
   registers itself with registerAreaWindow and is named by its spec's
   `window`; add a file here when a report needs its own window. */
import './AuditReportWindows'
import './AccessReportWindows'
