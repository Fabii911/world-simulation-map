// Kanten-Evidenz: Passt eine behauptete Wirkung zu den Daten?
// Korrelation der Jahresveränderungen (Differenzen), x um „lag“ Jahre vorlaufend.
import { esc, ratingBadge, weightAt } from './data.js';
import { loadSeries, fmt } from './series.js';

let cache = null;

export async function loadEvidence() {
  if (cache) return cache;
  const get = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); });
  const [ev, S, trade, iso] = await Promise.all([
    get('data/evidence.json'), loadSeries(), get('data/series/trade.json').catch(() => null), get('data/iso-codes.json'),
  ]);
  cache = { ev, S, trade, iso };
  return cache;
}

export function hasEvidence(key) { return Boolean(cache?.ev.edges[key]); }

const countryName = (code) => cache.iso[code]?.de || code;

/** Zeitreihe zu einer Spezifikation: [{year, value}] */
function seriesOf(spec) {
  const { S, trade } = cache;
  if (spec.source === 'trade') {
    if (!trade) return [];
    const Y = trade.meta.years;
    const sum = (map, i) => Object.entries(map || {}).reduce((s, [ch, a]) => (ch === '99' || (spec.sector !== undefined && trade.meta.chapters[ch].sector !== spec.sector) ? s : s + a[i]), 0);
    return Y.map((y, i) => { const w = sum(trade.world, i); return { year: y, value: w ? sum(trade.countries[spec.iso], i) / w * 100 : null }; })
      .filter((d) => d.value !== null);
  }
  const byYear = S.wb.values[spec.ind]?.[spec.iso] || {};
  return Object.entries(byYear).map(([y, v]) => ({ year: Number(y), value: v })).sort((a, b) => a.year - b.year);
}

function specLabel(spec) {
  const { S, trade } = cache;
  if (spec.source === 'trade') {
    const what = spec.sector !== undefined ? `Weltmarktanteil ${trade?.meta.sectors[spec.sector] || ''}` : 'Weltmarktanteil Warenexporte';
    return { name: `${what}, ${countryName(spec.iso)}`, unit: '%', source: 'Atlas of Economic Complexity' };
  }
  const m = S.wb.meta.indicators[spec.ind] || {};
  return { name: `${m.name || spec.ind}, ${countryName(spec.iso)}`, unit: m.unit || '', source: m.source || '' };
}

function pearson(a, b) {
  const n = a.length;
  if (n < 3) return null;
  const ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : null;
}

/** Bewertung einer Wirkung anhand der Daten. */
export function assess(edge, year = 2026) {
  const spec = cache?.ev.edges[edge.key];
  if (!spec) return { status: 'none', label: 'keine Datenreihe hinterlegt' };
  const xs = seriesOf(spec.x), ys = seriesOf(spec.y);
  const xm = new Map(xs.map((d) => [d.year, d.value])), ym = new Map(ys.map((d) => [d.year, d.value]));
  const sx = spec.x.invert ? -1 : 1, sy = spec.y.invert ? -1 : 1;
  const lag = spec.lag || 0;
  const pairs = [];
  for (const { year: t } of ys) {
    const y1 = ym.get(t), y0 = ym.get(t - 1), x1 = xm.get(t - lag), x0 = xm.get(t - lag - 1);
    if ([y1, y0, x1, x0].every((v) => v !== undefined && v !== null)) pairs.push({ t, dx: sx * (x1 - x0), dy: sy * (y1 - y0) });
  }
  const r = pearson(pairs.map((p) => p.dx), pairs.map((p) => p.dy));
  const expected = Math.sign(weightAt(edge, year, cache.validity || new Map()));
  let status, label;
  if (pairs.length < 10 || r === null) { status = 'few'; label = 'zu wenige Daten'; }
  else if (Math.abs(r) < 0.2) { status = 'unclear'; label = 'kein klarer Zusammenhang'; }
  else if (Math.sign(r) === expected) { status = 'fits'; label = 'Daten passen zur Richtung'; }
  else { status = 'contradicts'; label = 'Daten widersprechen der Richtung'; }
  return { status, label, r, n: pairs.length, pairs, xs, ys, spec, expected, lag };
}

export function setValidity(v) { if (cache) cache.validity = v; }

export function evidenceBadge(a) {
  const icon = { fits: '✓', contradicts: '✗', unclear: '≈', few: '…', none: '–' }[a.status];
  return `<span class="ev-badge ev-${a.status}" title="${esc(a.label)}">${icon} Daten: ${esc(a.label)}${a.r !== undefined && a.r !== null ? ` (r = ${fmt(a.r)})` : ''}</span>`;
}

export function literatureBadge(edge, claimById) {
  const claims = edge.claims.map((c) => claimById.get(c)).filter(Boolean);
  if (!claims.length) return '<span class="ev-badge ev-none">– Literatur: kein geprüfter Beleg</span>';
  return `<span class="ev-badge ev-lit">📖 Literatur: ${claims.length} geprüfte Aussage${claims.length > 1 ? 'n' : ''}</span>`;
}

