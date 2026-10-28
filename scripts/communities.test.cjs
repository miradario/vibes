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
test('several selected communities use OR and always include unassigned content',()=>{
 const selected=['Hatha','Músicos'];
 assert.equal(api.matchesCommunities({tags:['Hatha Yoga']},selected),true);
 assert.equal(api.matchesCommunities({communities:['Músicos','Servicio']},selected),true);
 assert.equal(api.matchesCommunities({tags:['Ashtanga']},selected),false);
 assert.equal(api.matchesCommunities({tags:['gratis']},selected),true);
 assert.equal(api.matchesCommunities({},selected),true);
 assert.equal(api.matchesCommunities({tags:['Servicio']},[]),true);
});
test('preferences drive defaults and community descriptions are not guessed',()=>{
 assert.deepEqual(Array.from(api.defaultCommunities({spiritual_path:['Art of Living','Hatha Yoga']})),['El Arte de Vivir','Hatha']);
 assert.deepEqual(Array.from(api.defaultCommunities({communities:[],spiritual_path:['Hatha']})),[]);
 assert.equal(api.matchesCommunities({description:'Un encuentro con músicos de Ashtanga'},['Servicio']),true);
 assert.equal(api.matchesCommunities({communities:['Ashtanga'],tags:['Servicio']},['Servicio']),false);
});

test('previous transcendental meditation selections map to Meditación',()=>{
 assert.deepEqual(Array.from(api.readCommunities(['Meditación trascendental','Meditacion trasendental','Meditación'])),['Meditación']);
 assert.equal(api.matchesCommunities({communities:['Meditación trascendental']},['Meditación']),true);
});
