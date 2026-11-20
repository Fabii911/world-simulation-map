// UI-Smoke-Test mit Playwright: lädt die Seite, prüft jede Ansicht und zentrale Interaktionen.
// Ausführen: npm run test:ui   (Playwright muss installiert sein: npm i -D playwright && npx playwright install chromium)
const path = require('node:path');
const fs = require('node:fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.error('Playwright nicht gefunden. Installieren mit: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const PORT = 8765;
const SHOTS = process.env.SCREENSHOTS ? path.resolve(process.env.SCREENSHOTS) : null;
let failures = 0;
const check = (cond, msg) => { if (cond) console.log(`  ✓ ${msg}`); else { failures++; console.error(`  ✗ ${msg}`); } };

(async () => {
  const { startServer } = await import('../scripts/serve.mjs');
  const server = await startServer(PORT);
  const model = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'model.json'), 'utf8'));
  const timeline = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'timeline.json'), 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  const shot = async (name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); } };

  try {
    console.log('Wirkungsnetz');
    await page.goto(`http://127.0.0.1:${PORT}/#netz`);
    await page.waitForSelector('body[data-ready="true"]', { timeout: 15000 });
    await page.waitForTimeout(800);
    const counts = await page.evaluate(() => {
      const cy = window.__cy; return cy ? { nodes: cy.nodes('.var').length, edges: cy.edges().length } : null;
    });
    check(counts && counts.nodes === model.nodes.length, `alle ${model.nodes.length} Größen gezeichnet (${counts?.nodes})`);
    check(counts && counts.edges === model.edges.length, `alle ${model.edges.length} Wirkungen gezeichnet (${counts?.edges})`);
    await shot('01-netz');

    await page.evaluate(() => window.__cy.getElementById('CN_CON').emit('tap'));
    await page.waitForTimeout(400);
    const panelNode = await page.textContent('#net-panel');
    check(panelNode.includes('Privatkonsum China') && panelNode.includes('Wirkt auf'), 'Klick auf Größe zeigt Ursachen und Folgen');
    await shot('02-netz-knoten');

    await page.evaluate(() => window.__cy.getElementById('e:RU_OLIG>RU_AGG').emit('tap'));
    await page.waitForTimeout(300);
    const panelEdge = await page.textContent('#net-panel');
    check(panelEdge.includes('Begründet durch') && panelEdge.includes('RU-08'), 'Klick auf Wirkung zeigt Begründung mit Aussage');
    check(panelEdge.includes('Veränderung über die Zeit'), 'zeitlich wechselnde Wirkung wird erklärt');

    await page.selectOption('#net-loop', 'R3');
    await page.waitForTimeout(400);
    check((await page.textContent('#net-panel')).includes('Überkapazitäts-Spirale'), 'Schleife R3 lässt sich hervorheben');

    await page.fill('#net-year', '1996');
    await page.dispatchEvent('#net-year', 'input');
    const sign = await page.evaluate(() => window.__cy.getElementById('e:INTER>RU_AGG').data('sign'));
    check(sign === '−', `Jahr 1996: Verflechtung wirkt dämpfend (Vorzeichen ${sign})`);
    const hit = await page.evaluate(() => window.__cy.getElementById('RU_OLIG').hasClass('event-hit'));
    check(hit, 'Ereignis 1996 markiert die betroffene Größe');
    await shot('03-netz-1996');

    console.log('Zeitleiste');
    await page.goto(`http://127.0.0.1:${PORT}/#zeit`);
    await page.waitForTimeout(600);
    const evCount = await page.locator('#timeline g.tl-ev').count();
    check(evCount === timeline.events.length, `alle ${timeline.events.length} Ereignisse gezeichnet (${evCount})`);
    await page.click('#tl-recent');
    await page.waitForTimeout(600);
    await shot('04-zeitleiste');
    await page.locator('#timeline g.tl-ev[aria-label^="2003-03-14"]').dispatchEvent('click');
    await page.waitForTimeout(200);
    check((await page.textContent('#tl-panel')).includes('Agenda 2010'), 'Klick auf Ereignis zeigt Details');
    await page.click('#tl-to-graph');
    await page.waitForTimeout(800);
    check(page.url().endsWith('#netz'), 'Sprung ins Wirkungsnetz');
    check((await page.textContent('#net-panel')).includes('Agenda 2010'), 'Ereignis-Größen im Netz hervorgehoben');
    check((await page.inputValue('#net-year')) === '2003', 'Jahr im Netz auf 2003 gesetzt');

    console.log('Faktencheck');
    await page.goto(`http://127.0.0.1:${PORT}/#fakten/RU-08`);
    await page.waitForTimeout(400);
    const claimCount = await page.locator('#fc-list .claim').count();
    check(claimCount === model.claims.length, `alle ${model.claims.length} Aussagen gelistet (${claimCount})`);
    await page.click('#fc-filter .chip[data-rating="false"]');
    const afterFilter = await page.locator('#fc-list .claim').count();
    const expected = model.claims.filter((c) => c.rating !== 'false').length;
    check(afterFilter === expected, `Filter „falsch“ ausblenden funktioniert (${afterFilter}/${expected})`);
    await page.fill('#fc-search', 'Oligarchen');
    check((await page.locator('#fc-list .claim').count()) >= 1, 'Suche findet Aussage');
    await shot('05-fakten');

    console.log('Weltkarte');
    await page.goto(`http://127.0.0.1:${PORT}/#karte`);
    await page.waitForSelector('#worldmap path.country', { timeout: 15000 });
    await page.waitForTimeout(500);
    const nCountries = await page.locator('#worldmap path.country').count();
    check(nCountries > 150, `Weltkarte zeichnet ${nCountries} Länder`);
    const colored = await page.evaluate(() => [...document.querySelectorAll('#worldmap path.country')].filter((p) => !p.getAttribute('fill').startsWith('url(')).length);
    check(colored > 120, `Länder mit Daten eingefärbt (${colored})`);
    await shot('06-karte');
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('#worldmap path.country')].find((p) => p.__data__?.properties?.iso === 'DEU');
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(400);
    const mp = await page.textContent('#map-panel');
    check(mp.includes('Deutschland') && mp.includes('Länder-Typ'), 'Klick auf Deutschland öffnet Länderprofil mit Typ');
    check((await page.locator('#map-panel svg.spark path.spark-line').count()) >= 5, 'Länderprofil zeigt Zeitreihen');
    await shot('07-karte-profil');
    await page.selectOption('#map-ind', 'hh_cons');
    await page.waitForTimeout(300);
    check((await page.textContent('#map-reading')).includes('Privater Konsum'), 'Kennzahlwechsel aktualisiert Karte');
    check((await page.locator('#map-table tbody tr').count()) > 100, 'Tabellenansicht enthält Länder');

    await page.selectOption('#map-ind', 'co2_cons');
    await page.waitForTimeout(300);
    check((await page.textContent('#map-reading')).includes('Our World in Data'), 'Klimakennzahl von Our World in Data auswählbar');
    await page.selectOption('#map-ind', 'donut_eco');
    await page.fill('#map-year', '2015');
    await page.dispatchEvent('#map-year', 'input');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('#worldmap path.country')].find((p) => p.__data__?.properties?.iso === 'DEU');
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(400);
    check((await page.locator('#map-panel svg.donut path').count()) > 3, 'Länderprofil zeigt Donut');
    check((await page.textContent('#map-panel')).includes('planetaren Grenzen'), 'Donut-Zusammenfassung vorhanden');
    await page.evaluate(() => document.querySelector('#map-panel svg.donut').scrollIntoView());
    await shot('10-donut');

    console.log('Diagnose');
    await page.goto(`http://127.0.0.1:${PORT}/#diagnose`);
    await page.waitForSelector('#diagnose g.dg-f', { timeout: 15000 });
    await page.waitForTimeout(400);
    const nf = await page.locator('#diagnose g.dg-f').count();
    check(nf === 3, `3 hervorgehobene Länder (${nf})`);
    const nd = await page.locator('#diagnose circle.dg-dot').count();
    check(nd > 100, `übrige Länder als Punkte (${nd})`);
    const dp = await page.textContent('#dg-panel');
    check(dp.includes('China') && dp.includes('Nachfrageschwäche'), 'China als Nachfrageschwäche eingeordnet');
    check(/Vereinigte Staaten|USA/.test(dp) && dp.includes('Defizit'), 'USA als Defizit-Typ eingeordnet');
    await shot('08-diagnose');
    await page.fill('#dg-year', '2007');
    await page.dispatchEvent('#dg-year', 'input');
    await page.waitForTimeout(300);
    check((await page.textContent('#dg-panel')).includes('Diagnose 2007'), 'Jahresregler wirkt');
    await shot('09-diagnose-2007');

    console.log('Handelsdruck');
    await page.goto(`http://127.0.0.1:${PORT}/#druck`);
    await page.waitForSelector('#pr-matrix g.pr-row', { timeout: 15000 });
    await page.waitForTimeout(400);
    const prRows = await page.locator('#pr-matrix g.pr-row').count();
    check(prRows >= 30, `Druckmatrix zeigt mindestens 30 Länder (${prRows})`);
    const prCells = await page.locator('#pr-matrix rect.pr-cell').count();
    check(prCells === prRows * 9, `9 Sektoren je Land (${prCells} Felder)`);
    const prof = await page.textContent('#pr-profile');
    check(prof.includes('Deutschland') && prof.includes('Exportkorb'), 'Profil Deutschland mit Exportkorb');
    check((await page.locator('#pr-treemap rect.pr-tm').count()) > 30, 'Treemap zeigt Gütergruppen');
    check((await page.locator('#pr-shares path.pr-line.cn').count()) >= 1, 'Weltmarktanteile Land und China im Zeitverlauf');
    const top = await page.textContent('#pr-panel');
    check(top.includes('Fahrzeuge') || top.includes('Elektronik') || top.includes('Maschinen'), 'China legt bei Fahrzeugen, Maschinen oder Elektronik am stärksten zu');
    await shot('12-druckmatrix');
    await page.evaluate(() => document.getElementById('pr-profile').scrollIntoView());
    await shot('13-exportkorb');
    await page.click('#pr-presets [data-p="0"]');
    await page.waitForTimeout(300);
    check((await page.textContent('#pr-panel')).includes('2001–2007'), 'Zeitraum „China-Schock 1.0“ wählbar');
    await page.selectOption('#pr-level', 'chapter');
    await page.waitForTimeout(300);
    check((await page.locator('#pr-matrix g.pr-row').first().locator('rect.pr-cell').count()) === 24, 'Kapitel-Ebene mit 24 Spalten');
    await page.selectOption('#pr-colormode', 'pressure');
    await page.waitForTimeout(200);
    check((await page.textContent('#pr-treemap-legend')).includes('Chinas Weltmarktanteil'), 'Exportkorb nach Druck einfärbbar');
    await page.goto(`http://127.0.0.1:${PORT}/#druck/KOR`);
    await page.waitForTimeout(500);
    check((await page.textContent('#pr-profile')).includes('Südkorea'), 'Direktlink auf ein Land (#druck/KOR)');

    console.log('Aus Sicht von');
    await page.goto(`http://127.0.0.1:${PORT}/#sicht/DEU`);
    await page.waitForSelector('#pv-profile g.pv-row', { timeout: 15000 });
    await page.waitForTimeout(500);
    check((await page.locator('#pv-profile g.pv-row').count()) === 11, '11 Kanäle im Betroffenheitsprofil');
    const head = await page.textContent('#pv-head');
    console.log('    ' + head.replace(/\s+/g, ' ').trim());
    check(head.includes('Deutschland'), 'Kopfzeile für Deutschland');
    check((await page.locator('#pv-chains li').count()) >= 3, 'relevante Ketten gelistet');
    check(await page.evaluate(() => window.__cyEgo && window.__cyEgo.nodes().length > 5), 'Ego-Netz gezeichnet');
    await page.selectOption('#pv-compare', 'JPN');
    await page.waitForTimeout(300);
    check((await page.locator('#pv-profile circle.pv-dot.cmp').count()) >= 5, 'Vergleich mit Japan');
    await shot('16-sicht');
    await page.selectOption('#pv-country', 'CHN');
    await page.waitForTimeout(300);
    check((await page.textContent('#pv-head')).includes('China'), 'Perspektive China wählbar');

    console.log('Lieferketten');
    await page.goto(`http://127.0.0.1:${PORT}/#lieferketten`);
    await page.waitForSelector('#sc-quadrant g.sc-pt', { timeout: 15000 });
    await page.waitForTimeout(400);
    const nPts = await page.locator('#sc-quadrant g.sc-pt').count();
    check(nPts >= 25, `Quadrant zeigt kritische Güter (${nPts})`);
    const scp = await page.textContent('#sc-panel');
    check(scp.includes('Batterien') && scp.includes('Anteil China'), 'Detail Batterien mit China-Anteil');
    check((await page.locator('#sc-suppliers rect.sc-bar').count()) >= 3, 'größte Lieferländer als Balken');
    console.log('    ' + (await page.textContent('#sc-summary')).replace(/\s+/g, ' ').trim());
    await shot('17-lieferketten');
    await page.click('#sc-groups [data-g="Kritische Rohstoffe"]');
    await page.waitForTimeout(200);
    check((await page.locator('#sc-quadrant g.sc-pt').count()) <= 8, 'Filter Kritische Rohstoffe');
    const va = await page.textContent('#va-main');
    console.log('    ' + va.split('Herkunft')[0].replace(/\s+/g, ' ').trim());
    check(va.includes('Kraftfahrzeuge') && va.includes('China'), 'Wertschöpfung deutscher Autoexporte mit China-Anteil');
    check((await page.locator('#va-bars rect.sc-bar').count()) >= 5, 'Herkunftsländer der Wertschöpfung');
    await page.evaluate(() => document.getElementById('va-main').scrollIntoView());
    await shot('18-wertschoepfung');
    await page.goto(`http://127.0.0.1:${PORT}/#lieferketten/USA`);
    await page.waitForTimeout(500);
    check((await page.inputValue('#sc-imp')) === 'USA', 'Direktlink #lieferketten/USA');

    console.log('Ketten');
    await page.goto(`http://127.0.0.1:${PORT}/#ketten/china-auto`);
    await page.waitForSelector('#ch-main .ch-step', { timeout: 15000 });
    const nSteps = await page.locator('#ch-main .ch-step').count();
    check(nSteps === 6, `Kette China–Autoindustrie mit 6 Schritten (${nSteps})`);
    const main = await page.textContent('#ch-main');
    check(main.includes('Gesamtrichtung') && main.includes('Schwächstes Glied'), 'Zusammenfassung der Kette');
    const statuses = await page.locator('#ch-main .ev-badge').allTextContents();
    console.log('    Datenbelege:', statuses.filter((t) => t.includes('Daten:')).join(' | '));
    check(statuses.some((t) => t.includes('Daten passen') || t.includes('widersprechen') || t.includes('kein klarer')), 'mindestens ein Schritt mit Datenauswertung');
    check((await page.locator('#ch-panel .ev-scatter circle').count()) >= 10, 'Evidenz-Panel zeigt Streudiagramm der Jahresveränderungen');
    await shot('14-kette');
    await page.locator('#ch-main .ch-link[data-step="3"]').click();
    await page.waitForTimeout(200);
    check((await page.textContent('#ch-panel')).includes('Fahrzeuge'), 'Schritt China → Autoindustrie mit Weltmarktanteilen Fahrzeuge');
    await shot('15-kette-schritt');
    await page.selectOption('#ch-from', 'GROW');
    await page.selectOption('#ch-to', 'RES');
    await page.click('#ch-find');
    await page.waitForTimeout(300);
    check((await page.textContent('#ch-main')).includes('Pfad 1'), 'Pfadsuche Wachstumsdruck → Resilienz findet einen Pfad');
    await page.goto(`http://127.0.0.1:${PORT}/#netz`);
    await page.waitForTimeout(600);
    await page.evaluate(() => window.__cy.getElementById('e:CLIM>EMIS').emit('tap'));
    await page.waitForTimeout(800);
    check((await page.textContent('#net-panel')).includes('Korrelation (Daten)') && (await page.locator('#net-panel .ev-scatter circle').count()) > 5, 'Wirkungsnetz zeigt Datenbeleg zur Wirkung');

    console.log('Simulation');
    await page.goto(`http://127.0.0.1:${PORT}/#sim`);
    await page.waitForSelector('#sim-chart g.sim-row', { timeout: 10000 });
    const simRows = await page.locator('#sim-chart g.sim-row').count();
    check(simRows >= 3, `Voreinstellung „China baut den Sozialstaat aus“ zeigt Wirkungen (${simRows})`);
    const firstLabel = await page.locator('#sim-chart g.sim-row text.sim-label').first().textContent();
    check(firstLabel.includes('Privatkonsum China'), `stärkste Wirkung plausibel (${firstLabel})`);
    check((await page.textContent('#sim-panel')).includes('Warum?'), 'Erklärung der Wirkung');
    await shot('11-simulation');
    await page.click('#sim-presets [data-preset="ai"]');
    await page.waitForTimeout(300);
    check((await page.locator('#sim-chart text.sim-label').allTextContents()).some((t) => t.includes('Strom')), 'Szenario KI-Boom erhöht Strombedarf');
    await page.selectOption('#sim-add', 'EU_DR');
    await page.waitForTimeout(300);
    check((await page.locator('#sim-levers .lever').count()) === 2, 'eigener Hebel hinzugefügt');
    check((await page.textContent('#sim-status')).includes('eingeschwungen'), 'Simulation schwingt ein');

    console.log('Methode');
    await page.goto(`http://127.0.0.1:${PORT}/#info`);
    check(await page.isVisible('#view-info'), 'Methodenseite sichtbar');
    await page.waitForSelector('#info-sources table', { timeout: 5000 });
    const srcText = await page.textContent('#info-sources');
    check(srcText.includes('Weltbank') && srcText.includes('zuletzt abgerufen'), 'Quellenliste mit Abrufdatum');
    check(!(await page.textContent('body')).toLowerCase().includes('podcast'), 'keine Podcast-Formulierung auf der Seite');
    check((await page.getAttribute('a.support-btn', 'href')) === 'https://github.com/sponsors/Fabii911', 'Sponsor-Link auf der Methodenseite');

    check(consoleErrors.length === 0, `keine Fehler in der Browser-Konsole${consoleErrors.length ? ': ' + consoleErrors.join(' | ') : ''}`);
  } catch (e) {
    failures++; console.error('  ✗ Abbruch:', e.message);
  } finally {
    await browser.close();
    server.close();
  }
  if (failures) { console.error(`\n${failures} Prüfung(en) fehlgeschlagen`); process.exit(1); }
  console.log('\nAlle UI-Prüfungen bestanden');
})();
