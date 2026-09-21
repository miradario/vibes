const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('supabase/functions/open-email-verification/handler.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exportsForTest, URL, Response });
const handle = exportsForTest.openEmailVerification;
const token = 'test_token_0123456789abcdef';
const endpoint = 'https://example.com/open-email-verification';
test('HTTPS link preserves the token and opens only the fixed Vibes verification route', () => {
  const response = handle(new Request(`${endpoint}?token_hash=${token}&redirect_to=https://evil.example`));
  assert.equal(response.status, 302);
  const target = new URL(response.headers.get('location'));
  assert.equal(target.protocol, 'com.gurudevelopers.vibes:');
  assert.equal(target.hostname, 'verify-email');
  assert.equal(target.searchParams.get('token_hash'), token);
  assert.equal(target.searchParams.get('type'), 'email');
  assert.equal(target.searchParams.has('redirect_to'), false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('email scanners can GET or HEAD repeatedly without consuming the token', () => {
  for (const method of ['HEAD', 'GET', 'GET']) {
    const response = handle(new Request(`${endpoint}?token_hash=${token}`, { method }));
    assert.equal(response.status, 302);
    assert.equal(response.body, null);
  }
});
test('rejects missing, malformed tokens and unsupported methods', () => {
  for (const invalid of ['', 'short', '<script>alert(1)</script>', 'x'.repeat(1025)]) {
    assert.equal(handle(new Request(`${endpoint}?token_hash=${encodeURIComponent(invalid)}`)).status, 400);
  }
  assert.equal(handle(new Request(`${endpoint}?token_hash=${token}`, { method: 'POST' })).status, 405);
});
test('the email button uses HTTPS and retains Supabase token substitution', () => {
  const template = fs.readFileSync('supabase/templates/magic_link.html', 'utf8');
  assert.match(template, /href="https:\/\/mhmpjezgdvnqyqsnabuq\.supabase\.co\/functions\/v1\/open-email-verification\?token_hash=\{\{ \.TokenHash \}\}"/);
});
