#!/usr/bin/env python3
"""Sestaví Herní dílnu ze zdrojů do jednoho souboru dist/index.html (ten se publikuje)."""
import glob, os, sys
ROOT = os.path.dirname(os.path.abspath(__file__))

def bundle_js():
    files = sorted(glob.glob(os.path.join(ROOT, "src", "js", "*.js")))
    return "\n".join(open(f, encoding="utf-8").read() for f in files)

def build(out=os.path.join(ROOT, "dist", "index.html")):
    page = open(os.path.join(ROOT, "src", "page.html"), encoding="utf-8").read()
    css = open(os.path.join(ROOT, "src", "styles.css"), encoding="utf-8").read()
    cards = open(os.path.join(ROOT, "src", "cards.css"), encoding="utf-8").read()
    html = page.replace("<!-- STYLY -->", "<style>\n" + css + "</style>\n<style id=\"card-css\">\n" + cards + "</style>").replace("<!-- SKRIPTY -->", '<script>\n"use strict";\n' + bundle_js() + "</script>")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html)
    return out

if __name__ == "__main__":
    print(build(*sys.argv[1:]))
