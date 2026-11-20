// Lieferketten: (A) Abhängigkeits-Quadrant für kritische Importgüter, (B) Herkunft der Wertschöpfung in Exporten (OECD TiVA).
import { esc } from './data.js';
import { fmt } from './series.js';

// Schwellen der EU-Methode zu strategischen Abhängigkeiten (SWD(2021) 352): Konzentration HHI > 0,4; Importabhängigkeit > 0,5
const HHI_T = 0.4, DEP_T = 0.5;
const SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];

let DEP = null, TIVA = null, iso = {}, st = { imp: 'DEU', year: null, group: 'alle', prod: '8507', ex: 'DEU', act: 'C29' };
let tooltip;
const $ = (id) => document.getElementById(id);
const name = (c) => iso[c]?.de || c;

export async function initSupply() {
  const get = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); });
  [DEP, TIVA, iso] = await Promise.all([get('data/series/dependencies.json'), get('data/series/tiva.json'), get('data/iso-codes.json')]);
  const Y = DEP.meta.years;
  st.year = Y.at(-1);
  $('sc-imp').innerHTML = DEP.meta.importers.map((c) => `<option value="${c}">${esc(name(c))}</option>`).sort((a, b) => a.localeCompare(b, 'de')).join('');
  $('sc-imp').value = st.imp;
  $('sc-year').innerHTML = Y.map((y) => `<option value="${y}">${y}</option>`).join(''); $('sc-year').value = st.year;
  const groups = ['alle', ...new Set(Object.values(DEP.meta.products).map((p) => p.group))];
  $('sc-groups').innerHTML = groups.map((g) => `<button type="button" class="chip" data-g="${esc(g)}" aria-pressed="${g === st.group}">${esc(g === 'alle' ? 'Alle Güter' : g)}</button>`).join('');
  $('sc-groups').querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => {
    st.group = b.dataset.g;
    $('sc-groups').querySelectorAll('[data-g]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    drawQuadrant();
  }));
  $('sc-imp').addEventListener('change', () => { st.imp = $('sc-imp').value; drawQuadrant(); renderProduct(); });
  $('sc-year').addEventListener('change', () => { st.year = Number($('sc-year').value); drawQuadrant(); renderProduct(); });

  $('va-ex').innerHTML = TIVA.meta.exporters.map((c) => `<option value="${c}">${esc(name(c))}</option>`).sort((a, b) => a.localeCompare(b, 'de')).join('');
  $('va-ex').value = st.ex;
  $('va-act').innerHTML = Object.entries(TIVA.meta.activities).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  $('va-act').value = st.act;
  $('va-ex').addEventListener('change', () => { st.ex = $('va-ex').value; renderVA(); });
  $('va-act').addEventListener('change', () => { st.act = $('va-act').value; renderVA(); });

  tooltip = document.createElement('div'); tooltip.className = 'tooltip'; tooltip.hidden = true; tooltip.style.position = 'fixed';
  document.body.appendChild(tooltip);
  new ResizeObserver(() => { drawQuadrant(); renderVA(); }).observe($('sc-quadrant'));
  drawQuadrant(); renderProduct(); renderVA();
}

export function setSupplyCountry(c) {
  if (!DEP) return;
  if (DEP.meta.importers.includes(c)) { st.imp = c; $('sc-imp').value = c; drawQuadrant(); renderProduct(); }
  if (TIVA.meta.exporters.includes(c)) { st.ex = c; $('va-ex').value = c; renderVA(); }
}

// ---------- (A) Abhängigkeits-Quadrant ----------
function metrics(imp, code, year) {
  const d = DEP.data[imp]?.[code];
  if (!d) return null;
  const i = DEP.meta.years.indexOf(year);
  const M = d.M[i], X = d.X[i];
  if (!M) return null;
  return { code, M, X, dep: M / (M + X), hhi: d.hhi[i], cn: d.cn[i], d };
}

