// Diagnose-Grafik: privater Konsum (x) gegen Leistungsbilanzsaldo (y), animierbar über die Jahre.
import { esc, cssVar } from './data.js';
import { loadSeries, val, classify, TYPES, fmt, lastYear, goodYear } from './series.js';

const SLOT_VARS = ['--s1', '--s2', '--s3']; // max. 3 hervorgehobene Länder (Farbregel: 3 Slots sicher unterscheidbar)
const M = { top: 20, right: 24, bottom: 46, left: 56 };

let S = null, year = null, focus = ['DEU', 'CHN', 'USA'], playing = null;
let svg, g, x, y, w = 800, h = 500, tooltip;
const $ = (id) => document.getElementById(id);

export async function initDiagnose() {
  S = await loadSeries();
  const ly = Math.min(lastYear(S, 'ca_gdp'), lastYear(S, 'hh_cons'));
  year = goodYear(S, ['ca_gdp', 'hh_cons']);
  const yr = $('dg-year');
  yr.min = S.wb.meta.years[0]; yr.max = ly; yr.value = year; $('dg-year-out').value = year;
  yr.addEventListener('input', () => { year = Number(yr.value); $('dg-year-out').value = year; render(); });
  $('dg-play').addEventListener('click', togglePlay);

  const dl = $('dg-countries');
  for (const [iso, c] of Object.entries(S.wb.countries).sort((a, b) => a[1].name.localeCompare(b[1].name, 'de'))) {
    const o = document.createElement('option'); o.value = `${c.name} (${iso})`; dl.appendChild(o);
  }
  $('dg-add').addEventListener('change', (ev) => {
    const m = ev.target.value.match(/\(([A-Z]{3})\)$/);
    if (m) addFocus(m[1]);
    ev.target.value = '';
  });

  const box = $('diagnose');
  tooltip = document.createElement('div'); tooltip.className = 'tooltip'; tooltip.hidden = true; box.appendChild(tooltip);
  svg = d3.select(box).append('svg').attr('role', 'img').attr('aria-label', 'Streudiagramm: privater Konsum gegen Leistungsbilanzsaldo');
  g = svg.append('g');

  // Achsen über alle Jahre fest (robuste Grenzen), damit die Animation vergleichbar bleibt
  const xs = [], ys = [];
  for (const byYear of Object.values(S.wb.values.hh_cons)) xs.push(...Object.values(byYear));
  for (const byYear of Object.values(S.wb.values.ca_gdp)) ys.push(...Object.values(byYear));
  xs.sort(d3.ascending); ys.sort(d3.ascending);
  x = d3.scaleLinear().domain([Math.floor(d3.quantileSorted(xs, 0.01) / 5) * 5, Math.ceil(d3.quantileSorted(xs, 0.99) / 5) * 5]).clamp(true);
  y = d3.scaleLinear().domain([Math.floor(d3.quantileSorted(ys, 0.02) / 5) * 5, Math.ceil(d3.quantileSorted(ys, 0.98) / 5) * 5]).clamp(true);

  new ResizeObserver(() => { layout(); render(); }).observe(box);
  layout();
  render();
}

function layout() {
  const box = $('diagnose');
  w = box.clientWidth || 800; h = box.clientHeight || 500;
  svg.attr('viewBox', `0 0 ${w} ${h}`);
  x.range([M.left, w - M.right]);
  y.range([h - M.bottom, M.top]);
  g.selectAll('*').remove();

  // Ausgeglichen-Band ±2 %
  g.append('rect').attr('class', 'dg-band').attr('x', M.left).attr('width', w - M.left - M.right)
    .attr('y', y(2)).attr('height', y(-2) - y(2));
  g.append('g').attr('class', 'dg-grid').selectAll('line').data(y.ticks(8)).join('line')
    .attr('x1', M.left).attr('x2', w - M.right).attr('y1', (d) => y(d)).attr('y2', (d) => y(d));
  g.append('line').attr('class', 'dg-zero').attr('x1', M.left).attr('x2', w - M.right).attr('y1', y(0)).attr('y2', y(0));
  for (const t of [45, 60]) {
    g.append('line').attr('class', 'dg-thresh').attr('x1', x(t)).attr('x2', x(t)).attr('y1', M.top).attr('y2', h - M.bottom);
    g.append('text').attr('class', 'dg-thresh-label').attr('x', x(t) + 4).attr('y', M.top + 10).text(`${t} %`);
  }
  g.append('g').attr('class', 'dg-axis').attr('transform', `translate(0,${h - M.bottom})`).call(d3.axisBottom(x).ticks(8).tickFormat((d) => `${d} %`));
  g.append('g').attr('class', 'dg-axis').attr('transform', `translate(${M.left},0)`).call(d3.axisLeft(y).ticks(8).tickFormat((d) => `${d > 0 ? '+' : ''}${d} %`));
  g.append('text').attr('class', 'dg-axis-title').attr('x', (M.left + w - M.right) / 2).attr('y', h - 8).attr('text-anchor', 'middle')
    .text('Privater Konsum in % des BIP  →  die Bevölkerung kauft mehr von dem, was erwirtschaftet wird');
  g.append('text').attr('class', 'dg-axis-title').attr('transform', `translate(14,${(M.top + h - M.bottom) / 2}) rotate(-90)`).attr('text-anchor', 'middle')
    .text('Leistungsbilanzsaldo in % des BIP  (+ Überschuss / − Defizit)');
  // Quadranten-Hinweise
  const q = (tx, ty, anchor, text) => g.append('text').attr('class', 'dg-quad').attr('x', tx).attr('y', ty).attr('text-anchor', anchor).text(text);
  q(M.left + 8, M.top + 26, 'start', 'Überschuss bei wenig Konsum');
  q(w - M.right - 8, h - M.bottom - 10, 'end', 'Defizit bei viel Konsum');

  g.append('g').attr('class', 'dg-trails');
  g.append('g').attr('class', 'dg-dots');
  g.append('g').attr('class', 'dg-focus');
  g.append('text').attr('class', 'dg-year-bg').attr('x', w - M.right - 10).attr('y', M.top + 50).attr('text-anchor', 'end');
}

