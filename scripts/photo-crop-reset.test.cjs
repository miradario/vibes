const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

test('reset saves the untouched original instead of cropping it again', () => {
  const slots = [], effects = [], done = [], manipulations = [];
  let cursor = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useRef: value => slots[cursor++] ??= { current: value },
    useState: value => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = value;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useEffect: (fn, deps) => {
      const i = cursor++, previous = slots[i];
      if (!previous || deps.some((x, j) => x !== previous[j])) effects.push(fn);
      slots[i] = deps;
    },
    useMemo: fn => fn(),
  };
  React.default = React;
  const imports = {
    react: React,
    'react-native': { Alert: { alert() {} }, Image: 'Image', View: 'View', TouchableOpacity: 'Button',
      PanResponder: { create: handlers => ({ panHandlers: handlers }) },
      StyleSheet: { create: x => x, absoluteFillObject: {} }, useWindowDimensions: () => ({ width: 400, height: 850 }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) },
    'expo-image-manipulator': { SaveFormat: { JPEG: 'jpeg' }, manipulateAsync: (...args) => { manipulations.push(args); } },
    '../AnimatedSheetModal': { default: 'Sheet' }, '../Typography': { Text: 'Text' },
    '../../src/theme/vibesTheme': { vibesTheme: { colors: {}, fonts: {} } },
    '../../src/lib/photoCrop': {},
  };
  const moduleUnderTest = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync('components/onboarding/PhotoCropEditor.tsx', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText)(name => imports[name], moduleUnderTest, moduleUnderTest.exports);
  const photo = { uri: 'file:///original.jpg', width: 2000, height: 1000 };
  // reset uses only source dimensions; saved original must bypass the crop API.
  function render() {
    cursor = 0;
    const tree = moduleUnderTest.exports.default({ photo, english: false, onDone: uri => done.push(uri) });
    effects.splice(0).forEach(fn => fn());
    return tree;
  }
  function nodes(tree) {
    if (!tree || typeof tree !== 'object') return [];
    return [tree, ...(tree.props?.children ?? []).flat(Infinity).flatMap(nodes)];
  }
  const button = (tree, label) => nodes(tree).find(n => n.type === 'Button' && nodes(n).some(x => x.type === 'Text' && x.props.children.includes(label)));
  let tree = render();
  tree = render();
  nodes(tree).find(n => n.type === 'Image').props.onLoad();
  tree = render();
  button(tree, 'Restablecer').props.onPress();
  tree = render();
  const image = nodes(tree).find(n => n.type === 'Image');
  assert.equal(image.props.style.width, 352);
  assert.equal(image.props.style.height, 176, 'entire landscape original fits the preview');
  button(tree, 'Usar foto').props.onPress();
  tree = render();
  assert.equal(tree.props.visible, false);
  tree.props.onClosed();
  assert.deepEqual(done, ['file:///original.jpg']);
  assert.deepEqual(manipulations, []);
});