function drawQuadrant() {
  const box = $('sc-quadrant');
  box.querySelector('svg')?.remove();
  const pts = Object.keys(DEP.meta.products)
    .filter((c) => st.group === 'alle' || DEP.meta.products[c].group === st.group)
    .map((c) => metrics(st.imp, c, st.year)).filter(Boolean);
  const W = box.clientWidth || 700, H = 460, M = { l: 56, r: 20, t: 20, b: 46 };
  const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Abhängigkeits-Quadrant');
  const x = d3.scaleLinear().domain([0, 1]).range([M.l, W - M.r]);
  const y = d3.scaleLinear().domain([0, 1]).range([H - M.b, M.t]);
  const r = d3.scaleSqrt().domain([0, d3.max(pts, (p) => p.M) || 1]).range([4, 30]);
  const color = d3.scaleQuantize().domain([0, 1]).range(SEQ);
  svg.append('rect').attr('class', 'sc-critical').attr('x', x(HHI_T)).attr('y', y(1)).attr('width', x(1) - x(HHI_T)).attr('height', y(DEP_T) - y(1));
  svg.append('text').attr('class', 'sc-zone').attr('x', x(1) - 8).attr('y', y(1) + 16).attr('text-anchor', 'end').text('kritisch: wenige Lieferländer, kaum eigene Exporte');
  svg.append('g').attr('class', 'dg-axis').attr('transform', `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(5));
  svg.append('g').attr('class', 'dg-axis').attr('transform', `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')));
  for (const [v, axis] of [[HHI_T, 'x'], [DEP_T, 'y']]) {
    if (axis === 'x') svg.append('line').attr('class', 'sc-thresh').attr('x1', x(v)).attr('x2', x(v)).attr('y1', M.t).attr('y2', H - M.b);
    else svg.append('line').attr('class', 'sc-thresh').attr('x1', M.l).attr('x2', W - M.r).attr('y1', y(v)).attr('y2', y(v));
  }
  svg.append('text').attr('class', 'dg-axis-title').attr('x', (M.l + W - M.r) / 2).attr('y', H - 8).attr('text-anchor', 'middle')
    .text('Lieferkonzentration (HHI: 0 = viele Lieferländer, 1 = ein einziges)  →');
  svg.append('text').attr('class', 'dg-axis-title').attr('transform', `translate(14,${(M.t + H - M.b) / 2}) rotate(-90)`).attr('text-anchor', 'middle')
    .text('Importabhängigkeit: Importe ÷ (Importe + eigene Exporte)  →');
  const g = svg.selectAll('g.sc-pt').data(pts.sort((a, b) => b.M - a.M), (d) => d.code).join('g').attr('class', (d) => `sc-pt${d.code === st.prod ? ' sel' : ''}`)
    .attr('transform', (d) => `translate(${x(d.hhi)},${y(d.dep)})`).attr('tabindex', 0).attr('role', 'button')
    .attr('aria-label', (d) => DEP.meta.products[d.code].name)
    .on('click', (ev, d) => { st.prod = d.code; drawQuadrant(); renderProduct(); })
    .on('keydown', (ev, d) => { if (ev.key === 'Enter') { st.prod = d.code; drawQuadrant(); renderProduct(); } })
    .on('mouseenter', (ev, d) => {
      tooltip.hidden = false;
      tooltip.innerHTML = `<b>${esc(DEP.meta.products[d.code].name)}</b> (HS ${d.code})<br>Importe ${fmt(d.M / 1000)} Mrd. USD · eigene Exporte ${fmt(d.X / 1000)} Mrd. USD<br>
        Anteil China: <b>${fmt(d.cn * 100)} %</b> · HHI ${fmt(d.hhi)} · Abhängigkeit ${fmt(d.dep * 100)} %`;
    })
    .on('mousemove', (ev) => { tooltip.style.left = `${Math.min(ev.clientX + 14, window.innerWidth - 300)}px`; tooltip.style.top = `${ev.clientY + 14}px`; })
    .on('mouseleave', () => { tooltip.hidden = true; });
  g.append('circle').attr('r', (d) => r(d.M)).attr('fill', (d) => color(d.cn));
  // Direkte Beschriftung: ausgewähltes Gut, kritische Güter und die größten – ohne Überlappung
  const placed = [];
  const wanted = pts.filter((d, i) => d.code === st.prod || (d.hhi > HHI_T && d.dep > DEP_T) || i < 8)
    .sort((a, b) => {
      const pri = (d) => (d.code === st.prod ? 2 : (d.hhi > HHI_T && d.dep > DEP_T ? 1 : 0));
      return pri(b) - pri(a) || b.M - a.M;
    });
  const labelled = new Set();
  for (const d of wanted) {
    const lx = x(d.hhi) + r(d.M) + 3, ly = y(d.dep), w = DEP.meta.products[d.code].name.length * 6;
    if (placed.some((p) => Math.abs(p.y - ly) < 13 && lx < p.x + p.w && lx + w > p.x)) continue;
    placed.push({ x: lx, y: ly, w }); labelled.add(d.code);
  }
  g.filter((d) => labelled.has(d.code)).append('text').attr('class', 'sc-label')
    .attr('x', (d) => r(d.M) + 3).attr('y', 4).text((d) => DEP.meta.products[d.code].name);
  $('sc-legend').innerHTML = `<span class="muted">Farbe = Anteil Chinas an den Importen:</span>
    ${color.range().map((c) => { const [a, b] = color.invertExtent(c); return `<span class="lg-bin"><span class="lg-sw" style="background:${c}"></span>${fmt(a * 100)}–${fmt(b * 100)} %</span>`; }).join('')}
    <span class="muted">Kreisfläche = Importwert. Gestrichelt: Schwellen der EU-Methode (HHI 0,4; Abhängigkeit 50 %).</span>`;
  renderSummary(Object.keys(DEP.meta.products).map((c) => metrics(st.imp, c, st.year)).filter(Boolean));
}

function renderSummary(all) {
  const crit = all.filter((p) => p.hhi > HHI_T && p.dep > DEP_T);
  const cnMax = [...all].sort((a, b) => b.cn - a.cn).slice(0, 5);
  $('sc-summary').innerHTML = `<b>${esc(name(st.imp))} ${st.year}:</b> ${crit.length} von ${all.length} Gütern im kritischen Feld${crit.length ? ` (${crit.map((p) => esc(DEP.meta.products[p.code].name)).join(', ')})` : ''}.
    Höchster China-Anteil: ${cnMax.map((p) => `${esc(DEP.meta.products[p.code].name)} ${fmt(p.cn * 100)} %`).join(' · ')}.`;
}

function renderProduct() {
  const p = metrics(st.imp, st.prod, st.year);
  const info = DEP.meta.products[st.prod];
  const el = $('sc-panel');
  if (!p) { el.innerHTML = `<h2>${esc(info.name)}</h2><p class="muted">Keine Importe von ${esc(name(st.imp))} in ${st.year}.</p>`; return; }
  const top = p.d.top[DEP.meta.years.at(-1)] || [];
  const top15 = p.d.top[2015] || [];
  const crit = [p.hhi > HHI_T, p.dep > DEP_T];
  el.innerHTML = `<h2>${esc(info.name)} <span class="muted">HS ${st.prod}</span></h2>
    <p class="muted">${esc(info.group)} · Importe ${esc(name(st.imp))} ${st.year}</p>
    <dl class="kv">
      <dt>Importe</dt><dd>${fmt(p.M / 1000)} Mrd. USD</dd>
      <dt>Eigene Exporte</dt><dd>${fmt(p.X / 1000)} Mrd. USD</dd>
      <dt>Anteil China</dt><dd><b>${fmt(p.cn * 100)} %</b></dd>
      <dt>Konzentration (HHI)</dt><dd>${fmt(p.hhi)} ${crit[0] ? '⚠ über 0,4' : '✓ unter 0,4'}</dd>
      <dt>Importabhängigkeit</dt><dd>${fmt(p.dep * 100)} % ${crit[1] ? '⚠ über 50 %' : '✓ unter 50 %'}</dd>
    </dl>
    <h3>Größte Lieferländer ${DEP.meta.years.at(-1)}</h3>
    <div id="sc-suppliers"></div>
    ${top15.length ? `<p class="muted">2015: ${top15.slice(0, 3).map(([c, s]) => `${esc(name(c))} ${fmt(s * 100)} %`).join(' · ')}</p>` : ''}
    <h3>Anteil Chinas an den Importen</h3>
    <div id="sc-cnline"></div>
    <p class="muted">Bei EU-Ländern zählen Importe aus anderen EU-Staaten mit. Wem eine Fabrik gehört (z. B. chinesische oder koreanische Batteriewerke in Ungarn und Polen), zeigen Handelsdaten nicht.</p>`;
  drawBars($('sc-suppliers'), top.map(([c, s]) => ({ label: name(c), v: s * 100, hi: c === 'CHN' })), '%');
  drawCnLine($('sc-cnline'), p.d);
}

function drawBars(box, rows, unit) {
  const W = Math.max(280, Math.min(560, box.clientWidth || 320)), rowH = 20, M = { l: 130, r: 46 };
  const H = rows.length * rowH + 4;
  const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'sc-bars').attr('role', 'img');
  const x = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.v) || 1]).range([0, W - M.l - M.r]);
  const g = svg.selectAll('g').data(rows).join('g').attr('transform', (d, i) => `translate(0,${i * rowH})`);
  g.append('text').attr('class', 'sc-bar-label').attr('x', M.l - 6).attr('y', rowH / 2 + 4).attr('text-anchor', 'end').text((d) => (d.label.length > 20 ? `${d.label.slice(0, 19)}…` : d.label));
  g.append('rect').attr('class', (d) => `sc-bar${d.hi ? ' hi' : ''}`).attr('x', M.l).attr('y', 3).attr('height', rowH - 6).attr('rx', 2).attr('width', (d) => Math.max(1, x(d.v)));
  g.append('text').attr('class', 'sc-bar-val').attr('x', (d) => M.l + x(d.v) + 4).attr('y', rowH / 2 + 4).text((d) => `${fmt(d.v)} ${unit}`);
}

