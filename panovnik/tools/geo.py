#!/usr/bin/env python3
"""Připraví zeměpisné podklady mapy do src/js/11a-geo.js.

Zdroje (obojí volně šiřitelné):
  * Natural Earth 1 : 10 000 000 – pevnina, drobné ostrovy, jezera, řeky (github.com/nvkelso/natural-earth-vector, geojson)
  * výškový model Terrarium (Mapzen/AWS Terrain Tiles, z dat SRTM, GMTED2010 aj.), dlaždice úrovně 6

Použití: python3 tools/geo.py <složka s geojson> <dlaždice úrovně 6 pro hlavní mapu> <dlaždice úrovně 4 pro mapu světa>
"""
import base64, json, math, os, re, sys
import numpy as np
from PIL import Image

NE, TILES = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "js", "11a-geo.js")
# mapa hry: x = (lon - 6.6) * 38, y = (55.1 - lat) * 60, plocha 720 × 570; podklad přesahuje o 40 jednotek
LON0, LAT1, KX, KY, MW, MH, PAD, CELL = 6.6, 55.1, 38.0, 60.0, 720, 570, 40, 2.5
BB = (LON0 - PAD / KX - 0.3, LAT1 - (MH + PAD) / KY - 0.3, LON0 + (MW + PAD) / KX + 0.3, LAT1 + PAD / KY + 0.3)  # lon0, lat0, lon1, lat1


def load(name):
    with open(os.path.join(NE, name + ".geojson"), encoding="utf-8") as f:
        return json.load(f)["features"]


def clip_poly(ring):
    """Sutherland–Hodgman: ořízne mnohoúhelník obdélníkem BB."""
    def cut(pts, inside, inter):
        out = []
        for i, p in enumerate(pts):
            q = pts[i - 1]
            if inside(p):
                if not inside(q): out.append(inter(q, p))
                out.append(p)
            elif inside(q): out.append(inter(q, p))
        return out
    def ix(x):
        return lambda a, b: (x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]))
    def iy(y):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y)
    pts = [tuple(p[:2]) for p in ring]
    for inside, inter in ((lambda p: p[0] >= BB[0], ix(BB[0])), (lambda p: p[0] <= BB[2], ix(BB[2])), (lambda p: p[1] >= BB[1], iy(BB[1])), (lambda p: p[1] <= BB[3], iy(BB[3]))):
        if not pts: break
        pts = cut(pts, inside, inter)
    return pts


def simplify(pts, tol):
    """Douglas–Peucker."""
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop(); ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; l2 = dx * dx + dy * dy; best, bi = 0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) if l2 else 0
            d = (px - ax - dx * t) ** 2 + (py - ay - dy * t) ** 2
            if d > best: best, bi = d, i
        if best > tol * tol: keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]


def polys(feats):
    for f in feats:
        g = f["geometry"]
        if not g: continue
        for poly in ([g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]):
            yield f["properties"], poly[0]


def flat(pts):
    return [v for p in pts for v in (round(p[0], 3), round(p[1], 3))]


def area(pts):
    return abs(sum(pts[i - 1][0] * p[1] - p[0] * pts[i - 1][1] for i, p in enumerate(pts))) / 2

# ---------- pevnina ----------
land = []
for name in ("ne_10m_land", "ne_10m_minor_islands"):
    for _, ring in polys(load(name)):
        xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
        if max(xs) < BB[0] or min(xs) > BB[2] or max(ys) < BB[1] or min(ys) > BB[3]: continue
        c = clip_poly(ring)
        if len(c) >= 3 and area(c) > 2e-4:
            s = simplify(c + [c[0]], 0.006)[:-1]
            if len(s) >= 3: land.append(flat(s))
land.sort(key=len, reverse=True)

