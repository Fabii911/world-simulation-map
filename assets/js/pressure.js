// Druckmatrix und Exportkorb: Wer steht bei welchem Gut unter Konkurrenzdruck durch China?
// Maß (angelehnt an die Importwettbewerbs-Exposition nach Autor, Dorn, Hanson 2013):
//   Beitrag(Land c, Gut k) = Anteil von k an den Exporten von c im Basisjahr × Veränderung von Chinas Weltmarktanteil in k
//   Druck(c) = Summe der Beiträge über alle Güter (in Prozentpunkten)
import { esc } from './data.js';
import { fmt } from './series.js';

const SECTOR_ORDER = [6, 7, 8, 5, 4, 0, 1, 3, 2];
// Kapitel 99 („nicht zugeordnet“, u. a. vertrauliche Meldungen) ist nicht interpretierbar und bleibt außen vor
const EXCLUDE = new Set(['99']);
// Sektorfarben: 8 kategoriale Slots in fester Reihenfolge, Rest (Stein/Edelmetalle, Sonstiges) neutral grau
const SECTOR_COLOR = { 6: '--s1', 7: '--s2', 8: '--s3', 5: '--c4', 4: '--c5', 0: '--c6', 1: '--c7', 3: '--c8', 2: '--muted', 9: '--muted' };
// Divergierend: blau = China verliert Anteile (Entlastung), grau = neutral, rot = China gewinnt (Druck)
const DIV = ['#184f95', '#3987e5', '#9ec5f4', '#f0efec', '#eda3a2', '#d65a59', '#a33433'];
const PRESETS = [
  { label: 'China-Schock 1.0 (2001–2007)', t0: 2001, t1: 2007 },
  { label: 'Aufstieg (2007–2015)', t0: 2007, t1: 2015 },
  { label: 'China-Schock 2.0 (2019–letztes Jahr)', t0: 2019, t1: null },
  { label: '2015–letztes Jahr', t0: 2015, t1: null },
];

let T = null, isoNames = {}, state = { t0: 2019, t1: null, level: 'sector', topN: 30, focus: 'DEU', color: 'sector' };
let tooltip;
const $ = (id) => document.getElementById(id);

export async function initPressure() {
  const [trade, iso] = await Promise.all([
    fetch('data/series/trade.json').then((r) => { if (!r.ok) throw new Error(`trade.json: HTTP ${r.status}`); return r.json(); }),
    fetch('data/iso-codes.json').then((r) => r.json()),
  ]);
  T = trade;
  isoNames = Object.fromEntries(Object.entries(iso).map(([k, v]) => [k, v.de]));
  const Y = T.meta.years;
  state.t1 = Y[Y.length - 1];

  for (const id of ['pr-t0', 'pr-t1']) {
    $(id).innerHTML = Y.map((y) => `<option value="${y}">${y}</option>`).join('');
  }
  $('pr-t0').value = state.t0; $('pr-t1').value = state.t1;
  $('pr-t0').addEventListener('change', () => { state.t0 = Number($('pr-t0').value); fixOrder('t0'); render(); });
  $('pr-t1').addEventListener('change', () => { state.t1 = Number($('pr-t1').value); fixOrder('t1'); render(); });
  $('pr-level').addEventListener('change', () => { state.level = $('pr-level').value; render(); });
  $('pr-topn').addEventListener('change', () => { state.topN = Number($('pr-topn').value); render(); });
  $('pr-presets').innerHTML = PRESETS.map((p, i) => `<button type="button" class="chip" data-p="${i}" aria-pressed="false">${esc(p.label.replace('letztes Jahr', String(Y[Y.length - 1])))}</button>`).join('');
  $('pr-presets').querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
    const p = PRESETS[Number(b.dataset.p)];
    state.t0 = p.t0; state.t1 = p.t1 ?? Y[Y.length - 1];
    $('pr-t0').value = state.t0; $('pr-t1').value = state.t1;
    render();
  }));
  const dl = $('pr-countries');
  dl.innerHTML = Object.keys(T.countries).filter((c) => c !== 'CHN').sort((a, b) => name(a).localeCompare(name(b), 'de'))
    .map((c) => `<option value="${esc(name(c))} (${c})"></option>`).join('');
  $('pr-find').addEventListener('change', (ev) => {
    const m = ev.target.value.match(/\(([A-Z]{3})\)$/);
    if (m && T.countries[m[1]]) { state.focus = m[1]; render(); }
    ev.target.value = '';
  });
  $('pr-colormode').addEventListener('change', () => { state.color = $('pr-colormode').value; renderProfile(); });

  const box = $('pr-matrix');
  tooltip = document.createElement('div'); tooltip.className = 'tooltip'; tooltip.hidden = true;
  document.body.appendChild(tooltip);
  new ResizeObserver(() => render()).observe(box);
  render();
}

