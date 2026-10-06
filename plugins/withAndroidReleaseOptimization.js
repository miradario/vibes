const { withAppBuildGradle } = require("expo/config-plugins");

// Expo's generated Gradle file otherwise selects proguard-android.txt, which
// disables optimization even when release minification is enabled.
module.exports = function withAndroidReleaseOptimization(config) {
  return withAppBuildGradle(config, (config) => {
    const original = config.modResults.contents;
    const optimized = original.replace(
      /getDefaultProguardFile\((["'])proguard-android\.txt\1\)/g,
      'getDefaultProguardFile("proguard-android-optimize.txt")'
    );
    if (!optimized.includes("proguard-android-optimize.txt")) {
      throw new Error("Android release optimization: default ProGuard configuration not found.");
    }
    config.modResults.contents = optimized;
    return config;
  });
};
