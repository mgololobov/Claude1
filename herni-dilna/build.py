#!/usr/bin/env python3
"""Sestaví Herní dílnu ze zdrojů do jednoho souboru dist/index.html (ten se publikuje)."""
import base64, glob, os, re, sys
ROOT = os.path.dirname(os.path.abspath(__file__))

def bundle_js():
    files = sorted(glob.glob(os.path.join(ROOT, "src", "js", "*.js")))
    return "\n".join(open(f, encoding="utf-8").read() for f in files)

def build(out=os.path.join(ROOT, "dist", "index.html")):
    page = open(os.path.join(ROOT, "src", "page.html"), encoding="utf-8").read()
    css = open(os.path.join(ROOT, "src", "styles.css"), encoding="utf-8").read()
    cards = open(os.path.join(ROOT, "src", "cards.css"), encoding="utf-8").read()
    # písma: soubory woff2 se vloží jako data, takže aplikace nepotřebuje internet
    fdir = os.path.join(ROOT, "src", "fonts")
    fcss = open(os.path.join(fdir, "fonts.css"), encoding="utf-8").read()
    fcss = re.sub(r"url\(fonts/([^)]+)\)", lambda m: "url(data:font/woff2;base64," + base64.b64encode(open(os.path.join(fdir, m.group(1)), "rb").read()).decode() + ")", fcss)
    page = page.replace("<!-- PISMA -->", '<style id="font-css">\n' + fcss + "</style>")
    vendor = "".join("<script>\n" + open(f, encoding="utf-8").read() + "\n</script>\n" for f in sorted(glob.glob(os.path.join(ROOT, "src", "vendor", "*.js"))))
    html = page.replace("<!-- STYLY -->", "<style>\n" + css + "</style>\n<style id=\"card-css\">\n" + cards + "</style>").replace("<!-- SKRIPTY -->", vendor + '<script>\n"use strict";\n' + bundle_js() + "</script>")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html)
    return out

if __name__ == "__main__":
    print(build(*sys.argv[1:]))
