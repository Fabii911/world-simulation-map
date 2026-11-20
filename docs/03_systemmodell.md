# 03 – Systemmodell (Version 0.1)

Ein Wirkungsnetz (Causal Loop Diagram). Die vollständige Liste der Knoten und Kanten steht in `data/model.json`.
Legende: `+` = gleichgerichtet (mehr A → mehr B), `−` = gegengerichtet (mehr A → weniger B), `‖` = mit Verzögerung.

## 1. Vier übergreifende Mechanismen

| Mechanismus | Wo er wirkt |
|---|---|
| **M1 Ungleichgewicht Produktion/Nachfrage** | China (Überkapazität), Russland (Kriegskeynesianismus), Deutschland (Exportüberschuss) |
| **M2 Abhängigkeit als Waffe** | Russland-Gas, China-Rohstoffe, Nahrungs- und Düngerimporte |
| **M3 Machtkonzentration** | Konzerne und Plattformen gegenüber staatlicher Steuerungsfähigkeit |
| **M4 Wachstumszwang gegen planetare Grenzen** | Monokulturen, Biodiversität, Zielkonflikte beim Klimaschutz |

## 2. Rückkopplungsschleifen

- **R1 Kriegswirtschafts-Falle (RU):**
  Militärausgaben ↑ → Abhängigkeit der Wirtschaft vom Krieg ↑ → Kosten eines Friedens ↑ → Militärausgaben ↑
- **B1 Abschreckung:**
  Russische Aggression ↑ → EU-Verteidigung ↑ ‖ → Abschreckung ↑ → Aggression ↓
- **R2 Sicherheitsdilemma:**
  EU-Verteidigung ↑ → wahrgenommene Bedrohung in RU ↑ → russische Militärausgaben ↑ → Aggressionsfähigkeit ↑ → EU-Verteidigung ↑
- **R3 Überkapazitäts-Spirale (CN):**
  Schwache soziale Sicherung → Vorsorgesparen ↑ → Konsum ↓ → Überkapazität ↑ → Deflation und Arbeitsplatzrisiko ↑
  → der Staat stützt mit mehr Investition und Subvention ↑ → Überkapazität ↑
- **R4 Handelskonflikt:**
  CN-Exportüberschuss ↑ → Druck auf EU-Industrie ↑ → Handelsschutz ↑ → Absatzproblem CN ↑ → Exportdruck auf Drittmärkte ↑
  - Zusatz: Handelsschutz ↑ → chinesische Rohstoff-Vergeltung ↑ → EU-Industrie ↓
- **R5 Konzentration:**
  Marktmacht ↑ → Gewinne ↑ → Übernahmen ↑ → Marktmacht ↑
- **R6 Regulierungserosion:**
  Plattformmacht ↑ → Lobbyeinfluss ↑ → staatliche Steuerungsfähigkeit ↓ → Regulierung ↓ → Plattformmacht ↑
- **R7 Deindustrialisierung und Populismus:**
  EU-Industrie ↓ → Abstiegsangst ↑ → nationalistische Politik ↑ → EU-Integration ↓ → Verhandlungsmacht gegenüber CN/US ↓ → EU-Industrie ↓
- **R8 Ökologische Verwundbarkeit:**
  Wachstumsdruck ↑ → intensive Landnutzung und Monokultur ↑ → Biodiversität ↓ → Resilienz der Ökosysteme ↓
  → Ernteausfälle ↑ → Ertragsdruck ↑ → intensive Landnutzung ↑
- **Zielkonflikt Z1 (kein Kreis):**
  Klimaschutz ↑ (Kohleausstieg) → Grundwasser-Abpumpung ↓ → Wasserführung der Spree ↓ → regionale Dürre/Biodiversität ↓

## 3. Diagramm (Ausschnitt)

