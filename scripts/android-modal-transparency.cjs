// RN 0.81 re-enables the three-button navigation scrim for translucent modals.
// Keep this scoped to those modals, with light buttons over the profile gradient.
const fs = require("node:fs");
const path = require("node:path");
const file = path.join(
  path.dirname(require.resolve("react-native/package.json")),
  "ReactAndroid/src/main/java/com/facebook/react/views/modal/ReactModalHostView.kt"
);
const source = fs.readFileSync(file, "utf8");
const marker = "// Vibes: transparent navigation over full-screen photos.";
if (!source.includes(marker)) {
  const original = "        dialogWindow.enableEdgeToEdge()";
  if (!source.includes(original)) {
    throw new Error("Review the Android modal transparency patch for this React Native version.");
  }
  fs.writeFileSync(file, source.replace(original, `${original}
        ${marker}
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
          dialogWindow.isNavigationBarContrastEnforced = false
        }
        dialogWindow.navigationBarColor = android.graphics.Color.TRANSPARENT
        androidx.core.view.WindowInsetsControllerCompat(dialogWindow, dialogWindow.decorView)
            .isAppearanceLightNavigationBars = false`));
}
