# World Simulation Map

*Weltlage im Zusammenhang*

**Eine interaktive Landkarte der Weltlage: Wie hängen Geopolitik, Weltwirtschaft, Machtkonzentration, Klima und Biodiversität zusammen?**

Kriege, Handelskonflikte, Deindustrialisierung, Monopole und Artensterben werden meist getrennt diskutiert.
World Simulation Map bringt sie in **ein gemeinsames Modell**. So wird sichtbar, wo eine Entwicklung die andere verstärkt
und wo ein Hebel an einer Stelle unerwartete Folgen an einer anderen hat.

Das Projekt verbindet drei Dinge:

1. **Geprüfte Thesen.** Verbreitete Aussagen zur Weltlage werden einzeln geprüft, bewertet (belegt, teilweise richtig, umstritten, falsch) und mit Literatur belegt.
2. **Ein Wirkungsmodell.** Die Thesen werden zu einem Netz aus Ursachen und Wirkungen verdichtet: Welche Größe beeinflusst welche, in welche Richtung, wie sicher?
3. **Öffentliche Daten.** Kennzahlen von Weltbank, Our World in Data und weiteren offenen Quellen zeigen, wo jedes Land steht und wie es dahin kam. Sie werden monatlich automatisch aktualisiert.

> **Leitfrage zum Beispiel:** Exportiert ein Land Waren, weil die Welt sie braucht, oder weil sich die eigene Bevölkerung die eigene Produktion nicht leisten kann? Die Diagnose-Grafik beantwortet das für jedes Land seit 1990.

**Website:** https://fabii911.github.io/world-simulation-map/ (nach Aktivierung von GitHub Pages)

## Was die Website zeigt

| Ansicht | Inhalt |
|---|---|
| **Weltkarte** | 25 Kennzahlen je Land und Jahr seit 1990 (Wirtschaft, Abhängigkeiten, Politik, Klima, Biodiversität). Länderprofil mit Zeitreihen, Länder-Typ und Donut |
| **Diagnose** | Privater Konsum gegen Leistungsbilanzsaldo, animiert über die Jahre. Ordnet Länder Typen zu, z. B. „Nachfrageschwäche wird exportiert“ oder „Defizit mit hohem Konsum“ |
| **Handelsdruck** | Druckmatrix: Welches Land steht bei welchem Gut unter Konkurrenzdruck durch China, und wie verschiebt sich das über die Zeit (2000 bis heute)? Dazu Exportkorb je Land und Weltmarktanteile im Vergleich mit China |
| **Aus Sicht von** | Über welche Kanäle treffen die Mechanismen ein gewähltes Land (Konkurrenzdruck durch China, Exportabhängigkeit, Energieimporte, Rüstung, Klima, Biodiversität u. a.)? Betroffenheit als Perzentil unter allen Ländern, Vergleich zweier Länder, relevante Ketten und Ego-Netz |
| **Lieferketten** | Abhängigkeits-Quadrant für rund 30 kritische Importgüter je Land (Lieferkonzentration, Importabhängigkeit, Anteil Chinas, größte Lieferländer seit 2010) und Herkunft der Wertschöpfung in Exporten nach Branche (OECD TiVA) |
| **Wirkungsnetz** | 50 Größen, 83 Wirkungen, 11 Rückkopplungsschleifen. Jede Wirkung verweist auf die Aussagen, die sie begründen |
| **Ketten** | Ursache-Wirkungs-Ketten Schritt für Schritt (9 vordefinierte, dazu freie Pfadsuche zwischen zwei Größen). Jeder Schritt zeigt getrennt den Literaturbeleg (Kausalität) und den Datenbeleg (Korrelation der Jahresveränderungen) |
| **Simulation** | Hebel setzen (z. B. „China baut den Sozialstaat aus“, „Weltweiter Protektionismus“) und sehen, wie sich die Wirkung durch das Netz ausbreitet |
| **Zeitleiste** | Ereignisse von 1906 bis heute, verknüpft mit dem Netz, inklusive historischer Vergleichspunkte (1914, 1930er) |
| **Faktencheck** | Alle geprüften Aussagen mit Bewertung und Begründung |

