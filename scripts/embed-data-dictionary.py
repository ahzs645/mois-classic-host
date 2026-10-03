#!/usr/bin/env python3
"""Embed the MOIS Data Dictionary field audit as the emulator's dictionary.

    python3 scripts/embed-data-dictionary.py <audit-dir> [<workbook.xlsx>]

<audit-dir> is the output folder of the 2026-08 field audit (the one holding
`audit-inventory.json` and `evidence/<id>/result.json`). The workbook is the
MOIS Data Dictionary the audit was run against; its path defaults to the
`sourcePath` the inventory records. The `Matrix` sheet is the dictionary;
`Matrix (2)` is an older draft of it and is not read.

Each audited row becomes one entry: where the field sits in MOIS (the
workbook's Module (1) ... Field (10) path), what the workbook says it stores
(Table Name, Field Name, Field Type, Field Format, Character Length) and its
Notes on the field's behaviour, what
MOIS itself answered when the field was focused and Ctrl+Shift+A pressed (the
verified table and column), and which of MOIS's audit answers that was.

Only structure is carried over. The evidence notes describe the synthetic
DEV records each check was run against, so they are left behind; the evidence
ID names the folder that holds them.

Writes src/data/dataDictionary.generated.ts.
"""
import json
import os
import re
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:  # pragma: no cover - the script's one dependency
    sys.exit('needs openpyxl: python3 -m pip install openpyxl')

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'data' / 'dataDictionary.generated.ts'

PATH_KEYS = [
    'module', 'folder', 'subFolder', 'subSubFolder', 'tab', 'subTab',
    'popOutWindow', 'popOutWindowTab', 'fieldHeading', 'field', 'subField',
]

# What MOIS did on Ctrl+Shift+A, as the audit recorded it, sorted into the
# answers the emulator reproduces.
#   not-available  "Audit Information Not Available" naming the table and
#                  column, then "Register Table - Field" (references/
#                  field-audit.md, two-stage sequence). The audit logged the
#                  same dialog under two names in different batches.
#   register       only the "Register Table - Field" prompt
#   report         the Print Preview of a Change Audit Report: the field is
#                  registered with the audit service
#   none           nothing happens: a display-only grid, a navigation link,
#                  a workflow button
#   untested       MOIS's answer is not known (no row to focus, focus stuck
#                  on a neighbour, an illegible dialog)
NOT_AVAILABLE = {
    'Unregistered field', 'Audit Information Not Available', 'Two unregistered fields',
    'Composite fields',
}
REGISTER = {
    'Register Table - Field', 'Register Table - Field prompt', 'Registration offered; mapping not shown',
}
REPORT = {
    'Blank Change Audit Report', 'Blank audit report', 'Blank change audit report',
    'Blank Change Audit Report preview', 'Change Audit Report', 'Change Audit Report with saved history',
    'Registration prompt or blank audit report',
}
NONE = {
    'No audit response', 'No response to Ctrl+Shift+A', 'No dialog', 'No audit dialog for the relationship container',
    'Workflow action', 'No data-field focus (read-only label)', 'Underlying Goal field only',
    'Underlying Condition field only', 'Underlying Planned Action field only', 'No identifier; switched to empty Links tab',
}

# Later read-only rechecks in the live TRAINING client (2026-09-21, Ctrl+Shift+A
# through the On-Screen Keyboard), which settle rows the August pass left for
# manual review. Webforms keeps the same list in
# lib/mois-field-connections/live-rechecks.ts; the two must agree (its
# mois-data-dictionary test compares them).
RECHECKS = {
    'MATRIX-R0008-chart-no': ('tdt_chart', 'num_chart'),
    'MATRIX-R0064-dep-no': ('tdt_chart', 'str_department'),
    'MATRIX-R0037-postal-code': ('tdt_chart', 'str_postal_code'),
    'MATRIX-R0039-home-phone': ('tdt_chart', 'str_phone1'),
    'MATRIX-R0041-work-phone': ('tdt_chart', 'str_phone2'),
    'MATRIX-R0044-cell-phone': ('tdt_chart', 'str_phone3'),
}

COLUMN = re.compile(r'^[a-z][a-z0-9_]*$')
TABLE = re.compile(r'^tdt_[a-z0-9_]+$')


def clean(value):
    if value is None:
        return ''
    return re.sub(r'\s+', ' ', str(value)).strip()