export function focusPressureCountry(iso) {
  if (T && T.countries[iso] && iso !== 'CHN') { state.focus = iso; render(); }
}

const name = (iso) => isoNames[iso] || iso;
function fixOrder(changed) {
  if (state.t0 < state.t1) return;
  if (changed === 't0') state.t1 = Math.min(state.t0 + 1, T.meta.years.at(-1));
  else state.t0 = Math.max(state.t1 - 1, T.meta.years[0]);
  if (state.t0 >= state.t1) state.t0 = state.t1 - 1;
  $('pr-t0').value = state.t0; $('pr-t1').value = state.t1;
}

// ---------- Berechnung ----------
const yi = (y) => T.meta.years.indexOf(y);

/** Werte je Einheit (Sektor oder Kapitel) für ein Land oder die Welt. */
function byUnit(arrMap, year) {
  const i = yi(year), out = {};
  for (const [ch, arr] of Object.entries(arrMap || {})) {
    if (EXCLUDE.has(ch)) continue;
    const key = state.level === 'sector' ? String(T.meta.chapters[ch].sector) : ch;
    out[key] = (out[key] || 0) + (arr[i] || 0);
  }
  return out;
}

function unitName(u) {
  return state.level === 'sector' ? T.meta.sectors[u] : `${u} ${T.meta.chapters[u].name}`;
}

export function compute(t0, t1) {
  const W0 = byUnit(T.world, t0), W1 = byUnit(T.world, t1);
  const C0 = byUnit(T.countries.CHN, t0), C1 = byUnit(T.countries.CHN, t1);
  const units = Object.keys(W1).filter((u) => W0[u] > 0 && W1[u] > 0);
  const cnShare0 = {}, cnShare1 = {}, dCn = {};
  for (const u of units) {
    cnShare0[u] = (C0[u] || 0) / W0[u]; cnShare1[u] = (C1[u] || 0) / W1[u];
    dCn[u] = cnShare1[u] - cnShare0[u];
  }
  const rows = [];
  for (const [iso, arr] of Object.entries(T.countries)) {
    if (iso === 'CHN') continue;
    const X0 = byUnit(arr, t0), X1 = byUnit(arr, t1);
    const tot0 = Object.values(X0).reduce((s, v) => s + v, 0);
    const tot1 = Object.values(X1).reduce((s, v) => s + v, 0);
    if (tot0 <= 0) continue;
    const cells = {};
    let total = 0;
    for (const u of units) {
      const s = (X0[u] || 0) / tot0;
      const c = s * dCn[u] * 100; // Prozentpunkte
      const own0 = (X0[u] || 0) / W0[u], own1 = (X1[u] || 0) / W1[u];
      cells[u] = { share: s, contrib: c, own0, own1, x0: X0[u] || 0, x1: X1[u] || 0 };
      total += c;
    }
    rows.push({ iso, total, tot0, tot1, cells });
  }
  return { units, dCn, cnShare0, cnShare1, rows, W0, W1 };
}

