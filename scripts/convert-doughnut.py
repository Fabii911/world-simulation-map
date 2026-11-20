"""Wandelt die Zusatzdaten von Fanning u. a. (2022) in data/series/doughnut.json um.

Quelle: Fanning, A.L., O'Neill, D.W., Hickel, J., Roux, N. (2022): The social shortfall and ecological
overshoot of nations. Nature Sustainability 5, 26–36. Daten: https://goodlife.leeds.ac.uk/download-data/
Verwendet werden nur die historischen Beobachtungen (1992–2015), keine Projektionen.

Ausführen (benötigt openpyxl):
  python3 scripts/convert-doughnut.py PFAD/SocialShortfallAndEcologicalOvershoot_SupplementaryData.xlsx
"""
import json
import sys
from pathlib import Path

import openpyxl

src = Path(sys.argv[1])
wb = openpyxl.load_workbook(src, read_only=True, data_only=True)


def sheet(name):
    rows = list(wb[name].iter_rows(values_only=True))
    head, data = rows[0], rows[1:]
    labels = list(head[3:])
    out = {}
    for r in data:
        iso, year = r[1], r[2]
        if not iso or year is None:
            continue
        vals = [None if v is None else round(float(v), 3) for v in r[3:]]
        out.setdefault(iso, {})[int(year)] = vals
    return labels, out


bio_labels, bio = sheet("Biophysical_Historical")
soc_labels, soc = sheet("Social_Historical")
DE = {
    "CO2 Emissions": "CO₂-Emissionen", "Phosphorus": "Phosphor", "Nitrogen": "Stickstoff",
    "Land-System Change": "Landnutzungswandel", "Ecological Footprint": "Ökologischer Fußabdruck",
    "Material Footprint": "Materialfußabdruck", "Life Satisfaction": "Lebenszufriedenheit",
    "Life Expectancy": "Lebenserwartung", "Nutrition": "Ernährung", "Sanitation": "Sanitärversorgung",
    "Income Poverty": "Einkommen über Armutsgrenze", "Access to Energy": "Zugang zu Energie",
    "Education": "Bildung", "Social Support": "Soziale Unterstützung", "Democratic Quality": "Demokratische Qualität",
    "Equality": "Gleichheit", "Employment": "Beschäftigung",
}
out = {
    "meta": {
        "source": "Fanning, O'Neill, Hickel, Roux (2022), Nature Sustainability 5, 26–36",
        "url": "https://goodlife.leeds.ac.uk/download-data/",
        "note": "Normiert: Ökologie 1 = planetare Grenze pro Kopf (>1 = überschritten); Soziales 1 = Mindeststandard (<1 = verfehlt). Nur historische Werte 1992–2015.",
        "bio_labels": [DE.get(l, l) for l in bio_labels],
        "social_labels": [DE.get(l, l) for l in soc_labels],
    },
    "bio": bio,
    "social": soc,
}
dst = Path(__file__).resolve().parent.parent / "data" / "series" / "doughnut.json"
dst.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
print(f"✓ {len(bio)} Länder (Ökologie), {len(soc)} Länder (Soziales) → {dst}")
