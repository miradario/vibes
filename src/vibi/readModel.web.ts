import { Asset } from "expo-asset";
export async function readVibiModel(): Promise<ArrayBuffer> {
  const asset = Asset.fromModule(
    require("../../assets/models/vibi-logo-juguetona.glb")
  );
  const response = await fetch(asset.uri);
  if (!response.ok)
    throw new Error(`Vibi asset request failed: ${response.status}`);
  return response.arrayBuffer();
}
