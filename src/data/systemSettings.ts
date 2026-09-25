/* ============================================================================
   Administration ▸ Configuration ▸ System Settings — every band and its rows.

   The current build lists its bands alphabetically (article 303124: "The
   list is organized alphabetically"), which is the order the stage's status
   bar version (v02.31) paints and the order below. The How-Do-I articles'
   own screenshots are older v02.21.12 b161125 / v02.19.04 captures with a
   different, non-alphabetical order (PRODUCT KEY, GLOBAL, MSP, …, LOCKOUT
   last — `3853719f…`); lessons describe the order this list has.

   Rows are transcribed from 303124's cropped, current-build image of each
   band — name, value and description exactly as printed, MOIS's own
   spellings kept ("upaid", "befoe", "Folded", "BIlling", "overriden").
   `locked` marks a value MOIS paints grey (a PROTECTED row, or one the
   current build will not let you type in).

   Source per band:
     APP SETTING                    `fabe5d8f…` (303171, v02.21.12) — the
                                    first 25 rows, the capture's order;
                                    the MOIS Viewer Mode description reads
                                    `E (Embedded)`, as captured
     APP SETTING - ADDRESS BOOK     `91140444…`
     APP SETTING - CARECONNECT      `8dd46e13…`
     APP SETTING - CPP RX           `7daf406e…`
     APP SETTING - DESKTOP PROVIDER `1074592b…`
     APP SETTING - HTML FORMS       `5d9043da…`
     APP SETTING - MOIS WEB         `6250cfa8…`
     APP SETTING - PRINT PREVIEW    `9fd0c4ee…`
     APP SETTING - RX               `779e8b23…`
     APP SETTING - SRFAX            `3647cce5…`
     APP SETTING - STARTUP          `ee063037…`
     APP SETTING - TELEHEALTH       `b0efcaf7…`
     APP SETTING - UPGRADES         `053898b2…`
     APP SETTING - WORKSPACE        `a7da7293…`
     CHART                          `5e64736a…`
     CLOUD - FILE REDIRECT          `8acf598a…`
     GLOBAL                         `fe9f4e71…` (42 rows)
     HELP MENU                      `9914a832…` (38 rows)
     INVOICE STATEMENT              `179996f4…`
     LAB INTERFACE                  `8d605634…`
     LABEL PRINTING                 `1b6a9aa8…`
     LABEL PRINTING - NAME FORMAT   `375eb74f…`
     LOCKOUT                        `3853719f…` (303352; the description of
                                    Lockout Ends is cut at the capture's
                                    edge after "hh:mm" — 303352's prose
                                    gives the rest of the format)
     MSP                            `ca7604fa…`
     NOTIFICATION                   `35dbfdbc…`
     NOTIFICATION SERVICE           `1ae83578…`
     PRINTER                        `44e2ad70…`
     PRINTERS                       `ab8f8027…`
     PRODUCT KEY                    `3d802b72…`
     PROTECTED                      `bb70f775…`
     REPORT OPTIONS                 `891409ba…`
     RXPRINTER - DOT MATRIX         `dc5a3f01…`
     RXPRINTER - WINDOWS            `70e4c79a…`
     SCHEDULER                      `3af66065…`
     SUMMARY                        `c4c8c1f6…`
     USER                           `f7163468…`
     UTILITY                        `b05dbafe…`

   The band list itself is `00d2c33d…` (current build) for the APP SETTING
   run: it has STARTUP and no PATIENT SUMMARY band, so neither does this.
   303124's jump list also names an `App Setting - CPSBC` that no capture
   shows; it is left out rather than drawn empty.
   ========================================================================= */

export type SystemSetting = {
  band: string
  name: string
  value: string
  desc: string
  /** painted grey: a protected or read-only value */
  locked?: boolean
}

type Row = [name: string, value: string, desc: string, locked?: boolean]

const band = (name: string, rows: Row[]): SystemSetting[] =>
  rows.map(([n, value, desc, locked]) => ({ band: name, name: n, value, desc, ...(locked ? { locked } : {}) }))

