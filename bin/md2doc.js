#!/usr/bin/env node

/**
 * md2doc
 * Converts a Markdown file (with YAML front matter) to a Turabian-formatted .docx
 * Usage: md2doc <input.md> <output.docx>
 * Requires: npm install docx
 *
 * Turabian 9th ed. (Chicago 17th) compliance
 * ─────────────────────────────────────────────────────────────────────────────
 * Body text      : double-spaced, 0.5" first-line indent, left-aligned
 * Block quotes   : single-spaced, 0.5" left + right indent, blank line before/after
 * Footnotes      : single-spaced, 10 pt, 0.5" first-line indent
 *                  Word auto-inserts the superscript number — do NOT add it manually
 * Bibliography   : single-spaced, 12 pt, 0.5" hanging indent, blank line between entries
 *
 * Heading levels
 *   L1  ##    Centered · Bold · Headline caps
 *              2 blank lines before · 1 blank line after
 *   L2  ###   Centered · Regular · Headline caps
 *              2 blank lines before · 1 blank line after
 *   L3  ####  Flush left · Bold italic · Headline caps
 *              2 blank lines before · 1 blank line after
 *   A stand-alone **bold-only line** is treated as L3 in body text
 *   and as a sub-label inside the bibliography section.
 *
 * Inline syntax (handled in order to avoid partial matches)
 *   ***bold-italic***   **bold**   *italic*   _italic_   ^N (footnote ref)
 *
 * Front-matter keys (YAML block between --- delimiters)
 *   title, subtitle, author, course, professor, institution, term, date
 *   Defaults: author → "Yi Hyan Yoon"
 *             institution → "Southwestern Baptist Theological Seminary"
 *
 * Title page
 *   Title is printed on one line; two lines only when > 45 chars.
 *   Subtitle, professor, and date/term are printed when present.
 *   Title page carries no page number (titlePage: true suppresses first-page header).
 *   All subsequent pages show "Surname N" right-aligned.
 *
 * Footnotes section (## Footnotes) is extracted into docx footnote metadata.
 * Bibliography section (## Bibliography) uses 0.5" hanging-indent format.
 */

'use strict';

const {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, Header, PageNumber, FootnoteReferenceRun, PageBreak,
} = require('docx');
const fs   = require('fs');
const path = require('path');

// ── CLI ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: md2doc <input.md> <output.docx>');
  process.exit(1);
}
const INPUT  = path.resolve(args[0]);
const OUTPUT = path.resolve(args[1]);

if (!fs.existsSync(INPUT)) {
  console.error(`Error: input file not found: ${INPUT}`);
  process.exit(1);
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FONT     = 'Times New Roman';
const SZ       = 24;    // 12 pt  (docx half-points)
const SZ_FN    = 20;    // 10 pt  footnotes only
const LINE     = 480;   // double-spaced
const LINE_SGL = 240;   // single-spaced
const INDENT   = 720;   // 0.5"  first-line indent   (1440 twips = 1")
const HANG     = 720;   // 0.5"  hanging indent (bibliography)
const BQ_SIDE  = 720;   // 0.5"  block-quote left + right margin
const MARGIN   = 1440;  // 1"    all four page margins

// ── Headline-caps helper ──────────────────────────────────────────────────────
const MINOR_WORDS = new Set([
  'a','an','the','and','but','or','nor','for','so','yet',
  'as','at','by','from','in','of','on','to','up','via','with',
]);

function toHeadlineCaps(text) {
  return text.split(/(\s+)/).map((tok, i) => {
    if (/^\s+$/.test(tok)) return tok;
    const lo = tok.toLowerCase();
    return (i === 0 || !MINOR_WORDS.has(lo))
      ? tok.charAt(0).toUpperCase() + tok.slice(1)
      : lo;
  }).join('');
}

// ── Inline parser ─────────────────────────────────────────────────────────────
// Order: *** before ** before * to prevent partial matches.
// ^N emits a docx FootnoteReferenceRun so Word inserts a live superscript.
function parseInline(text, size = SZ) {
  const runs = [];
  const re   = /\^(\d+)|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g;
  let last = 0, m;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last)
      runs.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size }));

    if      (m[1] !== undefined) runs.push(new FootnoteReferenceRun(parseInt(m[1], 10)));
    else if (m[2] !== undefined) runs.push(new TextRun({ text: m[2], font: FONT, size, bold: true, italics: true }));
    else if (m[3] !== undefined) runs.push(new TextRun({ text: m[3], font: FONT, size, bold: true }));
    else if (m[4] !== undefined) runs.push(new TextRun({ text: m[4], font: FONT, size, italics: true }));
    else if (m[5] !== undefined) runs.push(new TextRun({ text: m[5], font: FONT, size, italics: true }));

    last = re.lastIndex;
  }
  if (last < text.length)
    runs.push(new TextRun({ text: text.slice(last), font: FONT, size }));
  return runs.length ? runs : [new TextRun({ text: '', font: FONT, size })];
}

