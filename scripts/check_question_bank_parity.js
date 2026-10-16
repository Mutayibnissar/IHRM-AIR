#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'practice.html'), 'utf8');
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8'));
if (html.includes('var bank=[')) throw new Error('The legacy embedded question bank must not be restored.');
if (!html.includes("fetch(new URL('data/question-bank.json', document.baseURI)")) throw new Error('Practice page must load the structured question bank.');
for (const token of ['item.unitId','item.prompt','item.options.map','item.correctOptionId','item.explanation']) if (!html.includes(token)) throw new Error('Live question adapter is missing mapping: ' + token);
if (!Array.isArray(bank.questions) || bank.questions.length !== 32) throw new Error('Expected 32 structured questions.');
const ids = new Set(); const counts = [0,0,0,0,0];
for (const [index,q] of bank.questions.entries()) { if (!q.id || ids.has(q.id)) throw new Error('Missing or duplicate question ID at item ' + (index+1)); ids.add(q.id); if (!Number.isInteger(q.unitId)||q.unitId<1||q.unitId>4) throw new Error('Invalid unit at item '+(index+1)); counts[q.unitId]++; if (!Array.isArray(q.options)||q.options.length<2||!q.options.some(o=>o.id===q.correctOptionId)) throw new Error('Invalid options or answer at item '+(index+1)); if(!q.prompt||!q.explanation) throw new Error('Missing prompt or explanation at item '+(index+1)); }
if (counts.slice(1).some(n=>n!==8)) throw new Error('Expected 8 questions per unit, found '+counts.slice(1).join(', '));
console.log('PASS: live practice loads the structured bank; 32 questions, stable IDs, valid answer mapping, and 8 questions per unit.');
