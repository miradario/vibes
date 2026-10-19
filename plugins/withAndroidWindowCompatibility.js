const { withAndroidManifest, withAndroidStyles, withProjectBuildGradle, withGradleProperties } = require('expo/config-plugins');

module.exports = function withAndroidWindowCompatibility(config) {
  config = withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const application = manifest.application[0];
    const main = application.activity.find(activity => activity.$['android:name'] === '.MainActivity');
    if (main) {
      delete main.$['android:screenOrientation'];
      main.$['android:resizeableActivity'] = 'true';
    }
    const name = 'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity';
    let scanner = application.activity.find(activity => activity.$['android:name'] === name);
    if (!scanner) application.activity.push(scanner = { $: { 'android:name': name } });
    delete scanner.$['android:screenOrientation'];
    scanner.$['tools:remove'] = 'android:screenOrientation';
    scanner.$['android:resizeableActivity'] = 'true';
    return config;
  });
  config = withAndroidStyles(config, config => {
    for (const style of config.modResults.resources.style ?? []) {
      if (style.$.name === 'AppTheme') style.item = (style.item ?? []).filter(item => !['android:statusBarColor', 'android:navigationBarColor'].includes(item.$.name));
    }
    return config;
  });
  config = withProjectBuildGradle(config, config => {
    config.modResults.contents = config.modResults.contents.replace(/classpath\(['"]com.android.tools.build:gradle(?::[^'"]+)?['"]\)/, "classpath('com.android.tools.build:gradle:8.13.2')");
    return config;
  });
  return withGradleProperties(config, config => {
    config.modResults = config.modResults.filter(item => item.key !== 'android.r8.optimizedResourceShrinking');
    config.modResults.push({type:'property',key:'android.r8.optimizedResourceShrinking',value:'true'});
    return config;
  });
};
