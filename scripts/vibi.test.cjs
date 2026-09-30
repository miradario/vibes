const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const core = {};
const load = (file, exports, imports = {}) =>
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (name) => imports[name],
      Date,
      Set,
      Map,
      Error,
      Response,
      Request,
      AbortSignal,
      TextEncoder,
      crypto: require("node:crypto").webcrypto,
      console,
    }
  );
const dating = {};
load("supabase/functions/vibi-chat/dating.ts", dating);
load("supabase/functions/vibi-chat/core.ts", core, { "./dating.ts": dating });
const provider = {};
const prompts = {};
load("supabase/functions/vibi-chat/prompts.ts", prompts);
test("runtime reads only the published revision and falls back on missing or invalid configuration", async () => {
  const read=[];
  const db=(configured,revision)=>({from(table){read.push(table);const q={select(){return q;},eq(key,value){if(table==='vibi_prompt_versions')assert.equal(value,'published');return q;},maybeSingle:async()=>configured,single:async()=>revision};return q;}});
  assert.equal((await prompts.loadPublishedPrompt(db({data:{published_id:'published'}},{data:{id:'published',content:'Una instrucción publicada válida'}}))).version,'published');
  assert.equal((await prompts.loadPublishedPrompt(db({data:null},{}))).version,'builtin-v1');
  assert.equal((await prompts.loadPublishedPrompt(db({data:{published_id:'published'}},{data:{id:'published',content:''}}))).version,'builtin-v1');
  assert.equal((await prompts.loadPublishedPrompt({from(){throw new Error('offline');}})).content,prompts.DEFAULT_PROMPT);
  assert.throws(()=>prompts.validatePrompt('x'.repeat(12001)));
});
load("supabase/functions/vibi-chat/provider.ts", provider, {
  "./core.ts": core,
  "./prompts.ts": prompts,
});
test("editable instructions retain fixed constraints and response validation", async () => {
  let system='';
  const reply=await provider.generateReply({key:'fixture',model:'fixture',systemPrompt:'Respondé con un tono formal.',message:'Hola',previousCategory:null,history:[],preferences:{},candidates:[],fetcher:async (_url,options)=>{
    system=JSON.parse(options.body).messages[0].content;
    return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({text:'¿Buscás eventos, desafíos o personas?',category:null,recommendations:[]})}}]}));
  }});
  assert.match(system,/Respondé con un tono formal/);
  assert.match(system,/REGLAS FIJAS/);
  assert.match(system,/Nunca inventes candidatos/);
  assert.match(system,/Devolvé exclusivamente un objeto JSON/);
  assert.equal(reply.category,null);
});
const id = "00000000-0000-4000-8000-000000000001";
const person = {
  id: "other",
  is_active: true,
  deleted_at: null,
  birth_date: "1990-01-01",
  gender_id: 1,
  latitude: -34,
  longitude: -58,
};
const own = { id: "me", latitude: -34, longitude: -58 };
test("dating compatibility is reciprocal only for exclusive Citas, with missing answers allowed", () => {
  const prefs = (gender, interest, seeking = ["Citas"]) => ({gender, looking_for: seeking, profile_answers:{interestedIn:interest}});
  const requester = prefs("Hombre", "Mujer");
  for (const [candidate, expected] of [
    [prefs("Mujer", "Hombre"), true],
    [prefs("Mujer", "Mujer"), false],
    [prefs("Hombre", "Todos"), false],
    [prefs("Otro", "Todos"), false],
    [prefs("Mujer", "Todos", ["Amistad"]), false],
    [prefs("Mujer", "Todos", ["Amistad", "Citas"]), true],
    [{}, true],
    [prefs("Mujer", ""), true],
  ]) {
    assert.equal(dating.matchesDatingPreferences(requester, candidate), expected);
    assert.equal(core.matchesPerson(person, candidate, own, requester), expected);
    assert.equal(dating.matchesDatingPreferences({...requester, looking_for:["Citas","Amistad"]}, candidate), true);
  }
  assert.equal(dating.matchesDatingPreferences(prefs("Otro","Todos"), prefs("Otro","Todos")), true);
  assert.equal(dating.matchesDatingPreferences(prefs("Otro","Todos"), prefs("Mujer","Hombre")), false);
  assert.equal(dating.matchesDatingPreferences({lookingFor:["Citas"], profileAnswers:{interestedIn:"Mujer"}}, prefs("Mujer","Hombre")), true);
  assert.equal(core.matchesPerson(person, prefs("Mujer","Todos"), own, {discover_answer_filters:{interestedIn:["Hombre"]}}), true);
  assert.equal(core.matchesPerson(person, {}, own, {discover_answer_filters:{interestedIn:["Hombre"]}}), false);
});
const c = {
  id,
  type: "event",
  title: "Yoga",
  description: "Yoga para principiantes",
  thumbnail: "https://example.com/x.jpg",
  tags: ["Yoga"],
};
test("request rejects invalid IDs, blank or oversized messages and unknown categories", () => {
  for (const input of [
    { message: "hola" },
    { conversation_id: id, request_id: id, message: " " },
    { conversation_id: id, request_id: id, message: "a".repeat(2001) },
    {
      conversation_id: id,
      request_id: id,
      message: "hola",
      category: "unknown",
    },
  ])
    assert.throws(() => core.validateSend(input));
  assert.equal(
    core.validateSend({
      conversation_id: id,
      request_id: id,
      message: " hola ",
    }).message,
    "hola"
  );
});
test("person eligibility enforces activity, age, distance, genders and answer filters", () => {
  assert.equal(core.matchesPerson(person, {}, own, {}), true);
  assert.equal(
    core.matchesPerson({ ...person, is_active: false }, {}, own, {}),
    false
  );
  assert.equal(core.matchesPerson({ ...person, id: "me" }, {}, own, {}), false);
  assert.equal(
    core.matchesPerson(person, {}, own, { discover_age_max: 20 }),
    false
  );
  assert.equal(
    core.matchesPerson({ ...person, latitude: null }, {}, own, {
      discover_distance_max_km: 100,
    }),
    false
  );
  assert.equal(
    core.matchesPerson(person, {}, own, { discover_genders: ["man"] }),
    false
  );
  assert.equal(
    core.matchesPerson(person, { height_cm: 170 }, own, {
      discover_answer_filters: { heightMin: ["180"] },
    }),
    false
  );
  assert.equal(
    core.matchesPerson(
      person,
      { profile_answers: { hobbies: ["Correr"] } },
      own,
      { discover_answer_filters: { hobbies: ["Correr"] } }
    ),
    true
  );
});
test("person eligibility normalizes legacy diet, gender, smoking and spiritual paths", () => {
  const p = {
    gender: "No binario",
    vegetarian: "Sí",
    smoking: "A veces",
    spiritual_path: ["Art of Living"],
  };
  assert.equal(
    core.matchesPerson(person, p, own, {
      discover_genders: ["other"],
      discover_diets: ["vegetarian"],
      discover_smoking: "occasionally",
      discover_spiritual_paths: ["El Arte de Vivir"],
    }),
    true
  );
});
test("events must be future, have capacity, be unjoined and have an allowed creator", () => {
  const event = {
    id,
    created_by: "host",
    type: "event",
    starts_at: "2030-01-01",
    capacity: 10,
    participant_count: 9,
  };
  const creators = new Set(["host"]);
  assert.equal(core.visibleActivity(event, "event", new Set(), creators), true);
  for (const changes of [
    { participant_count: 10 },
    { starts_at: "2020-01-01" },
    { created_by: "blocked" },
    { type: "challenge" },
  ])
    assert.equal(
      core.visibleActivity(
        { ...event, ...changes },
        "event",
        new Set(),
        creators
      ),
      false
    );
  assert.equal(
    core.visibleActivity(event, "event", new Set([id]), creators),
    false
  );
});
test("private and finished challenges never enter the catalog", () => {
  const c = { id, created_by: "host", visibility: "public", duration_days: 7 };
  const creators = new Set(["host"]);
  assert.equal(core.visibleActivity(c, "challenge", new Set(), creators), true);
  for (const visibility of ["private", "friends"])
    assert.equal(
      core.visibleActivity(
        { ...c, visibility },
        "challenge",
        new Set(),
        creators
      ),
      false
    );
  assert.equal(
    core.visibleActivity(
      { ...c, description: "[[starts_at:2020-01-01]]" },
      "challenge",
      new Set(),
      creators
    ),
    false
  );
});
test("model IDs, category and duplicate cards are strictly validated; presentation comes from DB", () => {
  const valid = {
    text: "Encontré una opción.",
    category: "event",
    recommendations: [
      {
        id,
        type: "event",
        reason: "Coincide con yoga",
        title: "Inventado",
        thumbnail: "https://evil.test",
      },
    ],
  };
  const result = core.parseModelResponse(JSON.stringify(valid), [c]);
  assert.equal(result.recommendations[0].title, "Yoga");
  assert.equal(result.recommendations[0].thumbnail, c.thumbnail);
  for (const changed of [
    { ...valid, category: "person" },
    { ...valid, recommendations: [{ id: "fake", type: "event", reason: "x" }] },
    {
      ...valid,
      recommendations: [valid.recommendations[0], valid.recommendations[0]],
    },
    { ...valid, text: "" },
    { ...valid, recommendations: [null] },
  ])
    assert.throws(() => core.parseModelResponse(JSON.stringify(changed), [c]));
  assert.throws(() =>
    core.parseModelResponse(JSON.stringify(valid), [c], "person")
  );
  assert.throws(() => core.parseModelResponse("not json", [c]));
});
test("model context excludes photos, precise distance, contact and private state", () => {
  const context = core.preferenceContext({
    email: "secret",
    latitude: 123,
    moods: ["sad"],
    other_tags: ["Yoga"],
    profile_answers: { hobbies: ["Correr"], private: "secret" },
  });
  assert.equal(JSON.stringify(context).includes("secret"), false);
  const catalog = core.modelCatalog([{ ...c, distanceKm: 0.1 }]);
  assert.equal(catalog[0].thumbnail, undefined);
  assert.equal(catalog[0].distanceKm, undefined);
});
test("shortlist prioritizes requested interests over arbitrary database ordering", () => {
  const pool = Array.from({ length: 30 }, (_, i) => ({
    ...c,
    id: String(i),
    title: i === 29 ? "Correr" : "Pintar",
    description: "",
    tags: [],
  }));
  const list = core.shortlist(pool, {}, "Quiero correr");
  assert.equal(list.length, 24);
  assert.equal(list[0].id, "29");
});
test("provider sends bounded history and validates simulated JSON response", async () => {
  let payload;
  const reply = await provider.generateReply({
    key: "test-only",
    model: "test",
    message: "Yoga",
    previousCategory: null,
    history: [],
    preferences: {},
    candidates: [c],
    fetcher: async (url, options) => {
      payload = JSON.parse(options.body);
      assert.equal(url, "https://api.deepseek.com/chat/completions");
      return new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  text: "Una opción para vos.",
                  category: "event",
                  recommendations: [{ id, type: "event", reason: "Yoga" }],
                }),
              },
            },
          ],
        })
      );
    },
  });
  assert.equal(reply.recommendations.length, 1);
  assert.equal(payload.response_format.type, "json_object");
});
test("provider rejects empty, truncated and unavailable replies", async () => {
  for (const response of [
    new Response("{}", { status: 429 }),
    new Response(
      JSON.stringify({
        choices: [{ finish_reason: "length", message: { content: "{}" } }],
      })
    ),
    new Response(
      JSON.stringify({
        choices: [{ finish_reason: "stop", message: { content: "" } }],
      })
    ),
  ])
    await assert.rejects(() =>
      provider.generateReply({
        key: "test",
        model: "test",
        message: "hi",
        previousCategory: null,
        history: [],
        preferences: {},
        candidates: [],
        fetcher: async () => response,
      })
    );
});

