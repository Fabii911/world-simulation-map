// Hebel-Simulation als Fuzzy Cognitive Map (FCM) auf Basis der Gewichte im Wirkungsnetz.
// Ergebnis = Richtungen und Zielkonflikte, keine Prognose in Zahlen.
import { esc, weightAt, domainColor } from './data.js';

const YEAR = 2026;
const LAMBDA = 1.0;      // Steilheit der tanh-Funktion
const MAX_ITER = 60;
const EPS = 1e-4;

export const PRESETS = [
  { id: 'cn-soc', name: 'China baut den Sozialstaat aus', levers: { CN_SOC: 0.8 }, text: 'Rente, Gesundheit, Hukou-Reform: Die Menschen sparen weniger aus Angst und konsumieren mehr.' },
  { id: 'eu-td', name: 'EU erhöht Handelsschutz gegen China', levers: { EU_TD: 0.8 }, text: 'Ausgleichszölle und Subventionsverordnung konsequent anwenden.' },
  { id: 'prot', name: 'Weltweiter Protektionismus', levers: { PROT: 0.8 }, text: 'Zölle und Exportkontrollen nehmen überall zu (Muster 2025).' },
  { id: 'de-demand', name: 'Deutschland stärkt die Binnennachfrage', levers: { DE_DEMAND: 0.8 }, text: 'Öffentliche Investitionen, Löhne, Wohnungsbau (Sondervermögen 2025).' },
  { id: 'eu-def', name: 'Europa rüstet auf', levers: { EU_DEF: 0.8 }, text: 'Höhere Verteidigungsausgaben – mit Abschreckung und Sicherheitsdilemma.' },
  { id: 'nat', name: 'Renationalisierung in Europa', levers: { NAT: 0.8 }, text: 'Nationalistische Politik gewinnt, die EU handelt weniger geschlossen.' },
  { id: 'derisk', name: 'De-Risking bei Rohstoffen', levers: { EU_DR: 0.8 }, text: 'Diversifizierung, Recycling, strategische Reserven.' },
  { id: 'ai', name: 'KI-Investitionsboom', levers: { AI_INV: 0.8 }, text: 'Weiter stark steigende Investitionen in Rechenzentren und Chips.' },
  { id: 'agri', name: 'Agrarwende: Vielfalt statt Menge', levers: { LAND: -0.6 }, text: 'Weniger intensive Landnutzung und Monokultur.' },
  { id: 'state', name: 'Starke Wettbewerbs- und Plattformregulierung', levers: { STATE: 0.7 }, text: 'Fusionskontrolle, DMA, Steuern auf Konzerngewinne durchsetzen.' },
];

let D = null;
let levers = { CN_SOC: 0.8 };
let last = null;
const $ = (id) => document.getElementById(id);

export function initSimulation(data) {
  D = data;
  const pre = $('sim-presets');
  pre.innerHTML = PRESETS.map((p) => `<button type="button" class="chip" data-preset="${p.id}" aria-pressed="false" title="${esc(p.text)}">${esc(p.name)}</button>`).join('');
  pre.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    const p = PRESETS.find((x) => x.id === b.dataset.preset);
    levers = { ...p.levers };
    pre.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    renderLevers(); run();
  }));
  pre.querySelector('[data-preset="cn-soc"]').setAttribute('aria-pressed', 'true');

  const add = $('sim-add');
  add.innerHTML = '<option value="">+ Hebel hinzufügen …</option>' +
    [...D.model.nodes].sort((a, b) => a.label.localeCompare(b.label, 'de')).map((n) => `<option value="${n.id}">${esc(n.label)}</option>`).join('');
  add.addEventListener('change', () => {
    if (add.value && !(add.value in levers)) levers[add.value] = 0.5;
    add.value = ''; clearPreset(); renderLevers(); run();
  });
  renderLevers();
  run();
}

