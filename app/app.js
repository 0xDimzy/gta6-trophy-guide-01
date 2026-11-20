// Leonida Ledger — offline GTA VI trophy guide & tracker.
// Vanilla JS, no build step, no network beyond this app's own data/trophies.json.
// State lives in localStorage; URL hash carries view/filter/open/earned/spoiler/counts for deep links & screenshots.
const KEY_EARNED = 'gta6-ledger-earned-v2';
const KEY_COUNTS = 'gta6-ledger-counts-v2';
const KEY_SPOILER = 'gta6-ledger-spoiler-v2';

const $ = (sel) => document.querySelector(sel);
const cardsEl = $('#cards');
const statusEl = $('#status-line');

let doc = null;
let trophies = [];
let byId = new Map();
let earned = new Set();
let counts = {};
let openId = null;
let view = 'checklist';

function loadStored() {
  try { earned = new Set(JSON.parse(localStorage.getItem(KEY_EARNED) ?? '[]').map(Number)); } catch { earned = new Set(); }
  try { counts = JSON.parse(localStorage.getItem(KEY_COUNTS) ?? '{}') ?? {}; } catch { counts = {}; }
  $('#spoiler').checked = localStorage.getItem(KEY_SPOILER) === '1';
}
function save() {
  localStorage.setItem(KEY_EARNED, JSON.stringify([...earned].sort((a, b) => a - b)));
  localStorage.setItem(KEY_COUNTS, JSON.stringify(counts));
  localStorage.setItem(KEY_SPOILER, $('#spoiler').checked ? '1' : '0');
}

