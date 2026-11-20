// Weltkarte (Choropleth) mit Kennzahlauswahl, Jahresregler, Länderprofil und Tabellenansicht.
import { esc } from './data.js';
import { loadSeries, val, robustExtent, lastYear, goodYear, series, valNear, classify, TYPES, fmt } from './series.js';

const SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
// Divergierend: Rot (negativ) – Grau (neutral) – Blau (positiv)
const DIV = ['#a33433', '#d65a59', '#eda3a2', '#f0efec', '#9ec5f4', '#3987e5', '#184f95'];
const NODATA = 'url(#nodata-hatch)';
// Kennzahlen mit natürlichem Nullpunkt in der Mitte
const DIVERGING = new Set(['ca_gdp']);
const DIM_LABEL = { D1: 'Wirtschaftliches Gleichgewicht', D2: 'Abhängigkeiten', D3: 'Machtkonzentration', D4: 'Politik & Stabilität', D5: 'Klima', D6: 'Biodiversität & Ressourcen', Synthese: 'Donut (Synthese)' };

let S = null, D = null, ind = 'ca_gdp', year = null, selected = null, onShowNode = null;
let svg, gMap, path, tooltip, color;
const $ = (id) => document.getElementById(id);

export async function initWorldmap(data, showNode) {
  D = data; onShowNode = showNode;
  S = await loadSeries();
  const catalog = D.indicators.indicators.filter((i) => S.wb.values[i.id] && Object.keys(S.wb.values[i.id]).length);

  const sel = $('map-ind');
  const groups = d3.group(catalog, (i) => i.dimension);
  for (const [dim, items] of groups) {
    const og = document.createElement('optgroup'); og.label = DIM_LABEL[dim] || dim;
    for (const i of items) { const o = document.createElement('option'); o.value = i.id; o.textContent = `${i.name} (${i.unit})`; og.appendChild(o); }
    sel.appendChild(og);
  }
  sel.value = ind;
  sel.addEventListener('change', () => { ind = sel.value; setupYear(); update(); });

  const yr = $('map-year');
  yr.addEventListener('input', () => { year = Number(yr.value); $('map-year-out').value = year; update(); });

  const box = $('worldmap');
  tooltip = document.createElement('div'); tooltip.className = 'tooltip'; tooltip.hidden = true; box.appendChild(tooltip);
  svg = d3.select(box).append('svg').attr('role', 'img').attr('aria-label', 'Weltkarte');
  // Schraffur für „keine Daten“, damit sie nicht mit dem neutralen Grau der Skala verwechselt wird
  const pat = svg.append('defs').append('pattern').attr('id', 'nodata-hatch').attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 6).attr('height', 6).attr('patternTransform', 'rotate(45)');
  pat.append('rect').attr('width', 6).attr('height', 6).attr('fill', 'var(--surface)');
  pat.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).attr('stroke', 'var(--axis)').attr('stroke-width', 2);
  gMap = svg.append('g');
  const projection = d3.geoEqualEarth();
  path = d3.geoPath(projection);
  const features = S.features.filter((f) => f.properties.name !== 'Antarctica');

  gMap.selectAll('path').data(features).join('path')
    .attr('class', 'country')
    .on('mouseenter', (ev, f) => { tooltip.hidden = false; tooltip.innerHTML = tipHtml(f); })
    .on('mousemove', (ev) => moveTip(ev, box))
    .on('mouseleave', () => { tooltip.hidden = true; })
    .on('click', (ev, f) => { if (f.properties.iso) selectCountry(f.properties.iso); });

  function layout() {
    const w = box.clientWidth || 900, h = box.clientHeight || 480;
    svg.attr('viewBox', `0 0 ${w} ${h}`);
    projection.fitExtent([[10, 10], [w - 10, h - 10]], { type: 'FeatureCollection', features });
    gMap.selectAll('path').attr('d', path);
  }
  new ResizeObserver(layout).observe(box);
  layout();
  const zoom = d3.zoom().scaleExtent([1, 8]).on('zoom', (ev) => gMap.attr('transform', ev.transform));
  svg.call(zoom);

  setupYear();
  update();
  showIntro();
}