function points(yr) {
  return Object.keys(S.wb.countries).map((iso) => {
    const xv = val(S, 'hh_cons', iso, yr), yv = val(S, 'ca_gdp', iso, yr);
    return xv === null || yv === null ? null : { iso, xv, yv, clamped: xv < x.domain()[0] || xv > x.domain()[1] || yv < y.domain()[0] || yv > y.domain()[1] };
  }).filter(Boolean);
}

function render() {
  if (!svg) return;
  const pts = points(year);
  const focusSet = new Set(focus);
  g.select('.dg-year-bg').text(year);

  g.select('.dg-dots').selectAll('circle').data(pts.filter((p) => !focusSet.has(p.iso)), (d) => d.iso).join('circle')
    .attr('class', (d) => `dg-dot${d.clamped ? ' clamped' : ''}`).attr('r', 4.5)
    .attr('cx', (d) => x(d.xv)).attr('cy', (d) => y(d.yv))
    .on('mouseenter', (ev, d) => showTip(ev, d)).on('mousemove', moveTip).on('mouseleave', hideTip)
    .on('click', (ev, d) => addFocus(d.iso));

  // Spuren der hervorgehobenen Länder bis zum gewählten Jahr
  const trails = focus.map((iso, i) => {
    const tr = [];
    for (let yy = S.wb.meta.years[0]; yy <= year; yy++) {
      const xv = val(S, 'hh_cons', iso, yy), yv = val(S, 'ca_gdp', iso, yy);
      if (xv !== null && yv !== null) tr.push({ yy, xv, yv });
    }
    return { iso, i, tr };
  });
  g.select('.dg-trails').selectAll('path').data(trails, (d) => d.iso).join('path')
    .attr('class', 'dg-trail').attr('stroke', (d) => `var(${SLOT_VARS[d.i]})`)
    .attr('d', (d) => d3.line().x((p) => x(p.xv)).y((p) => y(p.yv)).curve(d3.curveCatmullRom.alpha(0.5))(d.tr));

  const fpts = focus.map((iso, i) => ({ ...(pts.find((p) => p.iso === iso) || { iso, missing: true }), i })).filter((p) => !p.missing);
  const fg = g.select('.dg-focus').selectAll('g.dg-f').data(fpts, (d) => d.iso).join((enter) => {
    const e = enter.append('g').attr('class', 'dg-f');
    e.append('circle').attr('r', 7);
    e.append('text').attr('x', 10).attr('y', 4);
    return e;
  });
  fg.attr('transform', (d) => `translate(${x(d.xv)},${y(d.yv)})`)
    .on('mouseenter', (ev, d) => showTip(ev, d)).on('mousemove', moveTip).on('mouseleave', hideTip);
  fg.select('circle').attr('fill', (d) => `var(${SLOT_VARS[d.i]})`);
  fg.select('text').text((d) => S.wb.countries[d.iso].name);

  renderFocusChips();
  renderPanel(pts);
  renderTable(pts);
}

