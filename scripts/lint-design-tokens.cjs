#!/usr/bin/env node
/**
 * Lint del Design System (DESIGN_SYSTEM.md §1): prohíbe valores de estilo hardcodeados.
 * Falla (exit 1) si encuentra, fuera de src/theme/tokens:
 *  - colores literales (hex, rgb/rgba, hsl) o sufijos de alfa en templates (`${color}0C`);
 *  - números en fontSize, lineHeight, borderRadius*, padding*, margin*, gap/rowGap/columnGap,
 *    shadowOpacity/shadowRadius/shadowOffset/elevation, y fontWeight / fontFamily literales;
 *  - tamaños numéricos en <Icon size> / <Ionicons size>.
 * 0 está permitido en spacing/radios. Medidas de layout (width, height, top, hitSlop, flex,
 * animaciones) no se revisan.
 *  - en components/ui/**: `vibesTheme.*` (usá ds.*) y números en width/height/minWidth/minHeight/maxWidth
 *    (usá ds.componentSize / ds.touchTarget / ds.avatarSize / ds.iconSize);
 *  - en screens/ y components/: <AnimatedSheetModal fullScreen> o <Modal statusBarTranslucent> en un archivo
 *    que no usa useSafeAreaInsets (en iOS el SafeAreaView recibe insets en 0 dentro del Modal).
 *    Excepción: `/* ds-lint-allow safe-area: <motivo> *\/` en las 3 líneas previas al elemento.
 *  - en todo el código: número suelto como 2º argumento de withAlpha (usá ds.opacity.*).
 *  - en screens/ y components/ (estados de carga, DS "Estados de carga"): <ActivityIndicator> o texto visible
 *    "Cargando…"/"Consultando…" como placeholder de carga inicial (usá los skeletons de components/ui/Skeleton).
 *    No cuenta dentro de un botón (Pressable, Touchable…, …Button o prop label: acción en curso) ni en accessibility*.
 *    Excepción: `/* ds-lint-allow loading: <motivo> *\/` en las 3 líneas previas.
 * Fuera de components/ui, `vibesTheme.*` es solo aviso (no falla) mientras dura la migración,
 * salvo en VIBES_THEME_STRICT (archivos ya migrados: ahí falla).
 * Excepciones documentadas: comentario `/* ds-lint-allow <motivo> *\/` justo antes del valor,
 * o `/* ds-lint-disable-file <motivo> *\/` en el archivo. El motivo es obligatorio.
 * Uso: node scripts/lint-design-tokens.cjs [archivos...]
 */
const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIRS = ["screens", "components", "src", "assets/styles"];
/** Archivos ya migrados fuera de components/ui donde `vibesTheme.*` falla (bottom bar 2/11). */
const VIBES_THEME_STRICT = new Set(["components/CustomTabBar.tsx", "src/lib/tabBarLayout.ts"]);
const IGNORE = [/^src\/theme\/tokens\//, /^src\/illustrations\//, /\.d\.ts$/, /\.test\./];
const SPACING_PROP = /^(padding|margin)(Horizontal|Vertical|Top|Bottom|Left|Right|Start|End)?$|^(gap|rowGap|columnGap)$/;
const RADIUS_PROP = /^border(Top|Bottom)?(Left|Right|Start|End)?Radius$|^border(TopStart|TopEnd|BottomStart|BottomEnd)Radius$/;
const NUMERIC_TEXT = new Set(["fontSize", "lineHeight"]);
const SHADOW_NUM = new Set(["shadowOpacity", "shadowRadius", "elevation"]);
const SIZE_PROP = new Set(["width", "height", "minWidth", "minHeight", "maxWidth"]);
const warnings = [];
const COLOR_RE = /^\s*(#[0-9a-fA-F]{3,8}|(rgba?|hsla?)\(.*\))\s*$/;

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (f !== "node_modules") walk(p, out); }
    else if (/\.(tsx?|jsx?)$/.test(f)) out.push(p);
  }
}

const isNum = (e) => ts.isNumericLiteral(e) ||
  (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(e.operand));
