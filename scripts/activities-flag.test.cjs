const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Renders screens/Activities.tsx with stubbed components and hooks (no React runtime).
function loadActivities({ flags = { clases: false, sesiones: false }, params, pendingSessions = [] } = {}) {
  const calls = { setParams: [] };
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: (fn) => { fn(); },
  };
  React.default = React;
  const pure = (file) => {
    const exports = {};
    const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    new Function('require', 'module', 'exports', 'process', out)(() => ({}), { exports }, exports, { env: {} });
    return exports;
  };
  const acts = pure('src/featureFlags/activities.ts');
  const kinds = acts.activitiesKinds(flags);
  const tokens = new Proxy({}, { get: () => new Proxy(() => 0, { get: () => 0, apply: () => 0 }) });
  const imports = {
    react: React,
    '@react-navigation/native': {
      useNavigation: () => ({ navigate: () => {}, setParams: (p) => calls.setParams.push(p) }),
      useRoute: () => ({ params }),
    },
    '../components/Icon': { default: 'Icon' },
    'react-native': { View: 'View', TouchableOpacity: 'Button', StyleSheet: { create: (x) => x } },
    '../src/i18n': { useI18n: () => ({ locale: 'es' }) },
    '../src/theme/vibesTheme': { vibesTheme: { colors: {}, fonts: {} } },
    '../src/theme/tokens': tokens,
    '../components/ScreenContainer': { default: 'Screen' },
    '../components/Typography': { Text: 'Text' },
    './Events': { default: 'Events' },
    './Learning': { LearningExplore: 'Classes', LearningCreateAction: 'CreateClass' },
    '../components/ui/SegmentedControl': { default: 'Segmented' },
    '../components/learning/LearningUI': { Page: 'Page' },
    '../components/activities/MyReservationsSheet': { default: 'ReservationsSheet' },
    '../components/ui/surfaceStyles': { badgeStyles: { count: {}, countText: {}, outlined: {} } },
    '../components/sessions/ProfessionalsExplore': { default: 'Professionals' },
    '../src/featureFlags/useActivitiesFlags': { useActivitiesFlags: () => ({ ...flags, kinds, label: acts.activitiesTabLabel(flags) }) },
    '../src/featureFlags/activities': { ...acts, teacherManagementInApp: false },
    '../src/sessions/sessionsQueries': { useStudentSessions: () => ({ data: { sessions: pendingSessions } }) },
    '../src/sessions/sessions': { sessionNeedsStudent: (item) => !!item.needs },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('screens/Activities.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  new Function('require', 'module', 'exports', source)((name) => {
    if (!(name in imports)) throw new Error(`unmocked import ${name}`);
    return imports[name];
  }, module, module.exports);
  return { module: module.exports, calls };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props.children)];
}

test('events and classes render independent screens without a shared selector', () => {
  const { module } = loadActivities();
  let tree = nodes(module.default({}));
  assert.ok(tree.some((node) => node.type === 'Events'));
  assert.equal(tree.filter((node) => node.props.accessibilityRole === 'tab').length, 0);
  tree = nodes(module.default({ section: 'classes' }));
  assert.ok(tree.some((node) => node.type === 'Classes'));
  assert.ok(!tree.some((node) => node.type === 'Events'));
  const app = fs.readFileSync('App.tsx', 'utf8');
  assert.match(app, /activities\.visible \? \([\s\S]*?name="ClassesTab" component=\{ClassesTab\}/);
});

test('ClassesTab: Clases / Sesiones switcher with both flags, Mis reservas button with badge and sheet', () => {
  const { module } = loadActivities({ flags: { clases: true, sesiones: true }, pendingSessions: [{ needs: true }, { needs: false }] });
  const tree = nodes(module.ClassesTab());
  const switcher = tree.find((node) => node.type === 'Segmented');
  assert.deepEqual(switcher.props.options.map((o) => o.label), ['Clases', 'Sesiones']);
  assert.equal(switcher.props.selected, 'classes');
  assert.ok(!tree.some((node) => (node.props.options ?? []).some?.((o) => o.label === 'Mis reservas' || o.label === 'Explorar')));
  const button = tree.find((node) => node.type === 'Button' && String(node.props.accessibilityLabel).startsWith('Mis reservas'));
  assert.equal(button.props.accessibilityLabel, 'Mis reservas, 1 pendiente');
  assert.ok(nodes(button).some((node) => node.type === 'Text' && node.props.children.includes(1)));
  const sheet = tree.find((node) => node.type === 'ReservationsSheet');
  assert.equal(sheet.props.visible, false);
  assert.deepEqual(sheet.props.kinds, ['classes', 'sessions']);
});

test('ClassesTab: one flag shows no switcher; section "mine" opens the sheet and clears the param', () => {
  const { module, calls } = loadActivities({ flags: { clases: false, sesiones: true }, params: { section: 'mine' } });
  const tree = nodes(module.ClassesTab());
  assert.ok(!tree.some((node) => node.type === 'Segmented'));
  assert.ok(tree.some((node) => node.type === 'Professionals'));
  assert.equal(tree.find((node) => node.type === 'Button' && node.props.accessibilityLabel === 'Mis reservas').props.accessibilityLabel, 'Mis reservas');
  assert.equal(tree.find((node) => node.type === 'ReservationsSheet').props.visible, true);
  assert.deepEqual(calls.setParams, [{ section: undefined }]);
});
