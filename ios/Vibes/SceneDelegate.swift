import Expo
import React
import UIKit

/// Scene-based life cycle required by iOS 27, which terminates apps at launch
/// (`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`) when they only
/// use the legacy AppDelegate window. Expo SDK 54 has no built-in scene delegate, so
/// this mirrors the approach of `ExpoAppSceneDelegate` from newer Expo SDKs.
///
/// - Creates the window from the connecting `UIWindowScene` and starts React Native in it.
/// - Rebuilds launch options from `connectionOptions` so `Linking.getInitialURL()` still
///   sees cold-start URLs and universal links.
/// - Forwards URL, user-activity and life-cycle events to the AppDelegate, which passes
///   them to the Expo subscribers (expo-linking, expo-notifications, ...) and RCTLinkingManager.
///
/// Managed by plugins/withSceneLifecycle.js.
@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = appDelegate, let factory = appDelegate.reactNativeFactory else {
      fatalError("SceneDelegate: AppDelegate did not create the React Native factory.")
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // Keep `UIApplication.shared.delegate?.window` working for libraries that read it.
    appDelegate.window = window

    let browsingWebActivity = connectionOptions.userActivities.first {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: Self.launchOptions(
        url: connectionOptions.urlContexts.first?.url,
        userActivity: browsingWebActivity
      )
    )

    // Let the Expo subscribers (e.g. expo-linking's initial URL registry) see cold-start links.
    let application = UIApplication.shared
    connectionOptions.urlContexts.forEach { context in
      _ = appDelegate.application(application, open: context.url, options: Self.openURLOptions(from: context.options))
    }
    connectionOptions.userActivities.forEach { activity in
      _ = appDelegate.application(application, continue: activity, restorationHandler: { _ in })
    }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    window = nil
  }

  // Under the scene life cycle UIKit no longer calls these on the app delegate,
  // so forward them for Expo AppDelegate subscribers.
  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }

  // Warm deep links (custom scheme).
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    URLContexts.forEach { context in
      _ = appDelegate?.application(UIApplication.shared, open: context.url, options: Self.openURLOptions(from: context.options))
    }
  }

  // Warm universal links.
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }

  /// Rebuilds the launch options React Native's `Linking.getInitialURL()` reads.
  /// Raw key strings avoid the iOS 26 deprecation of the `UIApplication.LaunchOptionsKey` accessors.
  static func launchOptions(url: URL?, userActivity: NSUserActivity?) -> [UIApplication.LaunchOptionsKey: Any]? {
    var options: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url {
      options[UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsURLKey")] = url
    }
    if let userActivity {
      options[UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsUserActivityDictionaryKey")] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }
    return options.isEmpty ? nil : options
  }

  private static func openURLOptions(from sceneOptions: UIScene.OpenURLOptions) -> [UIApplication.OpenURLOptionsKey: Any] {
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let sourceApplication = sceneOptions.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = sceneOptions.annotation {
      options[.annotation] = annotation
    }
    options[.openInPlace] = sceneOptions.openInPlace
    return options
  }
}
