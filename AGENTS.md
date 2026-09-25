# AGENTS

- When implementing a modal (especially bottom-sheet style with backdrop), use `components/AnimatedSheetModal.tsx` instead of creating a new ad-hoc `Modal` animation.
- For new screens, use `components/ScreenContainer.tsx` as the base container unless there is a concrete reason not to.

## Paleta obligatoria de Vibes

- Usar exclusivamente estos colores en la interfaz: `#E4B76E`, `#7F98B7`, `#D88C7A`, `#FEFEFD`, `#2B2B2B` y `#6E6E6E`. No introducir otros colores ni variantes de estos tonos.
- Referenciar los tokens de `src/theme/vibesTheme.ts`: `accentMustard`, `accentBlue`, `accentCoral`, `background`/`surface`, `primaryText` y `secondaryText`, respectivamente.
- Aplicar esta regla a botones, iconos, textos, fondos, bordes, sombras y degradados. Para transparencias, usar únicamente estos mismos colores con opacidad; no agregar tonos nuevos.
- Al crear o modificar estilos, reemplazar los colores fuera de la paleta en los elementos afectados.
- Ejecutar `npm run colors:check` después de modificar colores, estilos o ilustraciones para verificar la paleta.
- Priorizar la legibilidad sobre la cercanía numérica entre colores: usar texto oscuro sobre fondos mostaza, azul o coral; reservar el texto claro para fondos oscuros. No convertir bordes, iconos o estados seleccionados en el mismo color que su fondo. Para superficies suaves, usar los acentos de la paleta con opacidad.
