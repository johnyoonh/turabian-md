#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { checkMarkdown } = require('../lib/check');

const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error('Usage: md2check <input.md>');
  process.exit(2);
}

const input = path.resolve(args[0]);

if (!fs.existsSync(input)) {
  console.error(`Error: input file not found: ${input}`);
  process.exit(2);
}

try {
  const md = fs.readFileSync(input, 'utf8');
  const warnings = checkMarkdown(md, { file: input });

  if (warnings.length === 0) {
    console.log(`No Turabian mechanics warnings found in ${input}`);
    process.exit(0);
  }

  for (const warning of warnings) {
    console.log(`${warning.file}:${warning.line}:${warning.column} ${warning.ruleId}: ${warning.message}`);
    console.log(`  Suggestion: ${warning.suggestion}`);
  }

  console.log(`\n${warnings.length} warning${warnings.length === 1 ? '' : 's'} found.`);
  process.exit(1);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(2);
}