# ---------- jezera ----------
lakes, seen = [], set()
for name in ("ne_10m_lakes", "ne_10m_lakes_europe"):
    for pr, ring in polys(load(name)):
        xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
        cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
        if not (BB[0] < cx < BB[2] and BB[1] < cy < BB[3]) or area(ring) < 0.004: continue
        # jen přirozená jezera a zálivy: přehrady a poldry 19.–20. století (Kaunas, IJsselmeer, Lauwersmeer, bezejmenné nádrže) ve 13. století nebyly
        if not pr.get("name") or pr.get("name") in ("Kauno marios", "IJsselmeer", "Lauwerszee") or "Reservoir" in (pr.get("featurecla") or ""): continue
        key = (round(cx, 1), round(cy, 1))
        if key in seen: continue
        seen.add(key)
        s = simplify([tuple(p[:2]) for p in ring], 0.004)
        lakes.append([pr.get("name") or "", flat(s)])

# ---------- řeky ----------
CZ = {"Donau": "Dunaj", "Danube": "Dunaj", "Elbe": "Labe", "Oder": "Odra", "Vistula": "Visla", "Wisła": "Visla", "Rhine": "Rýn", "Rhein": "Rýn", "Main": "Mohan", "Vltava": "Vltava", "Moldau": "Vltava", "Morava": "Morava", "Tisza": "Tisa",
      "Drava": "Dráva", "Drau": "Dráva", "Sava": "Sáva", "Inn": "Inn", "Warta": "Varta", "Váh": "Váh", "Vah": "Váh", "Mur": "Mura", "Mura": "Mura", "Saale": "Sála", "Weser": "Vezera", "Neckar": "Neckar", "Bug": "Bug", "San": "San",
      "Havel": "Havola", "Spree": "Spréva", "Enns": "Enže", "Salzach": "Salice", "Isar": "Isar", "Lech": "Lech", "Raab": "Rába", "Rába": "Rába", "Thaya": "Dyje", "Dyje": "Dyje", "Hron": "Hron", "Dniester": "Dněstr", "Prut": "Prut",
      "Mureş": "Maruše", "Mures": "Maruše", "Someş": "Samoš", "Olt": "Olt", "Neisse": "Nisa", "Nysa Łużycka": "Nisa", "Aare": "Aara", "Po": "Pád", "Adige": "Adiže", "Narew": "Narew", "Noteć": "Notec", "Pregolya": "Pregola", "Neman": "Němen",
      "Körös": "Kriš", "Crişul Alb": "Kriš", "Kupa": "Kupa", "Una": "Una", "Tagliamento": "Tagliamento", "Piave": "Piava", "Leitha": "Litava", "March": "Morava", "Regen": "Řezná", "Naab": "Nába", "Altmühl": "Altmühl", "Eger": "Ohře", "Ohře": "Ohře",
      "Berounka": "Berounka", "Sázava": "Sázava", "Svratka": "Svratka", "Mosel": "Mosela", "Lahn": "Lahn", "Werra": "Werra", "Fulda": "Fulda", "Aller": "Aller", "Leine": "Leine", "Peene": "Pěna", "Pilica": "Pilica", "Nida": "Nida", "Dunajec": "Dunajec",
      "Wieprz": "Vepř", "Hornád": "Hornád", "Sajó": "Slaná", "Zala": "Zala", "Sió": "Sió", "Ipel'": "Ipeľ", "Bodrog": "Bodrog", "Tirza": "Tisa", "Ems": "Emže", "Unstrut": "Unstruta", "Mulde": "Mulda", "Bóbr": "Bobr", "Rega": "Rega", "Brda": "Brda",
      "Drwęca": "Drwęca", "Iller": "Iller", "Traun": "Traun", "Kamp": "Kamp", "Ybbs": "Ybbs", "Gail": "Gail", "Savinja": "Savinja", "Krka": "Krka", "Bosna": "Bosna", "Vrbas": "Vrbas", "Drina": "Drina", "Timiş": "Temeš", "Bega": "Bega", "Tisa": "Tisa"}
rivers = []
for name in ("ne_10m_rivers_lake_centerlines", "ne_10m_rivers_europe"):
    for f in load(name):
        g, pr = f["geometry"], f["properties"]
        if not g: continue
        rank = pr.get("scalerank") or 10
        if "Canal" in (pr.get("featurecla") or "") or re.search("Csatorna|Kanal|Canal", pr.get("name") or ""): continue  # umělé kanály jsou novodobé
        for line in ([g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]):
            run = []
            for p in line + [None]:
                if p is not None and BB[0] <= p[0] <= BB[2] and BB[1] <= p[1] <= BB[3]: run.append((p[0], p[1])); continue
                if len(run) >= 2:
                    s = simplify(run, 0.006)
                    n = pr.get("name") or ""
                    rivers.append([CZ.get(n, n), int(rank), flat(s)])
                run = []
