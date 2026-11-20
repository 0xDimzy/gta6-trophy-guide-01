# gta6-trophy-guide-01

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/0xDimzy/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/0xDimzy/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Trophy Guide — an offline, single-page trophy guide and tracker for all 55 official Grand Theft Auto VI trophies on PlayStation 5. Every trophy keeps its official name, description, grade and kind, paired with a guide written in our own words and a list of sources. A five-stage roadmap leads to the platinum, missable trophies are flagged, and progress is saved in your browser (localStorage) with export and import.

## Features

- Checklist card for each of the 55 trophies: checkbox, official name, official description, grade badge, kind badge, MISSABLE flag, roadmap stage, full guide text and source links — all visible on the card, no extra clicks.
- Roadmap view: the five stages in order, each listing its trophies with grade badges, missable flags and earned ticks; click a trophy to jump to its checklist card.
- Filters: kind (All, Story, Missable, Collectibles, Activities, Online), grade (All, Platinum, Gold, Silver, Bronze), text search, and a Hide earned toggle.
- Spoiler setting: unearned story trophies show "Hidden — story spoiler" instead of name, description and guide until you earn them.
- Tracker: earned state saved to localStorage under `gta6-trophy-guide-v1`; Export downloads your progress as JSON, Import restores it.
- Hash routing: share or bookmark any view. `#view=checklist|roadmap`, `#filter=all|story|missable|collectibles|activities|online`, `#grade=all|platinum|gold|silver|bronze`, `#spoiler=on|off`, `#hide=on|off`, `#open=<trophy id>` scrolls to and highlights a card, `#earned=<id,id,...>` pre-checks those ids (shareable progress, merged with your saved state).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. The app is fully offline: it loads no external fonts, images, scripts or stylesheets, and only fetches `data/trophies.json` from the same origin.

## Data

Trophy names, descriptions, grades, kinds, missable flags, roadmap stages, guides and sources come from `app/data/trophies.json` (55 trophies, read verbatim — no trophy id, name, description or grade was altered).

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
