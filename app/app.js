// Leonida Trophy Guide — offline, single-page tracker for the 55 Grand Theft Auto VI trophies.
// Reads app/data/trophies.json, persists earned state to localStorage, renders the checklist
// and the five-stage roadmap, and syncs everything to the URL hash so views are shareable.
const DATA_URL = 'data/trophies.json';
const STORAGE_KEY = 'gta6-trophy-guide-v1';

const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const KIND_NAME = { story: 'Story', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' };
const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

let doc = null;
const earned = new Set();
const state = {
  view: 'checklist',
  filter: 'all',
  grade: 'all',
  search: '',
  hide: false,
  spoiler: false,
  open: null,
};

const $ = (id) => document.getElementById(id);

function saveEarned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function gradeColor(grade) {
  return { platinum: '#c9a227', gold: '#ffd700', silver: '#c7cbd1', bronze: '#b87a3a' }[grade] || '#8b949e';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text === null || text === undefined ? '' : String(text);
  return div.innerHTML;
}

function parseHash(hash) {
  const out = {};
  const q = (hash || '').replace(/^#/, '');
  for (const part of q.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const k = eq === -1 ? part : part.slice(0, eq);
    const v = eq === -1 ? '' : part.slice(eq + 1);
    out[k] = v;
  }
  return out;
}

function buildHash() {
  const parts = [];
  parts.push('view=' + state.view);
  parts.push('filter=' + state.filter);
  parts.push('grade=' + state.grade);
  parts.push('spoiler=' + (state.spoiler ? 'on' : 'off'));
  parts.push('hide=' + (state.hide ? 'on' : 'off'));
  if (state.open) parts.push('open=' + state.open);
  const list = [...earned].sort((a, b) => a - b);
  if (list.length) parts.push('earned=' + list.join(','));
  return '#' + parts.join('&');
}

function syncHash() {
  history.replaceState(null, '', buildHash());
}

function updateControlsFromState() {
  $('filterKind').value = state.filter;
  $('filterGrade').value = state.grade;
  $('searchBox').value = state.search;
  $('hideEarned').checked = state.hide;
  $('spoilerMode').checked = state.spoiler;
  $('tabChecklist').classList.toggle('active', state.view === 'checklist');
  $('tabRoadmap').classList.toggle('active', state.view === 'roadmap');
}

function applyHash(hash) {
  const p = parseHash(hash);
  if (p.view !== undefined && /^(checklist|roadmap)$/.test(p.view)) state.view = p.view;
  if (p.filter !== undefined) state.filter = p.filter;
  if (p.grade !== undefined) state.grade = p.grade;
  if (p.spoiler !== undefined) state.spoiler = p.spoiler === 'on';
  if (p.hide !== undefined) state.hide = p.hide === 'on';
  if (p.open !== undefined) state.open = p.open || null;
  if (p.earned !== undefined) {
    for (const raw of p.earned.split(',')) {
      const n = Number(raw);
      if (!isNaN(n)) earned.add(n);
    }
    saveEarned();
  }
  updateControlsFromState();
}

function bindControls() {
  $('tabChecklist').addEventListener('click', () => { state.view = 'checklist'; state.open = null; syncHash(); render(); });
  $('tabRoadmap').addEventListener('click', () => { state.view = 'roadmap'; state.open = null; syncHash(); render(); });
  $('filterKind').addEventListener('change', (e) => { state.filter = e.target.value; state.open = null; syncHash(); render(); });
  $('filterGrade').addEventListener('change', (e) => { state.grade = e.target.value; state.open = null; syncHash(); render(); });
  $('searchBox').addEventListener('input', (e) => { state.search = e.target.value; state.open = null; syncHash(); render(); });
  $('hideEarned').addEventListener('change', (e) => { state.hide = e.target.checked; state.open = null; syncHash(); render(); });
  $('spoilerMode').addEventListener('change', (e) => { state.spoiler = e.target.checked; state.open = null; syncHash(); render(); });

  $('btnExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify([...earned].sort((a, b) => a - b))], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gta6-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  $('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const ids = JSON.parse(await file.text());
      if (Array.isArray(ids)) {
        earned.clear();
        for (const id of ids) {
          const n = Number(id);
          if (!isNaN(n)) earned.add(n);
        }
        saveEarned();
        state.open = null;
        syncHash();
        render();
      }
    } catch (err) {
      alert('Failed to import progress file.');
    }
    e.target.value = '';
  });
}