function setupYear() {
  const yr = $('map-year');
  const ly = lastYear(S, ind);
  yr.min = S.wb.meta.years[0]; yr.max = ly;
  if (year === null) year = goodYear(S, [ind]);
  if (year > ly) year = ly;
  yr.value = year; $('map-year-out').value = year;
}

function isCount() { return D.indicators.indicators.find((i) => i.id === ind)?.unit === 'Anzahl'; }

function buildColor() {
  if (isCount()) {
    let max = 0;
    for (const byYear of Object.values(S.wb.values[ind] || {})) for (const v of Object.values(byYear)) max = Math.max(max, v);
    const k = Math.min(SEQ.length, max + 1);
    const range = k === SEQ.length ? SEQ : d3.quantize(d3.interpolateRgb(SEQ[0], SEQ[SEQ.length - 1]), k);
    return d3.scaleQuantize().domain([-0.5, max + 0.5]).range(range);
  }
  const [lo, hi] = robustExtent(S, ind);
  if (DIVERGING.has(ind)) {
    const m = Math.max(Math.abs(lo), Math.abs(hi));
    return d3.scaleQuantize().domain([-m, m]).range(DIV);
  }
  return d3.scaleQuantize().domain([lo, hi]).range(SEQ);
}

function update() {
  color = buildColor();
  gMap.selectAll('path.country')
    .attr('fill', (f) => { const v = val(S, ind, f.properties.iso, year); return v === null ? NODATA : color(v); })
    .classed('sel', (f) => f.properties.iso === selected);
  renderLegend();
  renderTable();
  const meta = D.indicators.indicators.find((i) => i.id === ind);
  $('map-reading').innerHTML = `<b>${esc(meta.name)}</b> · ${esc(meta.reading)} <span class="muted">· Quelle: ${esc(meta.source)}${meta.source_code ? ` (${esc(meta.source_code)})` : ''}${S.wb.meta.indicators[ind]?.fetched ? ` · abgerufen ${esc(S.wb.meta.indicators[ind].fetched)}` : ''}</span>`;
  if (selected) selectCountry(selected, false);
}

function renderLegend() {
  const meta = D.indicators.indicators.find((i) => i.id === ind);
  const bins = color.range().map((c) => { const [a, b] = color.invertExtent(c); return { c, a, b }; });
  $('map-legend').innerHTML = `<span class="muted">${esc(meta.unit)}</span>
    ${bins.map((b, i) => {
      let label;
      if (isCount()) { const a = Math.ceil(b.a), z = Math.floor(b.b); label = a === z ? `${a}` : `${a}–${z}`; }
      else label = i === 0 ? `unter ${fmt(b.b)}` : i === bins.length - 1 ? `über ${fmt(b.a)}` : `${fmt(b.a)} bis ${fmt(b.b)}`;
      return `<span class="lg-bin"><span class="lg-sw" style="background:${b.c}"></span>${label}</span>`;
    }).join('')}
    <span class="lg-bin"><span class="lg-sw lg-nodata"></span>keine Daten</span>
    <span class="muted">${isCount() ? 'Eine Farbstufe je Anzahl.' : 'Farbskala über alle Jahre gleich (5.–95. Perzentil), damit Jahre vergleichbar sind.'}</span>`;
}

function tipHtml(f) {
  const iso = f.properties.iso;
  const c = iso && S.wb.countries[iso];
  const v = iso ? val(S, ind, iso, year) : null;
  const unit = D.indicators.indicators.find((i) => i.id === ind).unit;
  return `<b>${esc(c?.name || f.properties.name)}</b><br>${v === null ? 'keine Daten' : `${fmt(v)} ${esc(unit)}`} <span class="muted">(${year})</span>`;
}

function moveTip(ev, box) {
  const r = box.getBoundingClientRect();
  let left = ev.clientX - r.left + 14;
  if (left > r.width - 220) left = ev.clientX - r.left - 220;
  tooltip.style.left = `${left}px`; tooltip.style.top = `${ev.clientY - r.top + 14}px`;
}