const handlerModule = {};
load("supabase/functions/vibi-chat/handler.ts", handlerModule, {
  "https://esm.sh/@supabase/supabase-js@2.117.2": {},
  "./core.ts": core,
  "./provider.ts": provider,
  "./prompts.ts": prompts,
  "./catalog.ts": {
    loadCatalog: async () => ({ candidates: [c], preferences: {} }),
    hydrateCards: async (_db, cards, catalog) =>
      cards.flatMap((card) => {
        const found = catalog.find(
          (c) => c.id === card.id && c.type === card.type
        );
        return found ? [{ ...found, reason: card.reason }] : [];
      }),
  },
});
function fakeBackend({ validAuth = true, configured = true } = {}) {
  const tables = {
    profiles: [{ id, is_active: true, deleted_at: null }],
    vibi_conversations: [{ id, user_id: id, category: null }],
    vibi_exchanges: [],
  };
  let generations = 0;
  const db = {
    auth: {
      getUser: async () => ({
        data: { user: validAuth ? { id } : null },
        error: null,
      }),
    },
    from(table) {
      let mode = "select",
        payload,
        single = false,
        filters = [],
        maximum = Infinity;
      const query = {
        select() {
          return query;
        },
        eq(k, v) {
          filters.push((r) => r[k] === v);
          return query;
        },
        lt(k, v) {
          filters.push((r) => r[k] < Number(v));
          return query;
        },
        order() {
          return query;
        },
        limit(n) {
          maximum = n;
          return query;
        },
        single() {
          single = true;
          return query;
        },
        maybeSingle() {
          single = true;
          return query;
        },
        update(value) {
          mode = "update";
          payload = value;
          return query;
        },
        upsert() {
          return query;
        },
        delete() {
          mode = "delete";
          return query;
        },
        then(resolve, reject) {
          const matched = tables[table]
            .filter((r) => filters.every((f) => f(r)))
            .slice(0, maximum);
          if (mode === "update")
            matched.forEach((r) => Object.assign(r, payload));
          if (mode === "delete")
            tables[table] = tables[table].filter((r) => !matched.includes(r));
          return Promise.resolve({
            data: single ? matched[0] ?? null : matched,
            error: null,
          }).then(resolve, reject);
        },
      };
      return query;
    },
    async rpc(name, args) {
      if (name === "vibi_claim") return { data: true, error: null };
      const row = {
        id: tables.vibi_exchanges.length + 1,
        conversation_id: args.p_conversation_id,
        request_id: args.p_request_id,
        user_text: args.p_user_text,
        assistant_text: args.p_assistant_text,
        category: args.p_category,
        recommendations: args.p_recommendations,
      };
      tables.vibi_exchanges.push(row);
      return { data: row, error: null };
    },
  };
  const handler = handlerModule.createHandler({
    client: () => db,
    env: (name) =>
      name === "DEEPSEEK_API_KEY" && !configured ? undefined : "fixture",
    generate: async () => {
      generations++;
      return {
        text: "Una opción para vos.",
        category: "event",
        recommendations: [{ ...c, reason: "Yoga" }],
      };
    },
  });
  const call = (body, authorization = "Bearer fixture") =>
    handler(
      new Request("https://test.local", {
        method: "POST",
        headers: { Authorization: authorization },
        body: JSON.stringify(body),
      })
    );
  return { handler, call, tables, generations: () => generations };
}
test("handler rejects missing/invalid authentication before reading messages", async () => {
  for (const validAuth of [true, false]) {
    const backend = fakeBackend({ validAuth });
    const response = await backend.call(
      { action: "history" },
      validAuth ? "" : "Bearer invalid"
    );
    assert.equal(response.status, 401);
    assert.equal(backend.generations(), 0);
  }
});
test("missing provider key preserves history and does not persist a failed exchange", async () => {
  const backend = fakeBackend({ configured: false });
  assert.equal((await backend.call({ action: "history" })).status, 200);
  const response = await backend.call({
    action: "send",
    conversation_id: id,
    request_id: id,
    message: "Hola",
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "not_configured");
  assert.equal(backend.tables.vibi_exchanges.length, 0);
  assert.equal(backend.generations(), 0);
});
test("completed send is persisted atomically and duplicate request reuses the same exchange", async () => {
  const backend = fakeBackend();
  const body = {
    action: "send",
    conversation_id: id,
    request_id: id,
    message: "Quiero yoga",
    user_id: "attacker-supplied-id",
  };
  const first = await backend.call(body);
  assert.equal(first.status, 200);
  const second = await backend.call(body);
  assert.equal(second.status, 200);
  assert.equal(backend.generations(), 1);
  assert.equal(backend.tables.vibi_exchanges.length, 1);
  assert.equal(
    (await first.json()).exchange.id,
    (await second.json()).exchange.id
  );
  assert.equal(
    (await (await backend.call({ action: "history" })).json()).exchanges.length,
    1
  );
});
test("another conversation ID cannot reach provider or history writes", async () => {
  const backend = fakeBackend();
  const response = await backend.call({
    action: "send",
    conversation_id: "00000000-0000-4000-8000-000000000002",
    request_id: id,
    message: "hola",
  });
  assert.equal(response.status, 409);
  assert.equal(backend.generations(), 0);
});
const ui = {};
load("src/lib/vibi.ts", ui);
test("client history merge deduplicates a response recovered after timeout", () => {
  const a = { id: 1, request_id: "a", assistant_text: "old" },
    b = { id: 2, request_id: "b" };
  const result = ui.mergeVibiExchanges(
    [b, a],
    [{ ...a, assistant_text: "current" }]
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].assistant_text, "current");
  assert.equal(result[1].id, 2);
});

