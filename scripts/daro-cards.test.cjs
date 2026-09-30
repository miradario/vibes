const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(file) {
  const exports = {};
  new Function(
    "exports",
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText
  )(exports);
  return exports;
}
const { matchesEventDateAndLocation } = load("src/lib/eventFilters.ts");
const { hasProfilePhotos, comparePhotoPriority } = load(
  "src/lib/profilePhotos.ts"
);
const { VIBES_ONBOARDING_STEPS } = load(
  "src/screens/Onboarding/vibesOnboardingContent.ts"
);
test("event date range includes the entire first and last local day", () => {
  const from = new Date(2026, 8, 30);
  const to = new Date(2026, 9, 2);
  for (const time of [
    new Date(2026, 8, 30, 0),
    new Date(2026, 9, 2, 23, 59, 59, 999),
  ]) {
    assert.equal(
      matchesEventDateAndLocation(
        { startsAt: time.toISOString() },
        from,
        to,
        ""
      ),
      true
    );
  }
  for (const time of [new Date(2026, 8, 29, 23, 59), new Date(2026, 9, 3, 0)]) {
    assert.equal(
      matchesEventDateAndLocation(
        { startsAt: time.toISOString() },
        from,
        to,
        ""
      ),
      false
    );
  }
});
test("location filtering ignores case and accents and combines with dates", () => {
  const item = {
    location: "Córdoba, Argentina",
    startsAt: new Date(2026, 9, 1, 12).toISOString(),
  };
  assert.equal(
    matchesEventDateAndLocation(item, null, null, "  CORDOBA "),
    true
  );
  assert.equal(matchesEventDateAndLocation(item, null, null, "Rosario"), false);
  assert.equal(
    matchesEventDateAndLocation(item, new Date(2026, 9, 2), null, "Córdoba"),
    false
  );
  assert.equal(
    matchesEventDateAndLocation({ startsAt: "invalid" }, new Date(), null, ""),
    false
  );
  assert.equal(matchesEventDateAndLocation({}, null, null, ""), true);
});
test("only nonempty profile photos unlock viewing", () => {
  for (const profile of [
    null,
    {},
    { photos: [] },
    { photos: [" ", null, { url: "" }] },
  ])
    assert.equal(hasProfilePhotos(profile), false);
  for (const profile of [{ photos: ["a.jpg"] }, { photos: [{ url: "a.jpg" }] }])
    assert.equal(hasProfilePhotos(profile), true);
});
test("photo priority wins over distance while preserving equal-photo order", () => {
  const profiles = [
    { id: "near", distance: 1, photos: [] },
    { id: "far", distance: 100, photos: [{ url: "a.jpg" }] },
    { id: "hidden", distance: 200, photos: [], hasProfilePhoto: true },
  ];
  profiles.sort(
    (a, b) => comparePhotoPriority(a, b) || a.distance - b.distance
  );
  assert.deepEqual(
    profiles.map((p) => p.id),
    ["far", "hidden", "near"]
  );
});
test("onboarding reaches completion without the plans step", () => {
  assert.equal(VIBES_ONBOARDING_STEPS.includes("plans"), false);
  assert.equal(VIBES_ONBOARDING_STEPS.at(-1), "completion");
  assert.equal(
    new Set(VIBES_ONBOARDING_STEPS).size,
    VIBES_ONBOARDING_STEPS.length
  );
});

