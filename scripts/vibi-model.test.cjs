const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const THREE = require("three");
const cache = new Map();
function loadTS(name) {
  if (cache.has(name)) return cache.get(name);
  const source = ts.transpileModule(
    fs.readFileSync(`src/vibi/${name}.ts`, "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }
  ).outputText;
  const sandbox = {
    exports: {},
    require: (dep) => (dep === "three" ? THREE : loadTS(dep.replace("./", ""))),
  };
  vm.runInNewContext(source, sandbox);
  cache.set(name, sandbox.exports);
  return sandbox.exports;
}
const api = loadTS("controller");
const { normalizeVibiClips, VibiAnimator } = loadTS("animation");
let modelPromise;
const getModel = () =>
  (modelPromise ??= (async () => {
    const { GLTFLoader } = await import(
      "three/examples/jsm/loaders/GLTFLoader.js"
    );
    const bytes = fs.readFileSync("assets/models/vibi-estados.glb");
    const gltf = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      ""
    );
    return { gltf, ...normalizeVibiClips(gltf.animations) };
  })());
const durations = [4, 2.5, 4, 2, 2.5, 4, 6, 3, 3, 3.5, 3, 3];
const meshes = (root) => {
  const found = [];
  root.traverse((o) => {
    if (o.morphTargetInfluences) found.push(o);
  });
  return found;
};

test("global controller returns one-shots to their previous loop and ignores stale completion", () => {
  api.playAnimation("thinking");
  api.playAnimation("happy");
  const old = api.vibiController.getSnapshot().requestId;
  api.playAnimation("surprised");
  api.finishAnimation(old);
  assert.equal(api.vibiController.getSnapshot().animation, "surprised");
  api.finishAnimation(api.vibiController.getSnapshot().requestId);
  assert.equal(api.vibiController.getSnapshot().animation, "thinking");
  api.setVisible(false);
  api.setMinimized(true);
  assert.equal(api.vibiController.getSnapshot().visible, false);
  assert.equal(api.vibiController.getSnapshot().minimized, true);
  assert.throws(() => api.playAnimation("other"));
  api.playAnimation("idle");
  api.setVisible(true);
  api.setMinimized(false);
});
test("GLB has all 12 named clips, normalized durations, and five morph meshes including blue hair", async () => {
  const { gltf, clips, info } = await getModel();
  assert.equal(clips.size, 12);
  const fallbackDurations = JSON.parse(
    fs.readFileSync("assets/models/vibi-clips.json", "utf8")
  );
  info.forEach((clip, i) => {
    assert.ok(
      Math.abs(clip.duration - durations[i]) < 0.00001,
      `${clip.name}: ${clip.duration}`
    );
    assert.ok(Math.abs(clip.duration - fallbackDurations[clip.name]) < 0.00001);
  });
  const found = meshes(gltf.scene);
  assert.deepEqual(
    found.map((mesh) => mesh.morphTargetInfluences.length).sort(),
    [3, 4, 6, 6, 6]
  );
  const hair = found.find((mesh) => mesh.name.includes("Mechon"));
  assert.ok(hair);
  assert.equal(hair.material.color.getHexString(), "3978b8");
  for (const clip of clips.values()) {
    const weights = clip.tracks.filter((track) =>
      track.name.includes("morphTargetInfluences")
    );
    assert.equal(weights.length, 5, clip.name);
    assert.ok(clip.tracks.every((track) => Math.abs(track.times[0]) < 0.00001));
  }
});
test("every clip changes real morph weights; playback preserves materials and morph dictionaries", async () => {
  const { gltf, clips } = await getModel();
  for (const [name, clip] of clips) {
    const root = gltf.scene.clone(true);
    const found = meshes(root);
    const original = found.map((mesh) =>
      JSON.stringify(mesh.morphTargetDictionary)
    );
    const material = found.map((mesh) => mesh.material);
    const animator = new VibiAnimator(root, clips, () => {});
    animator.play(name, 1, false);
    const before = found.flatMap((mesh) => [...mesh.morphTargetInfluences]);
    animator.update(clip.duration * 0.37);
    const after = found.flatMap((mesh) => [...mesh.morphTargetInfluences]);
    assert.ok(after.every(Number.isFinite), name);
    assert.ok(
      after.some((v, i) => Math.abs(v - before[i]) > 0.00001),
      `${name} must deform at least one mesh`
    );
    found.forEach((mesh, i) => {
      assert.equal(JSON.stringify(mesh.morphTargetDictionary), original[i]);
      assert.equal(mesh.material, material[i]);
    });
    animator.dispose();
  }
});
test("interrupted fades preserve the visible morph pose and retire outgoing actions", async () => {
  const { gltf, clips } = await getModel();
  const root = gltf.scene.clone(true);
  const animator = new VibiAnimator(root, clips, () => {});
  const weights = () =>
    meshes(root).flatMap((mesh) => [...mesh.morphTargetInfluences]);
  animator.play("happy", 1, false);
  animator.update(0.8);
  animator.play("sad", 2, false);
  animator.update(0.08);
  const before = weights();
  animator.play("surprised", 3, false);
  const after = weights();
  before.forEach((v, i) =>
    assert.ok(Math.abs(v - after[i]) < 0.00001, `weight ${i} must not snap`)
  );
  animator.update(0.3);
  const reference = gltf.scene.clone(true);
  const isolated = new VibiAnimator(reference, clips, () => {});
  isolated.play("surprised", 3, false);
  isolated.update(0.3);
  const expected = meshes(reference).flatMap((mesh) => [
    ...mesh.morphTargetInfluences,
  ]);
  weights().forEach((v, i) =>
    assert.ok(
      Math.abs(v - expected[i]) < 0.00001,
      "retired expression must not leak"
    )
  );
  animator.dispose();
  isolated.dispose();
});
test("all one-shots finish once; looping clips do not emit completion; reduced motion is static", async () => {
  const { gltf, clips } = await getModel();
  for (const [name, clip] of clips) {
    let finished = 0;
    const root = gltf.scene.clone(true);
    const animator = new VibiAnimator(root, clips, () => {
      finished++;
    });
    animator.play(name, 7, true);
    const pose = meshes(root).flatMap((mesh) => [
      ...mesh.morphTargetInfluences,
    ]);
    animator.update(clip.duration / 2);
    assert.deepEqual(
      meshes(root).flatMap((mesh) => [...mesh.morphTargetInfluences]),
      pose
    );
    animator.update(clip.duration / 2 + 0.00001);
    animator.update(clip.duration);
    assert.equal(finished, api.VIBI_LOOPS.has(name) ? 0 : 1, name);
    animator.dispose();
  }
});

