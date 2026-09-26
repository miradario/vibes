// React Navigation 5 expects setNativeProps; React Native Web 0.21 exposes DOM refs.
// Keep the native path unchanged and use the DOM's inert attribute on web.
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('@react-navigation/stack/package.json'));
const marker = '// Vibes: support DOM refs without setNativeProps.';
for (const relative of ['src/views/Stack/Card.tsx', 'lib/module/views/Stack/Card.js', 'lib/commonjs/views/Stack/Card.js']) {
  const file=path.join(root,relative);const source=fs.readFileSync(file,'utf8');
  if(source.includes(marker)) continue;
  const original=relative.endsWith('.tsx')
    ? /this\.contentRef\.current\?\.setNativeProps\(\{ pointerEvents \}\);/
    : /\(_this\$contentRef\$curr = this\.contentRef\.current\) === null \|\| _this\$contentRef\$curr === void 0 \? void 0 : _this\$contentRef\$curr\.setNativeProps\(\{\s*pointerEvents\s*\}\);/;
  if(!original.test(source)) throw new Error(`Review navigation web compatibility patch: ${relative}`);
  fs.writeFileSync(file,source.replace(original,`${marker}
      const content = this.contentRef.current${relative.endsWith('.tsx') ? ' as any' : ''};
      if (typeof content?.setNativeProps === 'function') content.setNativeProps({ pointerEvents });
      else if (content?.setAttribute) {
        if (enabled) content.removeAttribute('inert');
        else content.setAttribute('inert', '');
      }`));
}
