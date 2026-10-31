"""Busca negocios de Bogotá sin página web en OpenStreetMap (datos abiertos).

Solo incluye negocios de servicios a los que les sirve una página informativa
(no tiendas que necesitarían e-commerce) y que tengan un teléfono público.

Uso:
    python scripts/negocios_sin_web.py            # genera negocios_sin_web_bogota.csv
"""
import csv
import json
import sys

from scrapling.fetchers import Fetcher

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
SALIDA = "negocios_sin_web_bogota.csv"
SALIDA_TXT = "negocios_sin_web_bogota.txt"

# Categorías de servicios -> descripción en español.
CATEGORIAS = {
    "amenity": {
        "dentist": "Consultorio odontológico",
        "doctors": "Consultorio médico",
        "clinic": "Clínica / centro médico",
        "veterinary": "Veterinaria",
        "restaurant": "Restaurante",
        "cafe": "Café",
        "bar": "Bar",
        "fast_food": "Comidas rápidas",
        "driving_school": "Escuela de conducción",
        "language_school": "Academia de idiomas",
        "music_school": "Escuela de música",
        "kindergarten": "Jardín infantil",
        "car_wash": "Lavadero de carros",
        "events_venue": "Salón de eventos",
    },
    "shop": {
        "hairdresser": "Peluquería",
        "beauty": "Centro de estética / belleza",
        "massage": "Centro de masajes / spa",
        "tattoo": "Estudio de tatuajes",
        "laundry": "Lavandería",
        "dry_cleaning": "Lavandería en seco",
        "tailor": "Sastrería / arreglos de ropa",
        "optician": "Óptica",
        "car_repair": "Taller mecánico",
        "photo": "Estudio fotográfico",
        "travel_agency": "Agencia de viajes",
    },
    "office": {
        "lawyer": "Abogados",
        "accountant": "Contadores",
        "estate_agent": "Inmobiliaria",
        "insurance": "Seguros",
        "architect": "Arquitectos",
        "notary": "Notaría",
    },
    "leisure": {
        "fitness_centre": "Gimnasio",
        "dance": "Academia de baile",
    },
    "tourism": {
        "hotel": "Hotel",
        "guest_house": "Hostal / casa de huéspedes",
        "hostel": "Hostal",
    },
    "craft": {
        "carpenter": "Carpintería",
        "electrician": "Electricista",
        "plumber": "Plomero",
        "photographer": "Fotógrafo",
        "upholsterer": "Tapicería",
        "locksmith": "Cerrajería",
    },
}

SIN_WEB = '[!"website"][!"contact:website"][!"url"]'


def construir_consulta() -> str:
    partes = []
    for clave, valores in CATEGORIAS.items():
        regex = "|".join(valores)
        for tipo in ("node", "way"):
            for tel in ("phone", "contact:phone", "contact:mobile", "mobile"):
                partes.append(f'{tipo}["{clave}"~"^({regex})$"]["name"]["{tel}"]{SIN_WEB}(area.bog);')
    return (
        '[out:json][timeout:180];'
        'area["name"="Bogotá"]["boundary"="administrative"]["admin_level"~"^(4|6|7)$"]->.bog;'
        f'({"".join(partes)});out center tags;'
    )


def describir(tags: dict) -> str:
    for clave, valores in CATEGORIAS.items():
        if tags.get(clave) in valores:
            return valores[tags[clave]]
    return ""


def main() -> None:
    resp = Fetcher.post(OVERPASS_URL, data={"data": construir_consulta()}, timeout=240)
    if resp.status != 200:
        sys.exit(f"Error {resp.status} consultando OpenStreetMap")
    elementos = json.loads(resp.body)["elements"]

    filas, vistos = [], set()
    for el in elementos:
        t = el.get("tags", {})
        telefono = t.get("phone") or t.get("contact:phone") or t.get("contact:mobile") or t.get("mobile")
        clave = (t["name"].lower(), telefono)
        if clave in vistos:
            continue
        vistos.add(clave)
        direccion = " ".join(filter(None, [t.get("addr:street"), t.get("addr:housenumber")]))
        filas.append({
            "nombre": t["name"],
            "de_que_trata": describir(t),
            "telefono": telefono,
            "direccion": direccion,
            "barrio": t.get("addr:suburb") or t.get("addr:neighbourhood", ""),
            "instagram": t.get("contact:instagram") or t.get("instagram", ""),
            "facebook": t.get("contact:facebook") or t.get("facebook", ""),
            "mapa": f"https://www.openstreetmap.org/{el['type']}/{el['id']}",
        })

    filas.sort(key=lambda f: (f["de_que_trata"], f["nombre"]))
    with open(SALIDA, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]) if filas else ["nombre"])
        w.writeheader()
        w.writerows(filas)
    with open(SALIDA_TXT, "w", encoding="utf-8") as f:
        for i, n in enumerate(filas, 1):
            ubicacion = ", ".join(filter(None, [n["direccion"], n["barrio"]])) or "Sin dirección (ver mapa)"
            f.write(
                f"{i}. {n['nombre']}\n"
                f"   Categoría: {n['de_que_trata']}\n"
                f"   Teléfono: {n['telefono']}\n"
                f"   Instagram: {n['instagram'] or 'No registrado'}\n"
                f"   Ubicación: {ubicacion}\n"
                f"   Mapa: {n['mapa']}\n\n"
            )
    print(f"{len(filas)} negocios guardados en {SALIDA} y {SALIDA_TXT}")


if __name__ == "__main__":
    main()
