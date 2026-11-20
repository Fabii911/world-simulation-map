# 06 – Darstellungsformen für komplexe Abhängigkeiten (Konzept)

Ziel: Beziehungen nicht nur behaupten, sondern **sichtbar und überprüfbar** machen: aus der Sicht eines Landes, für eine Güterart,
über die Zeit, mit klarer Trennung von **Korrelation (Daten)** und **Kausalität (begründete Wirkung)**.

---

## 1. Warum der aktuelle Stand nicht reicht

| Problem | Folge |
|---|---|
| **Aggregierte Größen** („Chinesischer Exportüberschuss“) | Die Zusammensetzung verschwindet: Ein schrumpfender Saldo kann mit wachsendem Druck in einzelnen Branchen einhergehen. |
| **Keine Perspektive** | Das Netz sieht für jedes Land gleich aus. Wer konkret unter Druck steht, ist nicht erkennbar. |
| **Keine Güterebene** | Druck wandert von Gut zu Gut (Textil → Elektronik → Solar → Autos). Das Modell kennt nur „Industrie“. |
| **Korrelation und Kausalität unsichtbar getrennt** | Eine Wirkung im Netz ist eine Behauptung mit Beleg. Ob die Daten dazu passen, sieht man nirgends. |
| **Netz als Knäuel** | 50 Knoten und 83 Pfeile auf einmal überfordern. Erzählte Ketten („A führt über B zu C“) sind nicht als Pfad verfolgbar. |
| **Keine Mengen** | Pfeile sagen „mehr/weniger“, aber nicht „wie viel, für wen, ab wann“. |

## 2. Beispiel: China-Überschuss schrumpft, Druck auf Deutschland steigt – wie passt das?

Die Beobachtung ist richtig. Der Widerspruch löst sich auf, wenn man **die Messgröße und die Zusammensetzung** trennt.

| Befund | Daten |
|---|---|
| Leistungsbilanz Chinas in % des BIP | 2007: 9,8 % → 2019: 0,6 % → 2024: 2,5 % → 2025: 3,8 % (Weltbank) |
| Warenexporte Chinas insgesamt | 2015: 2.273 Mrd. USD → 2024: 3.577 Mrd. USD (UN Comtrade) |
| Chinas Exporte von Fahrzeugen (HS 87) | 2015: 63 Mrd. USD → 2021: 119 → 2024: 216 Mrd. USD (UN Comtrade) |
| Chinas Exporte von Bekleidung (HS 61) | 2015: 84 Mrd. USD → 2024: 85 Mrd. USD (UN Comtrade) |
| Deutschlands Exporte von Fahrzeugen (HS 87) | 2015: 242 Mrd. USD → 2023: 298 → 2024: 286 Mrd. USD (UN Comtrade) |

**Erklärung in vier Schritten:**
1. **Messgröße:** Der Saldo *in % des BIP* ist geschrumpft, weil Chinas BIP schneller wuchs als der Überschuss. In absoluten Dollar ist der Warenhandelsüberschuss auf Rekordniveau (2024 knapp 1 Billion USD, 2025 über 1 Billion USD).
2. **Zusammensetzung:** Der Zuwachs kommt fast nur aus höherwertigen Gütern (Fahrzeuge, Batterien, Maschinen, Chemie). Bekleidung stagniert. Genau dort, wo Deutschland stark ist, wächst China am schnellsten.
3. **Drittmärkte und China selbst:** Deutschland verliert nicht nur zu Hause, sondern in China (Nachfrage nach deutschen Autos bricht weg) und auf Drittmärkten, wo chinesische Anbieter deutsche ersetzen.
4. **Preise:** Bei Deflation in China (siehe `04_vertiefung.md`) sinken Exportpreise. Die *Menge* der Exporte wächst stärker als ihr *Wert*. Wertgrößen unterschätzen den Druck.

