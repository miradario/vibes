const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const loadSocialShare = () => {
  const calls = [];
  const source = ts.transpileModule(
    fs.readFileSync("src/lib/socialShare.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const output = {};

  vm.runInNewContext(source, {
    exports: output,
    require(name) {
      if (name === "react-native") {
        return {
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

test("challenge share sends one native URL item to Messages", async () => {
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
  assert.deepEqual(Object.keys(calls[0]), ["message", "url"]);
  const url =
    "https://vibes.gurudevelopers.dev/challenge/challenge-1";
  assert.equal(calls[0].url, url);
  assert.equal(calls[0].message.includes(url), false);
});
