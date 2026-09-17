#!/usr/bin/env python3
"""Concatena las partes del cliente en un único index.html autocontenido."""
import pathlib

SRC = pathlib.Path("/home/user/piedra-papel-tijeras/src")
OUT = pathlib.Path("/home/user/piedra-papel-tijeras/index.html")

head = (SRC / "body.html").read_text(encoding="utf-8")
css = (SRC / "style.css").read_text(encoding="utf-8")
js = (SRC / "game.js").read_text(encoding="utf-8")

assert "/*__CSS__*/" in head and "/*__JS__*/" in head
html = head.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
OUT.write_text(html, encoding="utf-8")
print(f"OK -> {OUT} ({len(html)/1024:.1f} KB)")
