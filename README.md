# turabian-md

Convert academic Markdown papers into Turabian-style DOCX and PDF files.

The installed commands are `turabian`, `md2doc`, `md2pdf`, and `md2check`.

## Install

```sh
npm install
npm link
```

After linking, use the command from anywhere:

```sh
md2doc paper.md paper.docx
md2pdf paper.md paper.pdf
md2check paper.md
turabian paper.md
```

`turabian` is a compatibility alias for `md2doc`. When no output path is given,
it creates a `.docx` beside the input Markdown file. The repo also includes
`bin/md_to_docx.js` as a compatibility wrapper for the older script name.

## Quick Start for a New Markdown Paper

From any directory, run:

```sh
md2doc paper.md paper.docx
md2pdf paper.md paper.pdf
```

For example:

```sh
md2doc reports/my-paper.md reports/my-paper.docx
md2pdf reports/my-paper.md reports/my-paper.pdf
md2check reports/my-paper.md
```

Recommended workflow:

1. Write the paper in the Markdown format shown below.
2. Run `md2check` to catch reusable mechanics issues before conversion.
3. Run `md2doc` to create the editable Word document.
4. Open the DOCX in Microsoft Word once and save it. Word is the safest final normalizer for DOCX files.
5. Run `md2pdf` to create a PDF reading copy with page footnotes.

If you only need a PDF, you can run only `md2pdf`. If you need a Word file to send or edit, use `md2doc`.

## Usage

DOCX:

```sh
md2doc <input.md> <output.docx>
```

PDF:

```sh
md2pdf <input.md> <output.pdf>
```

Mechanics check:

```sh
md2check <input.md>
```

Example:

```sh
md2doc examples/sample-paper.md /tmp/sample-paper.docx
md2pdf examples/sample-paper.md /tmp/sample-paper.pdf
md2check examples/sample-paper.md
```

`md2pdf` uses Pandoc, WeasyPrint, and the bundled CSS/Lua filter in `share/`.
The filter converts Pandoc Markdown footnotes into real page footnotes instead
of a back-of-document notes section.

## Front Matter

The converter reads YAML front matter at the top of the Markdown file:

```yaml
---
title: "Sample Academic Paper"
subtitle: "A Short Demonstration"
author: "Yi Hyan Yoon"
course: "MISSN-3363"
professor: "Prof. Sieberhagen"
institution: "Southwestern Baptist Theological Seminary"
term: "Spring 2026"
date: "April 29, 2026"
---
```

Supported keys:

- `title`
- `subtitle`
- `author`
- `course`
- `professor`
- `institution`
- `term`
- `date`

Defaults:

- `author`: `Yi Hyan Yoon`
- `institution`: `Southwestern Baptist Theological Seminary`

## Expected Markdown Format

Use YAML front matter, body headings, caret-style footnote references, a `## Footnotes` section, and optionally a `## Bibliography` section.

```md
---
title: "AI in Missions for Christian Technologists"
subtitle: "Theological Anthropology and Technical Stewardship"
author: "John (Yi Hyan) Yoon"
course: "MISSN-3363"
professor: "Prof. Sieberhagen"
institution: "Southwestern Baptist Theological Seminary"
term: "Spring 2026"
date: "May 16, 2026"
---

## Introduction

This is the first body paragraph. It will be double-spaced with a first-line indent.^1

This is a second body paragraph.

## Main Argument

Use `##` for major section headings.

### Subsection

Use `###` for second-level headings.

#### Lower-Level Subsection

Use `####` for third-level headings.

> Use block quotes for longer quoted material. Block quotes are single-spaced and indented on both sides.

## Footnotes

1. First footnote text. Use Turabian/Chicago note format here.

## Bibliography

Lennox, John C. *2084 and the AI Revolution*. Updated and expanded edition. Grand Rapids: Zondervan, 2024.

Stetzer, Ed. "What Is a Human in the Machine Age? The Imago Dei and AI." Missional AI. YouTube video, April 22, 2026. https://www.youtube.com/watch?v=CITMVWoDa2k.
```

Notes:

- Use `^1`, `^2`, and so on for footnote references in the body.
- Put matching numbered notes under `## Footnotes`.
- Do not use Pandoc-style footnotes such as `[^1]` with `md2doc`; the DOCX converter expects caret-style notes.
- `md2pdf` can handle normal Markdown footnotes through Pandoc, but using the same caret-style format keeps one source file compatible with both commands.
- Keep one blank line between paragraphs.
- Use `## Bibliography` only if you want a bibliography at the end.

## Formatting

The DOCX output is intended for Turabian 9th edition / Chicago-style academic papers:

- Times New Roman
- 12 pt body text
- 1-inch margins
- double-spaced body paragraphs
- 0.5-inch first-line paragraph indent
- single-spaced block quotes with side indents
- live Word footnote references
- bibliography with 0.5-inch hanging indent
- title page without page number
- later pages with `Surname N` in the header

The PDF output is intended for a lightweight Turabian-style reading copy:

- Times New Roman
- 12 pt body text
- 1-inch margins
- double-spaced body paragraphs
- 0.5-inch first-line paragraph indent
- real page footnotes via WeasyPrint
- title page without page number

## Markdown Features

Supported body features:

- `## Heading` for level 1 headings
- `### Heading` for level 2 headings
- `#### Heading` for level 3 headings
- `**bold**`, `*italic*`, `_italic_`, and `***bold italic***`
- `^1` footnote references
- `> block quotes`
- `## Footnotes` section
- `## Bibliography` section

Footnotes should be listed under `## Footnotes`.

```md
This sentence has a footnote.^1

## Footnotes

1. This is the footnote body.
```

Bibliography entries should be listed under `## Bibliography`, separated by blank lines.

## Mechanics Check

`md2check` performs warn-only checks for repeatable Turabian mechanics issues before conversion:

- Scripture abbreviations with periods before references, such as `Gen. 1:26`.
- Numeric ranges using a single hyphen, such as `406-9` or `Gen 1:26-28`.
- Footnote page locators with labels such as `p.`, `pp.`, or `pages`.
- Footnote locators such as `chap.`, `chapter`, `loc.`, or `location` when page numbers may be required.
- Footnote entries not separated by exactly one blank line in Markdown.
- Bibliography entries not separated by exactly one blank line in Markdown.
- Bibliography entries that appear to repeat the same author and title.

The checker exits `0` when no warnings are found, `1` when warnings are found, and `2` for usage or input errors. It does not judge argument quality, doctrinal adequacy, prose clarity, or full citation correctness. Always inspect the final DOCX/PDF visually, especially footnote spacing.

For ranges, write ASCII double hyphen in Markdown source, such as `406--9` or `Gen 1:26--28`. `md2doc` and `md2pdf` render those numeric ranges with an en dash in output. Ordinary hyphens remain unchanged, and the tools do not rewrite nonnumeric `--` used in prose.

## Local Legacy Commands

This repo replaces the older standalone `md_to_docx.js` workflow. Running
`npm link` installs the package-owned `turabian` compatibility command, so its
`docx` dependency resolves from this package.

## Dependencies

`md2doc` requires Node.js dependencies installed with `npm install`.

`md2pdf` requires:

```sh
brew install pandoc weasyprint
```

If `md2pdf` reports that either command is missing, install the missing tool
and retry.