**Folgerung für die Darstellung:** Druck ist eine Größe **je Land und je Gut**: Wie stark überschneidet sich das Exportsortiment eines Landes mit den Gütern, in denen China gerade wächst?
Die Forschung misst genau das: **Importwettbewerbs-Exposition** nach Autor, Dorn und Hanson (2013): Anteil eines Guts an der Wirtschaft eines Landes × Zuwachs der chinesischen Exporte dieses Guts, summiert über alle Güter.
Mit dieser Größe wird sichtbar, dass heute Deutschland, Japan und Korea (Autos, Maschinen) unter Druck stehen und vor 15–20 Jahren vor allem Länder mit Möbel-, Textil- und Elektronikindustrie (in der Forschung am besten belegt für die USA).

## 3. Anforderungen

1. **Perspektive:** „Aus Sicht von“ einem Land: Was wirkt auf mich, wie stark, über welche Güter und Partner?
2. **Güterebene:** Produktgruppen (z. B. HS-2-Kapitel), wechselnd über die Zeit.
3. **Zeit:** Jeder Zusammenhang als Verlauf, nicht als Momentaufnahme.
4. **Evidenzart sichtbar:** Kausalität (Literatur, geprüfte Aussage) und Korrelation (Daten) getrennt kennzeichnen. Widersprechen sich beide, wird das angezeigt.
5. **Ketten statt Knäuel:** Erzählte Ursache-Wirkungs-Ketten Schritt für Schritt verfolgen.
6. **Überblick zuerst, Details auf Abruf** (Shneiderman 1996).

## 4. Darstellungsformen im Vergleich

| Form | Wofür | Stärke | Schwäche | Vorbild / Quelle |
|---|---|---|---|---|
| **Causal Loop Diagram** (vorhanden) | Wirkungslogik, Rückkopplungen | zeigt Kreisläufe | ohne Mengen, wird bei vielen Knoten unübersichtlich | Sterman 2000 |
| **Kettenansicht / Pfad-Explorer** | eine Ursache-Wirkungs-Kette Schritt für Schritt | Erzählungen werden nachvollziehbar, je Schritt mit Beleg | zeigt nur einen Ausschnitt | „Explorable Explanations“ (Victor 2011), LOOPY (Case 2017) |
| **Ego-Netz („Aus Sicht von“)** | alles, was auf ein Land/eine Größe wirkt, bis 2–3 Schritte entfernt | Fokus statt Knäuel | Kontext außerhalb fehlt | Fokus+Kontext (Furnas 1986) |
| **Adjazenzmatrix / Heatmap** | viele Abhängigkeiten auf einmal (Land × Gut, Größe × Größe) | bei dichten Netzen besser lesbar als Knoten-Kanten-Bilder | Pfade schwerer zu sehen | Ghoniem u. a. 2004; Design Structure Matrix |
| **Treemap des Exportkorbs** | Zusammensetzung der Exporte eines Landes, animiert über Jahre | zeigt Wandel der Güterstruktur sofort | Vergleich zwischen Ländern mühsam | Atlas of Economic Complexity (Harvard Growth Lab), OEC |
| **Product Space** | welche Güter ein Land herstellen kann und wohin es sich entwickelt | erklärt, warum China in Autos vorstößt | erklärungsbedürftig | Hidalgo u. a. 2007 |
| **Sankey / Chord** | Handelsströme: wer liefert was an wen | Größenordnungen auf einen Blick | wird bei vielen Partnern unübersichtlich | UN Comtrade, BACI |
| **Lieferketten-Netz (Input-Output)** | versteckte Abhängigkeiten über Vorprodukte (z. B. Batterien in deutschen Autos) | zeigt „Wertschöpfung im Handel“ | Daten mit 2–3 Jahren Verzug | OECD TiVA/ICIO; Acemoglu u. a. 2012 |
| **Abhängigkeits-Quadrant** | kritische Güter nach Importkonzentration und Ersetzbarkeit | priorisiert Risiken | stark verdichtet | Methode der EU-Kommission zu strategischen Abhängigkeiten (2021) |
| **Kanten-Evidenz („Dual-Ansicht“)** | zu einer Wirkung: beide Zeitreihen + zeitversetzte Korrelation + Literaturbeleg | trennt Korrelation und Kausalität sichtbar | Korrelationen können trügen (Trends) | – |
| **Kaskade / Wirkungsbaum** | Folgen eines Schocks in Ringen (1., 2., 3. Ordnung) | macht Fernwirkungen sichtbar | vereinfacht Rückkopplungen | Sunburst; Simulation als Ergebnisanzeige |
| **Small Multiples** | gleiche Grafik für mehrere Länder/Güter nebeneinander | Vergleich ohne Überladung | Platzbedarf | Tufte 1983 |
| **Sensitivität / Tornado** | welcher Hebel am meisten bewegt | priorisiert Hebel | nur so gut wie die Gewichte | System Dynamics |

