#!/usr/bin/env python3
"""Slovník hieroglyfických zápisů. Znaky se zadávají kódy Gardinerova seznamu a převádějí se na Unicode podle
oficiálních jmen znaků (EGYPTIAN HIEROGLYPH A001 …), takže kód nemůže ukázat na jiný znak.
Zápisy jsou běžné tvary ze slovníků střední egyptštiny (Gardiner, Faulkner); znaky jdou za sebou v řádku,
bez skládání do čtverců. Použití: python3 tools/gen_hg.py [cesta k úplnému písmu Noto Sans Egyptian Hieroglyphs]
– s cestou se znovu vyřízne src/fonts/hieroglyfy.woff2 jen na použité znaky."""
import json, os, re, sys, unicodedata, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def g(code):
    m = re.fullmatch(r"(Aa|[A-Z])(\d+)([A-Z]?)", code)
    name = "EGYPTIAN HIEROGLYPH %s%03d%s" % (m.group(1).upper(), int(m.group(2)), m.group(3))
    return unicodedata.lookup(name)

# klíč: (znaky, přepis, význam)
W = {
  # tituly a formule
  "pan": ("V30 N16 N16", "nb tꜣwj", "Pán Obou zemí"),
  "nswbjtj": ("M23 X1 L2 X1", "nswt-bjtj", "král Horního a Dolního Egypta"),
  "sara": ("G39 N5", "sꜣ Rꜥ", "syn Reův"),
  "anch": ("S34 U28 S29", "ꜥnḫ wḏꜣ snb", "živ, zdráv, silen"),
  "djanch": ("X8 S34 I10 X1 N16", "dj ꜥnḫ ḏt", "obdařený životem věčně"),
  "hetepdi": ("M23 X1 R4 X8", "ḥtp-dj-nswt", "oběť, kterou dává král"),
  "peraa": ("O1 O29", "pr-ꜥꜣ", "Velký dům, palác"),
  "tjaty": ("G47 X1", "ṯꜣty", "vezír"),
  "hatia": ("F4 D36", "ḥꜣty-ꜥ", "kníže, správce nomu"),
  "imira": ("F20", "jmj-r", "představený"),
  "general": ("F20 A12", "jmj-r mšꜥ", "představený vojska"),
  "sesh": ("Y3", "sš", "písař"),
  "pokladnik": ("F20 S19", "jmj-r ḫtmt", "představený zapečetěných věcí – pokladník"),
  "sypkar": ("F20 O51 O51", "jmj-r šnwty", "představený obou sýpek"),
  "veleknez": ("F20 R8 U36 Z2", "jmj-r ḥmw-nṯr", "představený kněží"),
  "hemnecer": ("R8 U36", "ḥm-nṯr", "kněz, „služebník boží“"),
  "heka": ("S38 N29 N25 X1 Z2", "ḥqꜣ ḫꜣswt", "vládce cizích zemí (odtud řecké Hyksós)"),
  # pojmy
  "maat": ("H6", "mꜣꜥt", "maat – řád a pravda (pero bohyně)"),
  "necer": ("R8", "nṯr", "bůh"),
  "sema": ("F36", "smꜣ", "sjednocení"),
  "sepat": ("N24", "spꜣt", "nom, kraj"),
  "sepaut": ("N24 Z2", "spꜣwt", "nomy"),
  "ta": ("N16", "tꜣ", "země"),
  "mesha": ("A12 Z2", "mšꜥ", "vojsko"),
  "aha": ("D34", "ꜥḥꜣ", "boj"),
  "hep": ("O4 Q3 Y1", "hp", "zákon"),
  "medzat": ("Y1 Z1", "mḏꜣt", "svitek, kniha"),
  "men": ("Y5", "mn", "hrací deska (znak mn)"),
  "shenut": ("O51", "šnwt", "sýpka"),
  "nebu": ("S12", "nbw", "zlato"),
  "perhedz": ("O1 T3", "pr-ḥḏ", "pokladnice, „dům stříbra“"),
  "shefit": ("F8", "šfyt", "vážnost, úcta"),
  "mu": ("N35A", "mw", "voda"),
  "hapi": ("V28 D36 Q3 Z4 N35A", "ḥꜥpj", "nilská záplava"),
  "hutnecer": ("R8 O6", "ḥwt-nṯr", "chrám, „dům boží“"),
  "niut": ("O49", "njwt", "město"),
  "per": ("O1", "pr", "dům"),
  "perankh": ("O1 S34", "pr-ꜥnḫ", "Dům života – chrámová písárna a škola"),
  "is": ("M40 O1", "js", "hrobka"),
  "menu": ("Y5 N35 W24 G43", "mnw", "památník, stavba"),
  "nefer": ("F35", "nfr", "dobrý, krásný"),
  # kalendář
  "hesbet": ("M4 O50", "ḥsbt", "rok vlády"),
  "renpet": ("M4", "rnpt", "rok (znak, jímž Palermská deska odděluje roky)"),
  "meh": ("D42", "mḥ", "loket (asi 52,4 cm)"),
  "wpwty": ("F13 Q3 X1 Z4 D54", "wpwty", "posel"),
  "abed": ("N11", "ꜣbd", "měsíc"),
  "achet": ("M8 Aa1 X1 N5", "ꜣḫt", "achet – období záplavy"),
  "peret": ("O1 D21 X1 N5", "prt", "peret – období setí"),
  "shemu": ("N37 N35A N5", "šmw", "šemu – období sklizně"),
  # země a místa
  "kemet": ("I6 G17 X1 O49", "kmt", "Kemet, „Černá země“ – Egypt"),
  "deshret": ("D46 N37 D21 X1 N25", "dšrt", "Dešret, „Červená země“ – poušť"),
  "tasti": ("N16 Aa32 X1 N25", "tꜣ-stj", "Ta-seti, „Země luku“ – Núbie"),
  "kash": ("V31 G1 N37 N25", "kꜣš", "Kuš"),
  "recenu": ("D21 V13 N35 W24 G43 N25", "rṯnw", "Recenu – Syropalestina"),
  "wadzwer": ("M13 G36 D21 N35A", "wꜣḏ-wr", "„Velká zeleň“ – moře (výklad není jednotný)"),
  "shemau": ("M26", "šmꜥw", "Horní Egypt"),
  "tamehu": ("N16 M15", "tꜣ-mḥw", "Dolní Egypt"),
  "waset": ("R19 X1 O49", "wꜣst", "Veset – Théby"),
  "mennefer": ("Y5 N35 F35 I9 D21 O24 O49", "mn-nfr", "Mennefer – Memfis"),
  "abdzu": ("U23 D58 N26 O49", "ꜣbḏw", "Abdžu – Abydos"),
  "iunu": ("O28 W24 O49", "jwnw", "Iunu – Héliopolis"),
  "abu": ("U23 D58 G43 E26 N25", "ꜣbw", "Abu – Elefantina"),
  "iunet": ("O28 N35 X1 O49", "jwnt", "Iunet – Dendera"),
  # bohové
  "g_montu": ("Y5 N35 V13 G43", "mnṯw", "Montu"),
  "g_amon": ("M17 Y5 N35", "jmn", "Amon"),
  "g_ptah": ("Q3 X1 V28", "ptḥ", "Ptah"),
  "g_re": ("D21 D36 N5", "rꜥ", "Re"),
  "g_usir": ("Q1 D4", "wsjr", "Usir"),
  "g_sobek": ("S29 D58 V31", "sbk", "Sobek"),
  "g_sutech": ("S29 X1 F32", "stẖ", "Sutech"),
  "g_herisef": ("D2 D21 N37 I9", "ḥrj-š.f", "Herišef, „Ten, který je na svém jezeře“"),
  "g_hor": ("G5", "ḥr", "Hor"),
  # královská jména (jen ta, jejichž zápis je dobře doložen)
  "k_intef": ("W25 N35 X1 I9", "jnj-jt.f", "Intef"),
  "k_cheti": ("F32 X1 M17 M17", "ẖty", "Cheti"),
  "k_neferkare": ("N5 F35 D28", "nfr-kꜣ-rꜥ", "Neferkare"),
  "k_merikare": ("N5 U6 M17 M17 D28", "mry-kꜣ-rꜥ", "Merikare"),
  "k_montuhotep": ("Y5 N35 V13 G43 R4 X1 Q3", "mnṯw-ḥtp", "Montuhotep"),
  "k_nebhepetre": ("N5 V30 P8", "nb-ḥpt-rꜥ", "Nebhepetre"),
  "k_sekenenre": ("N5 S29 N29 N35 N35", "sqnj.n-rꜥ", "Sekenenre"),
  "k_kamose": ("D28 F31 S29", "kꜣ-ms", "Kamose"),
  "k_ahmose": ("N12 F31 S29", "jꜥḥ-ms", "Ahmose"),
  "k_apopi": ("M17 Q3 Q3 M17", "jppj", "Apopi"),
  "k_dzehuti": ("G26 X1 Z4", "ḏḥwty", "Džehuti"),
  "k_senebkaj": ("S29 N35 D58 D28 M17 M17", "snb-kꜣy", "Senebkaj"),
}
out, info, chars = {}, {}, set()
for k, (codes, tr, cz) in W.items():
    s = "".join(g(c) for c in codes.split()); out[k] = s; info[k] = [tr, cz]; chars.update(s)
