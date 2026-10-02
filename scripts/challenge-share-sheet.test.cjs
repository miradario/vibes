const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("challenge sharing waits until the options sheet is fully closed", () => {
  const source = fs.readFileSync(
    "screens/ChallengeDetailScreen.tsx",
    "utf8",
  );

  assert.match(source, /const pendingShare = useRef\(false\);/);

  const onClosed = source.match(
    /onClosed=\{\(\) => \{([\s\S]*?)\n\s*\}\}\n\s*offsetY=/,
  )?.[1];
  assert.ok(onClosed, "the options sheet must expose its onClosed flow");
  assert.match(onClosed, /pendingShare\.current = false;/);
  assert.match(
    onClosed,
    /setTimeout\(\(\) => \{\s*setIsPreparingShare\(false\);\s*void handleShare\(\);\s*\}, 100\);/,
  );

  const shareAction = source.match(
    /<TouchableOpacity\n\s*style=\{localStyles\.menuItem\}\n\s*onPress=\{\(\) => \{([\s\S]*?)\n\s*\}\}\n\s*disabled=\{isPreparingShare \|\| isSharing\}/,
  )?.[1];
  assert.ok(shareAction, "the share menu action must be present");
  assert.match(shareAction, /pendingShare\.current = true;/);
  assert.match(shareAction, /setIsPreparingShare\(true\);/);
  assert.match(shareAction, /setMenuVisible\(false\);/);
  assert.doesNotMatch(
    shareAction,
    /handleShare\(\)/,
    "the native share sheet must not open while the options modal is closing",
  );

  assert.match(source, /Preparando para compartir…/);
  assert.match(source, /accessibilityRole="progressbar"/);
});
