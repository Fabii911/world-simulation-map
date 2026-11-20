# 05 – Kennzahlen und Website-Aufbau

Ziel: Für jedes Land und für die Welt soll sichtbar werden, **wo es steht**, **wie es dazu kam** und **was daraus folgt**.
Grundsatz: Wir zeigen Rohdaten mit Erklärung und **keinen selbst gebauten Gesamtindex**. Ein solcher Index würde Wertungen hinter einer einzelnen Zahl verstecken.

---

## 1. Korrektur der Ausgangsidee: Reallöhne gegen Exportanteil am BIP

Die Frage dahinter ist richtig: *Ist ein Export problematisch, weil sich die eigenen Leute die Ware nicht leisten können?*
Die beiden Kennzahlen messen das aber nicht:

| Gedachte Kennzahl | Problem | Bessere Kennzahl |
|---|---|---|
| **Export in % des BIP** | Misst nur, wie offen eine Volkswirtschaft ist, nicht ob sie ein Ungleichgewicht hat. Die Niederlande exportieren rund 80–90 % ihres BIP, importieren aber fast genauso viel. Die USA exportieren nur rund 11 %. | **Leistungsbilanzsaldo in % des BIP**: Überschuss oder Defizit |
| **Reallöhne** | Ein Index (z. B. 2000 = 100) zeigt nur die Entwicklung innerhalb eines Landes. Länder lassen sich damit nicht vergleichen. | **Reallohnwachstum** (Entwicklung) und **Lohnquote** (Anteil der Löhne am Volkseinkommen) |

**Für die Frage „Können sich die Menschen ihre Produkte leisten?“ braucht es fünf Kennzahlen zusammen:**

| Kennzahl | Was sie zeigt |
|---|---|
| Privater Konsum in % des BIP | Wie viel der eigenen Produktion die Bevölkerung selbst kauft |
| Sparquote der Haushalte in % des verfügbaren Einkommens | Wie viel die Menschen zurückhalten (CN ca. 30–35 %, DE ca. 11 %, US ca. 4–5 %) |
| Lohnquote | Welcher Teil des Erwirtschafteten bei Arbeitnehmern ankommt |
| Sozialausgaben in % des BIP und Anteil der Menschen mit Rente | Ob die Menschen für das Alter selbst vorsorgen müssen (DE ca. 26–28 %, CN deutlich niedriger) |
| Gesundheitskosten, die Patienten selbst zahlen, in % der Gesundheitsausgaben | Ob Krankheit ein privates Risiko ist, für das man spart |

**Daraus folgt die zentrale Diagnose-Grafik:**
X-Achse = privater Konsum in % des BIP, Y-Achse = Leistungsbilanzsaldo in % des BIP. Ein Punkt je Land, die Punktgröße zeigt die Sparquote, und mit dem Zeitregler lässt sich der Verlauf ab 1995 abspielen.

```
 Leistungsbilanz +
        │  China-Typ             │  Rohstoff-Typ (Norwegen, Golfstaaten)
        │  wenig Konsum,         │
        │  Überschuss            │  Deutschland-Typ (Mitte)
 ───────┼────────────────────────┼──────────── privater Konsum
        │                        │  USA-Typ: viel Konsum, Defizit
        │                        │  (Weltreservewährung)
 Leistungsbilanz −
```

**Länder-Typen und wie man sie erkennt:**

| Typ | Erkennungsmerkmale | Ursache des Überschusses oder Defizits |
|---|---|---|
| **Nachfrageschwäche wird exportiert** (China) | Überschuss, wenig Konsum, hohe Sparquote, schwache soziale Sicherung | Die Menschen können sich die eigene Produktion nicht leisten oder sparen aus Angst |
| **Investitionsschwäche** (Deutschland) | Überschuss, mittlerer Konsum, starker Sozialstaat, wenig öffentliche Investitionen, hohe Ersparnis der Unternehmen | Leisten können sich die Menschen die Waren. Das Land gibt aber zu wenig im Inland aus, vor allem der Staat und die Firmen. |
| **Rohstoff-Überschuss** (Norwegen, Golfstaaten, Russland vor 2022) | Überschuss durch Öl- und Gasexporte | Bei Norwegen ist das sinnvoll, weil das Geld in einen Staatsfonds für die Zeit nach dem Öl fließt. Bei Russland ist es ein Rentierstaat mit Kapitalflucht. |
| **Konsument letzter Instanz** (USA, Großbritannien) | Defizit, viel Konsum, niedrige Sparquote, hohes Staatsdefizit | Weltreservewährung und Kapitalzuflüsse |

Erkenntnis: **Ein Überschuss ist nicht gleich ein Überschuss.** Erst der Typ verrät, ob die Menschen im Land sich ihre Waren nicht leisten können oder ob etwas anderes dahintersteckt.

---

## 2. Kennzahlen je Dimension

Die fünf Dimensionen entsprechen den Mechanismen M1–M4 aus `03_systemmodell.md`, ergänzt um Politik.
Den vollständigen Katalog mit Quellencodes enthält `data/indicators.json`.

