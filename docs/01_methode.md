# 01 – Methode

Für jede Teilaufgabe nutzen wir eine erprobte Methode statt einer selbst erfundenen.

## 1. Analyse und Recherche: Aussagen-Zerlegung + Evidenzbewertung

1. **Atomisieren:** Jede These wird in einzelne prüfbare Aussagen zerlegt. Jede bekommt eine ID
   (z. B. `RU-03`).
2. **Typ bestimmen:** Ist es eine *Tatsache* (messbar), eine *Kausalbehauptung* (A verursacht B), eine *Prognose*
   oder eine *Wertung bzw. Empfehlung*? Jeder Typ wird anders geprüft.
3. **Bewerten** auf einer festen Skala:

| Symbol | Bedeutung |
|---|---|
| ✅ | **Belegt.** Breiter Konsens oder gute Daten |
| 🟡 | **Teilweise richtig.** Kern stimmt, ist aber überzeichnet oder unpräzise |
| 🟠 | **Umstritten / spekulativ.** Es gibt plausible Argumente, aber keinen Beleg, oder die Fachwelt ist gespalten |
| ❌ | **Falsch** oder Ursache und Wirkung vertauscht |
| ❓ | **Nicht prüfbar.** Zum Beispiel, ob eine Person etwas wörtlich so gesagt hat |

4. **Quellen kritisch prüfen:** Wer spricht (Fachgebiet, Rolle, Interessen)? Ist es Minderheits- oder Mehrheitsmeinung?
5. **Gegenposition:** Zu jeder starken These wird die beste Gegenposition notiert (Steelmanning).

## 2. Dokumentation

- Markdown für Menschen (`02_faktencheck.md`, `03_systemmodell.md`).
- JSON für Maschinen (`data/model.json`). Beides wird synchron gehalten.
- Jede Aussage enthält ID, Wortlaut, Quelle (Person, Werk, Beitrag), Bewertung, Begründung, Belege und Datum.
- Empfehlung: das Projekt in ein Git-Repository legen. So bleibt nachvollziehbar, wann sich welche Einschätzung geändert hat.

## 3. Beziehungsmodell (ERM): Wissensgraph

Ein klassisches relationales ERM wäre hier zu starr. Besser passt ein **Property Graph**:

```
Quelle (Person/Werk) ──äußert──▶ Aussage ──stützt/widerlegt──▶ Kante
Variable ──Kante (Wirkung)──▶ Variable
Variable ──gehört zu──▶ Thema/Domäne
Akteur (Staat, Konzern) ──beeinflusst──▶ Variable (Hebel)
```

**Entitäten:**

| Entität | Wichtige Felder |
|---|---|
| `Variable` (Knoten) | id, label, domain, Beschreibung, Einheit/Indikator (z. B. „Handelsüberschuss in USD“) |
| `Kante` (Wirkung) | von, nach, Polarität (+ gleichgerichtet / − gegengerichtet), Verzögerung, Stärke, Konfidenz, Aussage-IDs |
| `Aussage` | id, Text, Quelle, Bewertung, Begründung |
| `Quelle` | Person, Rolle, Werk oder Beitrag, Datum |
| `Hebel` | Variable, die ein Akteur direkt verändern kann |

Wichtig: Knoten sind **Größen, die steigen oder fallen können** („Chinesischer Exportüberschuss“),
keine Themen („China“). Nur so lassen sich Wirkungen und später Simulationen sauber formulieren.

## 4. Visualisierung: Causal Loop Diagram (System Dynamics)

- Die Methode stammt aus dem Systemdenken (Forrester, Meadows: *Die Grenzen des Wachstums*).
- Pfeile mit **+** (mehr A → mehr B) oder **−** (mehr A → weniger B).
- **Rückkopplungsschleifen** werden benannt: **R** = verstärkend (Teufels- oder Engelskreis), **B** = ausgleichend.
- Werkzeuge:
  - jetzt Mermaid in Markdown
  - für die Website später Cytoscape.js oder D3 (Force-Graph mit Filtern)
  - ohne Programmieren ginge Kumu.io

## 5. Hebel und Simulation

- **Hebel finden:** Meadows' „12 Leverage Points“ als Raster. Schwach wirken Parameter wie Zollsätze,
  stark wirken Rückkopplungen, Regeln und Ziele eines Systems.
- **Simulation:** **Fuzzy Cognitive Map (FCM)**. Jede Kante bekommt ein Gewicht zwischen −1 und +1.
  Man setzt einen Hebel („Ausgleichszölle hoch“) und lässt das Netz einschwingen.
  - Vorteil: Das funktioniert mit qualitativem Wissen ohne harte Daten, also mit Thesen und Einordnungen, für die es keine vollständigen Messreihen gibt.
  - Grenze: Das Ergebnis zeigt **Richtungen und Zielkonflikte**, keine Prognosen in Zahlen. Das wird auf der Website klar gekennzeichnet.
- Ein echtes Bestands-Fluss-Modell (System Dynamics mit Daten) wäre ein späterer Ausbau für einzelne Teilsysteme.

## 6. Zeitdimension

Das Wirkungsnetz allein zeigt, **wie** etwas zusammenhängt. Die Zeitachse zeigt, **wann** und **wie es dazu kam**.
Abgebildet werden drei Zeitebenen (Daten in `data/timeline.json`):

| Ebene | Inhalt | Beispiel |
|---|---|---|
| **Ereignisse** | datierte Auslöser, verknüpft mit den Größen, die sie verändert haben | Agenda 2010 (2003) → Binnennachfrage DE ↓ |
| **Zeitreihen** | Messwerte je Größe aus Primärquellen | Reallohnindex und Leistungsbilanz DE 1995–2025 |
| **Zeitliche Gültigkeit von Wirkungen** | Wirkungen, die sich über die Zeit ändern oder umkehren | Einfluss der Oligarchen auf den Kreml: stark 1991–2003, danach schwach |

**Epochenvergleich:** Zwei Zeitfenster werden übereinandergelegt, z. B. 1900–1914 und 2008–heute. Dafür werden Ereignisse gleichen Typs nebeneinandergestellt: Wettrüsten, Zölle, Bündnisse, Krisenherde.
**Regel:** Wenn zwei Zeitreihen gleichzeitig steigen oder fallen, ist das eine Korrelation, kein Beweis für Kausalität.
Ein Zusammenhang gilt erst als belegt, wenn eine geprüfte Aussage (Claim-ID) ihn stützt. Die Oberfläche kennzeichnet das sichtbar.
