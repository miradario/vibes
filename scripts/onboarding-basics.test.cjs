const pureTs = require('./helpers/load-pure-ts.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const load = file => {
  const api = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports: api, require: name => pureTs.dependency(file,name) });
  return api;
};
const basics = load('src/lib/onboardingBasics.ts');
test('only first name is required; surname, description and photo are optional', () => {
  assert.equal(basics.hasOnboardingBasics('Ana', 'Pérez'), true);
  assert.equal(basics.hasOnboardingBasics('', 'Pérez'), false);
  assert.equal(basics.hasOnboardingBasics('Ana', '  '), true);
});
test('compound names are preserved when combining and restoring older drafts', () => {
  assert.equal(basics.onboardingFullName(' Ana María ', ' Pérez López '), 'Ana María Pérez López');
  assert.equal(basics.splitOnboardingName(' Ana Pérez López ').lastName, 'Pérez López');
  assert.equal(basics.splitOnboardingName().lastName, '');
});
test('the decision to continue comes immediately after basics, before every optional question', () => {
  const { VIBES_ONBOARDING_STEPS: steps } = load('src/screens/Onboarding/vibesOnboardingContent.ts');
  assert.equal(steps[0], 'profileText');
  assert.equal(steps[1], 'profile');
  assert.equal(steps[2], 'continueChoice');
  for (const name of ['purpose', 'location', 'practices', 'identity', 'interests'])
    assert.ok(steps.indexOf(name) > steps.indexOf('continueChoice'));
  assert.equal(steps[steps.length - 1], 'completion');
});
