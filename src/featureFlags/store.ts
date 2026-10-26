export function createBooleanFlagStore() {
  let enabled = false;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => enabled,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(value: boolean) {
      if (enabled === value) return;
      enabled = value;
      listeners.forEach((listener) => listener());
    },
  };
}
export const createVibiFlagStore = createBooleanFlagStore;
export const vibiFlagStore = createBooleanFlagStore();
export const clasesFlagStore = createBooleanFlagStore();
