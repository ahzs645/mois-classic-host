# Local chart attachments

The repository's chart attachment entries are placeholders. PDF files and
decoded letter text in this directory are local data and are ignored by Git.

Import a real chart export with `node scripts/import-chart.mjs <export folder>/0001.xml`
from the host directory. The importer copies the export's attachments here and
regenerates its chart manifest. Register new charts in `src/data/charts/index.ts`
and `src/data/charts/attachments.ts`. Viewers show the real attachments when
those local files are available; otherwise they explain that the entry is a
placeholder. Attachment contents must not be committed to the repository.
