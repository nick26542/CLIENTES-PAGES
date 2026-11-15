"""Arma docs/COIL-Gota-entrega-completa.zip con documentos, capturas, diagramas y código.
Uso: python3 docs/empaquetar.py
"""
import os
import zipfile

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP = os.path.join(BASE, "docs", "COIL-Gota-entrega-completa.zip")
CARPETAS = [
    ("docs/entregables", "1-Documentos (Word y PDF)"),
    ("docs/capturas", "2-Capturas del prototipo"),
    ("docs/diagramas", "3-Diagramas"),
]
CODIGO = ["index.html", "manifest.webmanifest", "css", "js", "fonts", "img", "README.md", "package.json", "tests"]
LEEME = """COIL - Plataforma de donacion de sangre (prototipo "Gota")

Demo en linea: https://gota-donacion.vercel.app

1-Documentos: Word editable y PDF de cada semana (S0 resumen y guion de demo, S1 a S4) + PDF consolidado.
2-Capturas: pantallas del prototipo en celular y escritorio.
3-Diagramas: arquitectura, navegacion, arbol de decision, modelo de datos, secuencia.
4-Codigo del prototipo: abrir con cualquier servidor estatico (por ejemplo: npx serve .).

Marcado [Completar]: datos del equipo. Marcado [Validar TSLB]: lo debe aprobar el equipo de salud.
"""

with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
    for src, dst in CARPETAS:
        raiz = os.path.join(BASE, src)
        for d, _, archivos in os.walk(raiz):
            for f in archivos:
                if f.endswith(".mjs"):
                    continue
                p = os.path.join(d, f)
                zf.write(p, os.path.join(dst, os.path.relpath(p, raiz)))
    for item in CODIGO:
        p = os.path.join(BASE, item)
        if os.path.isfile(p):
            zf.write(p, os.path.join("4-Codigo del prototipo", item))
            continue
        for d, _, archivos in os.walk(p):
            for f in archivos:
                fp = os.path.join(d, f)
                zf.write(fp, os.path.join("4-Codigo del prototipo", os.path.relpath(fp, BASE)))
    zf.writestr("LEEME.txt", LEEME)
print(ZIP, os.path.getsize(ZIP) // 1024, "KB")