// ---------- Darstellung ----------
function render() {
  if (!T) return;
  const R = compute(state.t0, state.t1);
  $('pr-presets').querySelectorAll('[data-p]').forEach((b) => {
    const p = PRESETS[Number(b.dataset.p)];
    b.setAttribute('aria-pressed', String(p.t0 === state.t0 && (p.t1 ?? T.meta.years.at(-1)) === state.t1));
  });
  drawMatrix(R);
  renderPanel(R);
  renderProfile(R);
  renderTable(R);
}

function pickColumns(R) {
  if (state.level === 'sector') return SECTOR_ORDER.map(String).filter((u) => R.units.includes(u));
  // Kapitel: die 24 mit der größten absoluten Veränderung des chinesischen Anteils, gewichtet mit Weltmarktgröße
  return [...R.units].sort((a, b) => Math.abs(R.dCn[b]) * R.W1[b] - Math.abs(R.dCn[a]) * R.W1[a]).slice(0, 24)
    .sort((a, b) => R.dCn[b] - R.dCn[a]);
}

function pickRows(R) {
  const byExports = [...R.rows].sort((a, b) => b.tot1 - a.tot1);
  let rows = state.topN ? byExports.slice(0, state.topN) : byExports;
  if (!rows.some((r) => r.iso === state.focus)) {
    const f = R.rows.find((r) => r.iso === state.focus);
    if (f) rows = [...rows, f];
  }
  return rows.sort((a, b) => b.total - a.total);
}

