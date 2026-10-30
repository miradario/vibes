const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./helpers/load-pure-ts.cjs');
const {eventPlaces}=load('src/lib/eventPlaces.ts');
test('deduplicates addresses and prefers the entry with map coordinates',()=>{
 const places=eventPlaces([{location:' Costa Rica 5640 '},{location:'costa rica 5640',locationLatitude:-34.58,locationLongitude:-58.43}]);
 assert.equal(places.length,1); assert.equal(places[0].lat,-34.58); assert.equal(places[0].lng,-58.43);
});
test('ignores empty and online locations and searches without accents',()=>{
 const places=eventPlaces([{location:''},{location:'Online',modality:'online'},{location:'Córdoba 123'},{location:'Costa Rica 5640'}],'cordoba');
 assert.equal(places.length,1); assert.equal(places[0].address,'Córdoba 123');
});
test('does not fabricate coordinates from an incomplete location',()=>{
 const places=eventPlaces([{location:'Costa Rica 5640',locationLatitude:-34.58}]);
 assert.equal(places[0].lat,null); assert.equal(places[0].lng,null);
});