function drawCnLine(box, d) {
  const Y = DEP.meta.years, data = Y.map((y, i) => ({ y, v: d.cn[i] })).filter((p) => p.v !== null);
  const W = Math.max(280, Math.min(560, box.clientWidth || 320)), H = 110, M = { l: 36, r: 40, t: 8, b: 18 };
  const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'sc-line').attr('role', 'img').attr('aria-label', 'Anteil Chinas im Zeitverlauf');
  const x = d3.scaleLinear().domain([Y[0], Y.at(-1)]).range([M.l, W - M.r]);
  const y = d3.scaleLinear().domain([0, Math.max(0.1, d3.max(data, (p) => p.v))]).nice().range([H - M.b, M.t]);
  svg.append('g').attr('class', 'dg-axis').attr('transform', `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(3).tickFormat(d3.format('.0%')));
  svg.append('g').attr('class', 'dg-axis').attr('transform', `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d')));
  svg.append('path').attr('class', 'pr-line cn').attr('d', d3.line().x((p) => x(p.y)).y((p) => y(p.v))(data));
  const last = data.at(-1);
  if (last) svg.append('text').attr('class', 'pr-line-label').attr('x', x(last.y) + 4).attr('y', y(last.v) + 3).text(`${fmt(last.v * 100)} %`);
}