function drawMatrix(R) {
  const box = $('pr-matrix');
  box.querySelector('svg')?.remove();
  const cols = pickColumns(R), rows = pickRows(R);
  const W = box.clientWidth || 900;
  const M = { top: 150, left: 170, right: 90, bottom: 10 };
  const cw = Math.max(18, Math.min(64, (W - M.left - M.right) / cols.length));
  const rh = 20;
  const H = M.top + rows.length * rh + M.bottom;
  const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${M.left + cols.length * cw + M.right} ${H}`)
    .attr('width', M.left + cols.length * cw + M.right).attr('role', 'img')
    .attr('aria-label', `Druckmatrix ${state.t0}–${state.t1}`);

  const maxAbs = d3.max(rows, (r) => d3.max(cols, (u) => Math.abs(r.cells[u]?.contrib || 0))) || 1;
  const color = d3.scaleQuantize().domain([-maxAbs, maxAbs]).range(DIV);

  // Spaltenköpfe: Name + Balken für Chinas Anteilsveränderung
  const maxD = d3.max(cols, (u) => Math.abs(R.dCn[u])) || 0.01;
  const head = svg.append('g');
  cols.forEach((u, j) => {
    const x = M.left + j * cw + cw / 2;
    const g = head.append('g').attr('transform', `translate(${x},${M.top - 44})`);
    g.append('text').attr('class', 'pr-colname').attr('transform', 'rotate(-55)').attr('x', 2).attr('y', 0).text(trunc(unitName(u), 28))
      .append('title').text(unitName(u));
    const h = Math.abs(R.dCn[u]) / maxD * 26;
    g.append('rect').attr('class', R.dCn[u] >= 0 ? 'pr-cnbar up' : 'pr-cnbar down')
      .attr('x', -cw / 2 + 3).attr('width', cw - 6).attr('y', R.dCn[u] >= 0 ? 30 - h : 30).attr('height', Math.max(1, h))
      .append('title').text(`China ${unitName(u)}: Weltmarktanteil ${fmt(R.cnShare0[u] * 100)} % → ${fmt(R.cnShare1[u] * 100)} %`);
  });
  svg.append('text').attr('class', 'pr-axis-note').attr('x', M.left - 8).attr('y', M.top - 14).attr('text-anchor', 'end')
    .text('China: Anteil am Weltmarkt ±');
  svg.append('line').attr('class', 'pr-zero').attr('x1', M.left).attr('x2', M.left + cols.length * cw).attr('y1', M.top - 14).attr('y2', M.top - 14);

  // Zeilen
  const maxT = d3.max(rows, (r) => Math.abs(r.total)) || 1;
  const g = svg.selectAll('g.pr-row').data(rows, (d) => d.iso).join('g').attr('class', (d) => `pr-row${d.iso === state.focus ? ' focus' : ''}`)
    .attr('transform', (d, i) => `translate(0,${M.top + i * rh})`);
  g.append('text').attr('class', 'pr-rowname').attr('x', M.left - 8).attr('y', rh / 2).attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
    .text((d) => trunc(name(d.iso), 24)).on('click', (ev, d) => { state.focus = d.iso; render(); });
  g.selectAll('rect.pr-cell').data((d) => cols.map((u) => ({ row: d, u, c: d.cells[u] }))).join('rect')
    .attr('class', 'pr-cell').attr('x', (d, j) => M.left + j * cw + 1).attr('y', 1).attr('width', cw - 2).attr('height', rh - 2).attr('rx', 2)
    .attr('fill', (d) => (d.c ? color(d.c.contrib) : 'var(--grid)'))
    .on('mouseenter', (ev, d) => showTip(ev, d, R)).on('mousemove', moveTip).on('mouseleave', () => { tooltip.hidden = true; })
    .on('click', (ev, d) => { state.focus = d.row.iso; render(); });
  // Summe als Balken rechts
  g.append('rect').attr('class', (d) => (d.total >= 0 ? 'pr-total up' : 'pr-total down'))
    .attr('x', M.left + cols.length * cw + 8).attr('y', 4).attr('height', rh - 8)
    .attr('width', (d) => Math.max(1, Math.abs(d.total) / maxT * (M.right - 46)));
  g.append('text').attr('class', 'pr-totalval').attr('x', (d) => M.left + cols.length * cw + 12 + Math.abs(d.total) / maxT * (M.right - 46))
    .attr('y', rh / 2).attr('dominant-baseline', 'middle').text((d) => `${d.total >= 0 ? '+' : '−'}${fmt(Math.abs(d.total))}`);
  svg.append('text').attr('class', 'pr-axis-note').attr('x', M.left + cols.length * cw + 8).attr('y', M.top - 6).text('Druck gesamt');

  $('pr-legend').innerHTML = `<span class="muted">Beitrag je Feld (Prozentpunkte):</span>
    ${color.range().map((c) => { const [a, b] = color.invertExtent(c); return `<span class="lg-bin"><span class="lg-sw" style="background:${c}"></span>${fmt(a)} bis ${fmt(b)}</span>`; }).join('')}
    <span class="muted">Rot = China gewinnt Weltmarktanteile in Gütern, die das Land exportiert (Druck). Blau = China verliert Anteile (Entlastung).</span>`;
}

function trunc(t, n) { return t.length > n ? `${t.slice(0, n - 1)}…` : t; }

function showTip(ev, d, R) {
  if (!d.c) return;
  const u = d.u, c = d.c;
  tooltip.hidden = false;
  tooltip.innerHTML = `<b>${esc(name(d.row.iso))} · ${esc(unitName(u))}</b><br>
    Anteil an den Exporten ${state.t0}: <b>${fmt(c.share * 100)} %</b><br>
    China, Weltmarktanteil: ${fmt(R.cnShare0[u] * 100)} % → ${fmt(R.cnShare1[u] * 100)} % (${R.dCn[u] >= 0 ? '+' : '−'}${fmt(Math.abs(R.dCn[u] * 100))} Pp.)<br>
    Beitrag zum Druck: <b>${c.contrib >= 0 ? '+' : '−'}${fmt(Math.abs(c.contrib))} Pp.</b><br>
    <span class="muted">Eigener Weltmarktanteil: ${fmt(c.own0 * 100)} % → ${fmt(c.own1 * 100)} %</span>`;
  moveTip(ev);
}
function moveTip(ev) {
  const x = ev.clientX + 14, y = ev.clientY + 14;
  tooltip.style.position = 'fixed';
  tooltip.style.left = `${Math.min(x, window.innerWidth - 300)}px`;
  tooltip.style.top = `${Math.min(y, window.innerHeight - 140)}px`;
}

function renderPanel(R) {
  const top = [...R.units].sort((a, b) => R.dCn[b] * R.W1[b] - R.dCn[a] * R.W1[a]).slice(0, 5);
  const ranked = [...R.rows].filter((r) => r.tot1 > 20000).sort((a, b) => b.total - a.total);
  $('pr-panel').innerHTML = `<h2>Konkurrenzdruck durch China ${state.t0}–${state.t1}</h2>
    <p>Druck entsteht, wenn China Weltmarktanteile in genau den Gütern gewinnt, die ein Land exportiert.
    Das Maß gewichtet Chinas Anteilsgewinn je Gut mit dem Gewicht des Guts im Exportkorb des Landes (${state.t0}).</p>
    <h3>Wo China am stärksten zulegt</h3>
    <ul>${top.map((u) => `<li>${esc(unitName(u))}: ${fmt(R.cnShare0[u] * 100)} % → <b>${fmt(R.cnShare1[u] * 100)} %</b> Weltmarktanteil</li>`).join('')}</ul>
    <h3>Am stärksten betroffen <span class="muted">(Exporte über 20 Mrd. USD)</span></h3>
    <ol>${ranked.slice(0, 8).map((r) => `<li><button class="linklike" data-iso="${r.iso}">${esc(name(r.iso))}</button> +${fmt(r.total)} Pp.</li>`).join('')}</ol>
    <p class="muted">Exposition ist kein Schaden: Sie zeigt, wo Druck ankommt, nicht ob Arbeitsplätze verloren gehen. Werte in laufenden US-Dollar; fallende Preise in China unterzeichnen die Mengen.</p>`;
  $('pr-panel').querySelectorAll('[data-iso]').forEach((b) => b.addEventListener('click', () => { state.focus = b.dataset.iso; render(); }));
}

// ---------- Länderprofil: Exportkorb + Marktanteile ----------
function renderProfile(R = compute(state.t0, state.t1)) {
  const iso = state.focus;
  const row = R.rows.find((r) => r.iso === iso);
  const box = $('pr-profile');
  if (!row) { box.innerHTML = '<p class="muted">Für dieses Land liegen keine Handelsdaten vor.</p>'; return; }
  const contribs = Object.entries(row.cells).sort((a, b) => b[1].contrib - a[1].contrib);
  const relief = contribs.filter(([, c]) => c.contrib < 0).slice(-3).reverse();
  box.innerHTML = `<h2>${esc(name(iso))}: Exportkorb ${state.t1}</h2>
    <p>Warenexporte ${state.t0}: ${fmt(row.tot0 / 1000)} Mrd. USD → ${state.t1}: <b>${fmt(row.tot1 / 1000)} Mrd. USD</b> ·
      Druck durch China: <b>${row.total >= 0 ? '+' : '−'}${fmt(Math.abs(row.total))} Prozentpunkte</b>
      (Rang ${[...R.rows].sort((a, b) => b.total - a.total).findIndex((r) => r.iso === iso) + 1} von ${R.rows.length})</p>
    <div class="pr-profile-grid">
      <div>
        <svg id="pr-treemap" role="img" aria-label="Exportkorb als Treemap"></svg>
        <div id="pr-treemap-legend" class="legend"></div>
      </div>
      <div>
        <h3>Größte Druckquellen</h3>
        <ul>${contribs.slice(0, 5).filter(([, c]) => c.contrib > 0).map(([u, c]) => `<li>${esc(unitName(u))}: +${fmt(c.contrib)} Pp. <span class="muted">(${fmt(c.share * 100)} % der Exporte; eigener Weltmarktanteil ${fmt(c.own0 * 100)} → ${fmt(c.own1 * 100)} %)</span></li>`).join('')}</ul>
        ${relief.length ? `<h3>Entlastung</h3><ul>${relief.map(([u, c]) => `<li>${esc(unitName(u))}: −${fmt(Math.abs(c.contrib))} Pp.</li>`).join('')}</ul>` : ''}
        <h3>Weltmarktanteile im Zeitverlauf: ${esc(name(iso))} und China</h3>
        <div id="pr-shares" class="pr-shares"></div>
      </div>
    </div>`;
  drawTreemap(iso);
  drawShares(iso, contribs.filter(([, c]) => c.contrib > 0).slice(0, 4).map(([u]) => u));
}

function sectorColor(sector) { return `var(${SECTOR_COLOR[sector] || '--muted'})`; }

// Weiße Schrift auf dunklen Sektorfarben, dunkle auf hellen (Gelb, Magenta, Aqua, Grau)
const LIGHT_TEXT = new Set([6, 7, 0, 1, 3]);

function drawTreemap(iso) {
  const svgEl = document.getElementById('pr-treemap');
  const W = svgEl.parentElement.clientWidth || 500, H = 340;
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const arr = T.countries[iso], i = yi(state.t1);
  const bySector = d3.group(Object.entries(arr).filter(([ch, a]) => a[i] > 0 && !EXCLUDE.has(ch)), ([ch]) => T.meta.chapters[ch].sector);
  const root = d3.hierarchy({ children: [...bySector].map(([s, chs]) => ({ sector: s, children: chs.map(([ch, a]) => ({ ch, sector: s, value: a[i] })) })) })
    .sum((d) => d.value || 0).sort((a, b) => b.value - a.value);
  d3.treemap().size([W, H]).paddingInner(2).round(true)(root);
  // Für die Farbe „China-Druck“ immer Kapitel-Ebene verwenden
  const W0 = {}, W1 = {}, C0 = {}, C1 = {};
  const i0 = yi(state.t0);
  for (const [ch, a] of Object.entries(T.world)) { W0[ch] = a[i0]; W1[ch] = a[i]; }
  for (const [ch, a] of Object.entries(T.countries.CHN)) { C0[ch] = a[i0]; C1[ch] = a[i]; }
  const dch = (ch) => (W0[ch] && W1[ch] ? (C1[ch] || 0) / W1[ch] - (C0[ch] || 0) / W0[ch] : 0);
  const maxD = 0.15; // ±15 Pp. Anteilsveränderung als Sättigung
  const div = d3.scaleQuantize().domain([-maxD, maxD]).range(DIV);
  const total = root.value;
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();
  const leaf = svg.selectAll('g').data(root.leaves()).join('g').attr('transform', (d) => `translate(${d.x0},${d.y0})`);
  leaf.append('rect').attr('width', (d) => d.x1 - d.x0).attr('height', (d) => d.y1 - d.y0).attr('rx', 2)
    .attr('fill', (d) => (state.color === 'sector' ? sectorColor(d.data.sector) : div(dch(d.data.ch))))
    .attr('class', 'pr-tm');
  leaf.append('title').text((d) => `${d.data.ch} ${T.meta.chapters[d.data.ch].name}: ${fmt(d.value / 1000)} Mrd. USD (${fmt(d.value / total * 100)} %)\nChina-Weltmarktanteil ${state.t0}–${state.t1}: ${dch(d.data.ch) >= 0 ? '+' : '−'}${fmt(Math.abs(dch(d.data.ch) * 100))} Pp.`);
  leaf.filter((d) => d.x1 - d.x0 > 60 && d.y1 - d.y0 > 26).append('text').attr('class', (d) => `pr-tm-label${state.color === 'sector' && LIGHT_TEXT.has(d.data.sector) ? '' : ' dark'}`)
    .attr('x', 5).attr('y', 14).text((d) => trunc(T.meta.chapters[d.data.ch].name, Math.floor((d.x1 - d.x0) / 6.5)));
  leaf.filter((d) => d.x1 - d.x0 > 60 && d.y1 - d.y0 > 40).append('text').attr('class', (d) => `pr-tm-value${state.color === 'sector' && LIGHT_TEXT.has(d.data.sector) ? '' : ' dark'}`)
    .attr('x', 5).attr('y', 28).text((d) => `${fmt(d.value / total * 100)} %`);
  $('pr-treemap-legend').innerHTML = state.color === 'sector'
    ? SECTOR_ORDER.filter((s) => bySector.has(s)).map((s) => `<span><span class="swatch" style="background:${sectorColor(s)}"></span>${esc(T.meta.sectors[s])}</span>`).join('')
    : `${div.range().map((c) => { const [a, b] = div.invertExtent(c); return `<span class="lg-bin"><span class="lg-sw" style="background:${c}"></span>${fmt(a * 100)}…${fmt(b * 100)}</span>`; }).join('')}
       <span class="muted">Veränderung von Chinas Weltmarktanteil je Gut in Pp. (${state.t0}–${state.t1})</span>`;
}

function drawShares(iso, units) {
  const box = $('pr-shares');
  box.innerHTML = '';
  if (!units.length) { box.innerHTML = '<p class="muted">Keine Güter mit Druck im gewählten Zeitraum.</p>'; return; }
  const Y = T.meta.years;
  const agg = (map) => Y.map((y) => byUnit(map, y));
  const world = agg(T.world), cn = agg(T.countries.CHN), own = agg(T.countries[iso]);
  for (const u of units) {
    const s1 = Y.map((y, k) => ({ y, v: world[k][u] ? (own[k][u] || 0) / world[k][u] * 100 : null }));
    const s2 = Y.map((y, k) => ({ y, v: world[k][u] ? (cn[k][u] || 0) / world[k][u] * 100 : null }));
    const W = 300, H = 96, M = { l: 30, r: 78, t: 20, b: 16 };
    const x = d3.scaleLinear().domain([Y[0], Y.at(-1)]).range([M.l, W - M.r]);
    const y = d3.scaleLinear().domain([0, d3.max([...s1, ...s2], (d) => d.v) || 1]).nice().range([H - M.b, M.t]);
    const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'pr-share').attr('role', 'img')
      .attr('aria-label', `Weltmarktanteile ${unitName(u)}`);
    svg.append('text').attr('class', 'pr-share-title').attr('x', 0).attr('y', 11).text(trunc(unitName(u), 46));
    svg.append('rect').attr('class', 'pr-period').attr('x', x(state.t0)).attr('width', x(state.t1) - x(state.t0)).attr('y', M.t).attr('height', H - M.t - M.b);
    svg.append('g').attr('class', 'dg-axis').attr('transform', `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(3).tickFormat((d) => `${d}%`));
    svg.append('g').attr('class', 'dg-axis').attr('transform', `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format('d')));
    const line = d3.line().defined((d) => d.v !== null).x((d) => x(d.y)).y((d) => y(d.v));
    svg.append('path').attr('class', 'pr-line own').attr('d', line(s1));
    svg.append('path').attr('class', 'pr-line cn').attr('d', line(s2));
    const l1 = s1.filter((d) => d.v !== null).at(-1), l2 = s2.filter((d) => d.v !== null).at(-1);
    if (l1) svg.append('text').attr('class', 'pr-line-label own').attr('x', W - M.r + 4).attr('y', y(l1.v) + 3).text(`${trunc(name(iso), 10)} ${fmt(l1.v)}%`);
    if (l2) svg.append('text').attr('class', 'pr-line-label cn').attr('x', W - M.r + 4).attr('y', y(l2.v) + (l1 && Math.abs(y(l1.v) - y(l2.v)) < 10 ? (y(l2.v) > y(l1.v) ? 13 : -7) : 3)).text(`China ${fmt(l2.v)}%`);
  }
}

function renderTable(R) {
  const cols = pickColumns(R);
  const rows = [...R.rows].sort((a, b) => b.total - a.total);
  $('pr-table').innerHTML = `<table><thead><tr><th>Land</th><th>Druck gesamt (Pp.)</th>${cols.map((u) => `<th>${esc(unitName(u))}</th>`).join('')}</tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${esc(name(r.iso))}</td><td class="num">${fmt(r.total)}</td>${cols.map((u) => `<td class="num">${r.cells[u] ? fmt(r.cells[u].contrib) : '–'}</td>`).join('')}</tr>`).join('')}
    </tbody></table>`;
}
