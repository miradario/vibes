const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function mount(props) {
  const slots = [], effects = [], timers = new Map();
  let cursor = 0, timerId = 0, tree;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }];
    },
    useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo: (fn, deps) => {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { value: fn(), deps };
      return slots[i].value;
    },
    useEffect: (fn, deps) => {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) {
        slots[i]?.cleanup?.(); slots[i] = { deps };
        effects.push(() => { slots[i].cleanup = fn(); });
      }
    },
  };
  React.default = React;
  const imports = {
    react: React,
    'react-native': { ActivityIndicator: 'Spinner', View: 'View', TouchableOpacity: 'Button', StyleSheet: { create: s => s, absoluteFillObject: {} } },
    'expo-image': { Image: 'Image' },
    './Typography': { Text: 'Text' },
    '../src/lib/imageCacheSource': { imageCacheSource: s => s },
    '../src/theme/vibesTheme': { vibesTheme: { colors: { background: '#FEFEFD', accentBlue: '#3978B8', secondaryText: '#6E6E6E' } } },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('components/ProfileMediaImage.tsx', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  new Function('module', 'exports', 'require', 'setTimeout', 'clearTimeout', code)(module, module.exports, name => imports[name] ?? { default: 'Placeholder' }, fn => { timers.set(++timerId, fn); return timerId; }, id => timers.delete(id));
  function render(next = props) { props = next; cursor = 0; tree = module.exports.default(props); while (effects.length) effects.shift()(); return tree; }
  function nodes(node = tree) { if (!node || typeof node !== 'object') return []; return [node, ...(node.props?.children ?? []).flat(Infinity).flatMap(nodes)]; }
  render();
  return { render, images: () => nodes().filter(n => n.type === "Image").map(n => n.props), image: () => nodes().find(n => n.type === 'Image' && n.props.onDisplay).props,
    hasPreview: () => nodes().some(n => n.type === "Image" && n.props.source?.uri === "https://test/preview.jpg"),
    hasError: () => nodes().some(n => n.type === 'Text' && n.props.children.includes('No se pudo cargar la foto.')),
    expire: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); }, timers };
}

test('display before dimensions cancels timeout and waits for layout before notifying the parent', () => {
  let ready = 0;
  const view = mount({ source: 'https://test/portrait.jpg', blurBackground: true, onDisplay: () => ready++ });
  const image = view.image();
  image.onDisplay(); view.render();
  assert.equal(ready, 0);
  image.onLoad({ source: { width: 600, height: 900 } }); view.render();
  assert.equal(ready, 1);
  view.expire(); view.render();
  assert.equal(view.hasError(), false);
});
test('a decoded or displayed photo cannot become a late timeout or error', () => {
  const view = mount({ source: 'https://test/loaded.jpg' });
  const image = view.image();
  image.onLoad({ source: { width: 600, height: 400 } });
  image.onError(); view.expire(); view.render();
  assert.equal(view.hasError(), false);
});
test('a stalled photo retries twice before showing the retry action', () => {
  const view = mount({ source: 'https://test/stalled.jpg' });
  view.expire(); view.render(); assert.equal(view.hasError(), false);
  view.expire(); view.render(); assert.equal(view.hasError(), false);
  view.expire(); view.render(); assert.equal(view.hasError(), true);
});
test('callbacks from the previous photo cannot fail the next photo', () => {
  const view = mount({ source: 'https://test/old.jpg' });
  const old = view.image();
  view.render({ source: 'https://test/new.jpg' });
  old.onError(); old.onDisplay();
  view.render(); assert.equal(view.hasError(), false);
  assert.equal(view.timers.size, 1);
});

test('a photo can recover automatically after a transient error', () => {
 const view = mount({ source: 'https://test/retry.jpg', previewSource: 'https://test/preview.jpg' });
 view.image().onError(); view.render();
 assert.equal(view.hasError(), false);
 view.image().onLoad({ source: { width: 600, height: 900 } });
 view.image().onDisplay(); view.render(); view.expire(); view.render();
 assert.equal(view.hasError(), false);
});

test('a terminal image failure keeps the preview visible', () => {
 const view = mount({ source: 'https://test/broken.jpg', previewSource: 'https://test/preview.jpg' });
 for (let i = 0; i < 3; i++) { view.image().onError(); view.render(); }
 assert.equal(view.hasError(), true);
 assert.equal(view.hasPreview(), true);
});

test('blur covers both the photo and its preview and clears when photo access is restored', () => {
  const props = { source: 'https://test/person.jpg', previewSource: 'https://test/preview.jpg', blurRadius: 24 };
  const view = mount(props);
  assert.ok(view.images().length >= 2);
  assert.ok(view.images().every(image => image.blurRadius === 24));
  view.render({ ...props, blurRadius: 0 });
  assert.ok(view.images().every(image => image.blurRadius === 0));
});