## Was es nicht ist

- **Keine Prognose.** Die Simulation zeigt Richtungen und Zielkonflikte auf Basis geschätzter Gewichte, keine Zahlen über die Zukunft.
- **Keine fertige Wahrheit.** Bewertungen und Gewichte sind begründet und offengelegt, aber diskutierbar. Widerspruch mit Belegen ist ausdrücklich erwünscht (Issues).
- **Kein politisches Programm.** Bewertet werden Sachaussagen, nicht Parteien oder Personen.

## Quellen

**Daten** (alle offen zugänglich; vollständiges Register in [`data/sources.json`](data/sources.json)):

| Quelle | Lizenz | Verwendung | Aktualisierung |
|---|---|---|---|
| [Weltbank, World Development Indicators](https://data.worldbank.org) | CC BY 4.0 | Leistungsbilanz, Konsum, Ersparnis, Investitionen, Rohstoffrenten, Inflation, Arbeitslosigkeit u. a. | monatlich automatisch |
| [Our World in Data](https://ourworldindata.org) | CC BY 4.0 | CO₂ (Global Carbon Project), Erneuerbare (Ember), Demokratie (V-Dem), Militärausgaben (SIPRI), Ungleichheit (WID), Korruption (Transparency International), Lohnquote (ILO), Rote Liste (IUCN), Waldverlust (Global Forest Watch), Agrarfläche (FAO) | monatlich automatisch |
| [Atlas of Economic Complexity, Harvard Growth Lab](https://atlas.hks.harvard.edu) (doi:10.7910/DVN/T4CHWJ) | CC0 | Warenexporte nach Land, Gütergruppe (HS-Kapitel) und Jahr | monatlich automatisch |
| [OECD Trade in Value Added (TiVA)](https://www.oecd.org/en/topics/sub-issues/trade-in-value-added.html) | OECD-Nutzungsbedingungen | Herkunft der Wertschöpfung in Exporten nach Land und Branche | monatlich automatisch |
| [Fanning u. a. 2022, Universität Leeds](https://goodlife.leeds.ac.uk/download-data/) | Zitierpflicht | Donut: soziale Mindeststandards und planetare Grenzen je Land (1992–2015) | manuell bei neuer Version |
| [Natural Earth](https://www.naturalearthdata.com) über world-atlas | gemeinfrei / ISC | Ländergrenzen | statisch |

**Literatur:** Faktencheck und Wirkungsmodell stützen sich auf rund 50 Quellen aus Ökonomie, Politikwissenschaft und Ökologie,
u. a. Klein & Pettis (2020), Autor, Dorn & Hanson (2013), Philippon (2019), Draghi-Bericht (2024), Farrell & Newman (2019), Clark (2012), IPBES (2019), IEA (2025), Fanning u. a. (2022).
Die geprüften Ausgangsthesen gehen u. a. auf Ulrike Herrmann (2022), Ulrike Guérot (2016, 2022) und Katrin Böhning-Gaese (2023) zurück.
Vollständiges Verzeichnis: [`docs/quellen.md`](docs/quellen.md).

## Aktuell halten

Die Daten werden über die öffentlichen Schnittstellen der Quellen bezogen und **monatlich automatisch aktualisiert**
(GitHub Actions, [`.github/workflows/update-data.yml`](.github/workflows/update-data.yml)):

1. Kennzahlen bei Weltbank, Our World in Data und dem Atlas of Economic Complexity abrufen
2. Daten auf Konsistenz prüfen (`npm run validate`) und nach versehentlich enthaltenen Geheimnissen suchen (`npm run check-secrets`)
3. Nur wenn sich etwas geändert hat und alle Prüfungen bestehen: Commit auf `main`. GitHub Pages veröffentlicht automatisch.

Neue Quellen lassen sich anbinden, indem man eine Kennzahl in [`data/indicators.json`](data/indicators.json) einträgt
(mit `source_code` für die Weltbank oder `owid_slug` für Our World in Data) und sie mit Größen im Wirkungsnetz verknüpft (`model_nodes`).
Die Website zeigt sie danach automatisch auf der Weltkarte an.

Inhaltliche Teile (Thesen, Wirkungen, Ereignisse) werden redaktionell gepflegt. Jede Änderung prüft `npm run validate` auf kaputte Verweise.

## Lokal starten

Voraussetzung: Node.js ≥ 18. Es gibt keine Laufzeit-Abhängigkeiten; die Bibliotheken liegen in `assets/vendor/`.

```bash
npm run serve
```

Dann `http://localhost:8000` öffnen. Die Seite ist statisch und läuft unverändert auf GitHub Pages.

### Daten von Hand aktualisieren

```bash
npm run fetch:worldbank
```

```bash
npm run fetch:owid
```

```bash
npm run fetch:atlas
```

```bash
npm run fetch:dependencies
```

```bash
npm run fetch:tiva
```

Donut-Daten (Excel-Datei der Universität Leeds, benötigt `openpyxl`):

```bash
python3 scripts/convert-doughnut.py PFAD/SocialShortfallAndEcologicalOvershoot_SupplementaryData.xlsx
```

### Tests

```bash
npm test
```

- `validate`: Konsistenz der Daten (Verweise, Wertebereiche, doppelte IDs)
- `check-secrets`: Suche nach Schlüsseln, Tokens und verbotenen Dateien
- `test:ui`: Playwright-Test aller Ansichten (benötigt `npm i -D playwright && npx playwright install chromium`)

## Aufbau

```
index.html            Einstieg
assets/js/            app.js (Navigation), graph.js, timeline.js, claims.js, worldmap.js, diagnose.js, simulation.js, series.js, data.js
assets/css/           Stil (Hell- und Dunkelmodus)
assets/vendor/        Cytoscape.js (MIT), d3 (ISC), topojson-client (ISC), world-atlas (ISC)
data/model.json       Größen, Wirkungen, Aussagen, Schleifen
data/timeline.json    Ereignisse und zeitlich wechselnde Wirkungen
data/indicators.json  Katalog der Kennzahlen mit Quelle und Verknüpfung zum Wirkungsnetz
data/sources.json     Register der Datenquellen
data/series/          Zeitreihen (Weltbank, Our World in Data, Donut)
docs/                 Methode, Faktencheck, Systemmodell, Vertiefungen, Kennzahlen, Quellen
scripts/              Server, Datenabruf, Datenprüfung, Secret-Scan
tests/                UI-Test
```

## Methode in Kürze

- **Faktencheck:** Thesen werden in einzelne prüfbare Aussagen zerlegt und auf einer festen Skala bewertet, jeweils mit Gegenposition ([`docs/01_methode.md`](docs/01_methode.md), [`docs/02_faktencheck.md`](docs/02_faktencheck.md)).
- **Wirkungsmodell:** Causal Loop Diagram nach System Dynamics (Sterman 2000; Meadows 1999). Knoten sind Größen, die steigen oder fallen können; Pfeile tragen Polarität, Verzögerung, Gewicht und Sicherheit ([`docs/03_systemmodell.md`](docs/03_systemmodell.md)).
- **Simulation:** Fuzzy Cognitive Map (Kosko 1986). Effektives Gewicht = geschätzte Stärke × Sicherheit; unsichere Wirkungen tragen weniger weit.
- **Länder-Typen:** einfache, offen dokumentierte Schwellenwerte ([`docs/05_kennzahlen.md`](docs/05_kennzahlen.md)).

## Grenzen

- Gewichte und Sicherheiten der Wirkungen sind begründete Schätzungen, keine Messwerte.
- Die Einordnungen spiegeln den Forschungsstand bis Mitte 2026. Ereignisse sind als „zu belegen“ markiert, bis sie gegen Primärquellen geprüft sind.
- Amtliche Statistiken einzelner Länder (z. B. China, Russland) sind politisch beeinflusst oder lückenhaft.
- Parallele Entwicklungen zweier Größen beweisen keine Kausalität. Als belegt gilt nur, was eine geprüfte Aussage stützt.
