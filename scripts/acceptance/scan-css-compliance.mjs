#!/usr/bin/env node
/**
 * scan-css-compliance.mjs
 *
 * Scans v2 component CSS files for compliance:
 *  - className uses kebab-case
 *  - Uses CSS variables instead of hardcoded colors
 *  - References var(-- CSS variables
 *
 * Usage: node scripts/acceptance/scan-css-compliance.mjs
 * Exit:  0 if all pass, 1 if any FAIL
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve, relative, dirname } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(import.meta.dirname, '../..');

// CSS files to check: all v2 feature CSS + canvas-ai-bar
const CSS_FILES = [
  'src/features/canvas-01-premise/premise-entry.css',
  'src/features/canvas-02-structure/structure-flow.css',
  'src/features/canvas-03-setting/character-panel.css',
  'src/features/canvas-03-setting/faction-panel.css',
  'src/features/canvas-03-setting/setting-canvas.css',
  'src/features/canvas-03-setting/world-rule-panel.css',
  'src/features/pipeline-canvas/canvas-shell.css',
  'src/features/pipeline-nav/pipeline-nav.css',
  'src/components/ai/canvas-ai-bar.css',
];

// ---- Helpers ----

let violations = 0;

function fail(check, file, line, msg) {
  console.log(`[FAIL] ${check} — ${file}:${line}  ${msg}`);
  violations++;
}

function readFile(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

// ---- Checks ----

// 1. className uses kebab-case
//    Match `.className {` patterns and check they're kebab-case
function checkClassNameKebab(files) {
  const kebabRe = /\.([a-z][a-z0-9]*(-[a-z][a-z0-9]*)*)\b/g;

  for (const [rel, content] of files) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Find CSS class selectors: .xxx { or .xxx,
      const classMatch = line.match(/\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g);
      if (!classMatch) continue;

      for (const cls of classMatch) {
        const name = cls.slice(1); // Remove leading dot
        // Skip pseudo-classes and common exceptions
        if (name.startsWith('-') || name.startsWith('_')) continue;

        // Check kebab-case: only lowercase letters, digits, hyphens
        if (!/^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/.test(name)) {
          fail('classname-kebab', rel, i + 1, `"${cls}" is not kebab-case (got "${name}")`);
        }
      }
    }
  }
}

// 2. Check for hardcoded colors
//    Count occurrences of #rgb or #rrggbb patterns
function checkHardcodedColors(files) {
  const colorRe = /#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b/g;
  // Allowlist of reasonable hardcoded colors
  const allowlist = [
    '#ffffff', '#fff',
    '#000000', '#000',
    '#0000',   // transparent
    '#ff0000', '#f00',  // error red (emergency)
  ];

  for (const [rel, content] of files) {
    const lines = content.split('\n');
    let hardcodedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matches = line.matchAll(colorRe);
      for (const m of matches) {
        const color = m[0].toLowerCase();
        if (allowlist.includes(color)) continue;
        // Skip inside comments
        const before = line.slice(0, m.index);
        if (before.includes('/*') && !before.includes('*/')) continue;

        hardcodedCount++;
        fail('hardcoded-color', rel, i + 1, `Hardcoded color "${color}" — use var(--xxx) instead`);
      }
    }
  }
}

// 3. Check CSS variable references
function checkCssVarUsage(files) {
  const varRe = /var\(--/g;

  for (const [rel, content] of files) {
    const matches = content.match(varRe);
    if (!matches) {
      fail('css-vars-missing', rel, 1, 'No CSS variable (var(--)) references found; use design tokens');
    }
  }
}

// ---- Main ----

console.log('=== scan-css-compliance ===\n');

const files = [];
for (const cssPath of CSS_FILES) {
  const fullPath = join(ROOT, cssPath);
  const content = readFile(fullPath);
  if (content === null) {
    console.log(`[SKIP] ${cssPath} — file not found`);
    continue;
  }
  files.push([cssPath, content]);
}

console.log(`Checking ${files.length} CSS files...\n`);

checkClassNameKebab(files);
checkHardcodedColors(files);
checkCssVarUsage(files);

console.log('');
if (violations > 0) {
  console.log(`[FAIL] ${violations} violation(s) found.`);
  process.exit(1);
} else {
  console.log('[PASS] All CSS compliance checks passed.');
  process.exit(0);
}
