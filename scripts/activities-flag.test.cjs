const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

test('clases hides its selector and returns to Events when disabled while viewing classes', () => {
  let enabled = false, section = 'events';
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: () => [section, value => { section = value; }],
  };
  React.default = React;
  const imports = {
    react: React,
    '@react-navigation/native': { useNavigation: () => ({ navigate: () => {} }) },
    '../components/Icon': { default: 'Icon' },
    'react-native': { View: 'View', TouchableOpacity: 'Button', StyleSheet: { create: x => x } },
    '../src/featureFlags/useClasesEnabled': { useClasesEnabled: () => enabled },
    '../src/i18n': { useI18n: () => ({ locale: 'es' }) },
    '../src/theme/vibesTheme': { vibesTheme: { colors: {}, fonts: {} } },
    '../components/ScreenContainer': { default: 'Screen' },
    '../components/Typography': { Text: 'Text' },
    './Events': { default: 'Events' },
    './Learning': { LearningExplore: 'Classes', LearningCreateAction: 'CreateClass' },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('screens/Activities.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  new Function('require', 'module', 'exports', source)(name => imports[name], module, module.exports);
  function nodes(tree) {
    if (!tree || typeof tree !== 'object') return [];
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    return [tree, ...nodes(tree.props.children)];
  }
  const render = () => nodes(module.exports.default());
  let tree = render();
  assert.ok(tree.some(node => node.type === 'Events'));
  assert.equal(tree.filter(node => node.props.accessibilityRole === 'tab').length, 0);
  enabled = true;
  tree = render();
  const tabs = tree.filter(node => node.props.accessibilityRole === 'tab');
  assert.equal(tabs.length, 2);
  tabs[1].props.onPress();
  tree = render();
  assert.ok(tree.some(node => node.type === 'Classes'));
  assert.ok(tree.some(node => node.type === 'CreateClass'));
  enabled = false;
  tree = render();
  assert.ok(tree.some(node => node.type === 'Events'));
  assert.ok(!tree.some(node => ['Classes', 'CreateClass'].includes(node.type)));
});
