import { Asset } from "expo-asset";
import { File } from "expo-file-system";
export async function readVibiModel(): Promise<ArrayBuffer> {
  const asset = Asset.fromModule(
    require("../../assets/models/vibi-estados.glb")
  );
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error("Vibi model was not downloaded");
  return new File(asset.localUri).arrayBuffer();
}
