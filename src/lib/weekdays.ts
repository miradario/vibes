/**
 * Iniciales de día lun→dom (convención Vibes / Agus): X = miércoles, M = martes.
 * Una sola fuente para calendarios, WeekDayCell, EventRecurrenceEditor.
 */
export const WEEKDAY_INITIALS_MON_FIRST = ["L", "M", "X", "J", "V", "S", "D"] as const;

/** Nombres largos alineados a WEEKDAY_INITIALS_MON_FIRST (a11y / labels). */
export const WEEKDAY_NAMES_MON_FIRST = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

/**
 * Opciones Mon-first para selectores: [getDay() JS, inicial, nombre].
 * Domingo queda al final con getDay() === 0.
 */
export const WEEKDAY_OPTIONS_MON_FIRST = [
  [1, "L", "Lunes"],
  [2, "M", "Martes"],
  [3, "X", "Miércoles"],
  [4, "J", "Jueves"],
  [5, "V", "Viernes"],
  [6, "S", "Sábado"],
  [0, "D", "Domingo"],
] as const;
