#!/usr/bin/env node

'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
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

function rulesForMarkdown(md) {
  return ruleIds(checkMarkdown(md, { file: '<case>' }));
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

const dashRegressionCases = [
  {
    name: 'numeric double hyphen source ranges are clean',
    source: 'This cites Gen 1:26--28 and pages 406--9.^1',
    rules: [],
  },
  {
    name: 'numeric single hyphen ranges warn',
    source: 'This cites Gen 1:26-28 and pages 406-9.^1',
    rules: ['range-dash', 'range-dash'],
  },
  {
    name: 'ordinary word hyphens are clean',
    source: 'This first-century argument uses well-known terminology.^1',
    rules: [],
  },
  {
    name: 'nonnumeric double hyphen prose is not rewritten or warned',
    source: 'This sentence has a thought--not a numeric range.^1',
    rules: [],
  },
  {
    name: 'ISO dates are not treated as ranges',
    source: 'The date is 2026-07-06, not a page range.^1',
    rules: [],
  },
];

for (const testCase of dashRegressionCases) {
  assert.deepStrictEqual(
    rulesForMarkdown(testCase.source),
    testCase.rules,
    testCase.name,
  );
}

const typographyCases = [
  {
    source: 'Use 406--9 and Gen 1:26--28.',
    expected: 'Use 406–9 and Gen 1:26–28.',
  },
  {
    source: 'Leave first-century, well-known, and thought--not prose alone.',
    expected: 'Leave first-century, well-known, and thought--not prose alone.',
  },
  {
    source: 'Leave 2026-07-06 alone, but render 56--58.',
    expected: 'Leave 2026-07-06 alone, but render 56–58.',
  },
];

for (const testCase of typographyCases) {
  assert.strictEqual(
    normalizeNumericRanges(testCase.source),
    testCase.expected,
    testCase.source,
  );
}

const cleanCli = spawnSync(process.execPath, ['./bin/md2check.js', clean.file], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8',
});
assert.strictEqual(cleanCli.status, 0, cleanCli.stdout + cleanCli.stderr);
assert.match(cleanCli.stdout, /No Turabian mechanics warnings/);

const warningCli = spawnSync(process.execPath, ['./bin/md2check.js', warning.file], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8',
});
assert.strictEqual(warningCli.status, 1, warningCli.stdout + warningCli.stderr);
assert.match(warningCli.stdout, /range-dash/);
assert.match(warningCli.stdout, /1:26--28/);

console.log('check-fixtures passed');
