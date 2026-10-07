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
    const bytes = fs.readFileSync("assets/models/vibi-logo-juguetona.glb");
    const gltf = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      ""
    );
    return { gltf, ...normalizeVibiClips(gltf.animations) };
  })());
const durations = [4, 6, 2.5, 4, 2, 2.5, 4, 6, 3, 3, 3.5, 3, 3];
const meshes = (root) => {
  const found = [];
  root.traverse((o) => {
    if (o.morphTargetInfluences) found.push(o);
  });
  return found;
};

test("global controller returns one-shots to idle and ignores stale completion", () => {
  api.playAnimation("thinking");
  api.playAnimation("happy");
  const old = api.vibiController.getSnapshot().requestId;
  api.playAnimation("surprised");
  api.finishAnimation(old);
  assert.equal(api.vibiController.getSnapshot().animation, "surprised");
  api.finishAnimation(api.vibiController.getSnapshot().requestId);
  assert.equal(api.vibiController.getSnapshot().animation, "idle");
  api.setVisible(false);
  api.setMinimized(true);
  assert.equal(api.vibiController.getSnapshot().visible, false);
  assert.equal(api.vibiController.getSnapshot().minimized, true);
  assert.throws(() => api.playAnimation("other"));
  api.playAnimation("idle");
  api.setVisible(true);
  api.setMinimized(false);
});
test("logo GLB has all 13 clips, supplied durations and animated logo meshes", async () => {
  const { gltf, clips, info } = await getModel();
  assert.equal(clips.size, 13);
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
  assert.equal(found.length, 14);
  const leaf = found.find((mesh) => mesh.name.startsWith("Hoja_azul") || mesh.name.startsWith("Hoja azul"));
  assert.ok(leaf);
  assert.ok(found.every((mesh) => mesh.morphTargetDictionary.Respirar === 0));
  assert.ok(found.some((mesh) => mesh.morphTargetDictionary.Triste === 2));
  for (const clip of clips.values()) {
    const weights = clip.tracks.filter((track) =>
      track.name.includes("morphTargetInfluences")
    );
    assert.equal(weights.length, 14, clip.name);
    assert.ok(clip.tracks.every((track) => Math.abs(track.times[0]) < 0.00001));
  }
});
test("every clip animates the logo; playback preserves materials and morph dictionaries", async () => {
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
    const pose = () => {
      const values = [];
      root.traverse((o) =>
        values.push(
          ...o.position.toArray(),
          ...o.quaternion.toArray(),
          ...o.scale.toArray(),
          ...(o.morphTargetInfluences ?? [])
        )
      );
      return values;
    };
    const before = pose();
    animator.update(clip.duration * 0.37);
    const after = pose();
    assert.ok(after.every(Number.isFinite), name);
    assert.ok(
      after.some((v, i) => Math.abs(v - before[i]) > 0.00001),
      `${name} must change at least one transform or morph`
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

test("all logo clips preserve authored values and match the supplied frame ranges at 30 fps", async () => {
  const { gltf, clips, info } = await getModel();
  const ranges = [
    [1, 121], [121, 301], [301, 376], [376, 496],
    [496, 556], [556, 631], [631, 751], [751, 931],
    [931, 1021], [1021, 1111], [1111, 1216],
    [1216, 1306], [1306, 1396],
  ];
  for (const [i, raw] of gltf.animations.entries()) {
    const clip = clips.get(raw.name);
    assert.ok(Math.abs(info[i].start * 30 - ranges[i][0]) < 0.0001);
    assert.ok(Math.abs(info[i].end * 30 - ranges[i][1]) < 0.0001);
    raw.tracks.forEach((track, j) =>
      assert.deepEqual(clip.tracks[j].values, track.values)
    );
  }
  assert.ok(api.VIBI_LOOPS.has("breathing"));
  assert.ok(Math.abs(clips.get("breathing").duration - 6) < 0.00001);
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

test("instance celebration returns smoothly to idle and keeps looping", async () => {
  const { gltf, clips } = await getModel();
  let completed = 0;
  const animator = new VibiAnimator(gltf.scene.clone(true), clips, (id) => {
    completed++;
    animator.play("idle", id, false);
  });
  animator.play("happy", 1, false);
  animator.update(clips.get("happy").duration + 0.01);
  assert.equal(completed, 1);
  assert.equal(animator.needsCompletion, false);
  animator.update(10);
  assert.equal(completed, 1);
  animator.dispose();
});


test("breathing reports completion only after a full inhale/exhale cycle", async () => {
  const { gltf, clips } = await getModel();
  for (const reducedMotion of [false, true]) {
    let cycles = 0;
    const animator = new VibiAnimator(
      gltf.scene.clone(true), clips, () => {}, () => cycles++
    );
    animator.play("breathing", 0, reducedMotion, true);
    const duration = clips.get("breathing").duration;
    animator.update(duration - 0.01);
    assert.equal(cycles, 0);
    animator.update(0.02);
    assert.equal(cycles, 1);
    animator.update(duration);
    assert.equal(cycles, 2);
    animator.dispose();
  }
});


test("discovers custom GLB clips and plays wave once before returning to idle", () => {
  const root = new THREE.Object3D();
  const makeClip = (name) => new THREE.AnimationClip(name, 1, [
    new THREE.NumberKeyframeTrack(".position[x]", [0, 1], [0, 1]),
  ]);
  const { clips, info } = normalizeVibiClips([makeClip("idle"), makeClip("wave")]);
  assert.deepEqual([...clips.keys()], ["idle", "wave"]);
  assert.equal(info[1].name, "wave");
  api.playAnimation("wave");
  let completed = 0;
  const animator = new VibiAnimator(root, clips, (requestId) => {
    completed++;
    api.finishAnimation(requestId);
    animator.play("idle", requestId, false);
  });
  animator.play("wave", api.vibiController.getSnapshot().requestId, false);
  animator.update(0.5);
  assert.equal(completed, 0);
  animator.update(0.5);
  assert.equal(completed, 1);
  assert.equal(api.vibiController.getSnapshot().animation, "idle");
  animator.update(3);
  assert.equal(completed, 1);
  animator.dispose();
  // Restore the bundled model registry for subsequent controller use.
  api.registerVibiAnimations([...api.VIBI_ANIMATIONS]);
});