function matchesFilters(t) {
  if (state.grade !== 'all' && t.grade !== state.grade) return false;
  if (state.filter === 'missable') {
    if (!t.missable) return false;
  } else if (state.filter !== 'all' && state.filter !== 'online') {
    if (t.kind !== state.filter) return false;
  } else if (state.filter === 'online') {
    if (t.kind !== 'online') return false;
  }
  const term = state.search.toLowerCase();
  if (term && ![t.name, t.description, t.guide].some((s) => s.toLowerCase().includes(term))) return false;
  if (state.hide && earned.has(t.id)) return false;
  return true;
}

function trophyCardHtml(t) {
  const isEarned = earned.has(t.id);
  const hidden = state.spoiler && t.kind === 'story' && !isEarned;
  const gradeBadge = `<span class="grade-badge grade-${t.grade}" style="border-color:${gradeColor(t.grade)};color:${gradeColor(t.grade)}">${GRADE_LABEL[t.grade]}</span>`;
  const kindBadge = `<span class="kind-badge">${KIND_NAME[t.kind] || t.kind}</span>`;
  const missable = t.missable ? `<span class="missable-badge">MISSABLE</span>` : '';
  const stage = doc.roadmap.find((s) => s.stage === t.roadmap_stage);
  const stageLabel = stage ? `Roadmap stage ${t.roadmap_stage} — ${escapeHtml(stage.title)}` : '';
  const sources = t.sources.map((s) => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`).join(', ');

  let nameHtml = escapeHtml(t.name);
  let descHtml = escapeHtml(t.description);
  let guideHtml = `<div class="guide"><p>${escapeHtml(t.guide)}</p></div>`;
  let sourcesHtml = sources ? `<div class="sources">Sources: ${sources}</div>` : '';
  if (hidden) {
    nameHtml = '<span class="spoiler-hidden">Hidden — story spoiler</span>';
    descHtml = '<span class="spoiler-hidden">Hidden — story spoiler</span>';
    guideHtml = '<div class="guide"><p class="spoiler-hidden">Hidden — story spoiler</p></div>';
    sourcesHtml = '';
  }

  return `
<article class="trophy-card${isEarned ? ' earned' : ''}${hidden ? ' spoiler-hidden-card' : ''}" id="t-${t.id}" data-id="${t.id}">
  <div class="card-head">
    <label class="earned-label"><input type="checkbox" class="earned-box" ${isEarned ? 'checked' : ''}> <span class="earned-text">Earned</span></label>
    <div class="badges">${gradeBadge}${kindBadge}${missable}</div>
    ${isEarned ? '<span class="earned-check">&#10004;</span>' : ''}
  </div>
  <h2 class="trophy-name">${nameHtml}</h2>
  <p class="trophy-desc">${descHtml}</p>
  <div class="card-meta"><span class="stage-label">${escapeHtml(stageLabel)}</span></div>
  ${guideHtml}
  ${sourcesHtml}
</article>`;
}

function renderChecklist() {
  const section = $('viewChecklist');
  const items = doc.trophies.filter(matchesFilters);
  let html = `<div class="card-grid">${items.map(trophyCardHtml).join('')}</div>`;
  html += `<div class="result-count">${items.length} trophy${items.length !== 1 ? 's' : ''} shown</div>`;
  section.innerHTML = html;

  for (const box of section.querySelectorAll('.earned-box')) {
    const id = Number(box.closest('.trophy-card').dataset.id);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(id); else earned.delete(id);
      saveEarned();
      syncHash();
      render();
    });
  }
}

function renderRoadmap() {
  const section = $('viewRoadmap');
  let html = '';
  for (const stage of doc.roadmap) {
    const stageTrophies = doc.trophies.filter((t) => t.roadmap_stage === stage.stage).sort((a, b) => a.id - b.id);
    const rows = stageTrophies.map((t) => {
      const isEarned = earned.has(t.id);
      const gradeBadge = `<span class="grade-badge grade-${t.grade}" style="border-color:${gradeColor(t.grade)};color:${gradeColor(t.grade)}">${GRADE_LABEL[t.grade]}</span>`;
      const missable = t.missable ? `<span class="missable-badge">MISSABLE</span>` : '';
      const tick = isEarned ? `<span class="tick earned">&#10004;</span>` : `<span class="tick">&#10003;</span>`;
      return `<tr class="roadmap-row${isEarned ? ' earned' : ''}">
        <td><a href="#view=checklist&open=${t.id}" class="row-link">${escapeHtml(t.name)}</a></td>
        <td class="grade-td">${gradeBadge}</td>
        <td class="miss-td">${missable}</td>
        <td>${tick}</td>
      </tr>`;
    }).join('');
    html += `
<section class="roadmap-stage">
  <h2 class="stage-heading">Stage ${stage.stage} — ${escapeHtml(stage.title)}</h2>
  <p class="stage-summary">${escapeHtml(stage.summary)}</p>
  <table class="roadmap-table"><thead><tr><th>Trophy</th><th>Grade</th><th>Flags</th><th>Earned</th></tr></thead><tbody>${rows}</tbody></table>
</section>`;
  }
  section.innerHTML = html;
}

