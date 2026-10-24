const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');
const query = require('@tanstack/react-query');

test('App provides its query client to hooks called by AppNavigator', () => {
  // Execute the real root composition with native wrappers replaced by passthroughs.
  const source = fs.readFileSync('App.tsx', 'utf8');
  const root = source.slice(source.indexOf('const App = () =>'));
  const code = ts.transpileModule(root, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  const client = new query.QueryClient();
  let receivedClient;
  const AppNavigator = () => {
    receivedClient = query.useQueryClient();
    return null;
  };
  const passthrough = ({ children }) => children;
  const exports = {};
  new Function('exports', 'React', 'SafeAreaProvider', 'I18nProvider',
    'AppNavigator', 'QueryClientProvider', 'queryClient', code)(
    exports, React, passthrough, passthrough, AppNavigator, query.QueryClientProvider, client);
  renderToString(React.createElement(exports.default));
  assert.equal(receivedClient, client);
});
