const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function flag(dev, local, remote) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/featureFlags/useClasesEnabled.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {
    exports, __DEV__:dev, process:{env:{EXPO_PUBLIC_LOCAL_CLASSES:local}},
    require: name => name === 'react' ? {useSyncExternalStore:(_subscribe,get)=>get()} : {clasesFlagStore:{subscribe(){},getSnapshot:()=>remote}},
  });
  return exports.useClasesEnabled();
}
test('local override enables classes only in development', () => {
  assert.equal(flag(true,'true',false),true);
  assert.equal(flag(false,'true',false),false);
  assert.equal(flag(true,undefined,false),false);
});
test('remote class flag still enables production and development', () => {
  assert.equal(flag(false,undefined,true),true);
  assert.equal(flag(true,undefined,true),true);
});
