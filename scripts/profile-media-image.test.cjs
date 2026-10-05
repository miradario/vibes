const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function render(source) {
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useMemo: (fn) => fn(),
    useState: () => [null, () => {}],
  };
  const output = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('components/ProfileMediaImage.tsx', 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports: output.exports,
    require: (name) => {
      if (name === 'react') return react;
      if (name === 'react-native') return { View: 'View', StyleSheet: { create: (s) => s, absoluteFillObject: {} } };
      if (name === 'expo-image') return { Image: 'Image' };
      if (name.includes('vibesTheme')) return { vibesTheme: { colors: { background: '#FEFEFD' } } };
      return { default: 'Placeholder', __esModule: true };
    },
  });
  const tree = output.exports.default({ source });
  const images = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Image') images.push(node);
    node.children?.flat(Infinity).forEach(visit);
  }
  visit(tree);
  return images;
}

for (const source of ['https://example.com/event.jpg', { uri: 'https://example.com/person.jpg' }, 42]) {
  test(`renders a real photo for ${JSON.stringify(source)}`, () => {
    const images = render(source);
    assert.equal(images.length, 1, 'Photo must be mounted behind the loading placeholder');
    assert.equal(JSON.stringify(images[0].props.source), JSON.stringify(typeof source === 'string' ? { uri: source } : source));
  });
}
for (const source of [null, undefined, '', '   ']) {
  test(`keeps placeholder for missing source ${JSON.stringify(source)}`, () => {
    assert.equal(render(source).length, 0);
  });
}