rivers.sort(key=lambda r: (r[1], r[0]))
LAKE_CZ = {"Lake Geneva": "Ženevské jezero", "Bodensee": "Bodamské jezero", "Lake Balaton": "Blatenské jezero", "Neusiedlersee": "Neziderské jezero", "CHIEMSEE": "Chiemsee", "Zalew Wislany": "Viselský záliv", "Kaliningradskiy Zaliv": "Viselský záliv", "Jezioro Dąbie": "Dąbie"}
for l in lakes: l[0] = LAKE_CZ.get(l[0], l[0])

# ---------- výšky ----------
Z = 6; xs = sorted({int(f.split("_")[1]) for f in os.listdir(TILES) if f.endswith(".png")}); ys = sorted({int(f.split("_")[2].split(".")[0]) for f in os.listdir(TILES) if f.endswith(".png")})
mos = np.zeros((len(ys) * 256, len(xs) * 256), dtype=np.float32)
for i, x in enumerate(xs):
    for j, y in enumerate(ys):
        a = np.asarray(Image.open(os.path.join(TILES, f"t_{x}_{y}.png")).convert("RGB"), dtype=np.float32)
        mos[j * 256:(j + 1) * 256, i * 256:(i + 1) * 256] = a[:, :, 0] * 256 + a[:, :, 1] + a[:, :, 2] / 256 - 32768
GW, GH = int((MW + 2 * PAD) / CELL), int((MH + 2 * PAD) / CELL)
SUB = 3; grid = np.zeros((GH, GW), dtype=np.float32)
for gy in range(GH):
    for gx in range(GW):
        acc = 0.0
        for sy in range(SUB):
            for sx in range(SUB):
                lon = LON0 + (-PAD + (gx + (sx + 0.5) / SUB) * CELL) / KX; lat = LAT1 - (-PAD + (gy + (sy + 0.5) / SUB) * CELL) / KY
                tx = (lon + 180) / 360 * 2 ** Z; ty = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2 ** Z
                px = min(mos.shape[1] - 1, max(0, int((tx - xs[0]) * 256))); py = min(mos.shape[0] - 1, max(0, int((ty - ys[0]) * 256)))
                acc += mos[py, px]
        grid[gy, gx] = acc / SUB / SUB
EMAX = 4000.0
enc = np.clip(np.sqrt(np.clip(grid, 0, EMAX) / EMAX) * 255 + 0.5, 0, 255).astype(np.uint8)
b64 = base64.b64encode(enc.tobytes()).decode()

js = f"""// Zeměpisné podklady mapy. Soubor vytváří tools/geo.py – neupravovat ručně.
// Pobřeží, ostrovy, jezera a řeky: Natural Earth 1 : 10 000 000 (volné dílo), zjednodušeno na ≈ 0,006°.
// Výšky: model Terrarium (Mapzen / AWS Terrain Tiles; z dat SRTM a GMTED2010), síť {GW} × {GH} bodů po {CELL} jednotky mapy (asi 4,7 km).
// Je to dnešní pobřeží a dnešní toky řek: ve 13. století se místy lišily (ústí Visly, pobřeží Fríska, neregulované řeky).
const GEO = {{ pad: {PAD}, cell: {CELL}, gw: {GW}, gh: {GH}, emax: {int(EMAX)},
  land: {json.dumps(land, separators=(",", ":"))},
  lakes: {json.dumps(lakes, ensure_ascii=False, separators=(",", ":"))},
  rivers: {json.dumps(rivers, ensure_ascii=False, separators=(",", ":"))},
  elev: "{b64}" }};
"""
# ---------- mapa známého světa (výpravy): x = (lon + 12) * 10, y = (63 - lat) * 10.9, plocha 640 × 360 ----------
WK = (10.0, 10.9, -12.0, 63.0, 640, 360, 2.5)
BB = (-12.5, 63 - 360 / 10.9 - 0.5, 52.5, 63.5)
wland, wholes = [], []
for f in load("ne_50m_land"):
    g = f["geometry"]
    for poly in ([g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]):
        for ri, ring in enumerate(poly):
            xs_ = [q[0] for q in ring]; ys_ = [q[1] for q in ring]
            if max(xs_) < BB[0] or min(xs_) > BB[2] or max(ys_) < BB[1] or min(ys_) > BB[3]: continue
            c = clip_poly(ring)
            if len(c) >= 3 and area(c) > 0.02:
                sm = simplify(c + [c[0]], 0.04)[:-1]
                if len(sm) >= 3: (wholes if ri else wland).append([v for q in sm for v in (round(q[0], 2), round(q[1], 2))])
