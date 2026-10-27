const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

test('events and classes render independent screens without a shared selector', () => {
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
  const render = () => nodes(module.exports.default({}));
  let tree = render();
  assert.ok(tree.some(node => node.type === 'Events'));
  assert.equal(tree.filter(node => node.props.accessibilityRole === 'tab').length, 0);
  tree = nodes(module.exports.default({ section: 'classes' }));
  assert.ok(tree.some(node => node.type === 'Classes'));
  assert.ok(tree.some(node => node.type === 'CreateClass'));
  assert.ok(!tree.some(node => node.type === 'Events'));
  assert.equal(tree.filter(node => node.props.accessibilityRole === 'tab').length, 0);
  const app = fs.readFileSync('App.tsx', 'utf8');
  assert.match(app, /clasesEnabled \? \([\s\S]*?name="ClassesTab" component=\{ClassesTab\}/);
});
