// Leonida Trophy Guide — GTA VI (PlayStation 5).
//
// An offline, single-page trophy guide and tracker for all 55 official Grand Theft Auto VI trophies.
// The guide lives in app/ as plain static files (index.html, app.js, style.css) with no build step and no
// network requests at runtime; trophy data, guides and sources come from app/data/trophies.json, which is read
// verbatim and never altered. Earned state is stored in localStorage under gta6-trophy-guide-v1 and can be
// exported or imported as JSON. The checklist shows every trophy's official name, description, grade, kind,
// missable flag, roadmap stage, guide text and source links, and supports kind/grade/text filters, a "hide
// earned" toggle and a spoiler setting that masks unearned story trophies. A five-stage roadmap links each
// trophy to its checklist entry, and URL hash routing (#view, #filter, #grade, #spoiler, #hide, #open, #earned)
// lets any view or progress state be shared as a link.
//
// This entry is handed in by main.ts: it copies app/ and screenshots/ next to this file into /output and writes
// /output/dossier.json via the vendored make.fun library (buildDossier). Leave vendor/makefun-frontend.ts as it
// is — the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Run it locally: `node serve.ts`, then open http://localhost:8080.
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