function clearPreset() { $('sim-presets').querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false')); }

function renderLevers() {
  const box = $('sim-levers');
  box.innerHTML = Object.entries(levers).map(([id, v]) => `<div class="lever">
      <span class="swatch" style="background:${domainColor(D.nodeById.get(id).domain)}"></span>
      <span class="lever-name">${esc(D.nodeById.get(id).label)}</span>
      <input type="range" min="-1" max="1" step="0.1" value="${v}" data-lever="${id}" aria-label="Stärke ${esc(D.nodeById.get(id).label)}">
      <output class="num">${v > 0 ? '+' : ''}${Number(v).toFixed(1)}</output>
      <button type="button" class="chip-x" data-remove="${id}" aria-label="Hebel entfernen">×</button>
    </div>`).join('') || '<p class="muted">Kein Hebel gesetzt.</p>';
  box.querySelectorAll('[data-lever]').forEach((inp) => inp.addEventListener('input', () => {
    levers[inp.dataset.lever] = Number(inp.value);
    inp.nextElementSibling.value = `${inp.value > 0 ? '+' : ''}${Number(inp.value).toFixed(1)}`;
    clearPreset(); run();
  }));
  box.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => { delete levers[b.dataset.remove]; clearPreset(); renderLevers(); run(); }));
}

/** FCM: A_i(t+1) = tanh(λ · Σ_j w_ji · c_ji · A_j(t)) mit Sicherheit c; Hebel sind fest geklemmt. */
export function simulate(model, lev, validityByEdge, year = YEAR) {
  const ids = model.nodes.map((n) => n.id);
  const idx = new Map(ids.map((id, i) => [id, i]));
  const inc = ids.map(() => []);
  // Effektives Gewicht = geschätzte Stärke × Sicherheit: unsichere Wirkungen tragen weniger weit.
  for (const e of model.edges) inc[idx.get(e.to)].push({ j: idx.get(e.from), w: weightAt(e, year, validityByEdge) * e.confidence, e });
  let A = ids.map((id) => lev[id] ?? 0);
  let iter = 0, converged = false;
  for (; iter < MAX_ITER; iter++) {
    const N = A.map((a, i) => {
      if (ids[i] in lev) return lev[ids[i]];
      const s = inc[i].reduce((acc, { j, w }) => acc + w * A[j], 0);
      return Math.tanh(LAMBDA * s);
    });
    const delta = Math.max(...N.map((v, i) => Math.abs(v - A[i])));
    A = N;
    if (delta < EPS) { converged = true; break; }
  }
  const contributions = (id) => inc[idx.get(id)].map(({ j, w, e }) => ({ from: ids[j], w, value: w * A[j], e })).filter((c) => Math.abs(c.value) > 0.005).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return { ids, A, iter: iter + 1, converged, value: (id) => A[idx.get(id)], contributions };
}