```mermaid
flowchart LR
  subgraph RU[Russland]
    RU_IDEO[Imperiale Ideologie / Regimesicherung]
    RU_MIL[Russ. Militärausgaben]
    RU_DEP[Abhängigkeit vom Krieg]
    RU_CIV[Russ. Zivilwirtschaft]
    RU_AGG[Aggressionsrisiko]
  end
  subgraph EU[Europa / Deutschland]
    EU_DEF[EU-Verteidigung]
    EU_DET[Abschreckung]
    EU_IND[Industrielle Basis]
    EU_TD[Handelsschutz]
    EU_DR[De-Risking]
    EU_INT[EU-Integration]
    NAT[Nationalistische Politik]
    DE_SUR[DE-Exportüberschuss]
  end
  subgraph CN[China]
    CN_SOC[Soziale Sicherung]
    CN_CON[Privatkonsum]
    CN_SUB[Investition / Subvention]
    CN_OVR[Überkapazität]
    CN_EXP[Exportüberschuss]
    CN_DEF[Deflation / Arbeitslosigkeit]
    CN_RAW[Rohstoff-Hebel]
  end
  subgraph MA[Marktmacht]
    CONC[Marktkonzentration]
    PLAT[Plattformmacht]
    STATE[Staatl. Steuerungsfähigkeit]
  end
  subgraph ECO[Ökologie]
    GROW[Wachstumsdruck]
    LAND[Intensive Landnutzung / Monokultur]
    BIO[Biodiversität]
    RES[Resilienz / Ernährungssicherheit]
    CLIM[Klimaschutz: Kohleausstieg]
    WAT[Wasserhaushalt Spree]
  end
  INTER[Einseitige Abhängigkeiten]

  RU_IDEO -->|+| RU_AGG
  RU_AGG -->|+| RU_MIL
  RU_MIL -->|+| RU_DEP
  RU_DEP -->|+| RU_MIL
  RU_MIL -->|−| RU_CIV
  RU_DEP -->|+| RU_AGG
  RU_AGG -->|+| EU_DEF
  EU_DEF -->|+ ‖| EU_DET
  EU_DET -->|−| RU_AGG
  EU_DEF -->|+| RU_MIL

  CN_SOC -->|+| CN_CON
  CN_CON -->|−| CN_OVR
  CN_SUB -->|+| CN_OVR
  CN_OVR -->|+| CN_EXP
  CN_OVR -->|+| CN_DEF
  CN_DEF -->|+| CN_SUB
  CN_EXP -->|−| EU_IND
  EU_IND -->|−| EU_TD
  EU_TD -->|+| CN_RAW
  CN_RAW -->|−| EU_IND
  EU_DR -->|−| INTER
  CN_RAW -->|+| INTER

  CONC -->|+| CONC
  CONC -->|+| PLAT
  PLAT -->|−| STATE
  STATE -->|−| PLAT
  STATE -->|−| CONC

  EU_IND -->|−| NAT
  NAT -->|−| EU_INT
  EU_INT -->|+| EU_TD
  EU_INT -->|+| EU_DR
  EU_INT -->|+| STATE
  DE_SUR -->|+| INTER

  GROW -->|+| LAND
  GROW -->|+| CONC
  LAND -->|−| BIO
  BIO -->|+| RES
  RES -->|− ‖| LAND
  CLIM -->|−| WAT
  WAT -->|+| BIO
  INTER -->|−| RES
```

## 4. Erste Hebel-Kandidaten (eingeordnet nach Meadows)

Meadows ordnet zwölf Hebelpunkte nach Wirkstärke. Die Nummer zeigt die Stufe: Je kleiner die Nummer, desto stärker der Hebel.

| Hebel | Akteur | Meadows-Stufe | Wirkt auf | Erwarteter Zielkonflikt |
|---|---|---|---|---|
| Verteidigungsausgaben | EU/DE | 12 Parameter (schwach) | B1 ↑, aber R2 ↑ | Haushalt, Wettrüsten |
| Ausgleichszölle / FSR | EU | 12 Parameter | EU-Industrie ↑ | Vergeltung (CN_RAW), Preise, langsamere Energiewende |
| De-Risking (Rohstoffe, Recycling, Reserven) | EU/Firmen | 10 Struktur (Bestände, Flüsse) | einseitige Abhängigkeit ↓ | Kosten, Zeit (5–15 J.) |
| Binnennachfrage DE (Löhne, Investitionen) | DE | 8 Rückkopplung | DE-Überschuss ↓ | Wettbewerbsfähigkeit |
| Soziale Sicherung in CN | CN (nur indirekt beeinflussbar) | 7 verstärkende Schleife brechen (R3) | Konsum ↑, Überkapazität ↓ | Übergangsarbeitslosigkeit |
| Fusionskontrolle / DMA | EU | 5 Regeln | R5/R6 ↓ | Draghi: Skalierung |
| EU-Integrationstiefe | EU-Staaten | 5 Regeln / 4 Selbstorganisation | Verhandlungsmacht ↑ | Souveränitätsfragen, R7 |
| Agrarpolitik: Vielfalt statt Menge | EU (GAP) | 3 Ziele | Biodiversität ↑, Resilienz ↑ | kurzfristig Ertrag ↓ |
| Wachstumsziel infrage stellen | Gesellschaft | 2 Paradigma (sehr stark) | M4 insgesamt | Hochgradig umstritten (KO-02) |

## 5. Bekannte Lücken im Modell

Diese Faktoren fehlen in den Ausgangsthesen, sind für das Gesamtbild aber entscheidend:
- **USA:** Zölle ab 2025, Unsicherheit über die Verlässlichkeit in der NATO, Tech-Macht
- **Energiepreise** als Standortfaktor
- **Klimawandel** selbst als Treiber (Dürren, Ernten, Migration)
- **Demografie:** Alterung in CN, DE und RU
- **Staatsverschuldung und Zinsen:** Spielraum für Rüstung und Investitionen
- **Globaler Süden:** Indien, Golfstaaten, BRICS als Ausweichmärkte und Rohstofflieferanten
- **Technologie/KI** als neuer Knotenpunkt für Abhängigkeit und Macht
