#!/usr/bin/env node
/**
 * Corre `tsc --noEmit` y falla solo si aparecen errores que no están en scripts/tsc-baseline.txt.
 * Formato del baseline: `archivo: TScódigo` por línea (sin número de línea, para que mover código no lo rompa).
 * Uso: node scripts/tsc-baseline.cjs            -> chequea
 *      node scripts/tsc-baseline.cjs --update   -> regenera el baseline
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BASELINE = path.join(__dirname, "tsc-baseline.txt");
const r = spawnSync("npx", ["tsc", "--noEmit", "-p", "."], { encoding: "utf8", cwd: path.resolve(__dirname, "..") });
const out = (r.stdout || "") + (r.stderr || "");
const errors = out.split("\n").filter((l) => / error TS\d+:/.test(l));
const key = (l) => { const m = l.match(/^(.+?)\(\d+,\d+\): error (TS\d+):/); return m ? `${m[1]}: ${m[2]}` : l; };
const count = (keys) => keys.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
const current = count(errors.map(key));

if (process.argv.includes("--update")) {
  const lines = [...current].flatMap(([k, n]) => Array(n).fill(k)).sort();
  fs.writeFileSync(BASELINE, lines.join("\n") + (lines.length ? "\n" : ""));
  console.log(`tsc-baseline: ${lines.length} errores guardados en scripts/tsc-baseline.txt`);
  process.exit(0);
}
if (errors.length === 0 && r.status !== 0) { console.error(out); process.exit(r.status || 1); }

const base = count(fs.existsSync(BASELINE) ? fs.readFileSync(BASELINE, "utf8").split("\n").filter(Boolean) : []);
const extra = errors.filter((l) => { const k = key(l); const left = base.get(k) || 0; if (left > 0) { base.set(k, left - 1); return false; } return true; });
if (extra.length) {
  console.error(`✖ ${extra.length} errores de TypeScript nuevos (fuera de scripts/tsc-baseline.txt):\n` + extra.join("\n"));
  process.exit(1);
}
const fixed = [...base.values()].reduce((a, b) => a + b, 0);
console.log(`✓ tsc: ${errors.length} errores, todos en el baseline.` + (fixed ? ` ${fixed} del baseline ya no aparecen: corré con --update.` : ""));
