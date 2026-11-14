"""Crea docs/plantilla.docx: estilos de Word para los documentos (pandoc --reference-doc).
Uso: pandoc -o base.docx --print-default-data-file reference.docx; python3 docs/plantilla-word.py base.docx docs/plantilla.docx
"""
import sys
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

base, salida = sys.argv[1], sys.argv[2]
d = Document(base)

TINTA = RGBColor(0x2B, 0x12, 0x14)
ROJO = RGBColor(0x9E, 0x1F, 0x27)
GRIS = RGBColor(0x6B, 0x4A, 0x4C)
FUENTE = "Calibri"


def fuente(estilo, tam=None, color=None, negrita=None):
    s = next(x for x in d.styles if x.name == estilo)
    f = s.font
    f.name = FUENTE
    rpr = s.element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(a), FUENTE)
    for a in ("w:asciiTheme", "w:hAnsiTheme", "w:cstheme", "w:eastAsiaTheme"):
        if rfonts.get(qn(a)) is not None:
            del rfonts.attrib[qn(a)]
    if tam:
        f.size = Pt(tam)
    if color is not None:
        f.color.rgb = color
    if negrita is not None:
        f.bold = negrita
    return s


for nombre in ("Normal", "Body Text", "First Paragraph", "Compact"):
    if nombre in [s.name for s in d.styles]:
        s = fuente(nombre, 11, TINTA)
        s.paragraph_format.space_after = Pt(6)
        s.paragraph_format.line_spacing = 1.15

fuente("Title", 28, TINTA, True)
fuente("Subtitle", 13, GRIS, False)
for n, tam, col in (("Heading 1", 20, TINTA), ("Heading 2", 15, ROJO), ("Heading 3", 12.5, TINTA)):
    s = fuente(n, tam, col, True)
    s.paragraph_format.space_before = Pt(18 if n == "Heading 1" else 14)
    s.paragraph_format.space_after = Pt(6)
    s.paragraph_format.keep_with_next = True
for n in ("Author", "Date"):
    if n in [s.name for s in d.styles]:
        fuente(n, 11, GRIS)
if "Block Text" in [s.name for s in d.styles]:
    fuente("Block Text", 10.5, GRIS)
if "Source Code" in [s.name for s in d.styles]:
    pass

# Márgenes
for sec in d.sections:
    sec.left_margin = sec.right_margin = Cm(2.2)
    sec.top_margin = sec.bottom_margin = Cm(2.0)

# Estilo de tabla "Table": bordes finos y encabezado sombreado
t = next(x for x in d.styles if x.name == "Table")
tblPr = t.element.find(qn("w:tblPr"))
if tblPr is None:
    tblPr = OxmlElement("w:tblPr")
    t.element.append(tblPr)
for tag in ("w:tblBorders", "w:tblCellMar", "w:shd", "w:tblLayout", "w:tblLook"):
    for old in tblPr.findall(qn(tag)):
        tblPr.remove(old)
for old in t.element.findall(qn("w:tblStylePr")):
    if old.get(qn("w:type")) == "firstRow":
        t.element.remove(old)
bordes = OxmlElement("w:tblBorders")
for lado in ("top", "left", "bottom", "right", "insideH", "insideV"):
    e = OxmlElement(f"w:{lado}")
    e.set(qn("w:val"), "single")
    e.set(qn("w:sz"), "4")
    e.set(qn("w:color"), "E3D3CF")
    bordes.append(e)
tblPr.append(bordes)
mar = OxmlElement("w:tblCellMar")
for lado, v in (("top", "60"), ("bottom", "60"), ("left", "100"), ("right", "100")):
    e = OxmlElement(f"w:{lado}")
    e.set(qn("w:w"), v)
    e.set(qn("w:type"), "dxa")
    mar.append(e)
tblPr.append(mar)
# Fuente más pequeña en tablas
rpr = t.element.get_or_add_rPr() if hasattr(t.element, "get_or_add_rPr") else None
t.font.size = Pt(9.5)
# Encabezado de tabla sombreado
cond = OxmlElement("w:tblStylePr")
cond.set(qn("w:type"), "firstRow")
tcpr = OxmlElement("w:tcPr")
shd = OxmlElement("w:shd")
shd.set(qn("w:val"), "clear")
shd.set(qn("w:color"), "auto")
shd.set(qn("w:fill"), "F6ECE8")
tcpr.append(shd)
rp = OxmlElement("w:rPr")
b = OxmlElement("w:b")
rp.append(b)
cond.append(rp)
cond.append(tcpr)
t.element.append(cond)

d.save(salida)
print("ok", salida)
