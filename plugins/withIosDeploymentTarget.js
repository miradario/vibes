const { withPodfile } = require("@expo/config-plugins");

// CocoaPods resource bundles can retain a minimum older than Xcode supports.
const deploymentTargetFix = "\n    # Keep resource bundles compatible with the app's supported iOS versions.\n    minimum_ios = Gem::Version.new(podfile_properties['ios.deploymentTarget'] || '15.4')\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |build_config|\n        deployment_target = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']\n        if deployment_target && Gem::Version.new(deployment_target) < minimum_ios\n          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum_ios.to_s\n        end\n      end\n    end\n";

module.exports = (config) =>
  withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes("minimum_ios = Gem::Version.new")) {
      const hookEnd = /([ \t]*react_native_post_install\([\s\S]*?\n[ \t]*\)\n)/;
      if (!hookEnd.test(contents)) {
        throw new Error("Could not locate react_native_post_install in the Podfile");
      }
      config.modResults.contents = contents.replace(hookEnd, (match) => match + deploymentTargetFix);
    }
    return config;
  });
