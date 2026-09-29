const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/constants/eventClassification.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: api });

test('legacy and unknown classifications stay unset', () => {
  for (const value of [null, undefined, '', 'in_person', 'event', 'unsupported']) {
    assert.equal(api.parseEventCategory(value), null);
    assert.equal(api.parseEventParticipationType(value), null);
    assert.equal(api.getEventCategoryLabel(value), '');
    assert.equal(api.getEventParticipationLabel(value), '');
  }
});
test('activity and participation filters are independent and combine with AND', () => {
  const concert = { category: 'music', participationType: 'show' };
  const lesson = { category: 'music', participationType: 'workshop' };
  assert.equal(api.matchesEventClassification(concert, 'music', null), true);
  assert.equal(api.matchesEventClassification(lesson, 'music', null), true);
  assert.equal(api.matchesEventClassification(concert, 'music', 'workshop'), false);
  assert.equal(api.matchesEventClassification(lesson, 'music', 'workshop'), true);
  assert.equal(api.matchesEventClassification(lesson, 'wellness', 'workshop'), false);
  assert.equal(api.matchesEventClassification({}, null, null), true);
  assert.equal(api.matchesEventClassification({}, 'music', null), false);
});
test('all supported labels round-trip and are accepted by the database constraints', () => {
  const sql = fs.readFileSync('supabase/migrations/20260929120000_event_classification.sql', 'utf8');
  for (const option of api.EVENT_CATEGORIES) {
    assert.equal(api.parseEventCategory(option.id), option.id);
    assert.equal(api.getEventCategoryLabel(option.id), option.label);
    assert.ok(sql.includes(`'${option.id}'`));
  }
  for (const option of api.EVENT_PARTICIPATION_TYPES) {
    assert.equal(api.parseEventParticipationType(option.id), option.id);
    assert.equal(api.getEventParticipationLabel(option.id), option.label);
    assert.ok(sql.includes(`'${option.id}'`));
  }
});

test('modality combines with type and category and can be cleared independently', () => {
  const online = { category: 'learning', participationType: 'workshop', modality: 'online' };
  const inPerson = { ...online, modality: 'in_person' };
  assert.equal(api.matchesEventClassification(online, null, 'workshop', 'online'), true);
  assert.equal(api.matchesEventClassification(inPerson, null, 'workshop', 'online'), false);
  assert.equal(api.matchesEventClassification(online, 'music', 'workshop', 'online'), false);
  assert.equal(api.matchesEventClassification(online, null, 'show', 'online'), false);
  assert.equal(api.matchesEventClassification(inPerson, 'learning', 'workshop', null), true);
  assert.equal(api.matchesEventClassification({ modality: 'in_person' }, null, null, 'in_person'), true);
  assert.equal(api.matchesEventClassification({}, null, null, 'online'), false);
});
