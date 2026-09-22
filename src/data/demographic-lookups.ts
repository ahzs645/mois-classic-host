// Service center list transcribed from the supplied 2026-09-22 capture.
// Lookup choices, never patient records; not a complete directory export.
export const demographicServiceCenters = [
  ['CARDIAC REHAB', 'CARDIAC REHABILITATION'], ['DIAB ED FJN', ''], ['FJN PNC', 'FJN PRENATAL CLINIC'],
  ['KITIMAT', ''], ['PCPC ENROLLED', 'PCPC Enrolled Patient'], ['PH', 'PUBLIC HEALTH'],
  ['PRINCE GEORGE', ''], ['PRINCE RUPERT', ''], ['QUESNEL', ''], ['TERRACE', ''], ['VALEMOUNT', ''], ['VANDERHOOF', ''],
  ['ADDICTION', '', 'inactive'], ['COAST', 'COM OUT & ASS SERV TEAM', 'inactive'], ['FULL', '', 'inactive'],
  ['IHS', 'INTEGRATED HEALTH SERVICES', 'inactive'],
].map(([code, description, state]) => ({ code, description, inactive: state === 'inactive' }))
