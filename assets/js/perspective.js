// „Aus Sicht von“: Über welche Kanäle treffen die globalen Mechanismen ein bestimmtes Land, und wie stark?
// Die Wirkungslogik bleibt eine; die Perspektive gewichtet sie mit den Daten des Landes (Perzentil unter allen Ländern).
import { esc, domainColor, cssVar } from './data.js';
import { loadSeries, valNear, goodYear, classify, TYPES, fmt } from './series.js';

let D = null, S = null, T = null, P = null, chains = [], iso = 'DEU', compare = '', cyEgo = null, cache = {};
const $ = (id) => document.getElementById(id);
const MECH = { M1: 'Ungleichgewicht', M2: 'Abhängigkeit', M3: 'Machtkonzentration', M4: 'Planetare Grenzen' };

export async function initPerspective(data) {
  D = data;
  const get = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); });
  [S, T, P, chains] = await Promise.all([loadSeries(), get('data/series/trade.json'), get('data/perspective.json'), get('data/chains.json').then((c) => c.chains)]);
  const names = Object.entries(S.wb.countries).sort((a, b) => a[1].name.localeCompare(b[1].name, 'de'));
  const opts = names.map(([c, v]) => `<option value="${c}">${esc(v.name)}</option>`).join('');
  $('pv-country').innerHTML = opts; $('pv-country').value = iso;
  $('pv-compare').innerHTML = `<option value="">– kein Vergleich –</option>${opts}`;
  $('pv-country').addEventListener('change', () => { iso = $('pv-country').value; render(); });
  $('pv-compare').addEventListener('change', () => { compare = $('pv-compare').value; render(); });
  render();
}

export function setPerspective(code) {
  if (!S || !S.wb.countries[code]) return;
  iso = code; $('pv-country').value = code; render();
}

// ---------- Kennzahlen je Kanal ----------
function tradePressureAll() {
  if (cache.pressure) return cache.pressure;
  const Y = T.meta.years, t1 = Y.at(-1), t0 = P.meta.pressure_period[0];
  const i0 = Y.indexOf(t0), i1 = Y.indexOf(t1);
  const sec = (map, i) => { const o = {}; for (const [ch, a] of Object.entries(map)) { if (ch === '99') continue; const s = T.meta.chapters[ch].sector; o[s] = (o[s] || 0) + a[i]; } return o; };
  const W0 = sec(T.world, i0), W1 = sec(T.world, i1), C0 = sec(T.countries.CHN, i0), C1 = sec(T.countries.CHN, i1);
  const d = {}; for (const s in W1) d[s] = C1[s] / W1[s] - C0[s] / W0[s];
  const out = {};
  for (const [c, m] of Object.entries(T.countries)) {
    if (c === 'CHN') continue;
    const X = sec(m, i0), tot = Object.values(X).reduce((a, b) => a + b, 0);
    if (!tot) continue;
    out[c] = { value: Object.keys(d).reduce((s, k) => s + (X[k] || 0) / tot * d[k] * 100, 0), year: `${t0}–${t1}` };
  }
  return (cache.pressure = out);
}

function sectorShareAll(sector) {
  const key = `share${sector}`;
  if (cache[key]) return cache[key];
  const i = T.meta.years.length - 1, out = {};
  for (const [c, m] of Object.entries(T.countries)) {
    let tot = 0, part = 0;
    for (const [ch, a] of Object.entries(m)) { if (ch === '99') continue; tot += a[i]; if (T.meta.chapters[ch].sector === sector) part += a[i]; }
    if (tot) out[c] = { value: part / tot * 100, year: T.meta.years[i] };
  }
  return (cache[key] = out);
}

function seriesAll(ind) {
  const key = `s:${ind}`;
  if (cache[key]) return cache[key];
  const gy = goodYear(S, [ind]), out = {};
  for (const c of Object.keys(S.wb.countries)) { const v = valNear(S, ind, c, gy, 5); if (v) out[c] = v; }
  return (cache[key] = out);
}

function channelValues(ch) {
  if (ch.source.type === 'trade_pressure') return tradePressureAll();
  if (ch.source.type === 'trade_sector_share') return sectorShareAll(ch.source.sector);
  return seriesAll(ch.source.ind);
}

/** Perzentil der Betroffenheit (0–100, 100 = am stärksten betroffen). */
function percentile(all, code, direction) {
  const me = all[code];
  if (!me) return null;
  const vals = Object.values(all).map((v) => v.value);
  const below = vals.filter((v) => (direction === 'low' ? v > me.value : v < me.value)).length;
  const equal = vals.filter((v) => v === me.value).length;
  return Math.round(((below + 0.5 * (equal - 1)) / Math.max(1, vals.length - 1)) * 100);
}

