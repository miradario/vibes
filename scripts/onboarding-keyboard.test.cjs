const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function mount({ height = 800, top = 0, keyboardTop = null, platform = 'android' } = {}) {
  const slots = [], effects = [], listeners = {}, measurements = [];
  let cursor = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
    useState: value => {
      const i = cursor++;
      slots[i] ??= { value };
      return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }];
    },
    useEffect: fn => effects.push(fn),
  };
  React.default = React;
  const imports = {
    react: React,
    'react-native': {
      View: 'View', KeyboardAvoidingView: 'Avoid', Platform: { OS: platform },
      Keyboard: {
        metrics: () => keyboardTop === null ? undefined : { screenY: keyboardTop },
        addListener: (name, fn) => { listeners[name] = fn; return { remove: () => delete listeners[name] }; },
      },
    },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('components/KeyboardViewport.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  new Function('require', 'module', 'exports', 'requestAnimationFrame', code)(name => imports[name], module, module.exports, fn => fn());
  cursor = 0;
  const tree = module.exports.default({ children: 'content', style: { flex: 1 } });
  if (tree.props.ref) tree.props.ref.current = {
    measure: fn => { const measuredHeight = height; measurements.push(() => fn(0, top, 400, measuredHeight, 0, top)); },
  };
  const cleanups = effects.map(fn => fn());
  const flush = () => { while (measurements.length) measurements.shift()(); };
  flush();
  return {
    tree, flush,
    show: top => listeners.keyboardDidShow({ endCoordinates: { screenY: top } }),
    hide: () => listeners.keyboardDidHide(),
    overlap: () => slots[3].value,
    resize: next => { height = next; tree.props.onLayout(); },
    unmount: () => cleanups.forEach(fn => fn?.()),
  };
}

test('Android fallback lifts content on the first keyboard opening and restores it on hide', () => {
  const view = mount();
  view.show(500); view.flush(); assert.equal(view.overlap(), 300);
  view.hide(); assert.equal(view.overlap(), 0);
  view.show(500); view.flush(); assert.equal(view.overlap(), 300);
});

test('native adjustResize and fallback never add the keyboard height twice', () => {
  const view = mount();
  view.show(500); view.flush(); assert.equal(view.overlap(), 300);
  view.resize(500); view.flush(); assert.equal(view.overlap(), 0);
  view.resize(800); view.flush(); assert.equal(view.overlap(), 300);
});

test('late measurements cannot restore padding after hide or replace a newer resize', () => {
  const view = mount();
  view.show(500); view.hide(); view.flush(); assert.equal(view.overlap(), 0);
  view.show(500); view.resize(500); view.flush(); assert.equal(view.overlap(), 0);
  view.resize(800); view.unmount(); view.flush(); assert.equal(view.overlap(), 0);
});

test('mounting with the keyboard already open accounts for its existing frame', () => {
  const view = mount({ keyboardTop: 500 });
  assert.equal(view.overlap(), 300);
});

test('iOS retains its native KeyboardAvoidingView padding behavior', () => {
  const view = mount({ platform: 'ios' });
  assert.equal(view.tree.type, 'Avoid');
  assert.equal(view.tree.props.behavior, 'padding');
});


test('chat inside a safe area uses its actual page origin above the keyboard', () => {
 const view = mount({height:947,top:50.333333});
 view.show(661.333333);view.flush();
 assert.ok(Math.abs(view.overlap()-336)<0.001);
 view.resize(611);view.flush();assert.ok(view.overlap()<0.001);
 view.hide();view.flush();assert.equal(view.overlap(),0);
});
