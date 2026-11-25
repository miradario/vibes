import { useClasesEnabled } from "./useClasesEnabled";
import { useSesionesEnabled } from "./useSesionesEnabled";
import { activitiesKinds, activitiesTabLabel, activitiesTabVisible } from "./activities";

export function useActivitiesFlags() {
  const clases = useClasesEnabled();
  const sesiones = useSesionesEnabled();
  const flags = { clases, sesiones };
  return {
    clases,
    sesiones,
    visible: activitiesTabVisible(flags),
    label: activitiesTabLabel(flags),
    kinds: activitiesKinds(flags),
  };
}