const catalogModule = {};
load("supabase/functions/vibi-chat/catalog.ts", catalogModule, {
  "./core.ts": core,
});
test("catalog excludes both block directions, recent passes, likes and joined activities", async () => {
  const people = [
    "me",
    "visible",
    "blocked-by-me",
    "blocked-me",
    "liked",
    "recent-pass",
    "old-pass",
  ];
  const records = {
    profiles: people.map((id) => ({ ...person, id, display_name: id })),
    user_preferences: people.map((user_id) => ({
      user_id,
      other_tags: ["Yoga"],
    })),
    user_blocks: [
      { id: "b1", blocker_id: "me", blocked_user_id: "blocked-by-me" },
      { id: "b2", blocker_id: "blocked-me", blocked_user_id: "me" },
    ],
    swipes: [
      {
        id: "s1",
        swiper_id: "me",
        target_id: "liked",
        direction: "like",
        created_at: "2020-01-01",
      },
      {
        id: "s2",
        swiper_id: "me",
        target_id: "recent-pass",
        direction: "nope",
        created_at: new Date().toISOString(),
      },
      {
        id: "s3",
        swiper_id: "me",
        target_id: "old-pass",
        direction: "nope",
        created_at: "2020-01-01",
      },
    ],
    events: [
      {
        id: "available-event",
        type: "event",
        created_by: "visible",
        title: "Yoga",
        starts_at: "2030-01-01",
        capacity: 10,
        participant_count: 0,
      },
      {
        id: "blocked-event",
        type: "event",
        created_by: "blocked-me",
        starts_at: "2030-01-01",
        capacity: 10,
        participant_count: 0,
      },
      {
        id: "joined-event",
        type: "event",
        created_by: "visible",
        starts_at: "2030-01-01",
        capacity: 10,
        participant_count: 0,
      },
    ],
    challenges: [
      {
        id: "available-challenge",
        created_by: "visible",
        title: "Yoga",
        visibility: "public",
      },
      { id: "joined-challenge", created_by: "visible", visibility: "public" },
      { id: "private-challenge", created_by: "visible", visibility: "private" },
    ],
    event_participants: [
      {
        id: "j1",
        user_id: "me",
        event_id: "joined-event",
        event_type: "event",
      },
    ],
    challenge_participants: [
      { id: "j2", user_id: "me", challenge_id: "joined-challenge" },
    ],
    profile_photos: [],
  };
  const db = catalogDatabase(records);
  const catalog = await catalogModule.loadCatalog(db, "me");
  assert.deepEqual(Array.from(catalog.candidates, (c) => c.id).sort(), [
    "available-challenge",
    "available-event",
    "old-pass",
    "visible",
  ]);
});
test("historical cards are rehydrated from current eligible data and stale cards disappear", async () => {
  const cards = await catalogModule.hydrateCards(
    {},
    [
      { id, type: "event", title: "old", reason: "Yoga" },
      { id: "hidden", type: "person", reason: "old" },
    ],
    [{ ...c, title: "Current title" }]
  );
  assert.equal(cards.length, 1);
  assert.equal(cards[0].title, "Current title");
  assert.equal(cards[0].destination.id, id);
});

