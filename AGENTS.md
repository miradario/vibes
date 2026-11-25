# AGENTS

- Antes de crear o modificar pantallas, componentes visuales, tipografía, botones, campos, estados, layout, animaciones o assets de marca, leer y aplicar [el design system de Vibes](docs/design-system.md). Al cambiar una regla del sistema, actualizar ese documento junto con la implementación.
- Reglas obligatorias del DS: no hardcodear colores, tamaños de texto, espaciados, radios, sombras, opacidades ni tamaños de ícono; usar los tokens de `src/theme/tokens` (`ds.*`). Correr `npm run lint:ds` antes de commitear (el hook `.githooks/pre-commit` y el check de CI lo hacen automáticamente). Toda excepción necesita un motivo documentado con `/* ds-lint-allow <motivo> */`; no usar `--no-verify` para saltear el lint.

- When implementing a modal (especially bottom-sheet style with backdrop), use `components/AnimatedSheetModal.tsx` instead of creating a new ad-hoc `Modal` animation.
- For new screens, use `components/ScreenContainer.tsx` as the base container unless there is a concrete reason not to.
- Estados de carga: la carga inicial de una lista, card o pantalla usa skeletons con la geometría de las tarjetas reales (`components/ui/Skeleton`: `SkeletonGroup` + `CardRowSkeleton` / `SkeletonLine` / `SkeletonChips`, o el skeleton propio del componente como `PersonCardSkeleton`), nunca un `ActivityIndicator` ni un texto "Cargando…"/"Consultando…" suelto. Mostrar el skeleton solo con `isLoading`/`isPending` sin datos; en refetch (`isFetching`) conservar las tarjetas visibles. `ActivityIndicator` / `VibesLoader` quedan para una acción en curso dentro del control que la dispara (botón, conectar Salud). `npm run lint:ds` lo verifica; una excepción necesita `/* ds-lint-allow loading: <motivo> */`.
- Acciones terciarias o de baja jerarquía (p. ej. "Consultar por horarios fuera de turno") usan la variante `link` del botón (`buttonStyle("link")` / `<Button link>` de LearningUI): texto subrayado sin fondo ni borde, área táctil 44. No envolver acciones secundarias en una card con borde solo para agruparlas.
- En sheets/modals de pantalla completa (`AnimatedSheetModal fullScreen`, `Modal` de RN) no confiar solo en `SafeAreaView` en iOS; aplicar `useSafeAreaInsets()` arriba y abajo; la cabecera y la flecha de volver nunca se superponen a la barra de estado.

## Paleta obligatoria de Vibes

- Los colores salen de `ds.colors` (tokens semánticos: `text.*`, `bg.*`, `border.*`, `icon.*`, `base.*` para los acentos), definidos en `src/theme/tokens/colors.ts` e importados con `import * as ds from "<ruta>/src/theme/tokens"`. La paleta sigue siendo `#F4A340`, `#3978B8`, `#D88C7A`, `#FEFEFD`, `#2B2B2B` y `#6E6E6E`; no introducir otros tonos.
- `vibesTheme.colors.*` (`src/theme/vibesTheme.ts`) es legacy: no usarlo en código nuevo ni modificado. Al tocar un archivo, migrar a `ds.colors` los colores que se tocan.
- Para transparencias, usar `ds.withAlpha` con `ds.opacity`, no sufijos alfa en hex.
- Un color nuevo se agrega como token del DS y se documenta en `docs/design-system.md`; nunca se hardcodea.
- Correr `npm run lint:ds` antes de commitear. Después de modificar SVGs, ilustraciones o Lottie, correr también `npm run colors:check`.
- Priorizar la legibilidad sobre la cercanía numérica entre colores: usar texto oscuro sobre fondos mostaza, azul o coral; reservar el texto claro para fondos oscuros. No convertir bordes, iconos o estados seleccionados en el mismo color que su fondo. Para superficies suaves, usar los acentos de la paleta con opacidad.

- Excepción solicitada para el visor de perfiles (`components/UserProfileSheet.tsx`): fondo negro `#000000` y degradé negro con opacidad sobre la foto full-screen. No extender esta excepción a otras pantallas.

## Consistencia obligatoria de componentes

- Antes de agregar un control, buscar el equivalente en `components/ui` y reutilizar sus presets (`buttonStyles`, `surfaceStyles`, `chipStyles`), `BackButton`, `SectionHeader` y `Typography`. No crear tamaños, radios ni tipografías particulares para una feature.
- Las acciones persistentes de Clases usan `LearningActionDock` dentro de `LearningDockHost`. Las búsquedas en sheets con teclado usan `KeyboardSheetModal` (basado en `AnimatedSheetModal`).
- Si falta una variante reutilizable, definirla y documentarla primero en [el design system](docs/design-system.md), junto con su alcance; no resolverla con estilos aislados.
