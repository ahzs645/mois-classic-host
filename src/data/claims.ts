/* ============================================================================
   The training claim lists behind Billing's four "Prompt -" buttons.

   Column sets, their order and their widths are transcribed from the four
   captures of these dialogs on the MOIS help site:
     prompt patient.PNG        MSP Unsent Claims - Ordered by Patient
     prompt provider.PNG       MSP Unsent Claims - Ordered by Doctor
     prompt service date.PNG   the same dialog ordered by service date — note
                               its title bar still reads "Ordered by Patient",
                               which is the application's own bug and is kept
     prompt sent to msp.PNG    Claim Summary: Sent to MSP
     prompt sent by recon.PNG  Advanced Lookup Service ▸ MSP Sent Claim List

   The claims themselves are synthetic training data, like the rest of this
   emulator; they use the charts already in the roster.
   ========================================================================= */

export type UnsentClaim = {
  last: string; first: string; service: string; doctor: string; fee: string
  dob: string; insrBy: string; insrNbr: string; billed: string
  compl: string; hold: string; sub: string
}

export const unsentClaims: UnsentClaim[] = [
  { last: 'BROWN', first: 'FARMER', service: '2026.03.18', doctor: 'BEARDWOOD, WALTER', fee: '13060', dob: '1990.10.23', insrBy: 'BC', insrNbr: '9151259051', billed: '71.50', compl: 'Y', hold: '', sub: '' },
  { last: 'ADAM', first: 'GEORGE', service: '2026.03.18', doctor: 'BEARDWOOD, WALTER', fee: '00100', dob: '1978.02.04', insrBy: 'BC', insrNbr: '9151251882', billed: '33.05', compl: 'Y', hold: '', sub: '' },
  { last: 'HALE', first: 'MARGARET', service: '2026.03.18', doctor: 'SHEWCHUK, LEAH', fee: '00120', dob: '1955.07.19', insrBy: 'BC', insrNbr: '9151253340', billed: '46.20', compl: '', hold: 'Y', sub: '' },
  { last: 'RAO', first: 'PRIYA', service: '2026.03.17', doctor: 'HOWSER, DOOGIE', fee: '00101', dob: '1984.12.02', insrBy: 'BC', insrNbr: '9151257712', billed: '52.80', compl: 'Y', hold: '', sub: '' },
  { last: 'OKONKWO', first: 'SAM', service: '2026.03.17', doctor: 'BEARDWOOD, WALTER', fee: '14070', dob: '1969.05.28', insrBy: 'BC', insrNbr: '9151254496', billed: '125.00', compl: '', hold: '', sub: '' },
  { last: 'FONTAINE', first: 'DALE', service: '2026.03.16', doctor: 'FAIRCHILD, NESRIN L', fee: '13005', dob: '2001.09.11', insrBy: 'BC', insrNbr: '9151258003', billed: '18.40', compl: 'Y', hold: '', sub: '' },
  { last: 'CASTILLO', first: 'JUNE', service: '2026.03.16', doctor: 'DUCHARME, AMARILYS', fee: '00110', dob: '1947.01.30', insrBy: 'BC', insrNbr: '9151250264', billed: '39.95', compl: 'Y', hold: '', sub: 'Y' },
]

export type SentClaim = {
  service: string; diag: string; fee: string; ins: string
  billed: string; paid: string; doctor: string; sent: string
  r1: string; r2: string; wo: string; e1: string; e2: string; e3: string
  ref: string; pract: string; last: string; first: string; m: string; payee: string
}

export const sentClaims: SentClaim[] = [
  { service: '2026.02.11', diag: '780', fee: '13060', ins: 'BC', billed: '71.50', paid: '71.50', doctor: 'BEARDWOOD, WALTER', sent: '2026.02.12', r1: '', r2: 'P', wo: 'N', e1: '', e2: '', e3: '', ref: 'X', pract: '12345', last: 'BROWN', first: 'FARMER', m: '', payee: '00001' },
  { service: '2026.02.11', diag: '401', fee: '00100', ins: 'BC', billed: '33.05', paid: '33.05', doctor: 'BEARDWOOD, WALTER', sent: '2026.02.12', r1: '', r2: 'P', wo: 'N', e1: '', e2: '', e3: '', ref: 'X', pract: '12345', last: 'ADAM', first: 'GEORGE', m: '', payee: '00001' },
  { service: '2026.02.04', diag: '250', fee: '14050', ins: 'BC', billed: '98.60', paid: '0.00', doctor: 'SHEWCHUK, LEAH', sent: '2026.02.05', r1: '', r2: 'R', wo: 'N', e1: 'BA', e2: '', e3: '', ref: 'X', pract: '22781', last: 'HALE', first: 'MARGARET', m: '', payee: '00001' },
  { service: '2026.01.28', diag: '300', fee: '00120', ins: 'BC', billed: '46.20', paid: '41.58', doctor: 'HOWSER, DOOGIE', sent: '2026.01.29', r1: 'A', r2: 'X', wo: 'N', e1: 'CJ', e2: '', e3: '', ref: 'T', pract: '30117', last: 'RAO', first: 'PRIYA', m: '', payee: '00001' },
  { service: '2026.01.21', diag: '724', fee: '00101', ins: 'BC', billed: '52.80', paid: '0.00', doctor: 'BEARDWOOD, WALTER', sent: '2026.01.22', r1: '', r2: 'U', wo: 'N', e1: '', e2: '', e3: '', ref: 'X', pract: '12345', last: 'OKONKWO', first: 'SAM', m: '', payee: '00001' },
  { service: '2026.01.14', diag: '466', fee: '00110', ins: 'BC', billed: '39.95', paid: '39.95', doctor: 'FAIRCHILD, NESRIN L', sent: '2026.01.15', r1: 'R', r2: 'P', wo: 'N', e1: '', e2: '', e3: '', ref: 'X', pract: '41903', last: 'FONTAINE', first: 'DALE', m: '', payee: '00001' },
]
