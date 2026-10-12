# Vibes logo

`vibes-logo-palette.svg` is the source of the current flat logo: mustard `#F4A340`, blue `#3978B8`, dark strokes `#2B2B2B`, coral upper sphere `#D88C7A`. `vibes-logo-palette.png` is its transparent export. The reference image from generation is a draft, not an app asset.

Generate the launcher icons and splash resources with `scripts/generate-flat-app-icons.cjs`. Supply Sharp using `VIBES_ICON_SHARP_MODULE` if it is not installed in the project. Generate the compatible GLB with `node scripts/generate-flat-vibi-glb.cjs`.

The GLB has five coplanar meshes, unlit materials and the existing thirteen clip names/durations. The app displays the PNG in Vibi and auth screens; it does not create a GL context. The 2D assistant respects foreground, visibility and reduced-motion preferences. Store listings require a separate upload; regenerating these assets does not publish a release.

## Word-to-logo entrance

`vibes-logo-morph.json` contains matching contours from the actual Josefin font to the final logo. Regenerate with `scripts/generate-logo-morph.cjs` and an OpenType reader supplied through `VIBES_OPENTYPE_MODULE`. The letter mapping is V → arms, mustard i stem → small sphere, coral i dot → upper sphere, b → left leg, blue e → leaf, s → right leg. The letters stay visible for 450 ms, then bend into the mark over 2500 ms. The SVG paths animate on the UI thread with the existing Reanimated/SVG dependencies; there are no particles or radial explosion. Reduced motion displays the final mark, and backgrounding/focus loss suspends the transformation.
