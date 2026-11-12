#!/usr/bin/env python3
"""Vloží písma do src/fonts.css jako data URI, aby hra zůstala jedním souborem.

Písma (licence SIL Open Font License 1.1, Google Fonts):
  * Almendra (Ana Sanfelippo) – kaligrafické písmo podle středověké bastardy a kancelářských rukopisů; nadpisy a popisky mapy
  * Uncial Antiqua (Astigmatic) – unciála pro iniciály a název hry
Použití: python3 tools/fonts.py <css z fonts.googleapis.com> ; soubory woff2 stáhne samo.
"""
import base64, os, re, sys, urllib.request
css = open(sys.argv[1], encoding="utf-8").read()
out = ["/* Vytváří tools/fonts.py – neupravovat ručně. Almendra a Uncial Antiqua, licence SIL OFL 1.1. */"]
for m in re.finditer(r"/\* ([\w-]+) \*/\s*@font-face \{(.*?)\}", css, re.S):
    sub, body = m.group(1), m.group(2)
    if sub not in ("latin", "latin-ext"): continue
    url = re.search(r"url\((https[^)]+)\)", body).group(1)
    data = urllib.request.urlopen(url, timeout=60).read()
    fam = re.search(r"font-family: '([^']+)'", body).group(1); st = re.search(r"font-style: (\w+)", body).group(1); wt = re.search(r"font-weight: (\w+)", body).group(1); ur = re.search(r"unicode-range: ([^;]+);", body).group(1)
    out.append(f'@font-face {{ font-family: "{fam}"; font-style: {st}; font-weight: {wt}; font-display: swap; src: url(data:font/woff2;base64,{base64.b64encode(data).decode()}) format("woff2"); unicode-range: {ur}; }}')
    print(fam, st, wt, sub, len(data))
open(os.path.join(os.path.dirname(__file__), "..", "src", "fonts.css"), "w", encoding="utf-8").write("\n".join(out) + "\n")