const YN = '(Y)es or (N)o'
const CUSTOM_LABEL = 'Label for the custom website menu item'
const CUSTOM_ADDRESS = 'Address for the custom website menu item'
const NAME_ORDER = 'Define Name Format Order'
const INCHES = 'Inches (0.5 = half inch)'
const OBSOLETE = 'OBSOLETE - SEE SERVICE GROUPS'
const PROTECTED_ADMIN = 'Must be changed be a system administrator'

export const SYSTEM_SETTINGS: SystemSetting[] = [
  ...band('APP SETTING', [
    ['New Row Location', 'A', '(A)fter current row / (B)efore current row'],
    ['Idle Time-out', '60', 'Idle Time-out period to shutdown MOIS (minutes)'],
    ['Chart Lookup View', 'C', 'A (note/provider), B (provider/location), C (note/Location)'],
    ['D/E Distribution', 'ON', 'Turns (ON) / (OFF) the auto distribution for the manual entry'],
    ['Log-In Type', 'B', '(B)lank or (W)indows User'],
    ['Encounter Window Limit', '1', 'Maximum number of encounters window that can be open'],
    ['Flow Sheet Order', 'A', '(A)scending or (D)escending from Left to Right.'],
    ['Flow Sheet Period', '2', 'Default Period Length in Years.'],
    ['Document Locking', '5', 'Number of days after a document is created that the content locks'],
    ['Billing Ref Doc Alert', 'OFF', 'Alert user if a bill is prepared without a referring doctor'],
    ['Double Booking Alert', 'Off', 'Alert user when double-booking occurs from the scheduler'],
    ['Validate ICBC Claim No', 'YES', 'Toggle the ICBC Claim validation (Y)es or (N)o.'],
    ['Validate SIN No', 'YES', 'Toggle the SIN No MOD validation (Y)es or (N)o.'],
    ['Postal Code Service', 'YES', 'Is the postal code service enabled (Y)es or (N)o'],
    ['Eligibility Checking', 'YES', 'Is the MSP Eligibility Checking service enabled (Y)es or (N)o'],
    ['MOIS Viewer Mode', 'SI', 'MOIS Viewer Mode: S (Standalone), E (Embedded), SI (both)'],
    ['MOIS Viewer Types', 'TIF,JPG,JPE,PNG,BMP,GIF', 'Supported file types for the MOIS Viewer'],
    ['Spell Checker Disabled', 'NO', 'Is the spell checker disabled: Letter Writer (LW), No (NO)'],
    ['MAR Require Encounter', 'NO', 'YES or NO are valid options - NO is the default.'],
    ['MAR Admin Record User Lock', 'OFF', 'ON or OFF are valid options - OFF is the default.'],
    ['MAR Ordering', 'ON', 'ON or OFF are valid options - ON is the default.'],
    ['Require Reason to Delete', 'OFF', '(ON/OFF) When ON, enforce that a reason is entered on a delete'],
    ['OCR Enabled', 'Y', 'Determines whether the OCR feature is available (Y/N)'],
    ['Referral Mode', 'N', 'Use (S)tandard or (N)ew Referral Mode (When CDX-E2E is on)'],
    ['Electronic Interfaces Lookback', '90', 'Default number of days to look back in Electronic Interfaces'],
  ]),
  ...band('APP SETTING - ADDRESS BOOK', [
    ['Enable Address Book', 'Y', YN],
    ['Create External Organization from Window', 'N', '(E)verybody, (R)estricted, or (N)o'],
    ['Create External Provider from Window', 'N', '(E)verybody, (R)estricted, or (N)o'],
  ]),
  ...band('APP SETTING - CARECONNECT', [
    ['Enabled', 'N', 'Is the service Enabled (Y)es/(N)o'],
    ['URL', 'https://demo-careconnect.ca/Welcome/Search', 'URL for the CareConnect Service'],
    ['Parm: Organization', '', 'This parameter is used as a routing control.'],
    ['Parm: Domain', '', 'This is an optional domain - entry point - for CareConnect.'],
  ]),
  ...band('APP SETTING - CPP RX', [
    ['Enable Controlled Prescriptions Feature', 'Y', '(Y)es or (N)o to turn on or off the controlled prescriptions feature'],
    ['Who can create controlled prescriptions', 'P', '(E)verybody or Requires (P)ermission'],
  ]),
  ...band('APP SETTING - DESKTOP PROVIDER', [
    ['Exclude Private Schedules', 'N', '(Y)es to exclude private schedules; (N) to include private schedules'],
  ]),
  ...band('APP SETTING - HTML FORMS', [
    ['ForceOverride', 'N', 'Y (INI file is ignored) / N (INI file takes precedence)', true],
    ['SessionType', 'None', 'None/PerLogin/OnDemand', true],
    ['ApiServer', '', 'Enter the server address, e.g. http://localhost:5000/'],
    ['FormViewer', '', 'Optional. A valid file path such as c:\\aihs\\mois\\Utils\\FrameApp.exe.... or WEB to use the users browser.'],
    ['FormViewerArgs', '', 'Optional. Any additional cmdline switches to be passed to FrameApp.exe'],
  ]),
  ...band('APP SETTING - MOIS WEB', [
    ['Chart tab enabled', 'N', 'Is the service enabled (Y)es/(N)o', true],
    ['Composer API Service', '', 'URL of the Composer API Service for filling PDF Forms'],
  ]),
  ...band('APP SETTING - PRINT PREVIEW', [
    ['SaveAs PDF Method', '2', '0 - Distill / 2 - Native'],
    ['SaveAs PDF Standard', '0', '0 - None ; 1 - PDF/A-1a ; 2 - PDF/A-1b ; 3 - PDF/A-3a ; 4 - PDF/A-3b ; 5 - PDF/A-3u'],
  ]),
  ...band('APP SETTING - RX', [
    ['Dispense Phrase', 'DISPENSE', 'Phrase for Printed Prescriptions'],
    ['Dispense Separator', '', "Separator between Dose/Freq and Amount 'DISPENSE' (newline for a new line)"],
  ]),
  ...band('APP SETTING - SRFAX', [
    ['Enabled', 'Y', 'Is the service enabled (Y)es/(N)o'],
    ['URL', 'https://www.srfax.com/SRF_SecWebSvc.php', 'SRFax URL - Required'],
    ['Max File Size (MB)', '50', 'Maximum file size supported by SRFax in megabytes', true],
    ['Cover Page', 'O', '(N)one, (O)ptional, (R)equired'],
  ]),
  ...band('APP SETTING - STARTUP', [
    ['Alternate Launch Enabled', 'N', ''],
    ['Tracking Board (VP)', '<security profile>', OBSOLETE],
    ['Tracking Board (VMOA)', '<security profile>', OBSOLETE],
    ['Tracking Board (ADMIN)', '<security profile>', OBSOLETE],
    ['Quick Encounter (VP)', '<vp security profile>', OBSOLETE],
    ['My Encounters (VP)', '<security role>', OBSOLETE],
    ['Tracking Board - Refresh', '120', 'Auto-refresh frequency (seconds)'],
  ]),
  ...band('APP SETTING - TELEHEALTH', [
    ['Enabled', 'Y', 'Are Telehealth features enabled (Y)es/(N)o'],
  ]),
  ...band('APP SETTING - UPGRADES', [
    ['Enable startup upgrade notice', 'N', YN],
    ['Who receives an upgrade notice', 'E', '(E)verybody or Requires (P)ermission'],
  ]),
  ...band('APP SETTING - WORKSPACE', [
    ['Enable Message Attachments', 'N', YN],
    ['Enable Temporary Memberships', 'N', YN],
    ['Who can create temporary memberships', 'E', '(E)verybody or Requires (P)ermission'],
  ]),
  ...band('CHART', [
    ['Display Name Format', '111210', '1##### = First Middle Last // 2##### = Last First Middle // #0#### = Omit Name - #1#### = Include Name - #2#### = Include Initial // Option,First N,'],
  ]),
  ...band('CLOUD - FILE REDIRECT', [
    ['Enabled', 'N', 'Enable file redirect service - (Y)es or (N)o'],
    ['Redirect Support', 'N', 'Redirect the MOIS Remote Support Tool - (Y)es or (N)o'],
    ['File Types', 'HTML,CSV,DMG,EML', 'A list of file types to redirect.'],
    ['Launch Delay', '0', 'Number of seconds to "pause" befoe launching redirect'],
    ['Utility', '"C:\\Program Files (x86)\\TerminalWorks\\TSPrint Server\\pdf...', 'Path to utility - if space in path, include quotes.', true],
  ]),
  ...band('GLOBAL', [
    ['Label Doctors', 'Halliwell Medical Clinic', 'Clinic / Doctor Name'],
    ['Facility Address 1', '200 - 1110 6th Ave', "Clinic's address field 1"],
    ['Facility Address 2', 'Prince George, BC', "Clinic's address field 2"],
    ['Postal Code', 'V2L3M6', "Clinic's postal code"],
    ['Clinic Fax', '2505642655', "Clinic's fax number"],
    ['Clinic Phone', '2505642644', "Clinic's phone number"],
    ['Facility Number', '00000', 'Used for MSP Billing'],
    ['Subfacility Number', '00000', 'Used for MSP BIlling'],
    ['ICBC Vendor Number', '', "Clinic's ICBC Vendor Number"],
    ['Default Clarification', 'PG', 'Code for Rural Retention Program, used in Unsent to MSP Records'],
    ['Default Location', 'A', 'Used in Unsent to MSP Records'],
    ['Default Visit Code', 'R', 'Used when booking patients'],
    ['Default Visit Mode', '140182721000087101', 'Used when booking patients'],
    ['Service Code Default', '00100|VISIT IN OFFICE (AGE 2 - 59)|BCMSPFEE', 'System settings (this value can be set for each provider)', true],
    ['Service Code Option 1', '14033|ANNUAL COMPLEX CARE MANAGEMENT FEE|BC...', 'System settings (this value can be set for each provider)', true],
    ['Service Code Option 2', '15130|URINALYSIS - SCREENING|BCMSPFEE', 'System settings (this value can be set for each provider)', true],
    ['Service Code PCPC', '96198||', 'BC PCPC Default Fee Code for Enrolled Patient (applies to all providers, unless overriden at the provider level)', true],
    ['HST', '0.07', 'HST Tax Rate'],
    ['GST', '0.05', 'GST Tax Rate'],
    ['PST', '0.07', 'PST Tax Rate'],
    ['Interest Rate', '0.015', 'Interest amount on invoice'],
    ['Shared Folder', 'C:\\AIHS\\SHARED_FOLDER\\', 'Common Shared folder that contains mois system files.'],
    ['Document Folder', 'C:\\AIHS\\SHARED_FOLDER\\documents\\', 'Document storage folder (must end with a back slash).'],
    ['MSP Folder', 'C:\\AIHS\\SHARED_FOLDER\\msp\\', 'MSP Shared Folded (must end with a back slash).'],
    ['Default Folder', '<user>', 'Default folder for file attachments (must end with a back slash).'],
    ['CDX Executable Path', 'C:\\AIHS\\MOIS\\Utils\\cdx\\cdx.exe', 'Path to Clinical Document Exchange utility'],
    ['CDX Folder', 'C:\\AIHS\\SHARED_FOLDER\\CDX\\', 'Folder for shared CDX system files and data exchange.'],
    ['Default Scanning Location', 'C:\\AIHS\\SHARED_FOLDER\\scanning\\', 'Default file system or network location to put scanned files.'],
    ['MOIS Updater Executable Path', 'C:\\AIHS\\MOIS\\Utils\\macs\\macs.exe', 'Path to executable used to update MOIS'],
    ['Paper Forms Folder', 'C:\\AIHS\\SHARED_FOLDER\\pforms\\', 'Paper Form storage folder (must end with a back slash)'],
    ['Scanned Page-size Threshold', '1000', 'Largest size (KB) of a scanned page before users are warned.'],
    ['CDA Message Generation', 'v2', 'Version of CDA Message Generation to use (v1 / v2)'],
    ['Client Installer Folder', 'C:\\AIHS\\SHARED_FOLDER\\version\\', 'Client installer folder (must end with a back slash)'],
    ['User Manual Location', 'https://mymois.helpdocsonline.com/o5jsk7cxdjes4n3yhc3rfo...', 'URL of user manual'],
    ['Release Notes Location', 'https://mymois.helpdocsonline.com/o5jsk7cxdjes4n3yhc3rfo...', 'URL of release notes'],
    ['Drug Database', 'S', '(S)hared: Separate Database, (L)ocal Only: Same database'],
    ['Export Root', '', 'Export Folder (must end with a back slash)'],
    ['Site Code', '', 'AMCARE Site Code'],
    ['Site Name', '1000010', 'AMCARE Site Name'],
    ['XML File Location', '', 'AMCARE XML File Output Location'],
    ['Area Code', '250', 'Default Area Code Prefex'],
    ['User Fee', '0', 'Outstanding User Fee (Legacy)'],
  ]),
  ...band('HELP MENU', [
    ['User Manual Visible', 'Y', 'Is the User Manual shown in the help menu (Y)es or (N)o'],
    ['Context Help Visible', 'N', 'Is the Context Help shown in the help menu (Y)es or (N)o'],
    ['Website Label', 'Bright Health Web Site', 'Label that is shown for the website menu item'],
    ['Website Address', 'http://brighthealth.ca', 'Address for the website menu item'],
    ['Pathways Label', 'Pathways', 'Label that is shown for the Pathways menu item'],
    ['Pathways Address', 'https://pathwaysbc.ca/', 'Address for the Pathways menu item'],
    ['Electronic Fax Label', 'Electronic Fax', 'Label shown for the Electronic Fax menu item'],
    ['Electronic Fax Address', 'https://www.srfax.com/healthcare-plan-category/aihs-online...', 'Address for the Electronic Fax menu item'],
    ['Request Support Label', 'Request Support', 'Label that is shown for the Request Support menu item'],
    ['Request Support Address', '', 'URL that is used for the Request Support menu item. If empty, the First E-mail Address is used.'],
    ['First E-mail Label', 'Request Support', 'Label that is shown for the first e-mail menu item'],
    ['First E-mail Address', 'support@mymois.ca', 'E-mail address that is used for the first e-mail menu item'],
    ['First E-mail Body', 'Please provide as much information as possible, such as...Ar...', 'The content that will be injected into the support request email.'],
    ['First E-mail Subject', 'Request For Support From MOIS Application', 'Default subject for the first e-mail menu item'],
    ['Second E-mail Label', 'Contact Us (e-mail)', 'Label that is shown for the second e-mail menu item'],
    ['Second E-mail Address', 'info@brighthealth.ca', 'E-mail address that is used for the second e-mail menu item'],
    ['Second E-mail Subject', 'Contact Request From MOIS Application', 'Default subject for the second e-mail menu item'],
    ['Remote Support Visible', 'Y', 'Is Launch Remote Support shown in the help menu (Y)es or (N)o'],
    ['Remote Support (MacOS) Visible', 'N', 'Is Launch Remote Support (MacOS) shown in the help menu (Y)es or (N)o'],
    ['Custom Website 1 Label', 'Speech Recognition', CUSTOM_LABEL],
    ['Custom Website 1 Address', 'http://speakeasysolutions.com/products/dragon/dragon-me...', CUSTOM_ADDRESS],
    ['Custom Website 2 Label', 'Pharmanet (via Medinet)', CUSTOM_LABEL],
    ['Custom Website 2 Address', 'https://swan.medinet.ca/cgi-bin/aihs.cgi', CUSTOM_ADDRESS],
    ['Custom Website 3 Label', 'Up To Date', CUSTOM_LABEL],
    ['Custom Website 3 Address', 'http://www.uptodate.com/home', CUSTOM_ADDRESS],
    ['Custom Website 4 Label', 'CPSBC Library', CUSTOM_LABEL],
    ['Custom Website 4 Address', 'helper|nvo_cpsbc', CUSTOM_ADDRESS],
    ...[5, 6, 7, 8, 9, 10].flatMap((n): Row[] => [
      [`Custom Website ${n} Label`, '', CUSTOM_LABEL],
      [`Custom Website ${n} Address`, '', CUSTOM_ADDRESS],
    ]),
  ]),
  ...band('INVOICE STATEMENT', [
    ['Interest Statement', '1.5% for 30 days past due.', 'This line appears as the interest line in the invoice'],
    ['Footer Line 1', 'Accounts upaid after 30 days subject to interest charges', 'First line in the invoice footer'],
    ['Footer Line 2', 'Accounts upaid after 90 days sent to Collection agency', 'Second line in the invoice footer'],
  ]),
  ...band('LAB INTERFACE', [
    ['Auto-Acknowledge', 'ON', 'ON/OFF - Automatically check DUPLICATE InBasket items related to new messages.'],
  ]),
  ...band('LABEL PRINTING', [
    ['Version', 'V1', 'Label Printing Version (V1, V2)'],
    ['Customize Setting', 'OFF', 'Customize the label settings (ON / OFF)'],
    ['Top Margin', '.25', INCHES],
    ['Bottom Margin', '.25', INCHES],
    ['Left Margin', '.25', INCHES],
    ['Right Margin', '.25', INCHES],
    ['Font Name', 'Arial', 'Name of type face (ie Arial, Courier ...)'],
    ['Font Height', '8', '8 = 8 Point, 10 = 10 Point'],
    ['Label Width', '2.10', INCHES],
    ['Default Labels', '1', 'Default Value for number of labels'],
  ]),
  ...band('LABEL PRINTING - NAME FORMAT', [
    ['Detail Label', 'F M L', NAME_ORDER],
    ['Chart Detail Label', 'L, f m', NAME_ORDER],
    ['Chart Top Label', 'L, f m', NAME_ORDER],
    ['Chart Bottom Label', 'L, f m', NAME_ORDER],
    ['Envelope Label', 'F M L', NAME_ORDER],
    ['Referral Label', 'F M L', NAME_ORDER],
    ['1 Inch Label', 'L, f m', NAME_ORDER],
  ]),
  ...band('LOCKOUT', [
    ['Lockout Message', '', 'Message to show when locking out users.'],
    ['Lockout Ends', '', 'Date and time of lock expiry (format: yyyy-mm-dd hh:mm).'],
  ]),
  ...band('MSP', [
    ['ClaimFile', 'send.dat', 'Send file name'],
    ['FeeFile', 'feemsp.asc', 'Fee file name'],
    ['RemitFile', 'receive.dat', 'Receive file name'],
  ]),
  ...band('NOTIFICATION', [
    ['Log Message', 'ON', 'ON or OFF -> invalid entry will result in ON.'],
    ['Log Reminder', 'ON', 'ON or OFF -> invalid entry will result in ON.'],
    ['Log Task', 'ON', 'ON or OFF -> invalid entry will result in ON.'],
  ]),
  ...band('NOTIFICATION SERVICE', [
    ['Timer Interval', '60', 'Seconds -> invalid entry will result in 300 (5 minute)'],
    ['Include Blended Tasks', 'N', "Includes a user's current blended workspace records in the task notification bar: (Y)es/(N)o"],
    ['Include Blended Messages', 'N', "Includes a user's current blended workspace records in the message notification bar: (Y)es/(N)o"],
  ]),
  ...band('PRINTER', [
    ['Print Compress', '027015027048', 'Escape sequence to reset printer'],
    ['Print Release', '018', 'Legacy'],
    ['Release', '', 'Legacy'],
  ]),
  ...band('PRINTERS', [
    ['Form', 'Microsoft Office Document Image Writer', ''],
    ['Label', 'lpt1:', ''],
    ['Character Based - Label Printer', 'Y', ''],
    ['Report', 'CutePDFWriter', ''],
    ['Rx', 'Default', ''],
    ['Character Based - Rx Printer', 'N', ''],
    ['Remote Printer Redirect Enabled', 'N', 'Turns on the MOIS printer naming redirect service - (Y)es or (N)o'],
    ['Remote Printer Redirect Pattern', ' (redirected {SessionID})', 'Printer Name redirected suffix applied by the remote host.'],
    ['Session Default Printer', '', 'Named Printer from Available Printers'],
  ]),
  ...band('PRODUCT KEY', [
    ['Key', 'moiskey:2:moisdb_l007:l007:20220819:20300819:7df1a38e...', 'MOIS Product Key'],
    ['Select User Name 1', 'zz.aihs.ahalliwell', 'User to notify when 30 days left on product key', true],
    ['Select User Name 2', '', 'User to notify when 30 days left on product key'],
    ['Select User Name 3', '', 'User to notify when 30 days left on product key'],
  ]),
  ...band('PROTECTED', [
    ['Data Center', 'V3047', PROTECTED_ADMIN, true],
    ['MSP Prepare Bills Error Logging', 'OFF', 'MSP Prepare Bills Error Logging (ON) or (OFF).', true],
    ['Check Code Mapping', 'N', '(Y) Always use Code Mapping lookup even if an MSP acceptable code used. (N) Default. Only use look up if an MSP unacceptable Diag Code is used.', true],
    ['BC PCPC Service Center', 'PCPC ENROLLED', 'BC PCPC Service Center indicator for enrolled patients.', true],
    ['BC PCPC Site', 'NO', 'BC PCPC Site indicator (Y)es or (N)o w/ No as default.', true],
    ['BC PCPC Standard Code', '96198', 'BC PCPC Standard Fee Code.', true],
    ['PCPC Submit Standard Claim', 'OFF', 'BC PCPC Standard Claim billing flag (ON) or (OFF).', true],
    ['First Sequence Number', '1', PROTECTED_ADMIN, true],
    ['Last Sequence Number', '642', PROTECTED_ADMIN, true],
    ['Encounter Note User Lock', 'ON', 'Please contact AIHS to disable feature', true],
    ['Abnormal Flag Highlight', '"A","AA","L","LL","H","HH","CRI"', 'Abnormal flag codes contained within this list will be highlight on a patient chart / or list', true],
    ['Lab Inbox', '500033', 'Default User Profile For Incoming Labs', true],
    ['CDX E2E Enabled', 'Y', 'Determines whether Send buttons for E2E messaging are visible (Y/N)', true],
    ['Protect Chart Export', 'N', 'Is the chart export protected (Y)es/(N)o', true],
    ['Health Number Jurisdiction', 'BC', "Chart's Health Number Field Jurisdiction", true],
    ['Chart Export Function Version', '00.00.00', 'Current Version of the Export Functions', true],
  ]),
  ...band('REPORT OPTIONS', [
    ['Appointment Card', 'D', '(G)eneral or (D)etail - includes most recent and future appointments'],
    ['Appointment Card - F1', '', 'Footnote 1'],
    ['Appointment Card - F2', '', 'Footnote 2'],
    ['Appointment Card - F3', '', 'Footnote 3'],
    ['Referral Report - F1', "A summary of this patient 's current problems, allergies, medic...", 'Footnote 1'],
    ['Referral Report - Hide Booking', 'NO', 'Hide the booking information section on the report (Y)es (N)o.'],
    ['Encounter Care Form Version', 'V1', 'Version of Encounter Care Form (V1 / V2)'],
  ]),
  ...band('RXPRINTER - DOT MATRIX', [
    ['Line per Page', '44', 'Number of lines per page.'],
    ['Char per Line (Rx)', '72', 'Number of characters per line for a prescription'],
    ['Char per Line (Note)', '94', 'Number of characters per line for a note'],
  ]),
  ...band('RXPRINTER - WINDOWS', [
    ['Length', '18000', 'Length of page in INCHES or mm^10'],
    ['Width', '4.25', 'Width of page in INCHES or mm^10'],
    ['Margin - Left', '0.2', 'Left Margin in INCHES or mm^10'],
    ['Margin - Right', '0.2', 'Right Margin in INCHES or mm^10'],
    ['Margin - Top', '0.2', 'Top Margin in INCHES or mm^10'],
    ['Margin - Bottom', '0.2', 'Bottom Margin in INCHES or mm^10'],
    ['Full Page', 'No', 'Full Page Prescriptions Yes Or No.'],
  ]),
  ...band('SCHEDULER', [
    ['Arrival BackGround', '15793151', 'Background Color of Arrived Appointments'],
    ['Arrival Font', '12861504', 'Font Color of Arrived Appointments'],
    ['Cancel', '8884676', 'Background Color of Cancelled Appointments'],
    ['No Shows', '10263708', 'Background Color of No Show Appointments'],
    ['Rebook', '10263708', 'Background Color of Rebook Appointments'],
    ['Shift Indicator', '8684676', 'Block color for off-shift indicator'],
    ['Detail - Week View - 1 Provider', 'N', '(Y)es to show appointment detail in the box. (N)o to hide appointment detail.'],
    ['Detail - Day View - 8 Providers', 'N', '(Y) or (N)'],
  ]),
  ...band('SUMMARY', [
    ['Recent Events', '60', 'Default Recent Event Days on the Patient Summary Page'],
    ['Reminder Days', '90', 'Default Reminder Days on the Patient Summary Page'],
  ]),
  ...band('USER', [
    ['Default Password', 'mois', 'Default password for new users.'],
  ]),
  ...band('UTILITY', [
    ['CDMToolkit', 'cdm_cli.exe', 'CDM Toolkit exe'],
    ['GNUGraph', 'Utils\\Plot', 'Folder location of the plot / graph.'],
  ]),
]

