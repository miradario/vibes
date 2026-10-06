// Visual GLB verification in Chromium's WebGL renderer. This does not claim
// native Expo GL support; use the development selector on iOS/Android too.
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
const output = resolve(process.argv[2] || "/tmp/vibi-render-verification");
await mkdir(output, { recursive: true });
const chromium =
  process.env.CHROMIUM_BINARY ||
  "/Applications/Chromium.app/Contents/MacOS/Chromium";
const { createServer } = await import("node:http");
const root = resolve(".");
const html = `<!doctype html><html><head><style>html,body{margin:0;background:transparent}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script></head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
const gltf=await new GLTFLoader().loadAsync('/assets/models/vibi-logo-juguetona.glb');
gltf.scene.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.every(m=>m.name.startsWith('Rostro blanco'))){o.renderOrder=1;for(const m of materials){m.depthTest=false;m.depthWrite=false;}}});
const scene=new THREE.Scene();scene.add(gltf.scene);
scene.add(new THREE.AmbientLight('#FEFEFD',1.6));
for(const [intensity,p] of [[2,[-3,4,6]],[.6,[3,1,2]]]){const light=new THREE.DirectionalLight('#FEFEFD',intensity);light.position.set(...p);scene.add(light);}
const camera=new THREE.OrthographicCamera(-1.65,1.65,1.65,-1.65,.1,30);camera.position.set(0,0,7);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(256,256);renderer.setClearColor('#FEFEFD',0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;document.body.appendChild(renderer.domElement);
const mixer=new THREE.AnimationMixer(gltf.scene);const report=[];
for(const clip of gltf.animations){const start=Math.min(...clip.tracks.map(t=>t.times[0]));clip.tracks.forEach(t=>t.shift(-start));clip.resetDuration();report.push({name:clip.name,start,duration:clip.duration});}
window.preview=(name,fraction=.5)=>{mixer.stopAllAction();const clip=gltf.animations.find(c=>c.name===name);const action=mixer.clipAction(clip).reset().play();action.time=clip.duration*fraction;mixer.update(0);renderer.render(scene,camera);const morphs=[];gltf.scene.traverse(o=>{if(o.morphTargetInfluences)morphs.push({name:o.name,weights:[...o.morphTargetInfluences]});});return {clip:name,duration:clip.duration,morphs,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};};
window.clips=report;window.preview('idle',.13);window.ready=true;
</script></body></html>`;
const server = createServer(async (req, res) => {
  try {
    if (req.url === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end(html);
      return;
    }
    const path = resolve(root, "." + decodeURIComponent(req.url));
    if (!path.startsWith(root + "/")) throw Error("Invalid path");
    res.setHeader(
      "Content-Type",
      path.endsWith(".js")
        ? "application/javascript"
        : "application/octet-stream"
    );
    res.end(await readFile(path));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(8769, "127.0.0.1", resolve));
const browser = spawn(
  chromium,
  [
    "--headless",
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
    "--remote-debugging-port=9333",
    "--remote-allow-origins=*",
    `--user-data-dir=${output}/chrome-profile`,
  ],
  { stdio: "ignore" }
);
let socket;
try {
  let page;
  for (let i = 0; i < 100; i++) {
    try {
      page = await (
        await fetch("http://127.0.0.1:9333/json/new?http://127.0.0.1:8769/", {
          method: "PUT",
        })
      ).json();
      break;
    } catch {
      await delay(100);
    }
  }
  if (!page) throw Error("Chromium did not start");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    socket.onopen = res;
    socket.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error
        ? p.reject(Error(JSON.stringify(msg.error)))
        : p.resolve(msg.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send("Emulation.setDeviceMetricsOverride", {
    width: 256,
    height: 256,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Emulation.setDefaultBackgroundColorOverride", {
    color: { r: 0, g: 0, b: 0, a: 0 },
  });
  for (let i = 0; i < 100 && !(await evaluate("!!window.ready")); i++)
    await delay(100);
  const clips = await evaluate("window.clips");
  if (clips?.length !== 13) throw Error("Expected 13 loaded clips");
  const report = [];
  for (const clip of clips) {
    const frames = [];
    for (const fraction of [0.13, 0.5, 0.85])
      frames.push(
        await evaluate(
          `window.preview(${JSON.stringify(clip.name)},${fraction})`
        )
      );
    const mid = await evaluate(
      `window.preview(${JSON.stringify(clip.name)},.5)`
    );
    if (mid.morphs.length !== 14 || mid.drawCalls < 14)
      throw Error(
        `Missing visible mesh or morph targets: ${mid.morphs.length}, ${mid.drawCalls}`
      );
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: 256, height: 256, scale: 1 },
    });
    await writeFile(
      `${output}/${clip.name}.png`,
      Buffer.from(screenshot.data, "base64")
    );
    report.push({ ...clip, frames });
  }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    `Verified WebGL render of all 13 clips and 14 morph meshes. Screenshots: ${output}`
  );
} finally {
  socket?.close();
  browser.kill();
  await new Promise((resolve) => server.close(resolve));
}