def columns_of(text):
    """`dtm_a / dtm_b` and `num_a + str_b` name a composite's parts in order."""
    parts = [p.strip() for p in re.split(r'\s*[/+]\s*', text or '') if p.strip()]
    return parts if parts and all(COLUMN.match(p) for p in parts) else []


def audit_kind(dialog, has_mapping):
    if dialog in NOT_AVAILABLE:
        return 'not-available' if has_mapping else 'untested'
    if dialog in REGISTER:
        return 'register'
    if dialog in REPORT:
        return 'report'
    if dialog in NONE:
        return 'none'
    return 'untested'


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    audit = Path(sys.argv[1]).expanduser()
    inventory = json.loads((audit / 'audit-inventory.json').read_text())
    workbook_path = Path(sys.argv[2] if len(sys.argv) > 2 else inventory['sourcePath']).expanduser()
    sheet = openpyxl.load_workbook(workbook_path, read_only=True, data_only=True)['Matrix']
    rows = {i: row for i, row in enumerate(sheet.iter_rows(values_only=True), start=1)}
    header = [clean(h) for h in rows[2]]
    col = {name: header.index(name) for name in (
        'Table Name', 'Field Name', 'Field Type', 'Field Format', 'Character Length', 'Field - Coded Type', 'Notes',
    )}

    entries = []
    for candidate in inventory['candidates']:
        evidence_id = candidate['evidenceId']
        result_path = audit / 'evidence' / evidence_id / 'result.json'
        result = json.loads(result_path.read_text()) if result_path.exists() else {}
        row = rows.get(candidate['sourceRow'])
        if row is None:
            sys.exit(f'{evidence_id}: workbook row {candidate["sourceRow"]} is missing')

        at = {k: clean(candidate.get(k)) for k in PATH_KEYS}
        at = {k: v for k, v in at.items() if v}

        workbook = {
            'table': clean(row[col['Table Name']]),
            'field': clean(row[col['Field Name']]),
            'type': clean(row[col['Field Type']]),
            'format': clean(row[col['Field Format']]),
            'length': clean(row[col['Character Length']]),
            'coded': clean(row[col['Field - Coded Type']]),
            # the analysts' note on how the field behaves ("Only available with
            # Order Type: 'Lab'", "Autofills from demographics")
            'note': clean(row[col['Notes']]),
        }
        workbook = {k: v for k, v in workbook.items() if v}

        verified_table = clean(result.get('verifiedTable'))
        verified_columns = columns_of(clean(result.get('verifiedField')))
        verified = None
        if TABLE.match(verified_table) and verified_columns:
            verified = {'table': verified_table, 'columns': verified_columns}

        status = clean(result.get('status')) or 'Pending'
        dialog = clean(result.get('auditDialog'))
        if evidence_id in RECHECKS:
            table, column = RECHECKS[evidence_id]
            verified = {'table': table, 'columns': [column]}
            status, dialog = 'Verified', 'Audit Information Not Available'
        entry = {
            'id': evidence_id,
            'row': candidate['sourceRow'],
            'at': at,
            'workbook': workbook,
            'status': status,
            'audit': audit_kind(dialog, verified is not None),
            'dialog': dialog,
        }
        if verified:
            entry['verified'] = verified
        entries.append(entry)

    counts = {}
    for e in entries:
        counts[e['audit']] = counts.get(e['audit'], 0) + 1

    lines = [
        '/* GENERATED by scripts/embed-data-dictionary.py from the MOIS Data Dictionary field audit — do not edit.',
        f'   {len(entries)} rows of the workbook\'s Matrix sheet, each with the answer MOIS gave on Ctrl+Shift+A.',
        '   Audit answers: ' + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())) + '. */',
        "import type { DictionaryEntry } from './dataDictionary'",
        '',
        'export const DATA_DICTIONARY_ENTRIES: readonly DictionaryEntry[] = [',
    ]
    for e in entries:
        lines.append('  ' + json.dumps(e, ensure_ascii=False, separators=(',', ':')) + ',')
    lines.append(']')
    lines.append('')
    OUT.write_text('\n'.join(lines))
    print(f'wrote {os.path.relpath(OUT, ROOT)}: {len(entries)} entries ({counts})')


if __name__ == '__main__':
    main()
