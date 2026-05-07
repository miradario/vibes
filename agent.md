# Vibes Agent Guide

Este proyecto usa estas reglas como convención obligatoria para cualquier pantalla o componente nuevo.

## 1. Textos e idiomas

- Nunca hardcodear textos visibles al usuario si forman parte de la UI final.
- Todo texto debe salir del sistema de i18n usando `useI18n()` y `t("...")`.
- Las traducciones deben agregarse en:
  - [src/i18n/translations.ts](/Users/dariomira/Documents/GD/tinder-expo/src/i18n/translations.ts)
- El hook de idioma compartido está en:
  - [src/i18n/index.tsx](/Users/dariomira/Documents/GD/tinder-expo/src/i18n/index.tsx)

### Regla práctica

- Si un texto aparece en pantalla, debe poder mostrarse en `es` y `en`.
- Excepción mínima:
  - textos temporales de debug
  - logs internos

## 2. Botones

- No crear botones visuales ad hoc si cumplen el rol de CTA principal o secundario.
- Debe usarse el componente compartido:
  - [components/VibesActionButton.tsx](/Users/dariomira/Documents/GD/tinder-expo/components/VibesActionButton.tsx)

### Uso esperado

- `variant="start"` para CTA principal
- `variant="skip"` para acción secundaria

### Regla práctica

- Si una pantalla necesita un botón principal, primero intentar resolverlo con `VibesActionButton`.
- Si hace falta una variante nueva, extender el componente compartido en vez de inventar otro botón local.

## 3. Header

- Todas las pantallas nuevas deben usar un header compartido.
- El header base es:
  - [src/components/VibesHeader.tsx](/Users/dariomira/Documents/GD/tinder-expo/src/components/VibesHeader.tsx)

### Regla práctica

- No repetir títulos/sutítulos manuales si la pantalla puede usar `VibesHeader`.
- Si una pantalla necesita una variante especial, extender `VibesHeader` con props nuevas antes que duplicar layout.

## 4. Theme y estilos

- Los colores, radios, spacing y fuentes deben salir del theme compartido:
  - [src/theme/vibesTheme.ts](/Users/dariomira/Documents/GD/tinder-expo/src/theme/vibesTheme.ts)

### Reglas

- Usar `vibesTheme.colors.*`
- Usar `vibesTheme.spacing.*`
- Usar `vibesTheme.radii.*`
- Usar `vibesTheme.fonts.*`

- Evitar colores hex hardcodeados si ya existe un equivalente en el theme.
- Si falta un token, agregarlo al theme antes de repetir valores locales por muchas pantallas.

## 5. Tipografía

- Base de la app:
  - cuerpo: `vibesTheme.fonts.primary`
  - títulos: usar las variantes del theme
- Regla de legibilidad:
  - si un texto usa `fontSize < 14`, debe usar `vibesTheme.fonts.medium`

### Regla práctica

- No referenciar fuentes sueltas directamente si el theme ya define la variante necesaria.
- Preferir `vibesTheme.fonts.primary`, `medium`, `semibold`, `bold`.

## 6. Consistencia de componentes

- Si una solución ya existe en el repo, reutilizarla.
- Antes de crear algo nuevo, revisar:
  - header compartido
  - botón compartido
  - theme compartido
  - sistema de i18n

## 7. Checklist para pantalla nueva

- Usa `useI18n()` para todos los textos
- Usa `VibesHeader`
- Usa `VibesActionButton` para CTA principal/secundaria
- Usa `vibesTheme` para colores, spacing, radios y fuentes
- No deja textos hardcodeados sin traducción

## 8. Checklist para cambios en pantallas existentes

- Si aparece un texto nuevo, agregar traducción
- Si aparece un botón nuevo, evaluar moverlo a `VibesActionButton`
- Si aparece un header repetido, migrarlo a `VibesHeader`
- Si aparece un color repetido, moverlo a `vibesTheme`