function profile(code) {
  return P.channels.map((ch) => {
    const all = channelValues(ch);
    return { ch, v: all[code] || null, p: percentile(all, code, ch.direction), n: Object.keys(all).length };
  });
}

// ---------- Darstellung ----------
function render() {
  const prof = profile(iso).sort((a, b) => (b.p ?? -1) - (a.p ?? -1));
  const profCmp = compare ? Object.fromEntries(profile(compare).map((r) => [r.ch.id, r])) : null;
  const c = S.wb.countries[iso];
  const cl = classify(S, iso, goodYear(S, ['ca_gdp', 'hh_cons']));
  const known = prof.filter((r) => r.p !== null);
  const top = known.slice(0, 3);

  $('pv-head').innerHTML = `<h2>Aus Sicht von ${esc(c.name)}</h2>
    <p>${cl ? `Länder-Typ: <b>${esc(TYPES[cl.type].label)}</b> · ` : ''}Am stärksten betroffen über:
      ${top.map((r) => `<b>${esc(r.ch.name)}</b> (${r.p}. Perzentil)`).join(', ') || '–'}</p>`;

  drawProfile(prof, profCmp);
  renderChains(known);
  drawEgo(known);
  $('pv-table').innerHTML = `<table><thead><tr><th>Kanal</th><th>Wert ${esc(c.name)}</th><th>Betroffenheit (Perzentil)</th>${compare ? `<th>Wert ${esc(S.wb.countries[compare].name)}</th><th>Perzentil</th>` : ''}<th>Länder mit Daten</th></tr></thead><tbody>
    ${prof.map((r) => `<tr><td>${esc(r.ch.name)}</td><td class="num">${r.v ? `${fmt(r.v.value)} ${esc(r.ch.unit)} (${r.v.year})` : '–'}</td><td class="num">${r.p ?? '–'}</td>
      ${compare ? `<td class="num">${profCmp[r.ch.id]?.v ? fmt(profCmp[r.ch.id].v.value) : '–'}</td><td class="num">${profCmp[r.ch.id]?.p ?? '–'}</td>` : ''}<td class="num">${r.n}</td></tr>`).join('')}
    </tbody></table>`;
}

function drawProfile(prof, profCmp) {
  const box = $('pv-profile');
  box.innerHTML = '';
  const W = box.clientWidth || 700, rowH = 44, M = { l: 240, r: 120, t: 26, b: 22 };
  const H = M.t + prof.length * rowH + M.b;
  const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Betroffenheitsprofil');
  const x = d3.scaleLinear().domain([0, 100]).range([M.l, W - M.r]);
  for (const t of [0, 25, 50, 75, 100]) {
    svg.append('line').attr('class', 'pv-grid').attr('x1', x(t)).attr('x2', x(t)).attr('y1', M.t - 6).attr('y2', H - M.b);
    svg.append('text').attr('class', 'pv-tick').attr('x', x(t)).attr('y', H - 6).attr('text-anchor', 'middle').text(t);
  }
  svg.append('text').attr('class', 'pv-tick').attr('x', x(0)).attr('y', 14).text('wenig betroffen');
  svg.append('text').attr('class', 'pv-tick').attr('x', x(100)).attr('y', 14).attr('text-anchor', 'end').text('stark betroffen (Perzentil unter allen Ländern)');
  const g = svg.selectAll('g.pv-row').data(prof).join('g').attr('class', 'pv-row').attr('transform', (d, i) => `translate(0,${M.t + i * rowH})`);
  g.append('text').attr('class', 'pv-name').attr('x', M.l - 12).attr('y', rowH / 2 - 4).attr('text-anchor', 'end').text((d) => d.ch.name);
  g.append('text').attr('class', 'pv-mech').attr('x', M.l - 12).attr('y', rowH / 2 + 11).attr('text-anchor', 'end').text((d) => `${d.ch.mechanism} ${MECH[d.ch.mechanism]}`);
  g.append('line').attr('class', 'pv-track').attr('x1', x(0)).attr('x2', x(100)).attr('y1', rowH / 2).attr('y2', rowH / 2);
  g.filter((d) => d.p !== null).append('line').attr('class', 'pv-bar').attr('x1', x(0)).attr('x2', (d) => x(d.p)).attr('y1', rowH / 2).attr('y2', rowH / 2);
  if (profCmp) {
    g.filter((d) => profCmp[d.ch.id]?.p !== null && profCmp[d.ch.id]?.p !== undefined).append('circle').attr('class', 'pv-dot cmp').attr('r', 7)
      .attr('cx', (d) => x(profCmp[d.ch.id].p)).attr('cy', rowH / 2)
      .append('title').text((d) => `${S.wb.countries[compare].name}: ${profCmp[d.ch.id].p}. Perzentil`);
  }
  g.filter((d) => d.p !== null).append('circle').attr('class', 'pv-dot me').attr('r', 7).attr('cx', (d) => x(d.p)).attr('cy', rowH / 2)
    .append('title').text((d) => `${d.ch.text}`);
  g.append('text').attr('class', 'pv-val').attr('x', W - M.r + 12).attr('y', rowH / 2 + 4)
    .text((d) => (d.v ? `${fmt(d.v.value)} ${d.ch.unit}` : 'keine Daten'));
  const legend = `<span><span class="swatch" style="background:var(--s1)"></span>${esc(S.wb.countries[iso].name)}</span>${compare ? `<span><span class="swatch" style="background:var(--s2)"></span>${esc(S.wb.countries[compare].name)}</span>` : ''}
    <span class="muted">Perzentil 80 heißt: stärker betroffen als 80 % der Länder mit Daten. Wert rechts: Kennzahl im letzten gut abgedeckten Jahr.</span>`;
  $('pv-legend').innerHTML = legend;
}

