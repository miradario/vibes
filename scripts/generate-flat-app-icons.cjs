// Regenerate with VIBES_ICON_SHARP_MODULE pointing to an installed Sharp module.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.env.VIBES_ICON_SHARP_MODULE || 'sharp');
const root = path.resolve(__dirname, '..');
async function main() {
  const svg = await fs.readFile(path.join(root, 'assets/branding/vibes-logo-palette.svg'), 'utf8');
  await sharp(Buffer.from(svg)).png().toFile(path.join(root, 'assets/branding/vibes-logo-palette.png'));
  const foregroundSvg = svg.replace(/(<svg[^>]*>)/, '$1<g transform="translate(627 627) scale(0.64) translate(-627 -627)">').replace('</svg>', '</g></svg>');
  const icon = await sharp(Buffer.from(svg)).resize(1024, 1024).flatten({background:'#FEFEFD'}).removeAlpha().png().toBuffer();
  const foreground = await sharp(Buffer.from(foregroundSvg)).resize(1024, 1024).png().toBuffer();
  for (const name of ['icon-flat.png', 'icon-ios-flat.png']) await fs.writeFile(path.join(root, 'assets', name), icon);
  await fs.writeFile(path.join(root, 'assets/adaptive-icon-flat.png'), foreground);
  await sharp(icon).resize(64,64).png().toFile(path.join(root,'assets/favicon-flat.png'));
  await fs.writeFile(path.join(root, 'ios/Vibes/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png'), icon);
  // Keep every existing brand reference on the same design.
  for (const name of ['icon.png', 'icon-ios.png', 'favicon.png']) await fs.writeFile(path.join(root, 'assets', name), icon);
  await fs.writeFile(path.join(root, 'assets/adaptive-icon.png'), foreground);
  await fs.writeFile(path.join(root, 'assets/images/challenges/vibesLogo.png'), foreground);
  await fs.writeFile(path.join(root, 'assets/splash.png'), icon);
  const iosAssets = path.join(root, 'ios/Vibes/Images.xcassets');
  await fs.writeFile(path.join(iosAssets, 'SplashScreenLogo.imageset/image.png'), foreground);
  for (const name of ['image.png','image@2x.png','image@3x.png']) {
    await sharp(icon).resize(1242,2688,{fit:'contain',background:'#FEFEFD'}).png().toFile(path.join(iosAssets,'SplashScreenLegacy.imageset',name));
  }
  for (const [density, size] of [['mdpi',288],['hdpi',432],['xhdpi',576],['xxhdpi',864],['xxxhdpi',1152]]) {
    await sharp(foreground).resize(size,size).png().toFile(path.join(root,'android/app/src/main/res',`drawable-${density}`,'splashscreen_logo.png'));
  }
  for (const [density, size, foregroundSize] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]) {
    const dest = path.join(root, 'android/app/src/main/res', `mipmap-${density}`);
    await sharp(icon).resize(size,size).webp({lossless:true}).toFile(path.join(dest,'ic_launcher.webp'));
    const circleMask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#FEFEFD"/></svg>`);
    await sharp(icon).resize(size,size).ensureAlpha().composite([{input:circleMask,blend:'dest-in'}]).webp({lossless:true}).toFile(path.join(dest,'ic_launcher_round.webp'));
    await sharp(foreground).resize(foregroundSize,foregroundSize).webp({lossless:true}).toFile(path.join(dest,'ic_launcher_foreground.webp'));
  }
  console.log('Flat Vibes icons generated for Expo, Android and iOS.');
}
main().catch(error => { console.error(error.message); process.exit(1); });