## 5. Gestaltungsprinzipien

- **Überblick, Zoomen und Filtern, Details auf Abruf** (Shneiderman 1996): Startansicht = wenige, verdichtete Mechanismen (M1–M4). Erst auf Klick die Einzelgrößen.
- **Aufgabe vor Form** (Munzner 2014): Für „Wer steht unter Druck?“ eine Matrix, für „Wie hängt A mit C zusammen?“ einen Pfad, für „Was folgt aus dem Hebel?“ eine Kaskade.
- **Matrix statt Knäuel** bei dichten Beziehungen (Ghoniem u. a. 2004).
- **Perspektive als Filter**, nicht als eigenes Modell: Das Wirkungsmodell bleibt eines. Die Perspektive gewichtet es mit den Daten des gewählten Landes.
- **Evidenz immer mitliefern:** Jede Wirkung zeigt, worauf sie beruht: Literatur, Daten, beides oder nur Annahme.

## 6. Vorschlag: drei Ebenen und sechs neue Ansichten

**Ebenen**
1. **Wirkungslogik** (vorhanden): Größen, Wirkungen, Schleifen, Aussagen.
2. **Evidenz** (neu): Zu jeder Wirkung die passenden Kennzahl-Paare, zeitversetzte Korrelation (auf Veränderungsraten, nicht Niveaus) und die Einstufung *Literatur / Daten / beides / Annahme*.
3. **Daten nach Land × Gut × Partner × Jahr** (neu): Handelsströme nach Produktgruppen.

**Ansichten**

| # | Ansicht | Beantwortet | Daten |
|---|---|---|---|
| A | **Ketten** | „Wie führt A über B zu C?“ – vordefinierte und frei wählbare Pfade, Schritt für Schritt mit Beleg und Daten | Wirkungsmodell, Kennzahlen |
| B | **Kanten-Evidenz** | „Passt die behauptete Wirkung zu den Daten?“ | Kennzahlen, Literatur |
| C | **Aus Sicht von** | „Was wirkt auf Deutschland (oder ein anderes Land), wie stark?“ – Ego-Netz, gewichtet mit Landesdaten | Wirkungsmodell, Kennzahlen, Handel |
| D | **Druckmatrix** | „Welches Land steht bei welchem Gut unter Konkurrenzdruck?“ – Heatmap Land × Produktgruppe, Zeitregler (Exposition nach Autor/Dorn/Hanson) | UN Comtrade bzw. BACI |
| E | **Exportkorb und Handelsströme** | „Was exportiert ein Land, an wen, und wie ändert sich das?“ – Treemap über die Jahre, Sankey nach Partnern | UN Comtrade bzw. BACI |
| F | **Lieferketten** | „Wo hänge ich versteckt ab?“ – Wertschöpfung im Handel, kritische Güter im Quadranten | OECD TiVA/ICIO |

Die bestehende Simulation bekommt zusätzlich eine **Kaskadenanzeige** (Folgen 1., 2., 3. Ordnung) und eine **Sensitivitätsanalyse** (welcher Hebel bewegt eine gewählte Zielgröße am stärksten).

