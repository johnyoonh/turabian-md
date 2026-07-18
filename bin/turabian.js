#!/usr/bin/env node

'use strict';

const path = require('path');

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('Usage: turabian <input.md> [output.docx]');
  process.exit(0);
}

if (args.length === 1) {
  const parsed = path.parse(args[0]);
  process.argv.push(path.format({ ...parsed, base: undefined, ext: '.docx' }));
}

require('./md2doc.js');
