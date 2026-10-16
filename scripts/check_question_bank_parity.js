#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'practice.html'), 'utf8');
const marker = 'var bank=[';
const markerIndex = html.indexOf(marker);
if (markerIndex < 0) throw new Error('Could not locate the existing embedded question bank.');
const start = html.indexOf('[', markerIndex);
let depth = 0, quote = '', escaped = false, end = -1;
for (let i = start; i < html.length; i++) {
  const ch = html[i];
  if (quote) {
    if (escaped) escaped = false;
    else if (ch === '\\') escaped = true;
    else if (ch === quote) quote = '';
    continue;
  }
  if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
  if (ch === '[') depth++;
  else if (ch === ']' && --depth === 0) { end = i + 1; break; }
}
if (end < 0) throw new Error('Could not find the end of the existing question bank.');
const embedded = vm.runInNewContext('(' + html.slice(start, end) + ')');
const structured = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8')).questions;
const compact = q => JSON.stringify({u:q.u ?? q.unitId, q:q.q ?? q.prompt, o:q.o ?? q.options.map(x=>x.text), a:q.a ?? q.options.findIndex(x=>x.id===q.correctOptionId), e:q.e ?? q.explanation});
if (embedded.length !== structured.length) throw new Error(`Question count mismatch: embedded=${embedded.length}, structured=${structured.length}`);
for (let i = 0; i < embedded.length; i++) {
  if (compact(embedded[i]) !== compact(structured[i])) {
    throw new Error(`Question parity mismatch at item ${i + 1} (embedded ID ${embedded[i].u}-${i + 1}, structured ID ${structured[i].id}).`);
  }
}
console.log(`PASS: all ${embedded.length} structured questions exactly match the live practice bank (prompt, options, answer, explanation, unit, and order).`);
