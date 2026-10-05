const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [...config.resolver.assetExts, "lottie", "glb"];
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== "lottie"
);

// Native Fiber uses CommonJS and GLTFLoader uses ESM. Force one Three module
// so both share constructors, caches and the native loader adaptations.
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "three") {
    return { type: "sourceFile", filePath: require.resolve("three") };
  }
  return resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
