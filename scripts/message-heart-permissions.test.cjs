const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function bubble(canReact) {
  const api = {}; let hearts = 0, presses = 0, reaction;
  const React = { createElement: (type, props, ...children) => ({ type, props, children }), useRef: value => ({ current: value }), useEffect() {} };
  React.default = React;
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/HeartMessageBubble.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText, {
    exports: api, setTimeout, clearTimeout,
    require: name => name === 'react' ? React : name === 'react-native' ? {
      Pressable: 'Pressable', View: 'View', StyleSheet: { flatten: style => style, create: styles => styles },
    } : name.endsWith('vibesTheme') ? { vibesTheme: { colors: {} } } : {},
  });
  const tree = api.default({ canReact, count: 1, onHeart: () => hearts++, onSinglePress: () => presses++, children: (_press, _longPress, heart) => { reaction = heart; return null; } });
  return { content: tree.children[0], badge: reaction, hearts: () => hearts, presses: () => presses };
}
test('own messages ignore double taps and accessibility hearts while preserving normal taps', () => {
  const view = bubble(false);
  view.content.props.onPress(); view.content.props.onPress();
  view.content.props.onAccessibilityAction({ nativeEvent: { actionName: 'heart' } });
  assert.equal(view.badge.props.onPress, undefined);
  assert.equal(view.hearts(), 0);
  assert.equal(view.presses(), 2);
  assert.equal(view.badge.props.accessibilityRole, "text");
  assert.equal(view.badge.props.accessibilityLabel, '1 corazones');
});
test('other users messages still accept a double-tap heart', () => {
  const view = bubble(true);
  view.content.props.onPress(); view.content.props.onPress();
  assert.equal(view.hearts(), 1);
  assert.equal(view.badge.props.accessibilityRole, "button");
});