function numericSlots(e, out = []) {
  if (!e) return out;
  if (ts.isParenthesizedExpression(e)) return numericSlots(e.expression, out);
  if (isNum(e)) { out.push(e); return out; }
  if (ts.isConditionalExpression(e)) { numericSlots(e.whenTrue, out); numericSlots(e.whenFalse, out); return out; }
  if (ts.isBinaryExpression(e) && [ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken,
    ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(e.operatorToken.kind)) {
    numericSlots(e.left, out); numericSlots(e.right, out); return out;
  }
  if (ts.isCallExpression(e) && /^Math\.(max|min)$/.test(e.expression.getText())) e.arguments.forEach((a) => numericSlots(a, out));
  return out;
}
const value = (e) => ts.isNumericLiteral(e) ? +e.text : -e.operand.text;
const nameOf = (p) => p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null;

function lintFile(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const src = fs.readFileSync(file, "utf8");
  const fileDisable = src.match(/ds-lint-disable-file\s+(\S.*?)\s*\*\//);
  if (fileDisable) return [];
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, /x$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const problems = [];
  const allowed = (n) => {
    for (let k = n, i = 0; k && i < 3; k = k.parent, i++) {
      const trivia = src.slice(k.getFullStart(), k.getStart(sf));
      const m = trivia.match(/ds-lint-allow\s+([^*]*\S)/);
      if (m) return true;
      if (ts.isPropertyAssignment(k) || ts.isJsxAttribute(k)) break;
    }
    return false;
  };
  const report = (n, msg) => {
    if (allowed(n)) return;
    const { line, character } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
    problems.push(`${rel}:${line + 1}:${character + 1}  ${msg}`);
  };
  const isUi = rel.startsWith("components/ui/");
  const checksSafeArea = /^(screens|components)\//.test(rel) && !/useSafeAreaInsets\s*\(/.test(src);
  const truthyAttr = (el, name) => el.attributes.properties.some((at) => ts.isJsxAttribute(at) && at.name.getText(sf) === name &&
    !(at.initializer && ts.isJsxExpression(at.initializer) && at.initializer.expression &&
      at.initializer.expression.kind === ts.SyntaxKind.FalseKeyword));
  const lineAllowed = (n, kind) => {
    const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
    const from = sf.getPositionOfLineAndCharacter(Math.max(0, line - 3), 0);
    return new RegExp(`ds-lint-allow\\s+${kind}\\b[:\\s]*[^*\\s][^*]*`).test(src.slice(from, n.getStart(sf)));
  };
  const safeAreaAllowed = (n) => lineAllowed(n, "safe-area");
  const checksLoading = /^(screens|components)\//.test(rel) && rel !== "components/VibesLoader.tsx";
  /** Dentro de un control de acción (botón) o de una prop accesible: no es un placeholder de carga. */
  const inActionOrA11y = (n) => {
    for (let k = n.parent; k; k = k.parent) {
      if (ts.isJsxAttribute(k)) { const a = k.name.getText(sf); if (/^accessibility/.test(a) || a === "label") return true; }
      if ((ts.isJsxElement(k) && /(Pressable|Touchable\w*|Button)$/.test(k.openingElement.tagName.getText(sf))) ||
          (ts.isJsxSelfClosingElement(k) && /(Pressable|Touchable\w*|Button)$/.test(k.tagName.getText(sf)))) return true;
    }
    return false;
  };
  const loadingProblem = (n, what) => {
    if (inActionOrA11y(n) || lineAllowed(n, "loading")) return;
    const { line, character } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
    problems.push(`${rel}:${line + 1}:${character + 1}  ${what} como estado de carga: usá skeletons con la geometría real (components/ui/Skeleton) o, si es una acción en curso, documentá /* ds-lint-allow loading: <motivo> */`);
  };
  function visit(n) {
    if (checksSafeArea && (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n))) {
      const tag = n.tagName.getText(sf);
      const prop = tag === "AnimatedSheetModal" ? "fullScreen" : tag === "Modal" ? "statusBarTranslucent" : null;
      if (prop && truthyAttr(n, prop) && !safeAreaAllowed(n)) {
        const { line, character } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
        problems.push(`${rel}:${line + 1}:${character + 1}  <${tag} ${prop}> sin useSafeAreaInsets: aplicá los insets (patrón PhotoViewer) o documentá /* ds-lint-allow safe-area: <motivo> */`);
      }
    }
    if (checksLoading && (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === "ActivityIndicator")
      loadingProblem(n, "<ActivityIndicator>");
    if (checksLoading && (ts.isJsxText(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) &&
        /^\s*(Cargando|Consultando)\b/.test(n.text) && !(n.parent && ts.isImportDeclaration(n.parent)) &&
        // solo texto que termina en JSX (hijo o prop), no strings de lógica
        (ts.isJsxText(n) || (() => { for (let k = n.parent; k; k = k.parent) { if (ts.isJsxElement(k) || ts.isJsxSelfClosingElement(k) || ts.isJsxAttribute(k)) return true; if (ts.isBlock(k) || ts.isSourceFile(k)) return false; } return false; })()))
      loadingProblem(n, `texto "${n.text.trim()}"`);
    if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "vibesTheme") {
      if (isUi || VIBES_THEME_STRICT.has(rel)) report(n, `${n.getText(sf)} en ${isUi ? "components/ui" : rel}: usá ds.*`);
      else if (!allowed(n)) {
        const { line, character } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
        warnings.push(`${rel}:${line + 1}:${character + 1}  ${n.getText(sf)}: migrar a ds.*`);
      }
    }
    if (ts.isCallExpression(n) && /(^|\.)withAlpha$/.test(n.expression.getText(sf)) && n.arguments[1] &&
        numericSlots(n.arguments[1]).length) report(n.arguments[1], `withAlpha(…, ${n.arguments[1].getText(sf)}): usá ds.opacity.*`);
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && COLOR_RE.test(n.text) &&
        !(n.parent && ts.isImportDeclaration(n.parent))) report(n, `color literal ${n.text}: usá ds.colors.*`);
    if (ts.isTemplateExpression(n) && n.templateSpans.some((s) => /^[0-9A-Fa-f]{2}(?![0-9A-Za-z])/.test(s.literal.text)))
      report(n, "sufijo de alfa en template: usá ds.withAlpha(color, ds.opacity.*)");
    if (ts.isPropertyAssignment(n)) {
      const k = nameOf(n);
      if (k && (NUMERIC_TEXT.has(k) || SPACING_PROP.test(k) || RADIUS_PROP.test(k) || SHADOW_NUM.has(k))) {
        for (const s of numericSlots(n.initializer)) {
          if (value(s) === 0 && (SPACING_PROP.test(k) || RADIUS_PROP.test(k) || SHADOW_NUM.has(k))) continue;
          report(s, `${k}: ${s.getText(sf)} hardcodeado; usá ${NUMERIC_TEXT.has(k) ? "ds.textStyles.*" : SPACING_PROP.test(k) ? "ds.spacing[*]" : RADIUS_PROP.test(k) ? "ds.radii.*" : "ds.shadows.*"}`);
        }
      }
      if (isUi && k && SIZE_PROP.has(k))
        for (const s of numericSlots(n.initializer)) report(s, `${k}: ${s.getText(sf)} hardcodeado en components/ui; usá ds.componentSize / ds.touchTarget`);
      if (k === "fontWeight" && (ts.isStringLiteral(n.initializer) || ts.isNumericLiteral(n.initializer)))
        report(n.initializer, "fontWeight prohibido: el peso lo da la familia (ds.textStyles / ds.fontFamilies)");
      if (k === "fontFamily" && ts.isStringLiteral(n.initializer)) report(n.initializer, "fontFamily literal: usá ds.fontFamilies.*");
      if (k === "shadowOffset" && ts.isObjectLiteralExpression(n.initializer) &&
          n.initializer.properties.some((p) => ts.isPropertyAssignment(p) && isNum(p.initializer) && value(p.initializer) !== 0))
        report(n.initializer, "shadowOffset hardcodeado: usá ds.shadows.*");
    }
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && /^(Icon|Ionicons)$/.test(n.tagName.getText(sf))) {
      for (const at of n.attributes.properties) {
        if (ts.isJsxAttribute(at) && at.name.getText(sf) === "size" && at.initializer && ts.isJsxExpression(at.initializer))
          for (const s of numericSlots(at.initializer.expression)) report(s, `Icon size ${s.getText(sf)}: usá ds.iconSize.*`);
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(sf);
  return problems;
}

let files = process.argv.slice(2).map((f) => path.resolve(f));
if (!files.length) { DIRS.forEach((d) => walk(path.join(ROOT, d), files)); files.push(path.join(ROOT, "App.tsx")); }
files = files.filter((f) => !IGNORE.some((r) => r.test(path.relative(ROOT, f).split(path.sep).join("/"))));
const problems = files.flatMap(lintFile);
if (warnings.length) console.warn(`⚠ ${warnings.length} usos de vibesTheme.* fuera de components/ui (aviso, no falla). Detalle: DS_LINT_VERBOSE=1.`);
if (warnings.length && process.env.DS_LINT_VERBOSE) console.warn(warnings.join("\n"));
if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n✖ ${problems.length} problemas del DS (valores hardcodeados, safe area o estados de carga, DESIGN_SYSTEM.md §1). Usá tokens de src/theme/tokens o documentá la excepción con /* ds-lint-allow <motivo> */.`);
  process.exit(1);
}
console.log(`✔ Design system: ${files.length} archivos sin valores hardcodeados.`);