/** Every band, in the order the window paints them (alphabetical). */
export const SETTING_BANDS: string[] = [...new Set(SYSTEM_SETTINGS.map((s) => s.band))]

/** The slug a band's `+` box and a row are anchored by: `host.mois.group.<slug>`. */
export const settingSlug = (text: string) => text
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const NAME_COUNTS = SYSTEM_SETTINGS.reduce((m, s) => m.set(settingSlug(s.name), (m.get(settingSlug(s.name)) ?? 0) + 1), new Map<string, number>())

/**
 * The row's anchor, `host.mois.row.<id>`: the name's slug
 * (`encounter-window-limit`, `log-message`), or `<band>--<name>` for the few
 * names that repeat across bands (Enabled, URL).
 */
export const settingRowId = (s: SystemSetting) => {
  const name = settingSlug(s.name)
  return (NAME_COUNTS.get(name) ?? 0) > 1 ? `${settingSlug(s.band)}--${name}` : name
}

/* ============================================================================
   The lock a Save of the LOCKOUT band sets (article 303352, "Create a
   Lockout").

   System Settings keeps what Save commits in the frame's session store under
   SYSTEM_SETTINGS_KEY (row id → value), so the values outlive the window and
   the Clinic-wide MOIS Lockout window can read them at the next login. The
   article's two rules are the whole test for "a lock is set":
     - "If you do not type a message, your lock will not be set."
     - Lockout Ends "must be in yyyy-mm-dd hh:mm format … If the time and
       date section is left blank, your lock will not be set."
   A lock whose end date is already behind the stage's day has expired.
   Release Lock (fc7d615f…) clears both rows "for all workstations" and
   records LOCKOUT_RELEASED_KEY, so a lesson can grade the release after the
   window has gone.
   ========================================================================= */

/** Session key: the values System Settings' Save has committed, by row id. */
export const SYSTEM_SETTINGS_KEY = 'admin:system-settings'
/** Session key: Release Lock was confirmed with Yes. */
export const LOCKOUT_RELEASED_KEY = 'admin:lockout-released'

export const LOCKOUT_MESSAGE_ROW = 'lockout-message'
export const LOCKOUT_ENDS_ROW = 'lockout-ends'

export type Lockout = { message: string; ends: string }

const LOCK_ENDS = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/

/**
 * The lock the committed settings describe, or null when there is none:
 * no message, an end that is not yyyy-mm-dd hh:mm, or one that has passed.
 * `today` is the stage's `yyyy.mm.dd` (MOIS_TODAY).
 */
export function lockoutOf(saved: Record<string, string>, today: string): Lockout | null {
  const message = (saved[LOCKOUT_MESSAGE_ROW] ?? '').trim()
  const ends = (saved[LOCKOUT_ENDS_ROW] ?? '').trim()
  const m = LOCK_ENDS.exec(ends)
  if (!message || !m) return null
  if (`${m[1]}.${m[2]}.${m[3]}` < today) return null
  return { message, ends }
}
