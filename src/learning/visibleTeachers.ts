/** Temporary public Classes selection; management and existing bookings stay intact. */
const visibleNames = new Set(["ana frenkel", "pablo gumina"]);
export function isVisibleClassTeacher(name?: string | null) {
  return visibleNames.has((name ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase());
}
