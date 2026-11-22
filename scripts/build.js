import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');
const docsDir = path.join(root, 'docs');

fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

const readSrc = (file) => fs.readFileSync(path.join(srcDir, file), 'utf8');

const stripImports = (code) =>
  code.replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?\s*$/gm, '');

const stripExports = (code) =>
  code
    .replace(/^export\s+(async\s+function|function|class|const|let|var)\s+/gm, '$1 ')
    .replace(/^export\s*\{[\s\S]*?\};?\s*$/gm, '');

const coreCode = readSrc('core.js');
const shadowCode = readSrc('shadow.js');
const tailwindCode = readSrc('tailwind.js');
const demoHtml = readSrc('demo.html');
const pasHtml = readSrc('pas.html');

const banner = `/**
 * @micropasts/record-completeness v0.1.0
 * Zero-dependency cultural heritage metadata completeness Web Components
 * License: MIT
 */\n`;

const esmBundle = [
  banner,
  '// --- core.js ---',
  coreCode.trim(),
  '\n// --- shadow.js ---',
  stripImports(shadowCode).trim(),
  '\n// --- tailwind.js ---',
  stripImports(tailwindCode).trim(),
  '',
].join('\n');

const iifeBody = [
  stripExports(stripImports(coreCode)).trim(),
  stripExports(stripImports(shadowCode)).trim(),
  stripExports(stripImports(tailwindCode)).trim(),
  `window.RecordCompletenessLib = {
    DEFAULT_METADATA_SCHEMA,
    evaluateCompleteness,
    parseRecordData,
    emitRecordSelect,
    copyTextToClipboard,
    RecordCompleteness,
    RecordCompletenessTailwind
  };`,
].join('\n\n');

const iifeBundle = `${banner}(function () {\n'use strict';\n${iifeBody}\n})();\n`;

fs.writeFileSync(path.join(distDir, 'record-completeness.esm.js'), esmBundle, 'utf8');
fs.writeFileSync(path.join(distDir, 'record-completeness.iife.js'), iifeBundle, 'utf8');
fs.writeFileSync(path.join(docsDir, 'record-completeness.esm.js'), esmBundle, 'utf8');
fs.writeFileSync(path.join(docsDir, 'index.html'), demoHtml, 'utf8');
fs.writeFileSync(path.join(docsDir, 'pas.html'), pasHtml, 'utf8');

console.log('Built dist/ and docs/ (index.html + pas.html) for @micropasts/record-completeness.');
