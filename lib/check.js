'use strict';

const SCRIPTURE_ABBREVIATIONS = [
  '1 Sam', '2 Sam', '1 Kgs', '2 Kgs', '1 Chr', '2 Chr',
  '1 Cor', '2 Cor', '1 Thess', '2 Thess', '1 Tim', '2 Tim',
  '1 Pet', '2 Pet', '1 John', '2 John', '3 John',
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth',
  'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song',
  'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos',
  'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech',
  'Mal', 'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', 'Gal',
  'Eph', 'Phil', 'Col', 'Titus', 'Phlm', 'Heb', 'Jas', 'Jude', 'Rev',
];

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SCRIPTURE_PATTERN = SCRIPTURE_ABBREVIATIONS
  .slice()
  .sort((a, b) => b.length - a.length)
  .map((abbr) => escapeRegExp(abbr).replace(/\\ /g, '\\s+'))
  .join('|');

const SCRIPTURE_WITH_PERIOD_RE = new RegExp(
  `(^|[^A-Za-z])(${SCRIPTURE_PATTERN})\\.\\s+(?=\\d)`,
  'g',
);

function makeWarning(file, line, column, ruleId, message, suggestion) {
  return { file, line, column, ruleId, message, suggestion };
}

function getSectionRanges(lines) {
  const ranges = {};
  let active = null;

  lines.forEach((line, index) => {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (!heading) return;

    if (active) ranges[active].end = index;

    const normalized = heading[1].trim().toLowerCase();
    active = null;
    if (normalized === 'footnotes') active = 'footnotes';
    if (normalized === 'bibliography') active = 'bibliography';
    if (active) ranges[active] = { start: index + 1, end: lines.length };
  });

  return ranges;
}

function isInsideRange(lineIndex, range) {
  return Boolean(range && lineIndex >= range.start && lineIndex < range.end);
}

function checkScriptureAbbreviationPeriods(lines, file) {
  const warnings = [];

  lines.forEach((line, index) => {
    let match;
    SCRIPTURE_WITH_PERIOD_RE.lastIndex = 0;
    while ((match = SCRIPTURE_WITH_PERIOD_RE.exec(line)) !== null) {
      const prefixLength = match[1].length;
      const found = match[2].replace(/\s+/g, ' ');
      warnings.push(makeWarning(
        file,
        index + 1,
        match.index + prefixLength + 1,
        'scripture-abbrev-period',
        `Scripture abbreviation "${found}." uses a period before a reference.`,
        `Use "${found}" without a period before the chapter/verse reference.`,
      ));
    }
  });

  return warnings;
}

function isIsoDateAt(line, index) {
  const before = line.slice(Math.max(0, index - 1), index);
  const after = line.slice(index, index + 10);
  return !/\d/.test(before) && /^\d{4}-\d{2}-\d{2}\b/.test(after);
}

function checkRangeDashes(lines, file) {
  const warnings = [];
  const rangeRe = /\b\d{1,4}(?::\d{1,3})?-{1,2}\d{1,4}\b/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = rangeRe.exec(line)) !== null) {
      if (isIsoDateAt(line, match.index)) continue;
      const suggested = match[0].replace(/--?/, '–');
      warnings.push(makeWarning(
        file,
        index + 1,
        match.index + 1,
        'range-dash',
        `Numeric range "${match[0]}" uses a hyphen/double hyphen.`,
        `Use an en dash for Turabian/Chicago ranges: "${suggested}".`,
      ));
    }
  });

  return warnings;
}

function checkFootnoteLocators(lines, file, footnoteRange) {
  const warnings = [];
  if (!footnoteRange) return warnings;

  const pageLabelRe = /\b(?:p{1,2}\.|pages?)\s+\d+/gi;
  const nonPageRe = /\b(?:chap\.|chapter|loc\.|location|kindle location)\s+\d+/gi;

  lines.forEach((line, index) => {
    if (!isInsideRange(index, footnoteRange)) return;

    let match;
    while ((match = pageLabelRe.exec(line)) !== null) {
      warnings.push(makeWarning(
        file,
        index + 1,
        match.index + 1,
        'page-label',
        `Footnote locator "${match[0]}" includes a page label.`,
        'Use numeric page values only when page numbers are expected.',
      ));
    }

    while ((match = nonPageRe.exec(line)) !== null) {
      warnings.push(makeWarning(
        file,
        index + 1,
        match.index + 1,
        'non-page-locator',
        `Footnote locator "${match[0]}" is not a page number.`,
        'Verify the source and use numeric page values when the assignment requires pages.',
      ));
    }
  });

  return warnings;
}

