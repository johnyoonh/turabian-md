#!/usr/bin/env node

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { checkMarkdown } = require('../lib/check');
const { normalizeNumericRanges } = require('../lib/typography');

function readFixture(name) {
  const file = path.join(__dirname, 'fixtures', name);
  return {
    file,
    md: fs.readFileSync(file, 'utf8'),
  };
}

function ruleIds(warnings) {
  return warnings.map((warning) => warning.ruleId).sort();
}

const clean = readFixture('clean-paper.md');
assert.deepStrictEqual(checkMarkdown(clean.md, { file: clean.file }), []);

const warning = readFixture('warning-paper.md');
const warnings = checkMarkdown(warning.md, { file: warning.file });
assert.deepStrictEqual(ruleIds(warnings), [
  'bibliography-duplicate-author-title',
  'bibliography-spacing',
  'footnote-spacing-source',
  'non-page-locator',
  'page-label',
  'range-dash',
  'range-dash',
  'scripture-abbrev-period',
  'scripture-abbrev-period',
]);

assert(warnings.every((item) => Number.isInteger(item.line) && item.line > 0));
assert(warnings.every((item) => Number.isInteger(item.column) && item.column > 0));
assert.strictEqual(
  normalizeNumericRanges('Use 406--9 and Gen 1:26--28, but leave thought--not typed prose alone.'),
  'Use 406–9 and Gen 1:26–28, but leave thought--not typed prose alone.',
);

console.log('check-fixtures passed');
