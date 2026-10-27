const { withAndroidStyles } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
// Resolve native control colors from the same source used by React Native.
module.exports = function withAndroidVibesControls(config) {
  return withAndroidStyles(config, config => {
    const source = fs.readFileSync(path.join(config.modRequest.projectRoot, 'src/theme/vibesTheme.ts'), 'utf8');
    const token = name => {
      const match = source.match(new RegExp(`${name}:\\s*["'](#[A-Fa-f0-9]{6})["']`));
      if (!match) throw new Error(`Missing Vibes color token: ${name}`);
      return match[1];
    };
    const theme = config.modResults.resources.style.find(style => style.$.name === 'AppTheme');
    if (!theme) throw new Error('Missing Android AppTheme');
    const values = {'colorAccent': token('accentBlue'), 'android:colorAccent':token('accentBlue'), 'android:textColorPrimary':token('primaryText'), 'android:textColorPrimaryInverse':token('primaryText'), 'android:colorBackground':token('surface')};
    theme.item = (theme.item ?? []).filter(item => !Object.hasOwn(values, item.$.name));
    theme.item.push(...Object.entries(values).map(([name,value]) => ({$: {name}, _:value})));
    return config;
  });
};
