const fs = require("fs");
const path = require("path");
const {
  IOSConfig,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require("@expo/config-plugins");

// iOS 27 terminates apps that don't adopt the UIScene life cycle. Expo SDK 54 has no
// built-in scene delegate, so this plugin adds one and keeps it across `expo prebuild`.
const SCENE_DELEGATE = "SceneDelegate.swift";
const TEMPLATE = path.join(__dirname, "ios", SCENE_DELEGATE);
const WINDOW_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;
const WINDOW_NOTE =
  "    // The window and React Native root are created in SceneDelegate (UIScene life cycle, required by iOS 27).\n";

const withSceneManifest = (config) =>
  withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "SceneDelegate",
          },
        ],
      },
    };
    return config;
  });

const withSceneDelegateFiles = (config) =>
  withDangerousMod(config, [
    "ios",
    (config) => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
      const appDir = path.join(config.modRequest.platformProjectRoot, projectName);
      fs.copyFileSync(TEMPLATE, path.join(appDir, SCENE_DELEGATE));

      const appDelegatePath = path.join(appDir, "AppDelegate.swift");
      const contents = fs.readFileSync(appDelegatePath, "utf8");
      if (!contents.includes("created in SceneDelegate")) {
        if (!WINDOW_BLOCK.test(contents)) {
          throw new Error("withSceneLifecycle: could not find the window setup in AppDelegate.swift");
        }
        fs.writeFileSync(appDelegatePath, contents.replace(WINDOW_BLOCK, WINDOW_NOTE));
      }
      return config;
    },
  ]);

const withSceneDelegateSource = (config) =>
  withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
    const filePath = `${projectName}/${SCENE_DELEGATE}`;
    if (!project.hasFile(filePath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: filePath,
        groupName: projectName,
        project,
      });
    }
    return config;
  });

module.exports = (config) =>
  withSceneDelegateSource(withSceneDelegateFiles(withSceneManifest(config)));
