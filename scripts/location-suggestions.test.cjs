const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/lib/locationSuggestions.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const lib = {};
vm.runInNewContext(code, { exports: lib, Math, JSON, String, Array });

test('only searches from 3 meaningful characters', () => {
  assert.equal(lib.shouldSearchLocation('  Pa '), false);
  assert.equal(lib.shouldSearchLocation('Pal'), true);
  assert.equal(lib.normalizeLocationQuery('  Av.   Santa  Fe '), 'Av. Santa Fe');
});

test('autocomplete body is biased to Argentina in Spanish', () => {
  const body = lib.buildAutocompleteBody(' Palermo ', 'tok', { latitude: -34, longitude: -58, radiusMeters: 999999 });
  assert.equal(body.input, 'Palermo');
  assert.equal(body.regionCode, 'ar');
  assert.equal(body.languageCode, 'es');
  assert.equal(body.locationBias.circle.radius, 50000);
});

test('parses Places autocomplete predictions', () => {
  const list = lib.parseAutocompleteResponse({ suggestions: [
    { placePrediction: { placeId: 'abc', text: { text: 'Plaza Serrano, Palermo, CABA' }, structuredFormat: { mainText: { text: 'Plaza Serrano' }, secondaryText: { text: 'Palermo, CABA' } } } },
    { queryPrediction: { text: { text: 'yoga' } } },
  ] });
  assert.equal(list.length, 1);
  assert.equal(list[0].primaryText, 'Plaza Serrano');
  assert.equal(list[0].secondaryText, 'Palermo, CABA');
  assert.equal(list[0].lat, undefined);
});

test('geocode fallback suggestions already carry coordinates', () => {
  const list = lib.parseGeocodeResponse({ status: 'OK', results: [
    { place_id: 'p1', formatted_address: 'Honduras 4800, Palermo, CABA, Argentina', geometry: { location: { lat: -34.58, lng: -58.43 } } },
  ] });
  assert.equal(list[0].primaryText, 'Honduras 4800');
  assert.equal(list[0].lat, -34.58);
  assert.equal(lib.parseGeocodeResponse({ status: 'ZERO_RESULTS', results: [] }).length, 0);
});

test('detects a key without Places API enabled', () => {
  assert.equal(lib.isPlacesUnavailableResponse(403, null), true);
  assert.equal(lib.isPlacesUnavailableResponse(400, { error: { status: 'PERMISSION_DENIED' } }), true);
  assert.equal(lib.isPlacesUnavailableResponse(500, null), false);
});

test('formats native geocoder addresses', () => {
  const label = lib.formatNativeAddress({ street: 'Honduras', streetNumber: '4800', city: 'Buenos Aires', district: 'Palermo', country: 'Argentina' });
  assert.equal(label.primaryText, 'Honduras 4800');
  assert.equal(label.secondaryText, 'Palermo, Buenos Aires, Argentina');
});

test('suggestion country: profile, then device region, then AR', () => {
  const r = lib.resolveSuggestionCountry;
  assert.equal(r({ profileCountry: 'Uruguay', deviceLocale: 'es-AR' }).regionCode, 'uy');
  assert.equal(r({ profileCountry: 'Uruguay' }).source, 'profile');
  assert.equal(r({ profileCountry: 'España' }).regionCode, 'es');
  assert.equal(r({ profileLocationLabel: 'Providencia, Santiago, Chile' }).regionCode, 'cl');
  assert.equal(r({ profileCountry: 'MX' }).regionCode, 'mx');
  const device = r({ profileCountry: 'Atlantis', deviceLocale: 'pt-BR' });
  assert.equal(device.regionCode, 'br');
  assert.equal(device.source, 'device');
  assert.equal(r({ deviceLocale: 'es_419' }).source, 'default');
  const fallback = r({});
  assert.equal(fallback.regionCode, 'ar');
  assert.equal(fallback.source, 'default');
});

test('autocomplete restricts to the resolved country and can skip bias', () => {
  const body = lib.buildAutocompleteBody('Pocitos', 'tok', null, 'uy');
  assert.equal(body.includedRegionCodes[0], 'uy');
  assert.equal(body.regionCode, 'uy');
  assert.equal(body.locationBias, undefined);
});