// ---------- (B) Wertschöpfung in Exporten ----------
function renderVA() {
  if (!TIVA) return;
  const series = TIVA.data[st.ex]?.[st.act] || {};
  const years = Object.keys(series).map(Number).sort((a, b) => a - b);
  const el = $('va-main');
  if (!years.length) { el.innerHTML = '<p class="muted">Keine Daten.</p>'; return; }
  const ly = years.at(-1), r = series[ly];
  const rest = r.total - r.dom - r.top.reduce((s, [, v]) => s + v, 0);
  const rows = [{ label: `Inland (${name(st.ex)})`, v: r.dom / r.total * 100, dom: true },
    ...r.top.map(([c, v]) => ({ label: name(c), v: v / r.total * 100, hi: c === 'CHN' })),
    { label: 'Übrige Länder', v: Math.max(0, rest) / r.total * 100 }];
  const foreign = 1 - r.dom / r.total;
  const rank = r.top.findIndex(([c]) => c === 'CHN') + 1;
  el.innerHTML = `<p><b>${esc(TIVA.meta.activities[st.act])}, ${esc(name(st.ex))} ${ly}:</b> Exporte ${fmt(r.total / 1000)} Mrd. USD, davon <b>${fmt(foreign * 100)} %</b> Wertschöpfung aus dem Ausland.
      China: <b>${fmt(r.cn / r.total * 100)} %</b>${rank ? ` (Rang ${rank} der ausländischen Herkunftsländer)` : ''}.</p>
    <div class="va-grid">
      <div><h3>Herkunft der Wertschöpfung ${ly}</h3><div id="va-bars"></div></div>
      <div><h3>Auslandsanteil und China-Anteil seit ${years[0]}</h3><div id="va-line"></div>
        <h3>China-Anteil nach Branche (${esc(name(st.ex))}, ${ly})</h3><div id="va-acts"></div></div>
    </div>`;
  drawBars($('va-bars'), rows, '%');
  drawVALine($('va-line'), series, years);
  const acts = Object.entries(TIVA.meta.activities).map(([k, v]) => { const s = TIVA.data[st.ex]?.[k]?.[ly]; return s ? { label: v, v: s.cn / s.total * 100, hi: k === st.act } : null; }).filter(Boolean)
    .sort((a, b) => b.v - a.v);
  drawBars($('va-acts'), acts, '%');
}

