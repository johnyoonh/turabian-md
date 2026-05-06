# turabian-md

Convert academic Markdown papers into Turabian-style DOCX files without relying on Pandoc for layout.

The installed command is `md2doc`.

## Install

```sh
npm install
npm link
```

After linking, use the command from anywhere:

```sh
md2doc paper.md paper.docx
```

The repo also includes `bin/md_to_docx.js` as a compatibility wrapper for the older script name.

## Usage

```sh
md2doc <input.md> <output.docx>
```

Example:

```sh
md2doc examples/sample-paper.md /tmp/sample-paper.docx
```

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
