#!/usr/bin/env python3
"""Extract names and section labels from a legacy MOIS Dynamic Form CSV dump.

Usage: python3 scripts/extract-dynamic-form-catalog.py '/path/to/Dynamic Form dump.csv'

The PowerBuilder `code` column can span many lines. Only the stable identity
columns are carried into the host; the source CSV is not bundled with it.
"""

import csv
import json
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Pass the path to Dynamic Form dump.csv")
    csv.field_size_limit(sys.maxsize)
    catalog: dict[str, dict[str, object]] = {}
    with Path(sys.argv[1]).open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            form_id = row["formid"].strip()
            if not form_id:
                continue
            form = catalog.setdefault(form_id, {
                "title": row["formtitle"].strip(),
                "group": row["formgroup"].strip(),
                "sections": {},
            })
            section_id = row["subformid"].strip()
            section_name = row["sectionname"].strip()
            if section_id and section_name:
                form["sections"][section_id] = section_name
    output = Path(__file__).resolve().parents[1] / "src/data/legacy-dynamic-form-catalog.json"
    output.write_text(json.dumps(dict(sorted(catalog.items(), key=lambda item: int(item[0]))), indent=2) + "\n")
    print(f"{len(catalog)} forms -> {output}")


if __name__ == "__main__":
    main()