// ── Paragraph factories ───────────────────────────────────────────────────────

// Empty double-spaced line — one "blank line" in Turabian counting.
function blank() {
  return new Paragraph({
    spacing: { line: LINE, before: 0, after: 0 },
    children: [new TextRun({ text: '', font: FONT, size: SZ })],
  });
}

// Centred title-page line.
function titlePara(text, { bold = false, size = SZ } = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing:   { line: LINE, before: 0, after: 0 },
    children:  [new TextRun({ text, font: FONT, size, bold })],
  });
}

// Body paragraph — double-spaced, 0.5" first-line indent, left-aligned.
function bodyPara(text, { noIndent = false } = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing:   { line: LINE, before: 0, after: 0 },
    indent:    noIndent ? {} : { firstLine: INDENT },
    children:  parseInline(text),
  });
}

// L1 heading: centered, bold, headline caps.
function headingL1(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing:   { line: LINE, before: 0, after: 0 },
    children:  [new TextRun({ text: toHeadlineCaps(text), font: FONT, size: SZ, bold: true })],
  });
}

// L2 heading: centered, regular weight, headline caps.
function headingL2(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing:   { line: LINE, before: 0, after: 0 },
    children:  [new TextRun({ text: toHeadlineCaps(text), font: FONT, size: SZ })],
  });
}

// L3 heading: flush left, bold italic, headline caps.
function headingL3(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing:   { line: LINE, before: 0, after: 0 },
    children:  [new TextRun({ text: toHeadlineCaps(text), font: FONT, size: SZ, bold: true, italics: true })],
  });
}

// Block quote: single-spaced, 0.5" left + right margins.
// All > lines in the block are joined into one paragraph.
function blockQuote(lines) {
  const text = lines.map(l => l.replace(/^>\s?/, '')).join(' ');
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing:   { line: LINE_SGL, before: 0, after: 0 },
    indent:    { left: BQ_SIDE, right: BQ_SIDE },
    children:  parseInline(text),
  });
}

// Footnote body paragraph — 10 pt, single-spaced, 0.5" first-line indent.
// DO NOT manually prepend the footnote number: Word inserts it automatically
// as a superscript when using the docx footnotes API.
function footnotePara(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing:   { line: LINE_SGL, before: 0, after: 0 },
    indent:    { firstLine: INDENT },
    children:  parseInline(text, SZ_FN),
  });
}

// Bibliography entry — 12 pt, single-spaced, 0.5" hanging indent.
function bibEntry(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing:   { line: LINE_SGL, before: 0, after: 0 },
    indent:    { left: HANG, hanging: HANG },
    children:  parseInline(text, SZ),
  });
}

// Bibliography sub-label ("Primary Sources" / "Secondary Sources") —
// flush left, bold italic, same size as bibliography entries.
function bibLabel(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing:   { line: LINE_SGL, before: 0, after: 0 },
    children:  [new TextRun({ text, font: FONT, size: SZ, bold: true, italics: true })],
  });
}