function entryLineIndexes(lines, range, entryRe) {
  if (!range) return [];
  const indexes = [];
  for (let i = range.start; i < range.end; i++) {
    if (entryRe.test(lines[i])) indexes.push(i);
  }
  return indexes;
}

function checkFootnoteSpacing(lines, file, footnoteRange) {
  const warnings = [];
  const indexes = entryLineIndexes(lines, footnoteRange, /^\d+\.\s+\S/);

  for (let i = 1; i < indexes.length; i++) {
    const previous = indexes[i - 1];
    const current = indexes[i];
    const blankLines = lines.slice(previous + 1, current).filter((line) => line.trim() === '').length;
    if (blankLines !== 1) {
      warnings.push(makeWarning(
        file,
        current + 1,
        1,
        'footnote-spacing-source',
        'Footnote entries should be separated by exactly one blank line in Markdown.',
        'Leave one blank line between numbered footnote entries, then visually check final DOCX/PDF footnote spacing.',
      ));
    }
  }

  return warnings;
}

function checkBibliographySpacing(lines, file, bibliographyRange) {
  const warnings = [];
  const indexes = entryLineIndexes(lines, bibliographyRange, /^\S/);

  for (let i = 1; i < indexes.length; i++) {
    const previous = indexes[i - 1];
    const current = indexes[i];
    const blankLines = lines.slice(previous + 1, current).filter((line) => line.trim() === '').length;
    if (blankLines !== 1) {
      warnings.push(makeWarning(
        file,
        current + 1,
        1,
        'bibliography-spacing',
        'Bibliography entries should be separated by exactly one blank line in Markdown.',
        'Leave one blank line between bibliography entries before converting.',
      ));
    }
  }

  return warnings;
}

function normalizeBibliographyEntry(text) {
  return text
    .replace(/\*|_/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function bibliographyEntries(lines, range) {
  if (!range) return [];
  const entries = [];
  let current = [];
  let start = null;

  for (let i = range.start; i < range.end; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      if (current.length) {
        entries.push({ line: start + 1, text: current.join(' ') });
        current = [];
        start = null;
      }
      continue;
    }
    if (start === null) start = i;
    current.push(line.trim());
  }

  if (current.length) entries.push({ line: start + 1, text: current.join(' ') });
  return entries;
}

function bibliographyLineCandidates(lines, range) {
  if (!range) return [];
  const entries = [];
  for (let i = range.start; i < range.end; i++) {
    const text = lines[i].trim();
    if (text) entries.push({ line: i + 1, text });
  }
  return entries;
}

function duplicateKey(entry) {
  const normalized = normalizeBibliographyEntry(entry);
  const authorMatch = normalized.match(/^([^.,]+,\s*[^.]+)\./);
  const author = authorMatch ? authorMatch[1] : normalized.split('.')[0];
  const titleMatch = normalized.match(/(?:\.\s+|^)"?([^".]+)"?\.?/);
  const title = titleMatch ? titleMatch[1] : normalized;
  return `${author}|${title}`.replace(/\s+/g, ' ').trim();
}

function checkBibliographyDuplicates(lines, file, bibliographyRange) {
  const warnings = [];
  const seen = new Map();

  for (const entry of [
    ...bibliographyEntries(lines, bibliographyRange),
    ...bibliographyLineCandidates(lines, bibliographyRange),
  ]) {
    const key = duplicateKey(entry.text);
    if (!key || key.length < 8) continue;
    if (seen.has(key)) {
      if (seen.get(key) === entry.line) continue;
      warnings.push(makeWarning(
        file,
        entry.line,
        1,
        'bibliography-duplicate-author-title',
        'Bibliography appears to repeat the same author/title entry.',
        `Compare this entry with line ${seen.get(key)} and remove or distinguish the duplicate.`,
      ));
    } else {
      seen.set(key, entry.line);
    }
  }

  return warnings;
}

function checkMarkdown(md, options = {}) {
  const file = options.file || '<input>';
  const lines = md.split(/\r?\n/);
  const ranges = getSectionRanges(lines);

  return [
    ...checkScriptureAbbreviationPeriods(lines, file),
    ...checkRangeDashes(lines, file),
    ...checkFootnoteLocators(lines, file, ranges.footnotes),
    ...checkFootnoteSpacing(lines, file, ranges.footnotes),
    ...checkBibliographySpacing(lines, file, ranges.bibliography),
    ...checkBibliographyDuplicates(lines, file, ranges.bibliography),
  ].sort((a, b) => (a.line - b.line) || (a.column - b.column) || a.ruleId.localeCompare(b.ruleId));
}

module.exports = {
  checkMarkdown,
};
