#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'practice.html'), 'utf8');
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/question-bank.json'), 'utf8'));
if (html.includes('var bank=[' + String.fromCharCode(10) + '{')) throw new Error('The legacy embedded question bank must not be restored.');
if (!html.includes("fetch(new URL('data/question-bank.json', document.baseURI)")) throw new Error('Practice page must load the structured question bank.');
for (const token of ['item.unitId','item.prompt','item.options.map','item.correctOptionId','item.explanation']) if (!html.includes(token)) throw new Error('Live question adapter is missing mapping: ' + token);
if (!Array.isArray(bank.questions) || bank.questions.length !== 32) throw new Error('Expected 32 structured questions.');
const ids = new Set(); const counts = [0,0,0,0,0];
const prompts = new Set();
for (const [index,q] of bank.questions.entries()) {
  const label = 'item ' + (index + 1) + (q.id ? ' (' + q.id + ')' : '');
  if (!q.id || ids.has(q.id)) throw new Error('Missing or duplicate question ID at ' + label);
  ids.add(q.id);
  if (!Number.isInteger(q.unitId)||q.unitId<1||q.unitId>4) throw new Error('Invalid unit at ' + label);
  counts[q.unitId]++;
  if (typeof q.prompt !== 'string' || !q.prompt.trim() || prompts.has(q.prompt.trim().toLowerCase())) throw new Error('Missing or duplicate prompt at ' + label);
  prompts.add(q.prompt.trim().toLowerCase());
  if (!Array.isArray(q.options)||q.options.length<2||q.options.length>6) throw new Error('Expected 2-6 options at ' + label);
  const optionIds = new Set(), optionTexts = new Set();
  for (const option of q.options) {
    const text = typeof option.text === 'string' ? option.text.trim().toLowerCase() : '';
    if (!option.id || optionIds.has(option.id) || !text || optionTexts.has(text)) throw new Error('Missing or duplicate option ID/text at ' + label);
    optionIds.add(option.id); optionTexts.add(text);
  }
  if (!optionIds.has(q.correctOptionId)) throw new Error('Correct answer does not match an option at ' + label);
  if (typeof q.explanation !== 'string' || !q.explanation.trim()) throw new Error('Missing explanation at ' + label);
  if (!['foundation','intermediate','advanced'].includes(q.difficulty)) throw new Error('Invalid difficulty at ' + label);
  if (!Array.isArray(q.tags) || !q.tags.length || q.tags.some(tag => typeof tag !== 'string' || !tag.trim())) throw new Error('Missing topic tags at ' + label);
  if (!q.source || typeof q.source.kind !== 'string' || !q.source.kind.trim() || typeof q.source.title !== 'string' || !q.source.title.trim()) throw new Error('Missing source provenance at ' + label);
  if (q.source.url && !q.source.url.startsWith('https://')) throw new Error('Source URL must use HTTPS at ' + label);
  if (!q.review || !['draft','reviewed','approved','needs-review'].includes(q.review.status)) throw new Error('Missing or invalid review status at ' + label);
  if (['reviewed','approved'].includes(q.review.status) && (!q.review.reviewedAt || !q.review.reviewerNote)) throw new Error('Reviewed item needs date and reviewer note at ' + label);
}
if (counts.slice(1).some(n=>n!==8)) throw new Error('Expected 8 questions per unit, found '+counts.slice(1).join(', '));
console.log('PASS: live practice loads the structured bank; 32 questions, stable IDs, unique prompts/options, source provenance, review metadata, valid answer mapping, and 8 questions per unit.');
