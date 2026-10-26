# Logo oficial de Vibes

**Vigente desde el 25/10/2026.** Es el logo a usar en todos lados: app, landing, videos y cualquier pieza nueva.

## 1. Es texto, no el lobo
El logo oficial es el **wordmark "Vibes"** (texto). El ícono del lobo / marca plana (`vibes-logo-palette.svg`, `assets/icon.png`) **no** es el logo oficial; queda solo como ícono de app/launcher.

## 2. Colores (por letra, según `vibes-logo-morph.json`)
| Letra | Color | Hex |
|---|---|---|
| V | gris oscuro | `#2B2B2B` |
| i (palo) | mostaza | `#F4A340` |
| i (punto) | coral | `#D88C7A` |
| b | gris oscuro | `#2B2B2B` |
| e | azul | `#3978B8` |
| s | gris oscuro | `#2B2B2B` |

## 3. Formas de las letras
- Contornos reales de **Josefin Sans** (`assets/font/JosefinSans-Regular.ttf`), con los ajustes del morph: la **b corta** (palo y panza en un solo contorno) y la **e semi completa** (panza superior rellena, curva inferior abierta). El espacio e/s está ajustado.
- Fuente de verdad: `assets/branding/vibes-logo-morph.json` (se usa el estado `from`, progreso 0).
- Se dibuja con `components/VibesWordmark.tsx` (estático) y `components/AnimatedBrandLogo.tsx` (animación texto → marca), vía `src/illustrations/logoMorph.ts`.
- Regenerar: `VIBES_OPENTYPE_MODULE=<ruta a opentype.js> node scripts/generate-logo-morph.cjs`.

## 4. Exportes
Todavía **no hay SVG/PNG exportado** del wordmark. Para landing y videos hay que exportarlo desde el JSON (mismos paths que `VibesWordmark`).
