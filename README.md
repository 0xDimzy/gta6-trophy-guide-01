# Leonida Ledger — GTA VI Trophy Guide & Tracker (PS5)

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/0xDimzy/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/0xDimzy/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and tracker for all **55 PlayStation 5 trophies** in *Grand Theft Auto VI* — every guide written in my own words, every concrete step cited to the source page it came from.

**What you get**

- **Checklist** — all 55 trophies with official names, descriptions and grades; earned ticks and numeric counters (250 stunts, 100 WAiNK scans, $250,000 laundered…) saved in `localStorage`, with JSON export/import.
- **Cited guides** — per-trophy guide, step-by-step instructions with a source citation on every step, and a linked source list (PowerPyx, GTABase, Push Square, KeenGamer, GTADB and more). Five hidden trophies had no confirmed method at launch; their guides say so honestly instead of inventing steps.
- **Roadmap to Platinum** — five stages from story (≈200 h total) through collectibles and the 100% grind to cleanup, built from the official descriptions and the published 100% checklist.
- **Missables** — exactly one potentially missable trophy (*Positive Mental Attitude*, the Chapter 1 balcony meditation), plus a watchlist for temporary unavailability, cheats and the permanent Irredeemable profile.
- **Spoiler shield** — hide story trophy names/descriptions until earned. **Filters** by kind, grade and text, plus hide-earned.
- **Deep links** — `#view=roadmap|missables|sources`, `#open=<id>`, `#earned=<id,id,…>`, `#spoiler=1`, `#filter=<kind>`, `#counts=<id:n,…>` reproduce any state (used for the screenshots).

Vanilla JS/CSS, no build step, no external assets, no tracking. Fan-made; not affiliated with Rockstar Games or PlayStation. No official artwork is used — the neon-noir look is original.

## Run it

```bash
node serve.ts
# open http://localhost:8080
```

Or serve the `app/` folder with any static server, e.g. `python3 -m http.server -d app 8080`. Opening `app/index.html` via `file://` will not work in most browsers because the app fetches `data/trophies.json`.

To produce the make.fun hand-in dossier:

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
