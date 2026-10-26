const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const loadSocialShare = (platform = "ios") => {
  const calls = [];
  const source = ts.transpileModule(
    fs.readFileSync("src/lib/socialShare.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const output = {};

  vm.runInNewContext(source, {
    exports: output,
    require(name) {
      if (name === "expo-sharing") return {
        isAvailableAsync: async () => true,
        shareAsync: async (uri, options) => { calls.push({ uri, ...options }); },
      };
      if (name === "react-native") {
        return {
          Platform: { OS: platform },
          Share: {
            share(content) {
              calls.push(content);
              return Promise.resolve({ action: "sharedAction" });
            },
          },
        };
      }
      return {};
    },
  });

  return { socialShare: output, calls };
};

test("challenge progress share includes its URL in text for every share destination", async () => {
  const { socialShare, calls } = loadSocialShare();
  const challenge = {
    id: "challenge-1",
    type: "challenge",
    title: "Leer 10 páginas por día",
    subtitle: "Leer un poco cada día",
    visibility: "public",
    durationDays: 21,
  };

  await socialShare.shareChallengeProgress(challenge, {
    currentDay: 10,
    totalDays: 21,
    streak: 6,
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(Object.keys(calls[0]), ["message"]);
  const url =
    "https://vibes.gurudevelopers.dev/challenge/challenge-1";
  assert.equal(calls[0].url, undefined);
  assert.equal(calls[0].message.includes(url), true);
});

test("challenge invitation includes its URL in text for every share destination", async () => {
  const { socialShare, calls } = loadSocialShare();
  const challenge = {
    id: "challenge-2",
    type: "challenge",
    title: "Respirar cada mañana",
    visibility: "public",
  };

  await socialShare.shareChallengeInvite(challenge);

  const url = "https://vibes.gurudevelopers.dev/challenge/challenge-2";
  assert.equal(calls[0].url, undefined);
  assert.equal(calls[0].message.includes(url), true);
});

test("iOS completion shares the PNG with the message and public link", async () => {
  const { socialShare, calls } = loadSocialShare("ios");
  await socialShare.shareChallengeCompletion({ id: "one", type: "challenge" }, "Lo logré", "file:///completion.png");
  assert.equal(calls[0].url, "file:///completion.png");
  assert.equal(calls[0].message, "Lo logré\nhttps://vibes.gurudevelopers.dev/challenge/one");
});
test("Android completion sends the PNG as an image attachment", async () => {
  const { socialShare, calls } = loadSocialShare("android");
  await socialShare.shareChallengeCompletion({ id: "one", type: "challenge" }, "Lo logré", "file:///completion.png");
  assert.equal(calls[0].uri, "file:///completion.png");
  assert.equal(calls[0].mimeType, "image/png");
});