# číslovky: 1–9 (Z15…), desítky (V20…), stovky (V1…), tisíce (M12…)
NUM = {"1": "Z15", "10": "V20", "100": "V1", "1000": "M12"}
num = {}
for base, code in NUM.items():
    first = ord(g(code)); num[base] = first
    for i in range(9):
        ch = chr(first + i); nm = unicodedata.name(ch); assert nm.startswith("EGYPTIAN HIEROGLYPH " + code[0] + "%03d" % int(code[1:])), nm; chars.add(ch)
js = "// Vygenerováno skriptem tools/gen_hg.py – neupravovat ručně. Zápisy podle Gardinerova seznamu znaků.\n"
js += "Object.assign(HG, " + json.dumps(out, ensure_ascii=False) + ");\n"
js += "const HG_T = " + json.dumps(info, ensure_ascii=False) + ";\n"
js += "const HG_NUM = " + json.dumps(num) + ";\n"
open(os.path.join(ROOT, "src", "js", "12-lookb.js"), "w", encoding="utf-8").write(js)
for f in glob.glob(os.path.join(ROOT, "src", "js", "*.js")):
    chars.update(c for c in open(f, encoding="utf-8").read() if 0x13000 <= ord(c) <= 0x1342F)
print(len(W), "zápisů,", len(chars), "znaků")
if len(sys.argv) > 1:
    from fontTools import subset
    opt = subset.Options(); opt.flavor = "woff2"; opt.layout_features = []; opt.name_IDs = [1, 2]; opt.notdef_outline = True
    font = subset.load_font(sys.argv[1], opt); sub = subset.Subsetter(opt); sub.populate(unicodes=[ord(c) for c in chars]); sub.subset(font)
    dst = os.path.join(ROOT, "src", "fonts", "hieroglyfy.woff2"); subset.save_font(font, dst, opt); print("písmo:", os.path.getsize(dst), "B")
