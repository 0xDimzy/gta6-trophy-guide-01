// Leonida Ledger — my entry for the gta6-trophy-guide-01 bounty (Node 22, standard library only).
//
// What this is: a fully offline trophy guide and tracker for all 55 PlayStation 5 trophies in
// Grand Theft Auto VI. The real product lives in app/ as plain static files — index.html, app.js,
// style.css and data/trophies.json — with no build step, no framework and no network calls beyond
// loading its own JSON. Each trophy carries a guide written in my own words, concrete steps that
// each cite the source page they came from, a missable verdict backed by that evidence, a roadmap
// stage and, where the official description names a number, a counter target for the tracker UI.
// On top of the data the app adds localStorage progress with JSON export/import, kind/grade/text
// filters, a spoiler shield for story trophies, a five-stage platinum roadmap, a missables view
// and a source matrix — all deep-linkable through the URL hash (view, open, earned, spoiler,
// filter, counts) so any state can be screenshotted or shared.
//
// What this file does: it is only the hand-in plumbing. It copies app/ and screenshots/ next to
// this file into the output directory and writes dossier.json there using the vendored make.fun
// library, so the judge sees exactly the screenshots, first-load files and source I shipped.
// vendor/makefun-frontend.ts is intentionally untouched: the scorer recomputes the dossier with
// its own byte-identical copy and expects a match.
//
// Run it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