### D1 – Wirtschaftliches Gleichgewicht (M1)
| Kennzahl | Was man daraus ableitet |
|---|---|
| Leistungsbilanzsaldo % BIP | Exportiert das Land ein Problem, oder importiert es eins? |
| Privater Konsum % BIP, Sparquote, Lohnquote | Ob die eigene Nachfrage trägt (siehe oben) |
| Investitionen % BIP, öffentliche Nettoinvestitionen | Ob das Land in seine Zukunft investiert oder von der Substanz lebt |
| Reallohnwachstum | Ob Wachstum bei den Menschen ankommt |
| Inflation, Erzeugerpreise | Überhitzung (z. B. Russland) oder Deflation (z. B. China) |
| Jugendarbeitslosigkeit | Frühwarnzeichen für soziale Spannung |
| Staatsverschuldung, Nettoauslandsvermögen | Wer bei wem in der Schuld steht. „Verschenkt“ zeigt sich hier als Verlust. |

### D2 – Abhängigkeiten (M2)
| Kennzahl | Was man daraus ableitet |
|---|---|
| Energieimportquote und Konzentration der Lieferländer (wie viel kommt von wenigen Lieferanten?) | Erpressbarkeit bei Energie (DE 2021: ca. 55 % des Gases aus Russland) |
| Anteil Chinas an Förderung und Verarbeitung kritischer Rohstoffe | Rohstoffhebel (seltene Erden: ca. 90 % der Verarbeitung) |
| Selbstversorgungsgrad mit Nahrung, Abhängigkeit von Dünger- und Futterimporten | Ernährungssicherheit im Krisenfall |
| Halbleiter: Anteil an der weltweiten Fertigungskapazität | Klumpenrisiko Taiwan |
| Größte Handelspartner (Anteil) | In welche Richtung eine Abhängigkeit läuft |

### D3 – Machtkonzentration (M3)
| Kennzahl | Was man daraus ableitet |
|---|---|
| Marktanteil der größten vier Firmen je Branche (CR4) bzw. Konzentrationsindex (HHI) | Wettbewerb oder Oligopol |
| Gewinnaufschläge über den Kosten (De Loecker/Eeckhout) | Preissetzungsmacht |
| Gründungsrate, Anteil junger Firmen | Ob die Wirtschaft dynamisch ist |
| Anteil der Top-10-Firmen am Börsenwert | Klumpenrisiko für Finanzmärkte (z. B. KI-Blase) |
| Cloud- und KI-Marktanteile | Technofeudalismus |
| Lobbyausgaben (USA: OpenSecrets, EU: Transparenzregister) | Übersetzung von Wirtschaftsmacht in politische Macht |
| Effektive Steuerquote von Konzernen | Wie gut die Politik grenzüberschreitende Konzerne erreicht |

### D4 – Politik und Stabilität
| Kennzahl | Was man daraus ableitet |
|---|---|
| Demokratieindex (V-Dem Liberal Democracy Index, Freedom House) | Ob Macht kontrolliert wird. Langfristige Verschiebungen sieht man hier. |
| Stimmenanteil populistischer und nationalistischer Parteien (Datensatz PopuList) | Schleife R7: Abstieg → Populismus |
| Vertrauen in die Regierung (OECD-Vertrauensumfrage) | Legitimität |
| Ungleichheit: Gini-Koeffizient, Einkommensanteil der Top 10 % bzw. Top 1 % (WID) | Wer vom Wachstum profitiert, Verteilungskonflikte |
| Korruption (CPI, Transparency International), Regierungseffektivität (Weltbank) | Staatliche Steuerungsfähigkeit |
| Militärausgaben % BIP (SIPRI) | Wettrüsten, Kriegswirtschaft |
| Konflikte und Konfliktopfer (Datenbanken UCDP, ACLED) | Wo es eskaliert |
| Zollniveau und Handelsbeschränkungen (Global Trade Alert) | Protektionismus-Spirale R12 |

### D5 – Klimakrise (M4)
| Kennzahl | Was man daraus ableitet |
|---|---|
| CO₂ pro Kopf, **im Land erzeugt** und **im Konsum enthalten** | **Wichtig für das Gesamtbild:** Ein Teil der chinesischen Emissionen entsteht für Exporte. Deutschland und Großbritannien importieren Emissionen mit ihrem Konsum. So wird sichtbar, wie Handel und Klima zusammenhängen. |
| Kumulierte historische Emissionen | Wer für die Erwärmung verantwortlich ist |
| Anteil erneuerbarer Energien, CO₂-Intensität des BIP | Ob Wachstum sich vom CO₂ löst (Entkopplung) |
| Subventionen für fossile Energien (IWF) | Ob die Politik gegen die eigenen Ziele arbeitet |
| Globale Temperaturabweichung | 2024 war das erste Jahr über 1,5 °C (Copernicus) |
| Klimarisiko-Index (Germanwatch) | Wer die Schäden trägt |
| Stromverbrauch von Rechenzentren | Verbindung zur KI (TE-01) |