function drawVALine(box, series, years) {
  const fo = years.map((y) => ({ y, v: (1 - series[y].dom / series[y].total) * 100 }));
  const cn = years.map((y) => ({ y, v: series[y].cn / series[y].total * 100 }));
  const W = Math.max(280, Math.min(560, box.clientWidth || 320)), H = 130, M = { l: 32, r: 64, t: 8, b: 18 };
  const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'sc-line').attr('role', 'img').attr('aria-label', 'Auslands- und China-Anteil');
  const x = d3.scaleLinear().domain([years[0], years.at(-1)]).range([M.l, W - M.r]);
  const y = d3.scaleLinear().domain([0, d3.max(fo, (p) => p.v) || 1]).nice().range([H - M.b, M.t]);
  svg.append('g').attr('class', 'dg-axis').attr('transform', `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat((d) => `${d}%`));
  svg.append('g').attr('class', 'dg-axis').attr('transform', `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d')));
  const line = d3.line().x((p) => x(p.y)).y((p) => y(p.v));
  svg.append('path').attr('class', 'pr-line own').attr('d', line(fo));
  svg.append('path').attr('class', 'pr-line cn').attr('d', line(cn));
  svg.append('text').attr('class', 'pr-line-label').attr('x', W - M.r + 4).attr('y', y(fo.at(-1).v) + 3).text(`Ausland ${fmt(fo.at(-1).v)}%`);
  svg.append('text').attr('class', 'pr-line-label').attr('x', W - M.r + 4).attr('y', y(cn.at(-1).v) + 3).text(`China ${fmt(cn.at(-1).v)}%`);
}
