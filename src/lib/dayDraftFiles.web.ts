function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("vibes-day-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("No se pudo conservar el archivo en este navegador."));
  });
}
async function fileTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", mode);
    const request = action(tx.objectStore("files"));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("No se pudo guardar el archivo local."));
    };
  });
}
export async function stageDayFile(
  id: string,
  uri: string,
  _extension: string
) {
  const blob = await (await fetch(uri)).blob();
  await fileTransaction("readwrite", (store) => store.put(blob, id));
  return URL.createObjectURL(blob);
}
export async function resolveDayFile(id: string, _uri: string) {
  const blob = await fileTransaction("readonly", (store) => store.get(id));
  if (!(blob instanceof Blob))
    throw new Error("Volvé a seleccionar el archivo que falta.");
  return URL.createObjectURL(blob);
}
export async function removeDayFile(id: string, uri?: string) {
  await fileTransaction("readwrite", (store) => store.delete(id));
  if (uri?.startsWith("blob:")) URL.revokeObjectURL(uri);
}
