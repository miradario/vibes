const pureTs = require('./helpers/load-pure-ts.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const load = file => {
  const api = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8') + (file.endsWith('translations.ts') ? '\nexport { translations };' : ''), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports: api, require: name => pureTs.dependency(file,name) });
  return api;
};
const { translate, translations } = load('src/i18n/translations.ts');
const { VIBES_ONBOARDING_STEPS } = load('src/screens/Onboarding/vibesOnboardingContent.ts');

for (const locale of ['es-AR', 'es', 'en']) {
  test(`every onboarding step has localized copy in ${locale}`, () => {
    for (const step of VIBES_ONBOARDING_STEPS) {
      for (const field of ['title', 'subtitle', 'button']) {
        const key = `vibesOnboarding.${step}.${field}`;
        const value = translations[locale].vibesOnboarding[step]?.[field];
        assert.equal(typeof value, 'string', `${locale}: missing ${key}`);
        assert.ok(value.trim(), `${locale}: empty ${key}`);
        assert.notEqual(translate(locale, key), key);
      }
    }
  });
}
