#!/usr/bin/env python3
"""Sestaví hru Pán Obou zemí ze zdrojů do jednoho souboru dist/index.html (ten se publikuje i hraje offline)."""
import base64, glob, os, sys
ROOT = os.path.dirname(os.path.abspath(__file__))

def build(out=os.path.join(ROOT, "dist", "index.html")):
    page = open(os.path.join(ROOT, "src", "page.html"), encoding="utf-8").read()
    css = open(os.path.join(ROOT, "src", "styles.css"), encoding="utf-8").read()
    js = "\n".join(open(f, encoding="utf-8").read() for f in sorted(glob.glob(os.path.join(ROOT, "src", "js", "*.js"))))
    font = base64.b64encode(open(os.path.join(ROOT, "src", "fonts", "hieroglyfy.woff2"), "rb").read()).decode()
    css = css.replace("url(fonts/hieroglyfy.woff2)", "url(data:font/woff2;base64," + font + ")")
    html = page.replace("<!-- STYLY -->", "<style>\n" + css + "</style>").replace("<!-- SKRIPTY -->", '<script>\n"use strict";\n' + js + "\n</script>")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html)
    return out

if __name__ == "__main__":
    print(build(*sys.argv[1:]))