// ── Front-matter parser ───────────────────────────────────────────────────────
// Returns a plain object of key/value strings.
// Handles quoted and unquoted values and values that contain colons.
function parseFrontMatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    // Split only on the FIRST colon so values like "PASM-3313: Church Pastoral Ministry" work.
    const colon = line.indexOf(':');
    if (colon < 1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^"(.*)"$/, '$1');
    if (key && val) fm[key] = val;
  }
  return fm;
}

// ── Title-page block ──────────────────────────────────────────────────────────
function buildTitleBlock(fm) {
  const paras = [];

  // ~1/3 down the page: 6 blank double-spaced lines.
  for (let i = 0; i < 6; i++) paras.push(blank());

  // Title — one line when <= 45 chars; split near midpoint otherwise.
  const title = fm.title || 'Untitled';
  if (title.length > 45) {
    const mid   = Math.ceil(title.length / 2);
    let   split = title.lastIndexOf(' ', mid);
    if (split < 10) split = title.indexOf(' ', mid);
    if (split > 0 && split < title.length - 1) {
      paras.push(titlePara(title.slice(0, split).trim(), { bold: true }));
      paras.push(titlePara(title.slice(split + 1).trim(), { bold: true }));
    } else {
      paras.push(titlePara(title, { bold: true }));
    }
  } else {
    paras.push(titlePara(title, { bold: true }));
  }

  // Optional subtitle (regular weight, below title).
  if (fm.subtitle) {
    paras.push(blank());
    paras.push(titlePara(fm.subtitle));
  }

  paras.push(blank());
  paras.push(titlePara(fm.author || 'Yi Hyan Yoon'));
  paras.push(blank());
  if (fm.course)     paras.push(titlePara(fm.course));
  if (fm.professor)  paras.push(titlePara(fm.professor));
  paras.push(titlePara(fm.institution || 'Southwestern Baptist Theological Seminary'));
  paras.push(titlePara(fm.term || fm.date || ''));
  paras.push(new Paragraph({ children: [new PageBreak()] }));

  return paras;
}