function parseHash() {
  const raw = location.hash.replace(/^#/, '');
  const p = new URLSearchParams(raw);
  return p;
}
function applyHash(p) {
  const v = p.get('view');
  if (['checklist', 'roadmap', 'missables', 'sources'].includes(v)) view = v;
  const f = p.get('filter');
  if (f) $('#kind').value = f;
  const g = p.get('grade');
  if (g) $('#grade').value = g;
  const q = p.get('q');
  if (q !== null) $('#q').value = q;
  if (p.get('spoiler') === '1') $('#spoiler').checked = true;
  if (p.get('spoiler') === '0') $('#spoiler').checked = false;
  if (p.get('hide') === '1') $('#hide-earned').checked = true;
  const e = p.get('earned');
  if (e !== null && e !== '') {
    // Hash state wins for this load (deep links / screenshots). User toggles after this persist normally.
    earned = new Set(e.split(',').map((s) => Number(s.trim())).filter((n) => byId.has(n)));
  }
  const c = p.get('counts');
  if (c) {
    for (const pair of c.split(',')) {
      const [id, val] = pair.split(':');
      const n = Number(val);
      if (byId.has(Number(id)) && Number.isFinite(n)) counts[Number(id)] = n;
    }
  }
  const o = p.get('open');
  openId = o !== null && byId.has(Number(o)) ? Number(o) : null;
}
function writeHash() {
  const p = new URLSearchParams();
  if (view !== 'checklist') p.set('view', view);
  if ($('#kind').value !== 'all') p.set('filter', $('#kind').value);
  if ($('#grade').value !== 'all') p.set('grade', $('#grade').value);
  if ($('#q').value.trim()) p.set('q', $('#q').value.trim());
  if ($('#spoiler').checked) p.set('spoiler', '1');
  if ($('#hide-earned').checked) p.set('hide', '1');
  if (openId !== null) p.set('open', String(openId));
  const s = p.toString();
  history.replaceState(null, '', s ? `#${s}` : location.pathname + location.search);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function fmt(n) { return Number(n).toLocaleString('en-US'); }
function gradeLabel(g) { return g[0].toUpperCase() + g.slice(1); }
function kindLabel(k) {
  return { story: 'Story', collectibles: 'Collectibles', activities: 'Activities', misc: 'Misc / quests', missable: 'Missable', online: 'Online' }[k] ?? k;
}
function isSpoilered(t) {
  return $('#spoiler').checked && t.kind === 'story' && !earned.has(t.id);
}
function displayName(t) { return isSpoilered(t) ? 'Hidden story trophy' : t.name; }
function displayDesc(t) { return isSpoilered(t) ? 'Complete a story mission (hidden by spoiler shield). Earn it to reveal.' : t.description; }

function matches(t) {
  const kind = $('#kind').value;
  const grade = $('#grade').value;
  const q = $('#q').value.trim().toLowerCase();
  if (kind === 'missable' && !t.missable) return false;
  if (kind !== 'all' && kind !== 'missable' && t.kind !== kind) return false;
  if (grade !== 'all' && t.grade !== grade) return false;
  if ($('#hide-earned').checked && earned.has(t.id)) return false;
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide} ${t.kind} ${t.grade}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderProgress() {
  const total = trophies.length;
  const got = earned.size;
  const pct = total ? Math.round((got / total) * 100) : 0;
  $('#progress-pct').textContent = `${pct}%`;
  $('#progress-count').textContent = `${got} / ${total} earned`;
  $('#progress-fill').style.width = `${pct}%`;
  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  $('#grade-counts').innerHTML = grades.map((g) => {
    const tot = trophies.filter((t) => t.grade === g).length;
    const has = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    return `<span>${gradeLabel(g)} <b>${has}/${tot}</b></span>`;
  }).join('');
}

function detailHTML(t) {
  const steps = t.steps.map((s, i) => {
    const src = t.sources[s.source];
    const cite = src ? ` <span class="cite">[<a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">${esc(src.name.split(' — ')[0])}</a>]</span>` : '';
    return `<li>${esc(s.text)}${cite}</li>`;
  }).join('');
  const srcs = t.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a></li>`).join('');
  const noteCls = t.missable ? 'miss-note' : 'safe-note';
  const noteTitle = t.missable ? '⚠ Missable — read before you play past it' : 'Missable? No';
  return `<div class="detail">
    <h3>Guide</h3><p>${esc(t.guide)}</p>
    <h3>Steps (each cited)</h3><ol class="steps">${steps}</ol>
    <h3>${noteTitle}</h3><div class="${noteCls}">${esc(t.missable_note)}</div>
    <h3>Sources</h3><ul class="src-list">${srcs}</ul>
  </div>`;
}

function cardHTML(t) {
  const isEarned = earned.has(t.id);
  const isOpen = openId === t.id;
  const spoilerCls = isSpoilered(t) ? ' spoilered' : '';
  let countRow = '';
  if (t.count !== null && t.count !== undefined) {
    const cur = Number(counts[t.id] ?? 0);
    const pct = Math.min(100, Math.round((cur / t.count) * 100));
    countRow = `<div class="count-row">
      <label for="count-${t.id}">Progress</label>
      <input class="count-input" id="count-${t.id}" data-count-for="${t.id}" type="number" min="0" step="1" value="${cur}">
      <span class="count-target">/ ${fmt(t.count)} ${esc(t.count_label ?? '')}</span>
      <span class="count-bar"><span class="count-fill" style="width:${pct}%"></span></span>
      <span class="count-pct">${pct}%</span>
    </div>`;
  }
  return `<article class="card${isEarned ? ' earned' : ''}${isOpen ? ' open' : ''}" id="card-${t.id}">
    <div class="card-head">
      <input class="earned-box" type="checkbox" data-earned-for="${t.id}" ${isEarned ? 'checked' : ''} aria-label="Mark ${esc(t.name)} as earned">
      <div class="card-main">
        <div class="card-title-row">
          <h2 class="card-title${spoilerCls}">${esc(displayName(t))}</h2>
          <span class="badge ${t.grade}">${gradeLabel(t.grade)}</span>
          <span class="chip">${kindLabel(t.kind)}</span>
          <span class="chip stage">Stage ${t.roadmap_stage}</span>
          ${t.missable ? '<span class="chip missable">⚠ Missable</span>' : ''}
          ${isEarned ? '<span class="chip" style="color:#a3e635;border-color:#3f6212">✓ Earned</span>' : ''}
        </div>
        <p class="card-desc${spoilerCls}">${esc(displayDesc(t))}</p>
        ${countRow}
      </div>
      <button type="button" class="guide-btn" data-open-for="${t.id}">${isOpen ? 'Close guide' : 'Guide ▾'}</button>
    </div>
    ${isOpen ? detailHTML(t) : ''}
  </article>`;
}

function renderChecklist() {
  const list = trophies.filter(matches);
  cardsEl.innerHTML = list.map(cardHTML).join('');
  $('#empty').hidden = list.length > 0;
  statusEl.textContent = `Showing ${list.length} of ${trophies.length} trophies · ${earned.size} earned · progress saves automatically in this browser.`;
  // Wire events (delegation would also work; direct wiring keeps it simple and robust).
  cardsEl.querySelectorAll('[data-earned-for]').forEach((box) => {
    box.addEventListener('change', () => {
      const id = Number(box.dataset.earnedFor);
      if (box.checked) earned.add(id); else earned.delete(id);
      save(); renderAll(false);
    });
  });
  cardsEl.querySelectorAll('[data-open-for]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.openFor);
      openId = openId === id ? null : id;
      writeHash(); renderChecklist();
      if (openId !== null) document.getElementById(`card-${openId}`)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  });
  cardsEl.querySelectorAll('[data-count-for]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const id = Number(inp.dataset.countFor);
      const t = byId.get(id);
      const v = Math.max(0, Math.floor(Number(inp.value) || 0));
      counts[id] = v;
      if (t && t.count !== null && v >= t.count) earned.add(id);
      save(); renderAll(false);
    });
  });
}

function renderRoadmap() {
  const stages = doc.roadmap_stages ?? [];
  $('#roadmap').innerHTML = stages.map((s) => {
    const items = trophies.filter((t) => t.roadmap_stage === s.stage);
    const done = items.filter((t) => earned.has(t.id)).length;
    const chips = items.map((t) => `<button type="button" class="stage-item${earned.has(t.id) ? ' done' : ''}" data-jump="${t.id}"><span class="gdot" style="color:var(--${t.grade})">●</span>${esc(displayName(t))}${earned.has(t.id) ? ' ✓' : ''}</button>`).join('');
    return `<section class="stage">
      <div class="stage-head"><span class="stage-num">Stage ${s.stage}</span><h3>${esc(s.title)}</h3><span class="stage-hours">${esc(s.hours)}</span><span class="stage-progress">${done}/${items.length} earned</span></div>
      <p>${esc(s.summary)}</p><div class="stage-list">${chips}</div>
    </section>`;
  }).join('');
  $('#roadmap').querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => jumpTo(Number(b.dataset.jump))));
}

function renderMissables() {
  const miss = trophies.filter((t) => t.missable);
  const missHTML = miss.map((t) => `<div class="warn-card">
    <h3>⚠ ${esc(t.name)} <span class="badge ${t.grade}">${gradeLabel(t.grade)}</span></h3>
    <p><strong>${esc(t.description)}</strong></p>
    <p>${esc(t.missable_note)}</p>
    <p>${esc(t.guide)}</p>
    <button type="button" data-jump="${t.id}">Open cited guide →</button>
  </div>`).join('') || '<p>No missable trophies in the data.</p>';
  const watch = [
    { title: 'No mission replay — keep chapter saves', body: 'There is free-roam after the story but no mission replay. Keep a manual save at the start and end of each chapter (10 of 15 slots) and rotate the other five during cleanup. No trophy depends on mission performance or gold medals.', jump: 11 },
    { title: 'Cheats disable trophies', body: 'Cheats unlock after the story — exactly when you mop up. Activating one disables trophies and saving on that save. Keep cheats off your platinum save entirely.', jump: 1 },
    { title: 'Irredeemable profile is permanent', body: 'Actions Speak Louder needs 500 Criminal Profile actions, but pushing into Irredeemable cannot be undone and makes police more aggressive. Farm carefully and stop short of it.', jump: 48 },
    { title: 'One card interior closes after Chapter 2', body: 'The Delights Dancers card “Vicki” sits in the Starlet Motel office, inaccessible after Chapter 2. Don’t Touch My Deck only needs any 3 of 18 sets, so pick another set if you missed it — the trophy itself is not missable.', jump: 30 },
    { title: 'Quest givers vanish — then return', body: 'Kenton disappears after Chapter 1 and others pause mid-story, but every trophy-related quest giver returns later and is still there in free-roam after the story. Do not restart over a missing marker.', jump: 23 },
    { title: 'Five hidden trophies still unconfirmed', body: 'In The Beginning…, Capital Offense, Bad Luck I Guess, The Truth Is Out There and Ten Pin had no verified method at launch. Their guides in this app say so honestly — re-check sources instead of grinding invented theories.', jump: 44 },
  ];
  const watchHTML = watch.map((w) => `<div class="watch-card"><h4>${esc(w.title)}</h4><p>${esc(w.body)}</p><button type="button" data-jump="${w.jump}">Related trophy →</button></div>`).join('');
  $('#missables').innerHTML = `${missHTML}<h3 style="margin:18px 0 10px">Watchlist — not trophy-locking, still worth knowing</h3><div class="watch-grid">${watchHTML}</div>`;
  $('#missables').querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => jumpTo(Number(b.dataset.jump))));
}

function renderSources() {
  const map = new Map(); // url -> {name, url, trophies: []}
  for (const t of trophies) {
    for (const s of t.sources) {
      if (!map.has(s.url)) map.set(s.url, { name: s.name, url: s.url, trophies: [] });
      map.get(s.url).trophies.push(t);
    }
  }
  const rows = [...map.values()].sort((a, b) => b.trophies.length - a.trophies.length || a.name.localeCompare(b.name));
  const cited = trophies.filter((t) => t.sources.length > 0).length;
  const totalCites = trophies.reduce((n, t) => n + t.sources.length, 0);
  const totalSteps = trophies.reduce((n, t) => n + t.steps.length, 0);
  $('#sources-stats').textContent = `${cited}/${trophies.length} trophies carry at least one specific citation · ${totalCites} source links · ${totalSteps} cited steps · ${rows.length} distinct source pages.`;
  $('#sources').innerHTML = `<table class="src-table"><thead><tr><th>Source page</th><th>Trophies</th><th>Used for (click to open guide)</th></tr></thead><tbody>${
    rows.map((r) => `<tr><td><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a></td><td class="src-count">${r.trophies.length}</td><td><div class="src-trophies">${r.trophies.map((t) => `<button type="button" class="${earned.has(t.id) ? 'done' : ''}" data-jump="${t.id}">${esc(t.name)}</button>`).join('')}</div></td></tr>`).join('')
  }</tbody></table>`;
  $('#sources').querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => jumpTo(Number(b.dataset.jump))));
}

function setView(v) {
  view = v;
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === v));
  for (const name of ['checklist', 'roadmap', 'missables', 'sources']) {
    document.getElementById(`view-${name}`).hidden = name !== v;
  }
  $('#toolbar').style.display = v === 'checklist' ? '' : 'none';
}
function jumpTo(id) {
  openId = id;
  // Clear filters that would hide the target so the jump always lands.
  $('#kind').value = 'all'; $('#grade').value = 'all'; $('#q').value = ''; $('#hide-earned').checked = false;
  setView('checklist');
  writeHash(); renderAll(false);
  document.getElementById(`card-${id}`)?.scrollIntoView({ block: 'start', behavior: 'instant' });
}
function renderAll(scrollToOpen = true) {
  renderProgress();
  setView(view);
  if (view !== 'checklist') statusEl.textContent = `${earned.size} of ${trophies.length} trophies earned · open the Checklist to tick progress, or click any trophy to jump to its guide.`;
  if (view === 'checklist') renderChecklist();
  if (view === 'roadmap') renderRoadmap();
  if (view === 'missables') renderMissables();
  if (view === 'sources') renderSources();
  if (scrollToOpen && view === 'checklist' && openId !== null) {
    // Synchronous (not rAF) so headless screenshots paint correctly; skip when already visible.
    const el = document.getElementById(`card-${openId}`);
    if (el && el.getBoundingClientRect().top > window.innerHeight) {
      el.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }
}

// Toolbar wiring
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => { setView(tab.dataset.view); writeHash(); renderAll(false); window.scrollTo({ top: 0 }); }));
for (const id of ['#q', '#kind', '#grade', '#hide-earned', '#spoiler']) {
  $(id).addEventListener('input', () => { save(); writeHash(); renderAll(false); });
  $(id).addEventListener('change', () => { save(); writeHash(); renderAll(false); });
}
$('#clear-filters')?.addEventListener('click', () => {
  $('#q').value = ''; $('#kind').value = 'all'; $('#grade').value = 'all'; $('#hide-earned').checked = false;
  writeHash(); renderAll(false);
});
$('#export').addEventListener('click', () => {
  const payload = { app: 'leonida-ledger', game: 'Grand Theft Auto VI (PS5)', exportedAt: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b), counts };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('#import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    let ids = [];
    let newCounts = {};
    if (Array.isArray(data)) {
      // Starter format (array of names) or array of ids.
      ids = data.map((v) => (typeof v === 'number' ? v : trophies.find((t) => t.name === v)?.id)).filter((n) => byId.has(n));
    } else if (data && Array.isArray(data.earned)) {
      ids = data.earned.map(Number).filter((n) => byId.has(n));
      if (data.counts && typeof data.counts === 'object') newCounts = data.counts;
    } else { throw new Error('Unrecognised progress file.'); }
    earned = new Set(ids);
    counts = {};
    for (const [k, v] of Object.entries(newCounts)) if (byId.has(Number(k))) counts[Number(k)] = Math.max(0, Math.floor(Number(v) || 0));
    save(); renderAll(false);
    statusEl.textContent = `Imported progress: ${earned.size} trophies earned.`;
  } catch (err) {
    statusEl.textContent = `Import failed: ${err.message}`;
  } finally { e.target.value = ''; }
});
$('#reset').addEventListener('click', () => {
  if (!confirm('Reset all earned ticks and counters in this browser? Export first if you want a backup.')) return;
  earned = new Set(); counts = {}; openId = null;
  save(); writeHash(); renderAll(false);
});
window.addEventListener('hashchange', () => { applyHash(parseHash()); renderAll(true); });

// Boot
loadStored();
try {
  const res = await fetch('data/trophies.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  doc = await res.json();
  trophies = doc.trophies;
  byId = new Map(trophies.map((t) => [t.id, t]));
  applyHash(parseHash());
  renderAll(true);
} catch (err) {
  statusEl.textContent = `Could not load data/trophies.json (${err.message}). Serve the app/ folder with a static server (node serve.ts) — opening via file:// blocks fetch in most browsers.`;
  cardsEl.innerHTML = '';
}
