const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
      },
    }).outputText,
    {
      exports,
      require: (name) => dependencies[name] ?? {},
      console: { ...console, error() {} },
      ArrayBuffer,
      Uint8Array,
      atob,
      ...globals,
    }
  );
  return exports;
}
const content = load("src/screens/Onboarding/vibesOnboardingContent.ts");
const resume = load("src/lib/resumeOnboarding.ts", {
  "../screens/Onboarding/vibesOnboardingContent": content,
});
test("resume seeds the saved account, including optional answers, photos and preferences", () => {
  const draft = resume.buildResumeOnboardingDraft(
    {
      displayName: "Ana Pérez",
      genderId: 2,
      intentId: 1,
      birthDate: "1990-05-12",
      photos: [{ url: "saved-photo" }],
      neighborhood: "Palermo",
      latitude: -34,
    },
    {
      openTo: ["Amistad", "Otra intención"],
      spiritualPath: ["Yoga"],
      vegetarian: "Sí",
      aboutMe: "Mi bio",
      otherTags: ["Tag propio"],
    },
    { gender: "Mujer", hobbies: ["Arte"] }
  );
  assert.equal(draft.editingExistingProfile, true);
  assert.equal(draft.genderId, 2);
  assert.equal(draft.intentId, 1);
  assert.equal(draft.neighborhood, "Palermo");
  assert.equal(draft.primaryPhotoUri, "saved-photo");
  assert.equal(draft.briefDescription, "Mi bio");
  assert.equal(draft.vegetarian, "Sí");
  assert.ok(draft.purposeIds.includes("friendship"));
  assert.ok(draft.purpose.includes("Otra intención"));
  assert.equal(draft.profileAnswers.hobbies[0], "Arte");
  const other = resume.buildResumeOnboardingDraft({}, null, {});
  assert.equal(other.photoUris.length, 0);
  assert.equal(other.displayName, "");
});
function photoApi({ failUpload = false, failUpsert = false } = {}) {
  const log = [];
  const rows = [
    { id: "a", profile_id: "u", url: "u/a.jpg", order: 0, is_primary: true },
    { id: "b", profile_id: "u", url: "u/b.jpg", order: 1, is_primary: false },
  ];
  const supabase = {
    from(table) {
      const call = { table, filters: [] };
      const q = {
        select() {
          call.action = "select";
          return q;
        },
        update(payload) {
          call.action = "update";
          call.payload = payload;
          return q;
        },
        upsert(payload, options) {
          call.action = "upsert";
          call.payload = payload;
          call.options = options;
          return q;
        },
        delete() {
          call.action = "delete";
          return q;
        },
        eq(k, v) {
          call.filters.push([k, v]);
          return q;
        },
        gte(k, v) {
          call.filters.push([k, "gte", v]);
          return q;
        },
        then(resolve, reject) {
          log.push(call);
          return Promise.resolve({
            data: call.action === "select" ? rows : null,
            error:
              call.action === "upsert" && failUpsert
                ? new Error("offline")
                : null,
          }).then(resolve, reject);
        },
      };
      return q;
    },
    storage: {
      from() {
        return {
          upload: async (path) => {
            log.push({ action: "upload", path });
            return { error: failUpload ? new Error("upload failed") : null };
          },
        };
      },
    },
  };
  const api = load(
    "src/queries/onboarding.queries.ts",
    {
      "../lib/supabase": { supabase },
      "../lib/preparePhotoUpload": { preparePhotoUpload: async (uri) => uri },
      "../lib/profilePhotoStorage": {
        getProfilePicturePath: (uri) =>
          uri?.includes("/sign/") ? uri.split("/sign/")[1].split("?")[0] : uri,
      },
    },
    {
      fetch: async () => ({
        arrayBuffer: async () => new Uint8Array([1, 2]).buffer,
      }),
    }
  );
  return { save: api.saveProfilePhotoSelection, log };
}
test("existing signed photos reorder without uploading or deleting them first", async () => {
  const { save, log } = photoApi();
  const paths = await save("u", [
    "https://storage/sign/u/b.jpg?token=x",
    "u/a.jpg",
  ]);
  assert.deepEqual(Array.from(paths), ["u/b.jpg", "u/a.jpg"]);
  assert.equal(log.filter((call) => call.action === "upload").length, 0);
  const upsert = log.find((call) => call.action === "upsert");
  assert.equal(upsert.options.onConflict, "profile_id,order");
  assert.equal(upsert.payload[0].url, "u/b.jpg");
  assert.ok(
    log.indexOf(upsert) < log.findIndex((call) => call.action === "delete")
  );
});
test("upload failure leaves all saved references and primary flags untouched", async () => {
  const { save, log } = photoApi({ failUpload: true });
  await assert.rejects(
    save("u", ["u/a.jpg", "file:///new.jpg"]),
    /upload failed/
  );
  assert.equal(
    log.filter((call) => ["delete", "upsert", "update"].includes(call.action))
      .length,
    0
  );
});
test("failed photo replacement does not delete rows and restores the previous primary", async () => {
  const { save, log } = photoApi({ failUpsert: true });
  await assert.rejects(save("u", ["u/b.jpg", "u/a.jpg"]), /offline/);
  assert.equal(log.filter((call) => call.action === "delete").length, 0);
  assert.ok(
    log.some(
      (call) =>
        call.action === "update" &&
        call.payload.is_primary === true &&
        call.filters.some(([key, value]) => key === "id" && value === "a")
    )
  );
});
test("removing every photo clears both table selection and legacy profile fallback", async () => {
  const { save, log } = photoApi();
  await save("u", []);
  assert.ok(
    log.some(
      (call) =>
        call.action === "delete" &&
        call.filters.some(
          ([key, op, value]) => key === "order" && op === "gte" && value === 0
        )
    )
  );
  const profileUpdate = log.find(
    (call) => call.table === "profiles" && call.action === "update"
  );
  assert.equal(profileUpdate.payload.photos.length, 0);
});
function brandFixture() {
  const effects = [],
    values = [];
  let loops = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useContext: () => undefined,
    useState: (value) => [
      typeof value === "function" ? value() : value,
      () => {},
    ],
    useEffect: (callback) => effects.push(callback),
    useRef: (value) => ({ current: value }),
    useCallback: (value) => value,
  };
  react.default = react;
  const animated = {
    createAnimatedComponent: () => "Path",
    View: "Animated.View",
  };
  const reanimated = {
    default: animated,
    useSharedValue: (value) => {
      const shared = { value };
      values.push(shared);
      return shared;
    },
    useAnimatedStyle: (callback) => callback(),
    cancelAnimation() {},
    useAnimatedProps: (callback) => callback(),
    Easing: { inOut: (value) => value },
    withTiming: (value) => value,
    withSequence: (...values) => values,
    withRepeat: (value) => {
      loops++;
      return value;
    },
    withDelay: (_, value) => value,
    runOnJS: (fn) => fn,
  };
  const brand = load("components/AnimatedBrandLogo.tsx", {
    react: react,
    "react-native": { View: "View" },
    "react-native-svg": { default: "Svg" },
    "react-native-reanimated": reanimated,
    "../src/vibi/useMotionPreference": {
      useVibiRuntime: () => ({
        active: true,
        reducedMotion: false,
        motionReady: true,
      }),
    },
    "../src/illustrations/logoMorph": { logoMorphRenderShapes: [] },
  });
  return {
    mount(animate) {
      brand.default({ direction: "logo-to-word", loop: true, animate });
      effects.splice(0).forEach((effect) => effect());
    },
    loops: () => loops,
    values,
  };
}
test("transient Android boot logos keep their initial frame across remounts without restarting motion", () => {
  const f = brandFixture();
  f.mount(false);
  f.mount(false);
  assert.equal(f.loops(), 0);
  assert.ok(f.values.every((shared) => shared.value === 1));
});
test("the Welcome brand logo retains its animation", () => {
  const f = brandFixture();
  f.mount(true);
  assert.equal(f.loops(), 1);
});
