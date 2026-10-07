const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const THREE = require("three");
const output = ts.transpileModule(
  fs.readFileSync("src/vibi/welcomeIntro.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }
).outputText;
const sandbox = { exports: {}, require: () => THREE };
vm.runInNewContext(output, sandbox);
const api = sandbox.exports;
let modelPromise;
const load = () =>
  (modelPromise ??= (async () => {
    const { GLTFLoader } = await import(
      "three/examples/jsm/loaders/GLTFLoader.js"
    );
    const b = fs.readFileSync("assets/models/vibi-logo-juguetona.glb");
    const g = await new GLTFLoader().parseAsync(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
      ""
    );
    const clip = g.animations.find((c) => c.name === "breathing").clone();
    const start = Math.min(...clip.tracks.map((t) => t.times[0]));
    clip.tracks.forEach((t) => t.shift(-start));
    clip.resetDuration();
    return { g, clip };
  })());
test("intro holds, eases out, fades sequentially and respects reduced motion", () => {
  assert.equal(api.welcomeIntroFrame(0.399).camera, 0);
  assert.equal(api.welcomeIntroFrame(1.8).camera, 1);
  assert.equal(api.welcomeIntroFrame(1.59).titleOpacity, 0);
  assert.equal(api.welcomeIntroFrame(2.1).titleOpacity, 1);
  assert.equal(api.welcomeIntroFrame(1.89).buttonsOpacity, 0);
  assert.equal(api.welcomeIntroFrame(2.4).buttonsOpacity, 1);
  assert.equal(api.welcomeIntroFrame(2.4).buttonsTranslateY, 0);
  assert.equal(api.welcomeIntroFrame(0, true).camera, 1);
  assert.equal(api.welcomeIntroFrame(2.399).complete, false);
  assert.equal(api.welcomeIntroFrame(2.4).complete, true);
});
test("real GLB stays inside the upper viewport through an entire breathing cycle", async () => {
  const { g, clip } = await load();
  const envelope = api.welcomeModelBounds(g.scene, clip);
  for (const [width, height] of [
    [320, 568],
    [390, 760],
    [430, 860],
    [768, 980],
    [844, 340],
  ]) {
    const plan = api.welcomeCameraPlan(
      envelope.bounds,
      envelope.sphereBounds,
      width,
      height
    );
    const camera = new THREE.PerspectiveCamera();
    camera.zoom = 37;
    api.applyWelcomeCamera(camera, plan, 1);
    assert.equal(
      camera.zoom,
      1,
      "perspective camera must not inherit orthographic zoom"
    );
    const layout = api.welcomeLayout(height);
    assert(
      layout.titleTop + 54 <= height - 164 - 12,
      "title overlaps native buttons"
    );
    const root = g.scene.clone(true);
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(clip).play();
    for (let i = 0; i <= 360; i++) {
      mixer.setTime((i / 360) * clip.duration);
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root, true);
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            const p = new THREE.Vector3(x, y, z).project(camera);
            assert(
              Math.abs(p.x) < 0.9,
              `horizontal clipping ${width}x${height}: ${p.x}`
            );
            assert(
              p.y > 0.01 && p.y < 0.98,
              `upper-half clipping ${width}x${height}: ${p.y}`
            );
            assert(p.z < 1 && p.z > -1, "depth clipping");
          }
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
  }
});
test("close-up and interpolated camera never cross real model geometry", async () => {
  const { g, clip } = await load();
  const { bounds, sphereBounds } = api.welcomeModelBounds(g.scene, clip);
  for (const [w, h] of [
    [320, 568],
    [390, 760],
    [844, 340],
  ]) {
    const plan = api.welcomeCameraPlan(bounds, sphereBounds, w, h);
    const camera = new THREE.PerspectiveCamera();
    for (let i = 0; i <= 100; i++) {
      api.applyWelcomeCamera(camera, plan, i / 100);
      assert(
        camera.position.z - camera.near > bounds.max.z,
        "near plane crossed the model"
      );
      assert(
        Math.abs(camera.quaternion.x) < 1e-8 &&
          Math.abs(camera.quaternion.y) < 1e-8,
        "camera must remain frontal"
      );
    }
  }
});
