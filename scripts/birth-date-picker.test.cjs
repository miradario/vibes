const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function renderPicker(file) {
  const state = [];
  let cursor = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useMemo: (fn) => fn(),
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], (value) => { state[index] = value; }];
    },
  };
  function load(path) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
    }).outputText, { exports, Date, require(name) {
      if (name === 'react') return react;
      if (name === 'react-native') return { Platform: { OS: 'android' }, StyleSheet: { create: s => s }, View: 'View', TouchableOpacity: 'TouchableOpacity' };
      if (name === '@react-native-community/datetimepicker') return 'DateTimePicker';
      if (name === '@react-navigation/native') return { useNavigation: () => ({}) };
      if (name.endsWith('/birthDate')) return load('src/lib/birthDate.ts');
      if (name.endsWith('/vibesTheme')) return load('src/theme/vibesTheme.ts');
      if (name.endsWith('/onboarding.queries')) return { useOnboardingDraft: () => ({ draft: {}, updateDraft() {} }) };
      if (name.endsWith('/i18n')) return { useI18n: () => ({ t: key => key }) };
      return { __esModule: true, default: {}, Text: 'Text' };
    } });
    return exports;
  }
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of node.props?.children?.flat(Infinity) ?? []) {
      const found = find(child, predicate);
      if (found) return found;
    }
  }
  const Component = load(file).default;
  const tree = Component();
  find(tree, n => n.type === 'TouchableOpacity' && n.props.onPress).props.onPress();
  cursor = 0;
  return find(Component(), n => n.type === 'DateTimePicker').props;
}

// Model the installed Android picker's on-date-changed clamp. Guard the model
// against changes in the dependency, so it cannot silently become stale.
function androidSelectedDate(props, date) {
  const base = 'node_modules/@react-native-community/datetimepicker/android/src/main/java/com/reactcommunity/rndatetimepicker/';
  assert.match(fs.readFileSync(base + 'Common.java', 'utf8'), /minDateWithTimeZone\(Bundle args\)\s*\{\s*if \(!args.containsKey\(RNConstants.ARG_MINDATE\)\) \{\s*return 0;/);
  assert.match(fs.readFileSync(base + 'RNDatePickerDialogFragment.java', 'utf8'), /Math.min\(Math.max\(calendar.getTimeInMillis\(\), minDate\), maxDate\)/);
  return new Date(Math.min(Math.max(date.getTime(), props.minimumDate?.getTime() ?? 0), props.maximumDate.getTime()));
}

for (const screen of ['screens/AgeAssurance.tsx', 'screens/OnboardingAge.tsx']) {
  test(`${screen}: Android preserves birth dates before 1969`, () => {
    const props = renderPicker(screen);
    for (const date of [new Date(1940, 5, 15), new Date(1960, 1, 29), new Date(1968, 11, 31), new Date(2000, 0, 1)]) {
      assert.equal(androidSelectedDate(props, date).getTime(), date.getTime(), `Birth date ${date.toISOString()} must remain selectable`);
    }
    assert.ok(props.maximumDate <= new Date(), 'Future birth dates stay excluded');
  });
}
