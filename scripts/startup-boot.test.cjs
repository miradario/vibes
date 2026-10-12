const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const boot = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/startupBoot.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: boot, setTimeout, clearTimeout });

test('an auth request that never settles releases the boot pipeline', async () => {
  const never = new Promise(() => {});
  await assert.rejects(
    boot.withBootTimeout(never, 10, 'startup auth validation'),
    /startup auth validation timed out/
  );
});

test('successful validation preserves the user and soft-delete metadata', async () => {
  const response = { data: { user: { id: 'qa', app_metadata: { vibes_soft_deleted: true } } } };
  assert.equal(await boot.withBootTimeout(Promise.resolve(response), 100, 'auth'), response);
});

test('network errors propagate immediately instead of waiting for the deadline', async () => {
  const offline = new Error('Offline');
  await assert.rejects(boot.withBootTimeout(Promise.reject(offline), 100, 'auth'), error => error === offline);
});

test('late network rejection after timeout is handled', async () => {
  let rejectRequest;
  const request = new Promise((_, reject) => { rejectRequest = reject; });
  await assert.rejects(boot.withBootTimeout(request, 5, 'auth'), /timed out/);
  rejectRequest(new Error('late rejection'));
  await new Promise(resolve => setImmediate(resolve));
});