### D6 – Biodiversität und Ressourcen (M4)
| Kennzahl | Was man daraus ableitet |
|---|---|
| Living Planet Index (WWF/ZSL) | Bestände von Wirbeltieren sind 1970–2020 im Schnitt um rund 73 % geschrumpft |
| Rote-Liste-Index (IUCN) | Aussterberisiko |
| Biodiversity Intactness Index (Natural History Museum London) | Wie intakt die Natur eines Landes noch ist |
| Waldverlust (Global Forest Watch) | Landnutzungswandel, den wichtigsten Treiber |
| Schutzgebietsanteil (Ziel: 30 % bis 2030) | Ob politische Ziele erreicht werden |
| Ökologischer Fußabdruck im Verhältnis zur Biokapazität, Erdüberlastungstag | Ob ein Land über seine Verhältnisse lebt |
| Materialfußabdruck pro Kopf | Wie viel Ressourcen der Konsum verbraucht |
| Stickstoffüberschuss, Pestizideinsatz, Anteil der Agrarfläche | Intensität der Landnutzung und Monokultur |
| Importierte Entwaldung (Biodiversitäts-Fußabdruck des Konsums) | Wie unser Konsum Natur anderswo zerstört (verbindet Handel und Biodiversität) |

---

## 3. Zusammenführende Ansicht: der „Donut“

Das Konzept stammt von der Ökonomin Kate Raworth (*Doughnut Economics*).
Die Universität Leeds hat Daten für rund 150 Länder: O'Neill u. a. 2018, Fanning u. a. 2022, *goodlife.leeds.ac.uk*.
- **Innerer Ring, das soziale Fundament:** 11 Mindeststandards wie Ernährung, Gesundheit, Bildung, Einkommen, Demokratie und Gleichheit.
- **Äußerer Ring, die ökologische Decke:** 7 planetare Grenzen pro Kopf heruntergerechnet, etwa CO₂, Stickstoff, Phosphor, Land und Material.
- **Befund:** **Kein Land erreicht alle sozialen Ziele, ohne die ökologischen Grenzen zu überschreiten.**
  Reiche Länder überschreiten die Grenzen, arme verfehlen das Fundament.

Für die Frage nach dem Gesamtbild ist das die stärkste Einzelansicht. Sie verbindet Wirtschaft, Soziales, Klima und Biodiversität auf einer Karte.
Weltweit sind laut Planetary Health Check 2025 (PIK) **7 von 9 planetaren Grenzen** überschritten. Zuletzt kam die Ozeanversauerung dazu.

---

## 4. Aufbau der Website

| Bereich | Inhalt | Beantwortet |
|---|---|---|
| **1. Weltkarte** | Choropleth-Karte (Länder je nach Wert eingefärbt) mit Auswahl der Kennzahl und Zeitregler | Wo steht welches Land? |
| **2. Diagnose-Grafik** | Konsum gegen Leistungsbilanz (siehe oben), animiert über die Jahre | Exportiert ein Land sein Nachfrageproblem? |
| **3. Länderprofil** | Klick auf ein Land: Kennzahlen in sechs Dimensionen, Länder-Typ, Donut, relevante Ereignisse | Wie ist die Lage im Land, und wie kam es dazu? |
| **4. Wirkungsnetz** | Interaktiver Graph aus `model.json`; Klick auf einen Pfeil zeigt die Begründung | Wie hängt alles zusammen? |
| **5. Zeitleiste** | Ereignisse plus Kurven, Epochenvergleich | Wie kam es dazu, welche Parallelen gibt es? |
| **6. Simulation** | Hebel setzen und beobachten, was im Netz passiert (FCM) | Was wäre, wenn …? |
| **7. Faktencheck und Quellen** | Alle Aussagen mit Bewertung | Was ist belegt? |

**Verknüpfung der Bereiche:** Jede Kennzahl gehört zu einer Größe im Wirkungsnetz.
Ein Klick auf „Sparquote China“ in der Karte springt zur Größe *Privatkonsum China* im Netz und umgekehrt.

---

## 5. Datenquellen und Grenzen

**Hauptquellen** (offen und kostenlos):
- Our World in Data: bündelt viele der Kennzahlen, Lizenz CC-BY
- Weltbank-API
- OECD
- IWF (World Economic Outlook)
- ILO: Löhne, Lohnquote, Renten
- World Inequality Database (WID): Ungleichheit
- V-Dem: Demokratie
- SIPRI: Militärausgaben
- Global Carbon Project: Emissionen
- WWF/IUCN: Biodiversität
- Leeds Goodlife: Donut

**Grenzen, die die Website offen benennt:**
- **Datenqualität:** Statistiken aus China und Russland sind politisch beeinflusst. Russland veröffentlicht seit 2022 manche Daten nicht mehr.
- **Verzögerung:** Viele Kennzahlen erscheinen 1–3 Jahre später. Die Karte zeigt deshalb nicht immer den heutigen Stand.
- **Vergleichbarkeit:** Unterschiedliche Definitionen je Land, z. B. bei der Sparquote.
- **Korrelation ist keine Kausalität:** Karten und Kurven zeigen Muster. Ob A wirklich B verursacht, sagt nur eine geprüfte Aussage im Faktencheck.