function renderChains(known) {
  const score = {};
  for (const r of known) for (const cid of r.ch.chains) score[cid] = Math.max(score[cid] || 0, r.p);
  const list = chains.filter((c) => score[c.id] !== undefined).sort((a, b) => score[b.id] - score[a.id]);
  const why = (cid) => known.filter((r) => r.ch.chains.includes(cid)).map((r) => `${r.ch.name} (${r.p})`).join(', ');
  $('pv-chains').innerHTML = `<h3>Relevante Ketten für ${esc(S.wb.countries[iso].name)}</h3>
    <ol>${list.map((c) => `<li><a href="#ketten/${c.id}">${esc(c.title)}</a><br><span class="muted">wegen: ${esc(why(c.id))}</span></li>`).join('')}</ol>
    <p class="muted">Größen mit „DE“ im Namen stehen in anderen Ländern stellvertretend für die heimische Industrie; die Wirkungslogik ist dieselbe.</p>`;
}

function drawEgo(known) {
  const weight = {};
  for (const r of known) for (const n of r.ch.nodes) weight[n] = Math.max(weight[n] || 0, r.p);
  const core = new Set(Object.keys(weight));
  const edges = D.model.edges.filter((e) => core.has(e.from) || core.has(e.to));
  const nodes = new Set(edges.flatMap((e) => [e.from, e.to]));
  const els = [...nodes].map((id) => ({ data: { id, label: D.nodeById.get(id).label, domain: D.nodeById.get(id).domain, w: weight[id] ?? 0, core: core.has(id) ? 1 : 0 } }))
    .concat(edges.map((e) => ({ data: { id: `e:${e.key}`, source: e.from, target: e.to, neg: e.weight < 0 ? 1 : 0, strong: core.has(e.from) && core.has(e.to) ? 1 : 0 } })));
  if (cyEgo) cyEgo.destroy();
  const pos = cssVar('--pos'), neg = cssVar('--neg'), ink = cssVar('--ink'), surface = cssVar('--surface');
  cyEgo = cytoscape({
    container: $('pv-graph'), elements: els, wheelSensitivity: 0.25, minZoom: 0.3, maxZoom: 2.5,
    style: [
      { selector: 'node', style: { 'background-color': (n) => domainColor(n.data('domain')), width: (n) => (n.data('core') ? 14 + n.data('w') * 0.28 : 9), height: (n) => (n.data('core') ? 14 + n.data('w') * 0.28 : 9),
        opacity: (n) => (n.data('core') ? 1 : 0.45), label: 'data(label)', 'font-size': (n) => (n.data('core') ? 11 : 8), color: ink, 'text-wrap': 'wrap', 'text-max-width': 110,
        'text-valign': 'bottom', 'text-margin-y': 3, 'text-background-color': surface, 'text-background-opacity': 0.7, 'border-width': 2, 'border-color': surface } },
      { selector: 'edge', style: { width: (e) => (e.data('strong') ? 2 : 1), 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'arrow-scale': 0.7,
        'line-color': (e) => (e.data('neg') ? neg : pos), 'target-arrow-color': (e) => (e.data('neg') ? neg : pos), opacity: (e) => (e.data('strong') ? 0.85 : 0.25) } },
    ],
    layout: { name: 'cose', animate: false, randomize: true, nodeRepulsion: () => 30000, idealEdgeLength: () => 90, gravity: 0.5, numIter: 1200, padding: 20 },
  });
  cyEgo.on('tap', 'node', (ev) => { location.hash = `#netz/${ev.target.id()}`; });
  window.__cyEgo = cyEgo;
}