function scrollToOpen() {
  if (!state.open) return;
  const el = document.getElementById('t-' + state.open);
  if (!el) return;
  el.classList.add('highlighted');
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: 'center' });
  });
  setTimeout(() => el.classList.remove('highlighted'), 2500);
}

function renderProgress() {
  const total = doc.trophies.length;
  const n = earned.size;
  const pct = total ? Math.round((n / total) * 100) : 0;
  $('progressText').textContent = `${n} of ${total} earned (${pct}%)`;
  $('progressBar').querySelector('.progress-fill').style.width = pct + '%';

  let gradeHtml = '';
  for (const g of GRADES) {
    const allT = doc.trophies.filter((t) => t.grade === g).length;
    const earnedG = [...earned].filter((id) => doc.trophies.find((t) => t.id === id)?.grade === g).length;
    gradeHtml += `<span class="grade-pill grade-${g}" style="border-color:${gradeColor(g)};color:${gradeColor(g)}">${GRADE_LABEL[g]} <span class="count">${earnedG}/${allT}</span></span>`;
  }
  $('gradeCounts').innerHTML = gradeHtml;

  const plat = doc.trophies.find((t) => t.grade === 'platinum');
  const platEarned = earned.has(plat.id);
  $('platNote').innerHTML = `<span class="${platEarned ? 'plat-done' : 'plat-todo'}">${platEarned ? '&#10004; Platinum unlocked' : '&#10003; Platinum: unlock all 54 other trophies'}</span>`;
}

function render() {
  renderProgress();
  $('viewChecklist').classList.toggle('hidden', state.view !== 'checklist');
  $('viewRoadmap').classList.toggle('hidden', state.view !== 'roadmap');
  if (state.view === 'checklist') renderChecklist();
  else renderRoadmap();
  scrollToOpen();
}

function init() {
  fetch(DATA_URL)
    .then((r) => { if (!r.ok) throw new Error('failed to load trophy data'); return r.json(); })
    .then((d) => {
      doc = d;
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      for (const id of saved) {
        const n = Number(id);
        if (!isNaN(n)) earned.add(n);
      }
      applyHash(location.hash);
      bindControls();
      render();
      window.addEventListener('hashchange', () => { applyHash(location.hash); render(); });
    })
    .catch((err) => {
      document.body.innerHTML = '<div style="padding:2rem;color:#c46;font-family:sans-serif">Failed to load trophy data: ' + escapeHtml(err.message) + '</div>';
    });
}

init();
