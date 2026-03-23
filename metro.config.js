const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [...config.resolver.assetExts, 'lottie'];
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== 'lottie');

module.exports = config;