// ── Footnote extractor ────────────────────────────────────────────────────────
// Reads "## Footnotes" section and builds the docx footnotes metadata object.
// Each entry: { [id]: { children: [Paragraph, ...] } }
function extractFootnotes(md) {
  const body   = md.replace(/^---[\s\S]*?---\n/, '');
  const blocks = body.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);

  let inFootnotes = false;
  const footnotes = {};

  for (const block of blocks) {
    if (/^## Footnotes$/i.test(block))   { inFootnotes = true;  continue; }
    if (inFootnotes && /^## /.test(block)) { inFootnotes = false; continue; }
    if (!inFootnotes) continue;

    for (const line of block.split('\n')) {
      const m = line.match(/^(\d+)\.\s+(.+)/);
      if (m) {
        footnotes[parseInt(m[1], 10)] = { children: [footnotePara(m[2])] };
      }
    }
  }

  return Object.keys(footnotes).length > 0 ? footnotes : undefined;
}

// ── Markdown → paragraph list ─────────────────────────────────────────────────
function parseMarkdown(md) {
  const out    = [];
  const body   = md.replace(/^---[\s\S]*?---\n/, '');
  const blocks = body.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);

  let inBib       = false;
  let inFootnotes = false;
  let isFirst     = true;  // suppresses leading blank lines before the first heading

  // pre() emits 2 blank lines before a heading; skipped at document start.
  // IMPORTANT: isFirst must be read here (before setting to false) so the
  // very first heading correctly suppresses its leading blank lines.
  const pre  = () => { if (!isFirst) { out.push(blank()); out.push(blank()); } };
  const post = () => { out.push(blank()); };

  for (const block of blocks) {
    const lines = block.split('\n');

    // ── Horizontal rule → section spacer (one blank line) ───────────────────
    if (/^---+$/.test(block)) {
      if (!isFirst) out.push(blank());
      continue;
    }

    // ── L1 heading: ## ──────────────────────────────────────────────────────
    if (/^## /.test(lines[0]) && lines.length === 1) {
      const text = block.replace(/^## /, '').trim();
      inBib       = /bibliography/i.test(text);
      inFootnotes = /footnotes/i.test(text);
      if (inFootnotes) continue;   // footnotes go to metadata, not body text
      pre();
      isFirst = false;
      out.push(headingL1(text));
      post();
      continue;
    }

    // ── L2 heading: ### ─────────────────────────────────────────────────────
    if (/^### /.test(lines[0]) && lines.length === 1) {
      const text = block.replace(/^### /, '').trim();
      pre();
      isFirst = false;
      out.push(headingL2(text));
      post();
      continue;
    }

    // ── L3 heading: #### ────────────────────────────────────────────────────
    if (/^#### /.test(lines[0]) && lines.length === 1) {
      const text = block.replace(/^#### /, '').trim();
      pre();
      isFirst = false;
      out.push(headingL3(text));
      post();
      continue;
    }

    // ── Bold-only line → L3 heading in body; sub-label in bibliography ───────
    if (/^\*\*[^*]+\*\*$/.test(block)) {
      const text = block.replace(/\*\*/g, '').trim();
      pre();
      isFirst = false;
      out.push(inBib ? bibLabel(text) : headingL3(text));
      post();
      continue;
    }

    // ── Footnote entries are metadata — skip in body ─────────────────────────
    if (inFootnotes) continue;

    // ── Block quote: every line in the block starts with > ──────────────────
    if (lines.every(l => /^>/.test(l))) {
      isFirst = false;
      out.push(blank());
      out.push(blockQuote(lines));
      out.push(blank());
      continue;
    }

    // ── Bibliography entry ────────────────────────────────────────────────────
    if (inBib) {
      isFirst = false;
      out.push(bibEntry(lines.join(' ')));
      out.push(blank());
      continue;
    }

    // ── Regular body paragraph ────────────────────────────────────────────────
    isFirst = false;
    out.push(bodyPara(lines.join(' ')));
  }

  return out;
}

// ── Document assembly ─────────────────────────────────────────────────────────
function buildDocument(fm, bodyChildren, footnotes) {
  // Extract surname from author field for the running header ("Surname N").
  const surname = (fm.author || 'Yoon').trim().split(/\s+/).pop();

  return new Document({
    styles: {
      default: { document: { run: { font: FONT, size: SZ } } },
    },
    footnotes,
    sections: [{
      properties: {
        // titlePage: true enables a separate first-page header so the title
        // page can carry an empty header while all other pages show "Surname N".
        titlePage: true,
        page: {
          size:        { width: 12240, height: 15840 },   // 8.5" × 11"
          margin:      { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          pageNumbers: { start: 1 },
        },
      },
      headers: {
        // First page (title page) — empty: no page number shown.
        first: new Header({ children: [] }),
        // All subsequent pages — "Surname N" right-aligned.
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing:   { before: 0, after: 0 },
            children:  [
              new TextRun({ text: `${surname} `, font: FONT, size: SZ }),
              new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SZ }),
            ],
          })],
        }),
      },
      children: bodyChildren,
    }],
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
try {
  const md        = fs.readFileSync(INPUT, 'utf8');
  const fm        = parseFrontMatter(md);
  const footnotes = extractFootnotes(md);
  const children  = [...buildTitleBlock(fm), ...parseMarkdown(md)];

  Packer.toBuffer(buildDocument(fm, children, footnotes))
    .then(buf => {
      fs.writeFileSync(OUTPUT, buf);
      console.log(`✓  Written → ${OUTPUT}`);
    })
    .catch(err => {
      console.error('Packer error:', err.message);
      process.exit(1);
    });
} catch (err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
}
