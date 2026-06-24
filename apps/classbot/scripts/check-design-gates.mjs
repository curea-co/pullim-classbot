#!/usr/bin/env node
// CUDS design CI gates. Run from apps/classbot.
import { execSync } from 'node:child_process';

function grep(pattern, paths) {
  try {
    const out = execSync(`grep -rEn "${pattern}" ${paths} --include='*.ts' --include='*.tsx' --include='*.css' || true`, { encoding: 'utf8' });
    return out.split('\n').filter(Boolean).filter(l => !l.includes('/__tests__/') && !l.includes('scripts/check-design-gates'));
  } catch { return []; }
}

const failures = [];

// Gate 1: no word-break: break-all anywhere in source.
const breakAll = grep('word-break:\\\\s*break-all', 'app components lib');
if (breakAll.length) failures.push(['word-break: break-all is banned (use overflow-wrap: anywhere on the parent)', breakAll]);

// Gate 2: no hardcoded 6-digit hex inside components/ (token files live in lib/tokens, exempt).
// SVG presentation attributes (fill="…", stroke="…") in icon components are also exempt —
// frozen brand pixel-art colours cannot use CSS var() in SVG attribute syntax.
const hex = grep('#[0-9A-Fa-f]{6}', 'components')
  .filter(l => !/fill="#[0-9A-Fa-f]{6}"/i.test(l) && !/stroke="#[0-9A-Fa-f]{6}"/i.test(l));
if (hex.length) failures.push(['hardcoded hex in components/ — use var(--*) tokens', hex]);

if (failures.length) {
  for (const [msg, lines] of failures) {
    console.error(`\n✗ ${msg}`);
    for (const l of lines.slice(0, 40)) console.error(`    ${l}`);
  }
  console.error(`\n${failures.length} design gate(s) failed.`);
  process.exit(1);
}
console.log('✓ design gates passed');
