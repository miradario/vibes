import * as FileSystem from "expo-file-system/legacy";
const root = `${FileSystem.documentDirectory}challenge-day-drafts/`;
export async function stageDayFile(id: string, uri: string, extension: string) {
  await FileSystem.makeDirectoryAsync(root, { intermediates: true });
  const target = `${root}${id}.${extension}`;
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
}
export async function resolveDayFile(_id: string, uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists)
    throw new Error(
      "El archivo local ya no está disponible. Volvé a seleccionarlo."
    );
  return uri;
}
export async function removeDayFile(_id: string, uri?: string) {
  if (uri?.startsWith(root))
    await FileSystem.deleteAsync(uri, { idempotent: true });
}