wriv = []
for f in load("ne_50m_rivers_lake_centerlines"):
    g, pr = f["geometry"], f["properties"]
    if not g or (pr.get("scalerank") or 9) > 6: continue
    for line in ([g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]):
        run = []
        for q in line + [None]:
            if q is not None and BB[0] <= q[0] <= BB[2] and BB[1] <= q[1] <= BB[3]: run.append((q[0], q[1])); continue
            if len(run) >= 2: wriv.append([v for t in simplify(run, 0.05) for v in (round(t[0], 2), round(t[1], 2))])
            run = []
T4 = sys.argv[3]; Z4 = 4
xs4 = sorted({int(f.split("_")[1]) for f in os.listdir(T4) if f.endswith(".png")}); ys4 = sorted({int(f.split("_")[2].split(".")[0]) for f in os.listdir(T4) if f.endswith(".png")})
mos4 = np.zeros((len(ys4) * 256, len(xs4) * 256), dtype=np.float32)
for i, x in enumerate(xs4):
    for j, y in enumerate(ys4):
        a = np.asarray(Image.open(os.path.join(T4, f"t_{x}_{y}.png")).convert("RGB"), dtype=np.float32)
        mos4[j * 256:(j + 1) * 256, i * 256:(i + 1) * 256] = a[:, :, 0] * 256 + a[:, :, 1] + a[:, :, 2] / 256 - 32768
WGW, WGH = int(WK[4] / WK[6]), int(WK[5] / WK[6]); wgrid = np.zeros((WGH, WGW), dtype=np.float32)
for gy in range(WGH):
    for gx in range(WGW):
        lon = WK[2] + (gx + 0.5) * WK[6] / WK[0]; lat = WK[3] - (gy + 0.5) * WK[6] / WK[1]
        tx = (lon + 180) / 360 * 2 ** Z4; ty = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2 ** Z4
        px = min(mos4.shape[1] - 1, max(0, int((tx - xs4[0]) * 256))); py = min(mos4.shape[0] - 1, max(0, int((ty - ys4[0]) * 256)))
        wgrid[gy, gx] = mos4[py, px]
wenc = np.clip(np.sqrt(np.clip(wgrid, 0, EMAX) / EMAX) * 255 + 0.5, 0, 255).astype(np.uint8)
js += f"""// Mapa známého světa pro výpravy: pobřeží a řeky Natural Earth 1 : 50 000 000, výšky Terrarium, síť {WGW} × {WGH} bodů.
const GEOW = {{ pad: 0, cell: {WK[6]}, gw: {WGW}, gh: {WGH}, emax: {int(EMAX)},
  land: {json.dumps(wland, separators=(",", ":"))},
  lakes: {json.dumps([["", h] for h in wholes], separators=(",", ":"))},
  rivers: {json.dumps(wriv, separators=(",", ":"))},
  elev: "{base64.b64encode(wenc.tobytes()).decode()}" }};
"""
print("world: land", len(wland), sum(len(l) for l in wland) // 2, "holes", len(wholes), "rivers", len(wriv), sum(len(l) for l in wriv) // 2)
with open(OUT, "w", encoding="utf-8") as f: f.write(js)
print("land polys", len(land), "pts", sum(len(l) for l in land) // 2, "| lakes", len(lakes), "| rivers", len(rivers), "pts", sum(len(r[2]) for r in rivers) // 2, "| elev", GW, GH, "max", float(grid.max()), "| bytes", len(js))
print("river names:", sorted({r[0] for r in rivers if r[0]}))
print("lakes:", [l[0] for l in lakes])
