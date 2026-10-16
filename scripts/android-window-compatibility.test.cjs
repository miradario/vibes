const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function mods() {
  const callbacks = {};
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync('plugins/withAndroidWindowCompatibility.js','utf8'),{module,require:()=>Object.fromEntries(['withAndroidManifest','withAndroidStyles','withProjectBuildGradle','withGradleProperties'].map(name=>[name,(config,callback)=>{callbacks[name]=callback;return config;}]))});
  module.exports({});
  return callbacks;
}
test('allows main activity resizing and removes portrait from the merged scanner activity',()=>{
  const manifest = {$:{},application:[{activity:[{$:{'android:name':'.MainActivity','android:screenOrientation':'portrait'}}]}]};
  mods().withAndroidManifest({modResults:{manifest}});
  const activities=manifest.application[0].activity;
  assert.equal(activities[0].$['android:screenOrientation'],undefined);
  assert.equal(activities[0].$['android:resizeableActivity'],'true');
  assert.equal(activities[1].$['tools:remove'],'android:screenOrientation');
});
test('removes obsolete app theme bar colors without changing splash settings',()=>{
 const app={ $:{name:'AppTheme'},item:[{$:{name:'android:statusBarColor'}},{$:{name:'android:navigationBarColor'}},{$:{name:'colorPrimary'}}]};
 const splash={$:{name:'Theme.App.SplashScreen'},item:[{$:{name:'windowSplashScreenBackground'}}]};
 mods().withAndroidStyles({modResults:{resources:{style:[app,splash]}}});
 assert.equal(app.item.length,1);assert.equal(splash.item.length,1);
});
test('prebuild pins the tested AGP and keeps one optimized-shrinking property',()=>{
 const callbacks=mods();
 const gradle={modResults:{contents:"classpath('com.android.tools.build:gradle')"}};
 callbacks.withProjectBuildGradle(gradle);
 assert.ok(gradle.modResults.contents.includes('gradle:8.13.2'));
 const props={modResults:[{type:'property',key:'android.r8.optimizedResourceShrinking',value:'false'}]};
 callbacks.withGradleProperties(props);callbacks.withGradleProperties(props);
 assert.equal(props.modResults.length,1);assert.equal(props.modResults[0].value,'true');
});