## 7. Neue Datenquellen (offen)

| Quelle | Inhalt | Zugang | Hinweis |
|---|---|---|---|
| **UN Comtrade** | Handel nach Land, Partner, Produkt (HS), Jahr | öffentliche Schnittstelle ohne Schlüssel (begrenzt, getestet); kostenloser Schlüssel für größere Abfragen | Rohdaten, Meldungen von Export- und Importland weichen teils ab |
| **CEPII BACI** | bereinigte Handelsmatrix auf Basis Comtrade, HS-6, alle Länder | freier Download (große Jahresdateien) | beste Grundlage für Druckmatrix und Exportkörbe |
| **Atlas of Economic Complexity** (Harvard Growth Lab) | Exportkörbe, Komplexität, Product Space | offene Schnittstelle (GraphQL, erreichbar getestet), Downloads | sehr gut für Treemap und Product Space |
| **OECD TiVA / ICIO** | Wertschöpfung im Handel, Input-Output-Verflechtung | offene SDMX-Schnittstelle (erreichbar getestet) | 2–3 Jahre Verzug |
| **IWF Direction of Trade** | bilateraler Handel insgesamt, monatlich | offene Schnittstelle | ohne Produktgliederung |

## 8. Methodische Grenzen

- **Korrelation ist keine Kausalität.** Gleichlaufende Trends erzeugen Scheinkorrelationen. Deshalb Korrelation auf Veränderungsraten, mit Zeitversatz, und immer neben dem Literaturbeleg.
- **Exposition ist kein Schaden.** Hohe Überschneidung mit chinesischen Wachstumsgütern zeigt Druck, nicht automatisch Verluste. Ob Jobs verloren gehen, hängt von Anpassungsfähigkeit, Preisen und Politik ab.
- **Wert gegen Menge:** Handelsdaten sind Werte in US-Dollar. Wechselkurse und fallende Preise verzerren. Wo möglich, Mengen und Preisindizes ergänzen.
- **Perspektive ist Gewichtung, keine neue Wahrheit:** Sie zeigt, welche Wirkungen für ein Land relevant sind, ändert aber nicht die Wirkungslogik.

## 9. Literatur (zusätzlich zu `quellen.md`)

- Shneiderman, Ben (1996): The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations. *Proceedings IEEE Symposium on Visual Languages*, 336–343.
- Munzner, Tamara (2014): *Visualization Analysis and Design.* Boca Raton: CRC Press.
- Ghoniem, Mohammad; Fekete, Jean-Daniel; Castagliola, Philippe (2004): A Comparison of the Readability of Graphs Using Node-Link and Matrix-Based Representations. *IEEE Symposium on Information Visualization*, 17–24.
- Furnas, George (1986): Generalized Fisheye Views. *Proceedings CHI '86*, 16–23.
- Tufte, Edward (1983): *The Visual Display of Quantitative Information.* Cheshire: Graphics Press.
- Hidalgo, César u. a. (2007): The Product Space Conditions the Development of Nations. *Science* 317(5837), 482–487.
- Hausmann, Ricardo; Hidalgo, César u. a. (2014): *The Atlas of Economic Complexity.* Cambridge, MA: MIT Press.
- Acemoglu, Daron; Carvalho, Vasco; Ozdaglar, Asuman; Tahbaz-Salehi, Alireza (2012): The Network Origins of Aggregate Fluctuations. *Econometrica* 80(5), 1977–2016.
- Gaulier, Guillaume; Zignago, Soledad (2010): BACI: International Trade Database at the Product-Level. CEPII Working Paper 2010-23.
- Europäische Kommission (2021): *Strategic dependencies and capacities.* Commission Staff Working Document SWD(2021) 352.
- Victor, Bret (2011): *Explorable Explanations.* worrydream.com.
- Case, Nicky (2017): *LOOPY – a tool for thinking in systems.* ncase.me/loopy.