/** Ausführliche Evidenz-Ansicht in einen Container rendern. */
export function renderEvidence(el, edge, D, { literature = true } = {}) {
  const a = assess(edge);
  const from = D.nodeById.get(edge.from), to = D.nodeById.get(edge.to);
  const claims = edge.claims.map((c) => D.claimById.get(c)).filter(Boolean);
  const w = weightAt(edge, 2026, D.validityByEdge);
  let html = literature ? `<h3>Kausalität (Literatur)</h3>
    <p>Behauptet: mehr <b>${esc(from.label)}</b> → <b>${w < 0 ? 'weniger' : 'mehr'}</b> ${esc(to.label)}${edge.delay ? ' (mit Verzögerung)' : ''}. Sicherheit ${Math.round(edge.confidence * 100)} %.</p>
    <ul>${claims.map((c) => `<li><a href="#fakten/${c.id}">${c.id}</a> ${ratingBadge(c.rating)} ${esc(c.text)}</li>`).join('') || '<li class="muted">noch keine geprüfte Aussage</li>'}</ul>` : '';
  html += '<h3>Korrelation (Daten)</h3>';
  if (a.status === 'none') {
    html += '<p class="muted">Für diese Wirkung ist noch keine passende Datenreihe hinterlegt. Viele Größen (z. B. Aggressionsrisiko, Plattformmacht) lassen sich nicht direkt messen.</p>';
    el.innerHTML = html;
    return a;
  }
  const lx = specLabel(a.spec.x), ly = specLabel(a.spec.y);
  html += `<p>${evidenceBadge(a)}</p>
    <p class="muted">${esc(a.spec.note || '')}</p>
    <div class="ev-chart" data-which="x"></div>
    <div class="ev-chart" data-which="y"></div>
    <div class="ev-scatter"></div>
    <p class="muted">Korrelation der Jahresveränderungen${a.lag ? `, ${esc(lx.name)} ${a.lag} Jahr${a.lag > 1 ? 'e' : ''} vorlaufend` : ''}, n = ${a.n}.
      ${a.spec.x.invert || a.spec.y.invert ? 'Umgekehrt gewertete Kennzahlen sind im Streudiagramm bereits gedreht. ' : ''}
      Korrelation beweist keine Kausalität; ein fehlender Zusammenhang in Jahresdaten widerlegt keine langfristige Wirkung.</p>`;
  el.innerHTML = html;
  drawLine(el.querySelector('[data-which="x"]'), a.xs, lx, 'x');
  drawLine(el.querySelector('[data-which="y"]'), a.ys, ly, 'y');
  drawScatter(el.querySelector('.ev-scatter'), a, lx, ly);
  return a;
}

function drawLine(box, data, label, which) {
  const W = 320, H = 92, M = { l: 38, r: 10, t: 18, b: 18 };
  const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', label.name);
  svg.append('text').attr('class', 'ev-title').attr('x', 0).attr('y', 11).text(`${which === 'x' ? 'Ursache' : 'Wirkung'}: ${label.name}${label.unit ? ` (${label.unit})` : ''}`);
  if (data.length < 2) { svg.append('text').attr('class', 'ev-empty').attr('x', M.l).attr('y', 50).text('keine Daten'); return; }
  const x = d3.scaleLinear().domain(d3.extent(data, (d) => d.year)).range([M.l, W - M.r]);
  const y = d3.scaleLinear().domain(d3.extent(data, (d) => d.value)).nice().range([H - M.b, M.t]);
  svg.append('g').attr('class', 'dg-axis').attr('transform', `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(3));
  svg.append('g').attr('class', 'dg-axis').attr('transform', `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d')));
  svg.append('path').attr('class', `ev-line ${which}`).attr('d', d3.line().x((d) => x(d.year)).y((d) => y(d.value))(data));
}

function drawScatter(box, a, lx, ly) {
  const W = 320, H = 170, M = { l: 38, r: 10, t: 18, b: 30 };
  const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Streudiagramm der Jahresveränderungen');
  svg.append('text').attr('class', 'ev-title').attr('x', 0).attr('y', 11).text('Jahresveränderungen: Ursache → (waagerecht), Wirkung ↑ (senkrecht)');
  if (a.pairs.length < 3) return;
  const ex = d3.max(a.pairs, (p) => Math.abs(p.dx)) || 1, ey = d3.max(a.pairs, (p) => Math.abs(p.dy)) || 1;
  const x = d3.scaleLinear().domain([-ex, ex]).range([M.l, W - M.r]);
  const y = d3.scaleLinear().domain([-ey, ey]).range([H - M.b, M.t]);
  svg.append('line').attr('class', 'ev-zero').attr('x1', x(0)).attr('x2', x(0)).attr('y1', M.t).attr('y2', H - M.b);
  svg.append('line').attr('class', 'ev-zero').attr('x1', M.l).attr('x2', W - M.r).attr('y1', y(0)).attr('y2', y(0));
  svg.append('g').attr('class', 'dg-axis').attr('transform', `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(4));
  svg.append('g').attr('class', 'dg-axis').attr('transform', `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(4));
  // Erwartete Richtung als schwache Diagonale
  svg.append('line').attr('class', 'ev-expect').attr('x1', x(-ex)).attr('x2', x(ex)).attr('y1', y(-ey * a.expected)).attr('y2', y(ey * a.expected));
  svg.selectAll('circle').data(a.pairs).join('circle').attr('class', 'ev-dot').attr('r', 4)
    .attr('cx', (p) => x(p.dx)).attr('cy', (p) => y(p.dy))
    .append('title').text((p) => `${p.t}: Δ Ursache ${fmt(p.dx)}, Δ Wirkung ${fmt(p.dy)}`);
  svg.append('text').attr('class', 'ev-empty').attr('x', W - M.r).attr('y', H - 4).attr('text-anchor', 'end').text('gestrichelt: erwartete Richtung');
}
