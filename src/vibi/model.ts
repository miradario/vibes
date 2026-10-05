import type { Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { normalizeVibiClips } from "./animation";
import { readVibiModel } from "./readModel";

async function load() {
  // This GLB is self-contained and has no textures, external URIs, skins, or
  // compressed extensions. parseAsync avoids DOM/Blob-based image loaders.
  // RN exposes navigator.product but not userAgent. This loader version
  // checks userAgent even for an untextured GLB; preserve real browser values.
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.userAgent !== "string"
  ) {
    Object.defineProperty(navigator, "userAgent", {
      value: "ReactNative",
      configurable: true,
    });
  }
  const gltf = await new GLTFLoader().parseAsync(await readVibiModel(), "");
  const animations = normalizeVibiClips(gltf.animations);
  const morphs: { name: string; count: number }[] = [];
  gltf.scene.traverse((object) => {
    const mesh = object as Mesh;
    if (mesh.isMesh && mesh.morphTargetInfluences?.length) {
      morphs.push({
        name: mesh.name,
        count: mesh.morphTargetInfluences.length,
      });
      mesh.frustumCulled = false;
    }
  });
  if (morphs.length !== 5)
    throw new Error("Vibi body, hair, or facial morph targets are missing");
  if (__DEV__)
    console.info(
      "[Vibi] loaded clips and morph targets",
      animations.info,
      morphs
    );
  return { scene: gltf.scene, ...animations, morphs };
}
export type VibiModel = Awaited<ReturnType<typeof load>>;
let cachedModel: Promise<VibiModel> | undefined;
export function loadVibiModel() {
  // The source geometry/materials and parsed clips are shared for the app's
  // lifetime. Each reusable instance owns only its scene pose and mixer.
  return (cachedModel ??= load());
}
