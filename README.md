# turabian-md

Convert academic Markdown papers into Turabian-style DOCX and PDF files.

The installed commands are `md2doc` and `md2pdf`.

## Install

```sh
npm install
npm link
```

After linking, use the command from anywhere:

```sh
md2doc paper.md paper.docx
md2pdf paper.md paper.pdf
```

The repo also includes `bin/md_to_docx.js` as a compatibility wrapper for the older script name.

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
```

Recommended workflow:

1. Write the paper in the Markdown format shown below.
2. Run `md2doc` to create the editable Word document.
3. Open the DOCX in Microsoft Word once and save it. Word is the safest final normalizer for DOCX files.
4. Run `md2pdf` to create a PDF reading copy with page footnotes.

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

Example:

```sh
md2doc examples/sample-paper.md /tmp/sample-paper.docx
md2pdf examples/sample-paper.md /tmp/sample-paper.pdf
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

## Local Legacy Commands

This repo replaces the older standalone `~/.local/bin/md_to_docx.js` workflow. The old `turabian` command can remain installed as a legacy command while `md2doc` becomes the main entry point.

## Dependencies

`md2doc` requires Node.js dependencies installed with `npm install`.

`md2pdf` requires:

```sh
brew install pandoc weasyprint
```

If `md2pdf` reports that either command is missing, install the missing tool
and retry.
