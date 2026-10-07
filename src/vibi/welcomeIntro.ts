import {
  AnimationMixer,
  Box3,
  PerspectiveCamera,
  Vector3,
  type Object3D,
  type AnimationClip,
} from "three";

export const WELCOME_INTRO_DURATION = 2.4;
export function welcomeLayout(height: number) {
  const titleTop = Math.max(12, Math.min(height * 0.53, height - 234));
  const logoHeight = Math.min(height * 0.42, Math.max(40, titleTop - 24));
  const logoCenter =
    logoHeight === height * 0.42 ? height * 0.29 : titleTop / 2;
  return { titleTop, logoHeight, logoCenter };
}
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function welcomeIntroFrame(seconds: number, reducedMotion = false) {
  const zoom = reducedMotion ? 1 : clamp((seconds - 0.4) / 1.4);
  const camera = 1 - Math.pow(1 - zoom, 3);
  return {
    camera,
    titleOpacity: clamp((seconds - 1.6) / 0.5),
    buttonsOpacity: clamp((seconds - 1.9) / 0.5),
    buttonsTranslateY: 12 * (1 - clamp((seconds - 1.9) / 0.5)),
    complete: seconds >= WELCOME_INTRO_DURATION,
  };
}

const envelopes = new WeakMap<Object3D, { bounds: Box3; sphereBounds: Box3 }>();
/** Include authored node transforms and morph expansion over an entire cycle. */
export function welcomeModelBounds(scene: Object3D, breathing: AnimationClip) {
  const cached = envelopes.get(scene);
  if (cached) return cached;
  const root = scene.clone(true);
  root.updateMatrixWorld(true);
  const sphere =
    root.getObjectByName("Circulo_superior010") ??
    (() => {
      let found: Object3D | undefined;
      root.traverse((o) => {
        if (/^Circulo[ _]superior/i.test(o.name)) found = o;
      });
      return found;
    })();
  if (!sphere) throw new Error("Vibi's upper sphere was not found");
  const sphereBounds = new Box3().setFromObject(sphere, true);
  // Cache local geometry bounds once (including every morph target). Sweeping
  // transformed boxes then avoids walking every vertex on every animation pose.
  root.traverse((object) => {
    const geometry = (object as Object3D & { geometry?: { computeBoundingBox: () => void } }).geometry;
    geometry?.computeBoundingBox();
  });
  const bounds = new Box3().setFromObject(root);
  const mixer = new AnimationMixer(root);
  mixer.clipAction(breathing).play();
  // A dense sweep plus 12% framing margin covers interpolation between samples.
  for (let i = 0; i <= 240; i++) {
    mixer.setTime((breathing.duration * i) / 240);
    root.updateMatrixWorld(true);
    bounds.union(new Box3().setFromObject(root));
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(root);
  const envelope = { bounds, sphereBounds };
  envelopes.set(scene, envelope);
  return envelope;
}

export function welcomeCameraPlan(
  bounds: Box3,
  sphereBounds: Box3,
  width: number,
  height: number
) {
  const fov = 40;
  const near = 0.01;
  const aspect = width / height;
  const tanV = Math.tan((fov * Math.PI) / 360);
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const sphereCenter = sphereBounds.getCenter(new Vector3());
  const sphereSize = sphereBounds.getSize(new Vector3());
  const layout = welcomeLayout(height);
  const startDistance = Math.max(
    // Crop deeply into the orange sphere in both axes, so the opening reads
    // as an orange screen before pulling back to reveal the complete logo.
    Math.min(
      sphereSize.x / (2 * tanV * aspect),
      sphereSize.y / (2 * tanV)
    ) / 2.4,
    bounds.max.z - sphereCenter.z + near * 4
  );
  // Fit the breathing envelope into 42% of the screen's height and 88% width.
  const finalDistance =
    size.z / 2 +
    Math.max(
      size.x / (2 * tanV * aspect * 0.88),
      size.y / (2 * tanV * (layout.logoHeight / height))
    ) *
      1.12;
  return {
    fov,
    near,
    aspect,
    center,
    sphereCenter,
    startDistance,
    finalDistance,
    width,
    height,
    offsetY: height / 2 - layout.logoCenter,
  };
}
export type WelcomeCameraPlan = ReturnType<typeof welcomeCameraPlan>;
export function applyWelcomeCamera(
  camera: PerspectiveCamera,
  plan: WelcomeCameraPlan,
  progress: number
) {
  const target = plan.sphereCenter.clone().lerp(plan.center, progress);
  const distance =
    plan.startDistance + (plan.finalDistance - plan.startDistance) * progress;
  camera.fov = plan.fov;
  camera.zoom = 1;
  camera.aspect = plan.aspect;
  camera.near = plan.near;
  camera.far = distance + 30;
  camera.position.copy(target).add(new Vector3(0, 0, distance));
  camera.lookAt(target);
  // Shift the lens to the upper logo area without tilting the model/camera.
  camera.setViewOffset(
    plan.width,
    plan.height,
    0,
    plan.offsetY * progress,
    plan.width,
    plan.height
  );
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
