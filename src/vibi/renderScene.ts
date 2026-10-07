import { Material, Mesh, MeshBasicMaterial, Object3D } from "three";
import { vibesTheme } from "../theme/vibesTheme";

// The iOS simulator's software GL renderer can stall on the GLB's PBR
// shaders. Unlit materials keep the geometry and morph animations usable.
export function createVibiScene(source: Object3D, useUnlitMaterials: boolean) {
  const scene = source.clone(true);
  const replacements = new Map<Material, MeshBasicMaterial>();
  if (useUnlitMaterials) {
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const replace = (material: Material) => {
        let replacement = replacements.get(material);
        if (!replacement) {
          const colors = vibesTheme.colors;
          const color = material.name.startsWith("Azul")
            ? colors.accentBlue
            : material.name.startsWith("Naranja")
              ? colors.accentMustard
              : material.name.startsWith("Rostro blanco")
                ? colors.surface
                : colors.primaryText;
          replacement = new MeshBasicMaterial({
            name: material.name,
            color,
            side: material.side,
            transparent: material.transparent,
            opacity: material.opacity,
            depthTest: material.depthTest,
            depthWrite: material.depthWrite,
          });
          replacements.set(material, replacement);
        }
        return replacement;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(replace)
        : replace(mesh.material);
    });
  }
  return {
    scene,
    dispose: () => replacements.forEach((material) => material.dispose()),
  };
}
