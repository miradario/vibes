const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
const react = {
  forwardRef: render => render,
  createElement: (type, props) => ({ type, props }),
};
const source = ts.transpileModule(fs.readFileSync('components/Typography.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
vm.runInNewContext(source, { exports: exportsObject, require: name => {
  if (name === 'react') return react;
  if (name === 'react-native') return { Text: 'NativeText', TextInput: 'NativeTextInput' };
  if (name === '../src/theme/vibesTheme') return { vibesTheme: { fonts: { regular: 'JosefinSans-Regular' } } };
  throw Error(name);
}});
for (const component of ['Text', 'TextInput']) {
  test(`${component} applies app font while retaining styles, scaling, handlers and ref`, () => {
    const ref = { current: null };
    const onPress = () => {};
    const style = { fontSize: 18, color: '#333' };
    const result = exportsObject[component]({ style, allowFontScaling: true, onPress, accessibilityLabel: 'Texto', children: 'Vibes' }, ref);
    assert.equal(result.props.style[0].fontFamily, 'JosefinSans-Regular');
    assert.equal(result.props.style[1], style);
    assert.equal(result.props.ref, ref);
    assert.equal(result.props.onPress, onPress);
    assert.equal(result.props.allowFontScaling, true);
    assert.equal(result.props.accessibilityLabel, 'Texto');
    assert.equal(result.props.children, 'Vibes');
  });
}
