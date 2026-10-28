const {test}=require('node:test');const assert=require('node:assert/strict');
const {load}=require('./helpers/load-pure-ts.cjs');
const api=load('supabase/functions/_shared/communities.ts');
const onboarding=load('src/screens/Onboarding/vibesOnboardingContent.ts');
test('onboarding and every shared filter offer the requested communities including Otros',()=>{
 assert.deepEqual(Array.from(api.COMMUNITY_OPTIONS),['El Arte de Vivir','Danzantes','Ashtanga','Hatha','Meditación','Bikram','Músicos','Artistas','Servicio','Otros']);
 assert.deepEqual(Array.from(onboarding.PRACTICE_OPTIONS),Array.from(api.COMMUNITY_OPTIONS));
});
test('legacy labels normalize and meditation normalize while generic Yoga stays unassigned',()=>{
 assert.deepEqual(Array.from(api.readCommunities(['Art of Living','Hatha Yoga','Música','Contact','Meditacion trasendental','Yoga','Meditación'])),['El Arte de Vivir','Danzantes','Hatha','Meditación','Músicos']);
});
test('several selected communities use OR and exclude unassigned content',()=>{
 const selected=['Hatha','Músicos'];
 assert.equal(api.matchesCommunities({tags:['Hatha Yoga']},selected),true);
 assert.equal(api.matchesCommunities({communities:['Músicos','Servicio']},selected),true);
 assert.equal(api.matchesCommunities({tags:['Ashtanga']},selected),false);
 assert.equal(api.matchesCommunities({tags:['gratis']},selected),false);
 assert.equal(api.matchesCommunities({},selected),false);
 assert.equal(api.matchesCommunities({tags:['Servicio']},[]),true);
});
test('preferences drive defaults and community descriptions are not guessed',()=>{
 assert.deepEqual(Array.from(api.defaultCommunities({spiritual_path:['Art of Living','Hatha Yoga']})),['El Arte de Vivir','Hatha']);
 assert.deepEqual(Array.from(api.defaultCommunities({communities:[],spiritual_path:['Hatha']})),['Hatha']);
 assert.equal(api.matchesCommunities({description:'Un encuentro con músicos de Ashtanga'},['Servicio']),false);
 assert.equal(api.matchesCommunities({communities:['Ashtanga'],tags:['Servicio']},['Servicio']),false);
});

test('previous transcendental meditation selections map to Meditación',()=>{
 assert.deepEqual(Array.from(api.readCommunities(['Meditación trascendental','Meditacion trasendental','Meditación'])),['Meditación']);
 assert.equal(api.matchesCommunities({communities:['Meditación trascendental']},['Meditación']),true);
});

test('Comunidad reads the original Camino fields and details before alternate community data',()=>{
 assert.deepEqual(Array.from(api.defaultCommunities({spiritual_path:['Art of Living'],communities:['Bikram'],spiritual_path_details:{'Meditación trascendental':{role:'Alumno'}}})),['El Arte de Vivir','Meditación']);
 assert.deepEqual(Array.from(api.contentCommunities({spiritualPath:['Hatha'],communities:[]})),['Hatha']);
 assert.deepEqual(Array.from(api.defaultCommunities({spiritual_path:[],communities:['Bikram']})),[]);
});

test('no selection still includes profiles without Camino, selected community excludes them',()=>{
 const michelle={spiritual_path:[],spiritual_path_details:{}};
 assert.equal(api.matchesCommunities(michelle,[]),true);
 assert.equal(api.matchesCommunities(michelle,['El Arte de Vivir']),false);
});