function candidateQuery(hasOwnPhoto) {
  const signed = [];
  const supabase = {
    from(table) {
      let own = false;
      const request = {
        select() {
          return this;
        },
        eq(key, value) {
          if (table === "profile_photos" && value === "viewer") own = true;
          return this;
        },
        is() {
          return this;
        },
        neq() {
          return this;
        },
        or() {
          return this;
        },
        not() {
          return this;
        },
        in() {
          return this;
        },
        order() {
          return this;
        },
        limit() {
          return this;
        },
        gt() {
          return this;
        },
        async maybeSingle() {
          return { data: { latitude: 0, longitude: 0 }, error: null };
        },
        then(resolve, reject) {
          const rows =
            table === "profiles"
              ? [
                  { id: "near", latitude: 0, longitude: 0, is_active: true },
                  { id: "far", latitude: 0, longitude: 1, is_active: true },
                ]
              : table === "profile_photos"
              ? own
                ? hasOwnPhoto
                  ? [{ url: "viewer/photo.jpg" }]
                  : []
                : [
                    {
                      profile_id: "far",
                      url: "far/photo.jpg",
                      order: 0,
                      is_primary: true,
                    },
                  ]
              : [];
          return Promise.resolve({ data: rows, error: null }).then(
            resolve,
            reject
          );
        },
      };
      return request;
    },
  };
  const imports = {
    "../lib/profilePhotos": load("src/lib/profilePhotos.ts"),
    "../lib/zodiac": { zodiacFromBirthDate: () => undefined },
    "../lib/communityDiscovery": { isSwipeHidden: () => false },
    "@tanstack/react-query": { useQuery: (options) => options.queryFn() },
    "../api/mappers/case.mapper": load("src/api/mappers/case.mapper.ts"),
    "../auth/auth.queries": {
      useAuthSession: () => ({ data: { user: { id: "viewer" } } }),
    },
    "../lib/supabase": { supabase },
    "../lib/profilePhotoStorage": {
      createSignedProfilePhotoUrl: async (path) => {
        signed.push(path);
        return `https://photo.test/${path}`;
      },
    },
  };
  const exports = {};
  new Function(
    "exports",
    "require",
    ts.transpileModule(
      fs.readFileSync("src/queries/candidates.queries.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
      }
    ).outputText
  )(exports, (name) => {
    assert.ok(name in imports, name);
    return imports[name];
  });
  return { run: exports.useCandidatesQuery, signed };
}
test("discovery does not sign or expose photos when the viewer has none, but still ranks photo profiles first", async () => {
  const query = candidateQuery(false);
  const result = await query.run();
  assert.deepEqual(
    result.map((p) => p.id),
    ["far", "near"]
  );
  assert.equal(
    result.every((p) => p.photos.length === 0),
    true
  );
  assert.equal(query.signed.length, 0);
});
test("uploading a profile photo unlocks signed discovery photos on the next query", async () => {
  const query = candidateQuery(true);
  const result = await query.run();
  assert.equal(result[0].id, "far");
  assert.equal(result[0].photos[0].url, "https://photo.test/far/photo.jpg");
  assert.deepEqual(query.signed, ["far/photo.jpg"]);
});

test("Home previews show photos even without an own photo, while discovery stays locked", async () => {
  const query = candidateQuery(false);
  const preview = await query.run(undefined, true);
  assert.equal(preview[0].photos[0].url, "https://photo.test/far/photo.jpg");
  const discovery = await query.run();
  assert.ok(discovery.every((profile) => profile.photos.length === 0));
});

test("date shortcuts use local calendar boundaries and never start before today", () => {
  const { getEventDatePreset } = load("src/lib/eventFilters.ts");
  const now = new Date(2026, 8, 30, 18, 45);
  const parts = (d) => [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()];
  assert.deepEqual(parts(getEventDatePreset("today", now).from), [2026, 8, 30, 0]);
  assert.deepEqual(parts(getEventDatePreset("tomorrow", now).to), [2026, 9, 1, 0]);
  assert.deepEqual(parts(getEventDatePreset("week", now).to), [2026, 9, 4, 0]);
  assert.deepEqual(parts(getEventDatePreset("month", now).to), [2026, 8, 30, 0]);
  assert.deepEqual(parts(getEventDatePreset("week", new Date(2026, 9, 4)).to), [2026, 9, 4, 0]);
  assert.deepEqual(parts(getEventDatePreset("month", new Date(2028, 1, 10)).to), [2028, 1, 29, 0]);
  assert.equal(now.getHours(), 18);
});