function catalogDatabase(records) {
  return {
    from(table) {
      let filters = [],
        single = false,
        start = 0,
        end = Infinity;
      const query = {
        select() {
          return query;
        },
        order() {
          return query;
        },
        eq(k, v) {
          filters.push((r) => r[k] === v);
          return query;
        },
        is(k, v) {
          filters.push((r) => r[k] === v);
          return query;
        },
        gt(k, v) {
          filters.push((r) => r[k] > v);
          return query;
        },
        in(k, v) {
          filters.push((r) => v.includes(r[k]));
          return query;
        },
        or() {
          return query;
        },
        range(a, b) {
          start = a;
          end = b;
          return query;
        },
        maybeSingle() {
          single = true;
          return query;
        },
        then(resolve, reject) {
          const data = records[table]
            .filter((r) => filters.every((f) => f(r)))
            .slice(start, end === Infinity ? undefined : end + 1);
          return Promise.resolve({
            data: single ? data[0] ?? null : data,
            error: null,
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

test("catalog includes public unjoined activities created by the requesting user", async () => {
  // Minimal reproduction of the live account: its unjoined public activities
  // are created by that same account, which must not make the catalog empty.
  const records = {
    profiles: [{ ...person, id: "me", display_name: "Me" }],
    user_preferences: [{ user_id: "me" }],
    user_blocks: [],
    swipes: [],
    events: [
      {
        id: "own-event",
        type: "event",
        created_by: "me",
        title: "Mantras",
        starts_at: "2099-10-03T22:00:00Z",
        capacity: 60,
        participant_count: 0,
      },
    ],
    challenges: [
      {
        id: "own-challenge",
        created_by: "me",
        title: "Caminar",
        visibility: "public",
        duration_days: 40,
      },
    ],
    event_participants: [],
    challenge_participants: [],
    profile_photos: [],
  };
  const result = await catalogModule.loadCatalog(
    catalogDatabase(records),
    "me"
  );
  assert.deepEqual(Array.from(result.candidates, (c) => c.id).sort(), [
    "own-challenge",
    "own-event",
  ]);
});

test("explicit event request never accepts the captured generic category question", async () => {
  let calls = 0;
  const result = await provider.generateReply({
    key: "fixture",
    model: "fixture",
    message: "Listame todos los eventos futuros",
    previousCategory: null,
    history: [],
    preferences: {},
    candidates: [c],
    fetcher: async () => {
      calls++;
      const captured =
        calls === 1
          ? {
              text: "¿Buscás desafíos, eventos o personas?",
              category: null,
              recommendations: [],
            }
          : {
              text: "Encontré esta opción disponible.",
              category: "event",
              recommendations: [
                { id, type: "event", reason: "Es un evento futuro" },
              ],
            };
      return new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(captured) },
            },
          ],
        })
      );
    },
  });
  assert.equal(result.category, "event");
  assert.equal(result.recommendations.length, 1);
  assert.equal(calls, 2);
});

test("explicit category guard leaves mixed, negated and implicit intents to the model", () => {
  assert.equal(
    core.requestedCategory("Listame todos los eventos futuros"),
    "event"
  );
  assert.equal(core.requestedCategory("Quiero desafíos"), "challenge");
  assert.equal(core.requestedCategory("Busco personas"), "person");
  assert.equal(core.requestedCategory("Eventos o desafíos"), undefined);
  assert.equal(
    core.requestedCategory("No quiero eventos, quiero desafíos"),
    undefined
  );
  assert.equal(core.requestedCategory("Quiero ir a un recital"), undefined);
});
test("provider sends the actual request last as text, apart from catalog data and history", async () => {
  await provider.generateReply({
    key: "fixture",
    model: "fixture",
    message: "Listame todos los eventos futuros",
    previousCategory: "person",
    history: [
      {
        user_text: "Hola",
        assistant_text: "¿Buscás desafíos, eventos o personas?",
        category: null,
      },
    ],
    preferences: {},
    candidates: [c],
    fetcher: async (_url, options) => {
      const payload = JSON.parse(options.body);
      assert.equal(payload.messages.at(-1).role, "user");
      assert.equal(
        payload.messages.at(-1).content,
        "Listame todos los eventos futuros"
      );
      assert.match(payload.messages[1].content, /CONTEXTO DE VIBES/);
      assert.match(payload.messages[0].content, /category=event/);
      return new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  text: "Una opción disponible.",
                  category: "event",
                  recommendations: [{ id, type: "event", reason: "Es futuro" }],
                }),
              },
            },
          ],
        })
      );
    },
  });
});