function renderTable() {
  const unit = D.indicators.indicators.find((i) => i.id === ind).unit;
  const rows = Object.entries(S.wb.countries)
    .map(([iso, c]) => ({ iso, name: c.name, v: val(S, ind, iso, year) }))
    .filter((r) => r.v !== null).sort((a, b) => b.v - a.v);
  $('map-table').innerHTML = `<p class="muted">${rows.length} Länder mit Daten für ${year}.</p>
    <table><thead><tr><th>#</th><th>Land</th><th>Wert (${esc(unit)})</th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr><td class="num">${i + 1}</td><td><button class="linklike" data-iso="${r.iso}">${esc(r.name)}</button></td><td class="num">${fmt(r.v)}</td></tr>`).join('')}
    </tbody></table>`;
  $('map-table').querySelectorAll('[data-iso]').forEach((b) => b.addEventListener('click', () => selectCountry(b.dataset.iso)));
}

function showIntro() {
  $('map-panel').innerHTML = `<h2>Weltkarte</h2>
    <p>Wähle oben eine Kennzahl und ein Jahr. Klick auf ein Land öffnet sein Profil.</p>
    <p><b>Leistungsbilanzsaldo</b> (Voreinstellung): Blau = Überschuss, das Land verkauft mehr ins Ausland, als es von dort kauft. Rot = Defizit.</p>
    <p class="muted">Werte erscheinen bei der Weltbank meist mit 1–2 Jahren Verzögerung. Statistiken einzelner Länder (z. B. China, Russland) sind politisch beeinflusst oder lückenhaft.</p>`;
}

const PROFILE = [
  ['ca_gdp', 'Leistungsbilanzsaldo', '% BIP'],
  ['hh_cons', 'Privater Konsum', '% BIP'],
  ['gross_saving', 'Bruttoersparnis', '% BIP'],
  ['gcf_gdp', 'Investitionen', '% BIP'],
  ['resource_rents', 'Rohstoffrenten', '% BIP'],
  ['oop_health', 'Gesundheitskosten selbst bezahlt', '% Gesundheitsausg.'],
  ['youth_unemp', 'Jugendarbeitslosigkeit', '%'],
  ['inflation', 'Inflation', '%'],
  ['co2_terr', 'CO₂ pro Kopf (im Land)', 't'],
  ['co2_cons', 'CO₂ pro Kopf (im Konsum)', 't'],
  ['renew_share', 'Erneuerbare am Strom', '%'],
  ['vdem_ldi', 'Liberaler Demokratieindex', '0–1'],
  ['milex', 'Militärausgaben', '% BIP'],
];

export function selectCountry(iso, animate = true) {
  if (!S) return;
  selected = iso;
  gMap.selectAll('path.country').classed('sel', (f) => f.properties.iso === iso);
  const c = S.wb.countries[iso];
  if (!c) return;
  const cl = classify(S, iso, year);
  const t = cl && TYPES[cl.type];
  $('map-panel').innerHTML = `<h2>${esc(c.name)}</h2>
    <p class="muted">${esc(c.region)} · ${esc(c.income)}</p>
    ${t ? `<h3>Länder-Typ ${cl.year}</h3><p><b>${esc(t.label)}</b><br>${esc(t.text)}</p>
      <p class="muted">Heuristik: Leistungsbilanz ${fmt(cl.ca)} %, Konsum ${fmt(cl.cons)} %, Investitionen ${fmt(cl.gcf)} %, Rohstoffrenten ${fmt(cl.rents)} % des BIP.</p>` : '<p class="muted">Zu wenige Daten für eine Einordnung.</p>'}
    <h3>Kennzahlen im Zeitverlauf</h3>
    <div class="sparks">${PROFILE.filter(([id]) => S.wb.values[id]).map(([id, label, unit]) => sparkHtml(iso, id, label, unit)).join('')}</div>
    ${donutHtml(iso)}
    <p><a href="#diagnose/${iso}">In der Diagnose-Grafik zeigen</a> · <a href="#sicht/${iso}">Aus Sicht von ${esc(c.name)}</a> · <a href="#druck/${iso}">Handelsdruck</a></p>`;
  $('map-panel').querySelectorAll('svg.spark').forEach((el) => drawSpark(el, iso, el.dataset.ind));
  const dn = $('map-panel').querySelector('svg.donut');
  if (dn) drawDonut(dn, iso);
  if (animate) $('map-panel').scrollTop = 0;
}

function sparkHtml(iso, id, label, unit) {
  const cur = valNear(S, id, iso, year);
  return `<div class="spark-row"><div class="spark-head"><span>${esc(label)}</span>
    <span class="num">${cur ? `${fmt(cur.value)} <span class="muted">${esc(unit)}${cur.year !== year ? ` (${cur.year})` : ''}</span>` : '<span class="muted">–</span>'}</span></div>
    <svg class="spark" data-ind="${id}" viewBox="0 0 300 54" preserveAspectRatio="none" role="img" aria-label="${esc(label)} im Zeitverlauf"></svg></div>`;
}

function drawSpark(el, iso, id) {
  const data = series(S, id, iso);
  const g = d3.select(el);
  if (data.length < 2) { g.append('text').attr('x', 4).attr('y', 30).attr('class', 'spark-empty').text('keine Zeitreihe'); return; }
  const x = d3.scaleLinear().domain([S.wb.meta.years[0], lastYear(S, id)]).range([4, 296]);
  const ext = d3.extent(data, (d) => d.value);
  const lo = Math.min(ext[0], 0), hi = Math.max(ext[1], 0);
  const y = d3.scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([48, 6]);
  g.append('line').attr('class', 'spark-zero').attr('x1', 4).attr('x2', 296).attr('y1', y(0)).attr('y2', y(0));
  g.append('line').attr('class', 'spark-year').attr('x1', x(year)).attr('x2', x(year)).attr('y1', 2).attr('y2', 52);
  g.append('path').attr('class', 'spark-line').attr('d', d3.line().defined((d) => d.value !== null).x((d) => x(d.year)).y((d) => y(d.value))(data));
  const hover = g.append('g').attr('class', 'spark-hover').style('display', 'none');
  hover.append('circle').attr('r', 3.5);
  const label = hover.append('text').attr('y', 10);
  g.append('rect').attr('x', 0).attr('y', 0).attr('width', 300).attr('height', 54).attr('fill', 'transparent')
    .on('mousemove', (ev) => {
      const [mx] = d3.pointer(ev);
      const yr = Math.round(x.invert(mx));
      const d = data.reduce((best, p) => (Math.abs(p.year - yr) < Math.abs(best.year - yr) ? p : best), data[0]);
      hover.style('display', null).attr('transform', `translate(${x(d.year)},0)`);
      hover.select('circle').attr('cy', y(d.value));
      label.attr('x', x(d.year) > 220 ? -6 : 6).attr('text-anchor', x(d.year) > 220 ? 'end' : 'start').text(`${d.year}: ${fmt(d.value)}`);
    })
    .on('mouseleave', () => hover.style('display', 'none'));
  g.append('text').attr('class', 'spark-axis').attr('x', 4).attr('y', 53).text(S.wb.meta.years[0]);
  g.append('text').attr('class', 'spark-axis').attr('x', 296).attr('y', 53).attr('text-anchor', 'end').text(lastYear(S, id));
}

// ---------- Donut (Raworth; Daten Fanning u. a. 2022) ----------
function donutYear(iso) {
  const years = Object.keys(S.donut?.bio?.[iso] || {}).map(Number);
  if (!years.length) return null;
  const capped = Math.min(year, Math.max(...years));
  return years.includes(capped) ? capped : Math.max(...years);
}

function donutHtml(iso) {
  const dy = donutYear(iso);
  if (!dy) return '';
  const bio = S.donut.bio[iso][dy] || [], soc = S.donut.social[iso]?.[dy] || [];
  const L = S.donut.meta;
  const row = (label, v, eco) => {
    if (v === null || v === undefined) return `<tr><td>${esc(label)}</td><td class="num muted">–</td><td class="muted">keine Daten</td></tr>`;
    const bad = eco ? v > 1 : v < 1;
    return `<tr><td>${esc(label)}</td><td class="num">${fmt(v)}</td><td>${bad ? (eco ? '⚠ überschritten' : '⚠ verfehlt') : '✓ eingehalten'}</td></tr>`;
  };
  const nSoc = soc.filter((v) => v !== null && v >= 1).length, kSoc = soc.filter((v) => v !== null).length;
  const nBio = bio.filter((v) => v !== null && v > 1).length, kBio = bio.filter((v) => v !== null).length;
  return `<h3>Donut ${dy}: gutes Leben innerhalb planetarer Grenzen?</h3>
    <p><b>${nSoc} von ${kSoc}</b> sozialen Mindeststandards erreicht · <b>${nBio} von ${kBio}</b> planetaren Grenzen (pro Kopf) überschritten.</p>
    <svg class="donut" viewBox="0 0 400 330" role="img" aria-label="Donut-Diagramm: soziale Ziele innen, planetare Grenzen außen"></svg>
    <p class="muted">Innen: soziale Ziele (rot = Abstand zum Mindeststandard). Außen: Grenzen (orange/rot = Überschreitung). Der grüne Ring ist der „sichere und gerechte Raum“.
    Quelle: Fanning u. a. (2022), Nature Sustainability, Daten Universität Leeds; neuere Jahre als ${dy} liegen nicht vor.</p>
    <details class="table-view"><summary>Donut-Werte als Tabelle</summary>
    <table><thead><tr><th>Bereich</th><th>Wert (1 = Schwelle)</th><th>Status</th></tr></thead><tbody>
    ${L.social_labels.map((l, i) => row(l, soc[i], false)).join('')}
    ${L.bio_labels.map((l, i) => row(l, bio[i], true)).join('')}
    </tbody></table></details>`;
}

function drawDonut(el, iso) {
  const dy = donutYear(iso);
  const bio = S.donut.bio[iso][dy] || [], soc = S.donut.social[iso]?.[dy] || [];
  const L = S.donut.meta;
  const g = d3.select(el).append('g').attr('transform', 'translate(200,165)');
  const R_IN = 58, R_OUT = 90, MAX_OUT = 48;
  g.append('path').attr('class', 'dn-safe').attr('d', d3.arc().innerRadius(R_IN).outerRadius(R_OUT).startAngle(0).endAngle(2 * Math.PI)());
  const wedge = (n, i) => ({ a0: (2 * Math.PI * i) / n + 0.02, a1: (2 * Math.PI * (i + 1)) / n - 0.02 });
  // Soziales: Verfehlung wächst von innen nach Mitte
  soc.forEach((v, i) => {
    const { a0, a1 } = wedge(soc.length, i);
    if (v === null) {
      g.append('path').attr('class', 'dn-na').attr('d', d3.arc().innerRadius(R_IN - 8).outerRadius(R_IN).startAngle(a0).endAngle(a1)());
    } else if (v < 1) {
      g.append('path').attr('class', 'dn-short').attr('d', d3.arc().innerRadius(R_IN * Math.max(0, v)).outerRadius(R_IN).startAngle(a0).endAngle(a1)())
        .append('title').text(`${L.social_labels[i]}: ${fmt(v)} (verfehlt)`);
    }
  });
  // Ökologie: Überschreitung wächst nach außen (gekappt bei 3-facher Grenze)
  bio.forEach((v, i) => {
    const { a0, a1 } = wedge(bio.length, i);
    if (v !== null && v > 1) {
      const len = Math.min(v - 1, 2) / 2 * MAX_OUT;
      g.append('path').attr('class', v > 2 ? 'dn-over dn-over2' : 'dn-over').attr('d', d3.arc().innerRadius(R_OUT).outerRadius(R_OUT + len).startAngle(a0).endAngle(a1)())
        .append('title').text(`${L.bio_labels[i]}: ${fmt(v)}-fache Grenze`);
    }
    const mid = (a0 + a1) / 2, r = R_OUT + MAX_OUT + 6;
    g.append('text').attr('class', 'dn-label').attr('x', Math.sin(mid) * r).attr('y', -Math.cos(mid) * r)
      .attr('text-anchor', Math.sin(mid) > 0.2 ? 'start' : Math.sin(mid) < -0.2 ? 'end' : 'middle').attr('dominant-baseline', 'middle')
      .text(shortLabel(L.bio_labels[i]));
  });
}

function shortLabel(l) { return l.replace('Ökologischer ', 'Ökol. ').replace('Landnutzungswandel', 'Landnutzung').replace('Materialfußabdruck', 'Material'); }