test("Expo GL adapter skips unsupported conversions and preserves other pixel-store calls", () => {
  const { prepareExpoGLContext } = loadTS("expoGL");
  const calls = [];
  const context = {
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
    UNPACK_COLORSPACE_CONVERSION_WEBGL: 37443,
    pixelStorei(parameter, value) {
      assert.equal(this, context);
      calls.push([parameter, value]);
    },
  };
  prepareExpoGLContext(context);
  const adapted = context.pixelStorei;
  prepareExpoGLContext(context);
  assert.equal(context.pixelStorei, adapted);
  context.pixelStorei(37441, false);
  context.pixelStorei(37443, 0);
  context.pixelStorei(37440, true); // UNPACK_FLIP_Y_WEBGL
  context.pixelStorei(3317, 4); // UNPACK_ALIGNMENT
  assert.deepEqual(calls, [
    [37440, true],
    [3317, 4],
  ]);
});

test("meditating breathes in for three seconds and out for three with synchronized closed face", async () => {
  const { gltf, clips } = await getModel();
  const root = gltf.scene.clone(true);
  const animator = new VibiAnimator(root, clips, () => {});
  animator.play("meditating", 1, false);
  const pose = () =>
    meshes(root).map((mesh) => [...mesh.morphTargetInfluences]);
  const dimensions = () => {
    root.updateMatrixWorld(true);
    return meshes(root).map((mesh) =>
      new THREE.Box3().setFromObject(mesh, true).getSize(new THREE.Vector3())
    );
  };
  const start = pose();
  const restingSize = dimensions();
  animator.update(1.5);
  const halfway = pose();
  animator.update(1.5);
  const peak = pose();
  const inhaledSize = dimensions();
  animator.update(1.5);
  const out = pose();
  animator.update(1.5);
  const end = pose();
  peak.forEach((weights, i) => {
    assert.ok(Math.abs(weights[0] - 3.2) < 0.00001);
    assert.ok(Math.abs(halfway[i][0] - 1.6) < 0.00001);
    assert.ok(Math.abs(out[i][0] - halfway[i][0]) < 0.00001);
    assert.deepEqual(end[i], start[i]);
    assert.ok(weights.slice(1).every((value) => value === 0));
    assert.ok(
      inhaledSize[i].x / restingSize[i].x > 1.17,
      "body, hair and face expand together"
    );
    assert.ok(
      inhaledSize[i].z / restingSize[i].z > 1.11,
      "breathing expands depth too"
    );
  });
  const meditating = clips.get("meditating");
  assert.equal(meditating.duration, 6);
  for (const track of meditating.tracks) {
    const size = track.getValueSize();
    for (let axis = 0; axis < size; axis++)
      assert.equal(
        track.values[axis],
        track.values[track.values.length - size + axis],
        "loop closes without a jump"
      );
    if (track.name.endsWith(".position")) {
      const vertical = Array.from(track.values).filter(
        (_, i) => i % size === 1
      );
      assert.ok(
        Math.max(...vertical) - Math.min(...vertical) <= 0.003001,
        "float stays subtle"
      );
    }
    if (track.name.includes("morphTargetInfluences")) {
      const breath = Array.from(track.values).filter((_, i) => i % size === 0);
      for (let i = 1; i <= 90; i++)
        assert.ok(breath[i] > breath[i - 1], "inhale never pauses");
      for (let i = 91; i < breath.length; i++)
        assert.ok(breath[i] < breath[i - 1], "exhale never pauses");
      assert.ok(
        breath[1] < 0.001 && breath[90] - breath[89] < 0.001,
        "smooth at reversal and loop boundary"
      );
    }
  }
  // Every other normalized clip retains the source animation values.
  for (const raw of gltf.animations) {
    if (raw.name === "meditating") continue;
    raw.tracks.forEach((track, i) =>
      assert.deepEqual(clips.get(raw.name).tracks[i].values, track.values)
    );
  }
  animator.dispose();
});

test("welcome happy animation repeats without completing the global request", async () => {
  const { gltf, clips } = await getModel();
  let finished = 0;
  const animator = new VibiAnimator(
    gltf.scene.clone(true),
    clips,
    () => finished++
  );
  animator.play("happy", 0, false, true);
  animator.update(clips.get("happy").duration * 2.37);
  assert.equal(finished, 0);
  assert.equal(animator.needsCompletion, false);
  assert.ok(
    meshes(animator.root)
      .flatMap((mesh) => mesh.morphTargetInfluences)
      .every(Number.isFinite)
  );
  animator.dispose();
});
