"""Audit authored UI colors, including SVGs, native launch screens and Lottie.

Photos, raster artwork and videos retain their original pixels. Transparent
colors and opacity variations of the six brand colors are allowed.
"""
import json
import pathlib
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
PALETTE = {"E4B76E", "7F98B7", "D88C7A", "FEFEFD", "2B2B2B", "6E6E6E"}
errors = []


def check_rgb(values, location):
    color = "".join(f"{round(float(v)):02X}" for v in values[:3])
    if color not in PALETTE:
        errors.append(f"{location}: #{color}")


def check_text(path):
    text = path.read_text()
    location = str(path.relative_to(ROOT))
    for match in re.finditer(r"#(?:[a-fA-F0-9]{8}|[a-fA-F0-9]{6}|[a-fA-F0-9]{4}|[a-fA-F0-9]{3})\b", text):
        value = match[0][1:].upper()
        if len(value) in (3, 4):
            value = "".join(c * 2 for c in value)
        if len(value) == 8:
            value = value[2:] if path.suffix == ".xml" else value[:6]
        if value not in PALETTE:
            errors.append(f"{location}:{text.count(chr(10), 0, match.start()) + 1}: {match[0]}")
    for match in re.finditer(r"\b(rgba?|hsla?)\(([^()]*)\)", text):
        if match[1].startswith("hsl"):
            errors.append(f"{location}: use palette tokens instead of {match[0]}")
            continue
        try:
            values = [float(v.strip().rstrip("%")) * (2.55 if "%" in v else 1)
                      for v in match[2].split(",")[:3]]
            check_rgb(values, location)
        except ValueError:
            errors.append(f"{location}: manually review dynamic color {match[0]}")
    for match in re.finditer(r'''(?:\b\w*[Cc]olor|\bcolor|\bfill|\bstroke)\s*[:=]\s*["'](white|black|red|blue|green|gray|grey|orange|purple|pink|yellow|navy|cyan)["']''', text):
        errors.append(f"{location}: named color {match[1]}")


def check_lottie(value, location):
    if isinstance(value, dict):
        if value.get("ty") in ("fl", "st") and isinstance(value.get("c"), dict):
            color = value["c"]
            arrays = [color.get("k")] if not color.get("a") else [
                frame[key] for frame in color.get("k", []) for key in ("s", "e") if key in frame
            ]
            for values in arrays:
                if isinstance(values, list) and len(values) >= 3:
                    check_rgb([v * 255 for v in values[:3]], location)
        for child in value.values():
            check_lottie(child, location)
    elif isinstance(value, list):
        for child in value:
            check_lottie(child, location)


files = [ROOT / "App.tsx", ROOT / "app.json"]
for directory in ("components", "screens", "src", "assets", "navigation", "constants", "styles", "android/app/src/main/res"):
    files.extend(p for p in (ROOT / directory).rglob("*")
                 if p.suffix in (".ts", ".tsx", ".js", ".jsx", ".svg", ".css", ".xml")
                 and not p.name.endswith(".d.ts"))
for path in files:
    check_text(path)
for path in (ROOT / "assets/images/lotties").iterdir():
    if path.suffix == ".json":
        check_lottie(json.loads(path.read_text()), path.name)
    elif path.suffix == ".lottie":
        with zipfile.ZipFile(path) as archive:
            for name in archive.namelist():
                if name.startswith("animations/") and name.endswith(".json"):
                    check_lottie(json.loads(archive.read(name)), f"{path.name}/{name}")
for path in (ROOT / "ios").rglob("*.colorset/Contents.json"):
    for color in json.loads(path.read_text()).get("colors", []):
        components = color["color"]["components"]
        check_rgb([float(components[c]) * 255 for c in ("red", "green", "blue")], str(path.relative_to(ROOT)))
for path in (ROOT / "ios/Vibes").glob("*.storyboard"):
    for color in ET.parse(path).iter("color"):
        if "red" in color.attrib:
            check_rgb([float(color.attrib[c]) * 255 for c in ("red", "green", "blue")], path.name)
        elif "white" in color.attrib:
            check_rgb([float(color.attrib["white"]) * 255] * 3, path.name)
if errors:
    print("\n".join(sorted(set(errors))))
    sys.exit(1)
print(f"Vibes palette OK: {len(files)} source files, native launch colors and Lottie animations checked.")
