const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, imports = {}, dev = false) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (key) => {
        if (!(key in imports)) throw Error("missing native SDK");
        return imports[key];
      },
      __DEV__: dev,
      console,
      Set,
    }
  );
  return exports;
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
function fixture({ cached = false, fail = false } = {}) {
  const store = load("src/featureFlags/store.ts").vibiFlagStore;
  let remote = cached,
    observer,
    foreground,
    removed = 0;
  const config = {};
  const sdk = {
    getRemoteConfig: () => config,
    getValue: () => ({ asBoolean: () => remote }),
    fetchAndActivate: async () => {
      if (fail) throw Error("offline");
    },
    activate: async () => {},
    onConfigUpdate: (_, value) => {
      observer = value;
      return () => {
        removed++;
      };
    },
  };
  const module = load("src/featureFlags/remoteConfig.native.ts", {
    "./store": { vibiFlagStore: store },
    "@react-native-firebase/remote-config": sdk,
    "react-native": {
      TurboModuleRegistry: { get: () => ({}) },
      AppState: {
        addEventListener: (_, fn) => {
          foreground = fn;
          return {
            remove: () => {
              removed++;
            },
          };
        },
      },
    },
  });
  return {
    store,
    config,
    start: module.startRemoteConfig,
    update: (value) => {
      remote = value;
      observer.next();
    },
    foreground: () => foreground("active"),
    removed: () => removed,
  };
}
test("first launch defaults off, remote updates enable and disable, cleanup ignores late events", async () => {
  const f = fixture();
  assert.equal(f.store.getSnapshot(), false);
  let updates = 0;
  f.store.subscribe(() => {
    updates++;
  });
  const stop = f.start();
  assert.equal(f.config.defaultConfig.vibi_enabled, false);
  await settle();
  f.update(true);
  await settle();
  assert.equal(f.store.getSnapshot(), true);
  f.update(false);
  await settle();
  assert.equal(f.store.getSnapshot(), false);
  assert.equal(updates, 2);
  stop();
  f.update(true);
  await settle();
  assert.equal(f.store.getSnapshot(), false);
  assert.equal(f.removed(), 2);
});
test("offline retains activated value and foreground retries do not reset it", async () => {
  const f = fixture({ cached: true, fail: true });
  const stop = f.start();
  await settle();
  assert.equal(f.store.getSnapshot(), true);
  f.foreground();
  await settle();
  assert.equal(f.store.getSnapshot(), true);
  stop();
});
for (const missing of ["NativeRNFBTurboApp", "NativeRNFBTurboConfig"]) {
  test(`Expo Go development enables Vibi without ${missing}`, () => {
    const store = load("src/featureFlags/store.ts").vibiFlagStore;
    let sdkImports = 0;
    const module = load("src/featureFlags/remoteConfig.native.ts", {
      "./store": { vibiFlagStore: store },
      "react-native": {
        TurboModuleRegistry: { get: (name) => name === missing ? null : {} },
      },
      get "@react-native-firebase/remote-config"() {
        sdkImports++;
        throw Error("must not evaluate SDK in Expo Go");
      },
    }, true);
    const stop = module.startRemoteConfig();
    assert.equal(store.getSnapshot(), true);
    assert.equal(sdkImports, 0);
    stop();
  });
  test(`older native build missing ${missing} never imports Firebase`, () => {
    const store = load("src/featureFlags/store.ts").vibiFlagStore;
    store.update(true);
    let sdkImports = 0;
    const module = load("src/featureFlags/remoteConfig.native.ts", {
      "./store": { vibiFlagStore: store },
      "react-native": {
        TurboModuleRegistry: { get: (name) => name === missing ? null : {} },
      },
      get "@react-native-firebase/remote-config"() {
        sdkImports++;
        throw Error("must not evaluate SDK without native modules");
      },
    });
    const stop = module.startRemoteConfig();
    assert.equal(store.getSnapshot(), false);
    assert.equal(sdkImports, 0);
    stop();
});
}