function run() {
  last = simulate(D.model, levers, D.validityByEdge);
  const rows = last.ids.map((id, i) => ({ id, v: last.A[i] }))
    .filter((r) => !(r.id in levers) && Math.abs(r.v) >= 0.02)
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  drawBars(rows.slice(0, 20));
  $('sim-status').textContent = Object.keys(levers).length
    ? `${rows.length} Größen reagieren · ${last.converged ? `eingeschwungen nach ${last.iter} Schritten` : `nach ${last.iter} Schritten nicht vollständig eingeschwungen (Schleifen schaukeln sich auf)`}`
    : 'Setze einen Hebel oder wähle ein Szenario.';
  $('sim-table').innerHTML = `<table><thead><tr><th>Größe</th><th>Veränderung (−1 … +1)</th><th>Richtung</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${esc(D.nodeById.get(r.id).label)}</td><td class="num">${r.v.toFixed(2)}</td><td>${r.v > 0 ? '▲ steigt' : '▼ sinkt'}</td></tr>`).join('')}</tbody></table>`;
  const first = rows[0];
  if (first) explain(first.id); else $('sim-panel').innerHTML = intro();
}

function drawBars(rows) {
  const box = $('sim-chart');
  box.innerHTML = '';
  if (!rows.length) { box.innerHTML = '<p class="muted" style="padding:16px">Keine Wirkung.</p>'; return; }
  const W = box.clientWidth || 700, rowH = 26, M = { top: 24, right: 60, bottom: 10, left: Math.min(330, Math.round(W * 0.4)) };
  const maxChars = Math.floor((M.left - 16) / 6.2);
  const cut = (t) => (t.length > maxChars ? `${t.slice(0, maxChars - 1)}…` : t);
  const H = M.top + rows.length * rowH + M.bottom;
  const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Simulierte Veränderungen');
  const m = Math.max(0.2, d3.max(rows, (r) => Math.abs(r.v)));
  const x = d3.scaleLinear().domain([-m, m]).range([M.left, W - M.right]);
  svg.append('line').attr('class', 'sim-zero').attr('x1', x(0)).attr('x2', x(0)).attr('y1', M.top - 6).attr('y2', H - M.bottom);
  svg.append('text').attr('class', 'sim-head').attr('x', x(0) - 6).attr('y', 14).attr('text-anchor', 'end').text('◀ sinkt');
  svg.append('text').attr('class', 'sim-head').attr('x', x(0) + 6).attr('y', 14).text('steigt ▶');
  const g = svg.selectAll('g.sim-row').data(rows).join('g').attr('class', 'sim-row')
    .attr('transform', (d, i) => `translate(0,${M.top + i * rowH})`).attr('tabindex', 0).attr('role', 'button')
    .on('click', (ev, d) => explain(d.id)).on('keydown', (ev, d) => { if (ev.key === 'Enter') explain(d.id); });
  g.append('rect').attr('class', 'sim-hit').attr('x', 0).attr('width', W).attr('height', rowH);
  g.append('text').attr('class', 'sim-label').attr('x', M.left - 10).attr('y', rowH / 2).attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
    .text((d) => cut(D.nodeById.get(d.id).label));
  g.append('title').text((d) => D.nodeById.get(d.id).label);
  g.append('rect').attr('class', (d) => `sim-bar ${d.v > 0 ? 'up' : 'down'}`)
    .attr('x', (d) => Math.min(x(0), x(d.v))).attr('width', (d) => Math.max(2, Math.abs(x(d.v) - x(0))))
    .attr('y', 5).attr('height', rowH - 10).attr('rx', 3);
  g.append('text').attr('class', 'sim-val').attr('y', rowH / 2).attr('dominant-baseline', 'middle')
    .attr('x', (d) => (d.v > 0 ? x(d.v) + 6 : x(d.v) - 6)).attr('text-anchor', (d) => (d.v > 0 ? 'start' : 'end'))
    .text((d) => `${d.v > 0 ? '+' : '−'}${Math.abs(d.v).toFixed(2)}`);
}

function intro() {
  return `<h2>Hebel-Simulation</h2><p>Wähle ein Szenario oder setze eigene Hebel. Die Simulation lässt die Wirkung durch das Netz laufen, bis es einschwingt.</p>`;
}

function explain(id) {
  const n = D.nodeById.get(id);
  const v = last.value(id);
  const cons = last.contributions(id).slice(0, 5);
  $('sim-panel').innerHTML = `<h2>${esc(n.label)}</h2>
    <p>${v > 0 ? '▲ steigt' : '▼ sinkt'} um <b>${Math.abs(v).toFixed(2)}</b> <span class="muted">(Skala −1 … +1)</span></p>
    <p class="muted">${esc(n.description)}</p>
    <h3>Warum? Stärkste Einflüsse</h3>
    <ul>${cons.map((c) => `<li>${c.value > 0 ? '▲' : '▼'} <b>${esc(D.nodeById.get(c.from).label)}</b> (${last.value(c.from) > 0 ? 'steigt' : 'sinkt'}, Wirkung ${c.w > 0 ? '+' : '−'}): Beitrag ${c.value > 0 ? '+' : '−'}${Math.abs(c.value).toFixed(2)}
      ${c.e.claims.length ? `<br><span class="muted">Belegt durch ${c.e.claims.map((k) => `<a href="#fakten/${k}">${k}</a>`).join(', ')}</span>` : ''}</li>`).join('') || '<li class="muted">direkt gesetzter Hebel</li>'}</ul>
    <p><a href="#netz/${id}">Im Wirkungsnetz zeigen</a></p>`;
}