function showTip(ev, d) {
  const cl = classify(S, d.iso, year);
  tooltip.hidden = false;
  tooltip.innerHTML = `<b>${esc(S.wb.countries[d.iso].name)}</b> (${year})<br>Konsum ${fmt(d.xv)} % · Leistungsbilanz ${fmt(d.yv)} %${cl ? `<br>${esc(TYPES[cl.type].label)}` : ''}<br><span class="muted">Klick: hervorheben</span>`;
  moveTip(ev);
}
function moveTip(ev) {
  const r = $('diagnose').getBoundingClientRect();
  let left = ev.clientX - r.left + 14;
  if (left > r.width - 260) left = ev.clientX - r.left - 260;
  tooltip.style.left = `${left}px`; tooltip.style.top = `${ev.clientY - r.top + 14}px`;
}
function hideTip() { tooltip.hidden = true; }

export function addFocus(iso) {
  if (!S || !S.wb.countries[iso]) return;
  if (focus.includes(iso)) return;
  focus = [...focus, iso].slice(-3);
  render();
}

function renderFocusChips() {
  $('dg-focus').innerHTML = focus.map((iso, i) => `<span class="chip" aria-pressed="true"><span class="swatch" style="background:var(${SLOT_VARS[i]})"></span>${esc(S.wb.countries[iso].name)}
    <button class="chip-x" data-iso="${iso}" aria-label="${esc(S.wb.countries[iso].name)} entfernen">×</button></span>`).join('');
  $('dg-focus').querySelectorAll('.chip-x').forEach((b) => b.addEventListener('click', () => { focus = focus.filter((f) => f !== b.dataset.iso); render(); }));
}

function renderPanel(pts) {
  const counts = {};
  for (const p of pts) { const cl = classify(S, p.iso, year); if (cl) counts[cl.type] = (counts[cl.type] || 0) + 1; }
  $('dg-panel').innerHTML = `<h2>Diagnose ${year}</h2>
    <p>Kann sich ein Land leisten, was es produziert? Links oben liegen Länder, deren Bevölkerung wenig konsumiert und deren Überschuss ins Ausland geht. Rechts unten Länder, die mehr kaufen, als sie verkaufen.</p>
    ${focus.map((iso, i) => {
      const cl = classify(S, iso, year);
      const c = S.wb.countries[iso];
      return `<h3><span class="swatch" style="background:var(${SLOT_VARS[i]})"></span> ${esc(c.name)}</h3>
        ${cl ? `<p><b>${esc(TYPES[cl.type].label)}</b>${cl.year !== year ? ` <span class="muted">(Daten ${cl.year})</span>` : ''}<br>
        Leistungsbilanz ${fmt(cl.ca)} % · Konsum ${fmt(cl.cons)} % · Investitionen ${fmt(cl.gcf)} % · Rohstoffrenten ${fmt(cl.rents)} %</p>
        <p class="muted">${esc(TYPES[cl.type].text)}</p>` : '<p class="muted">Keine Daten für dieses Jahr.</p>'}`;
    }).join('')}
    <h3>Verteilung der Länder-Typen</h3>
    <table><tbody>${Object.entries(TYPES).map(([k, t]) => `<tr><td>${esc(t.label)}</td><td class="num">${counts[k] || 0}</td></tr>`).join('')}</tbody></table>
    <p class="muted">Einordnung nach einfacher, offener Heuristik: Überschuss/Defizit ab ±2 % des BIP; Konsum unter 45 % = niedrig, ab 60 % = hoch; Rohstoffrenten ab 10 %; Investitionen unter 23 %. Die Einordnung ist ein Hinweis, kein Urteil.</p>`;
}

function renderTable(pts) {
  const rows = pts.map((p) => ({ ...p, cl: classify(S, p.iso, year) })).sort((a, b) => b.yv - a.yv);
  $('dg-table').innerHTML = `<table><thead><tr><th>Land</th><th>Konsum % BIP</th><th>Leistungsbilanz % BIP</th><th>Typ</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${esc(S.wb.countries[r.iso].name)}</td><td class="num">${fmt(r.xv)}</td><td class="num">${fmt(r.yv)}</td><td>${r.cl ? esc(TYPES[r.cl.type].short) : '–'}</td></tr>`).join('')}
    </tbody></table>`;
}

function togglePlay() {
  const btn = $('dg-play');
  if (playing) { clearInterval(playing); playing = null; btn.textContent = '▶ Abspielen'; return; }
  const yr = $('dg-year');
  if (Number(yr.value) >= Number(yr.max)) { year = Number(yr.min); }
  btn.textContent = '❚❚ Pause';
  playing = setInterval(() => {
    if (year >= Number(yr.max)) { togglePlay(); return; }
    year += 1; yr.value = year; $('dg-year-out').value = year; render();
  }, 450);
}

export function focusCountry(iso) { addFocus(iso); }
export function cssSlots() { return SLOT_VARS.map(cssVar); }
