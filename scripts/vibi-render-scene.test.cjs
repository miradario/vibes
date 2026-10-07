const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');
function load(file, requireModule) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: requireModule });
  return exports;
}
const theme = load('src/theme/vibesTheme.ts');
const { createVibiScene } = load('src/vibi/renderScene.ts', (name) => name === 'three' ? THREE : theme);
async function model() {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const data = fs.readFileSync('assets/models/vibi-logo-juguetona.glb');
  return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
}
function meshes(scene) {
  const result = [];
  scene.traverse((o) => { if (o.isMesh) result.push(o); });
  return result;
}
test('simulator uses palette unlit materials while preserving real GLB geometry and animated morphs', async () => {
  const gltf = await model();
  const original = meshes(gltf.scene);
  const rendered = createVibiScene(gltf.scene, true);
  const copies = meshes(rendered.scene);
  const allowed = new Set(Object.values(theme.vibesTheme.colors));
  assert.ok(copies.length > 0);
  for (let i = 0; i < copies.length; i++) {
    assert.equal(copies[i].geometry, original[i].geometry);
    assert.deepEqual(copies[i].morphTargetDictionary, original[i].morphTargetDictionary);
    assert.notEqual(copies[i].morphTargetInfluences, original[i].morphTargetInfluences);
    assert.equal(copies[i].material.isMeshBasicMaterial, true);
    assert.ok(allowed.has('#' + copies[i].material.color.getHexString().toUpperCase()));
    assert.equal(original[i].material.isMeshStandardMaterial, true);
  }
  const pose = (scene) => {
    const values = [];
    scene.traverse((o) => values.push(...o.position.toArray(), ...o.quaternion.toArray(), ...(o.morphTargetInfluences ?? [])));
    return values;
  };
  const before = pose(rendered.scene);
  const originalPose = pose(gltf.scene);
  const mixer = new THREE.AnimationMixer(rendered.scene);
  const clip = gltf.animations.find((c) => c.name === 'happy');
  assert.ok(clip);
  mixer.clipAction(clip).play();
  const start = Math.min(...clip.tracks.map((t) => t.times[0]));
  mixer.setTime(start + (clip.duration - start) / 2);
  assert.ok(pose(rendered.scene).some((value, i) => Math.abs(value - before[i]) > 0.00001));
  assert.deepEqual(pose(gltf.scene), originalPose);
  let disposed = 0;
  const materials = new Set(copies.map((m) => m.material));
  materials.forEach((m) => m.addEventListener('dispose', () => disposed++));
  rendered.dispose();
  assert.equal(disposed, materials.size);
});
test('device rendering keeps authored GLB materials and never disposes shared resources', async () => {
  const gltf = await model();
  const original = meshes(gltf.scene);
  const rendered = createVibiScene(gltf.scene, false);
  const copies = meshes(rendered.scene);
  let disposed = false;
  original.forEach((mesh, i) => {
    assert.equal(copies[i].material, mesh.material);
    mesh.material.addEventListener('dispose', () => { disposed = true; });
  });
  rendered.dispose();
  assert.equal(disposed, false);
});
