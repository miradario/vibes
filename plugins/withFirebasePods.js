const { withPodfile } = require("@expo/config-plugins");

// Firebase v26 defaults to SPM; static Expo frameworks require CocoaPods.
module.exports = (config) =>
  withPodfile(config, (config) => {
    const flags =
      "$RNFirebaseDisableSPM = true\n$RNFirebaseAsStaticFramework = true";
    if (!config.modResults.contents.includes("$RNFirebaseDisableSPM")) {
      config.modResults.contents = `${flags}\n${config.modResults.contents}`;
    }
    return config;
  });
