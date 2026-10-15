type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  multiRemove: (keys: string[]) => Promise<void>;
};

/** Freeze late SDK writes during an explicit session reset, until the app reloads. */
export function createRecoveryStorage(storage: Storage, sessionKey: string) {
  const keys = [sessionKey, `${sessionKey}-code-verifier`, `${sessionKey}-user`];
  let resetting = false;
  const pending = new Set<Promise<void>>();
  return {
    adapter: {
      getItem: (key: string) => resetting && keys.includes(key) ? Promise.resolve(null) : storage.getItem(key),
      setItem: (key: string, value: string) => {
        if (resetting && keys.includes(key)) return Promise.resolve();
        const write = storage.setItem(key, value);
        pending.add(write);
        void write.finally(() => pending.delete(write)).catch(() => {});
        return write;
      },
      removeItem: (key: string) => storage.removeItem(key),
    },
    reset: async () => {
      resetting = true;
      // Drain already-started writes before deleting so they cannot resurrect a session.
      await Promise.allSettled([...pending]);
      await storage.multiRemove(keys);
    },
  };
}
