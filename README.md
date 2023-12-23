# Obsidian Impresario

You focus on the content.

The impresario will manage the production.

Simple Pandoc wrapper that sends your Obsidian notes to the show.

## Features

### Slide level processed from YAML frontmatter

I recognize that the slide level is not metadata and does not belong here.
But I wanted a way to package this data organically within the document.

### Nice templates

Currently focusing on developing only PDF's (articles etc.), Beamer presentations (PDF), and HTML presentations (reveal.js etc.).

### Pandoc processing of Obsidian (wikilink) citations!

The following formats are native Pandoc and are processed correctly:

- ``[@shannon-1948-mathematical-theory]``
- ``[@{shannon-1948-mathematical-theory}]``

These are "dead" text in Obsidian however, and in a typical note/document, I would like to augment the citation with links to the reference:

- ``[[@shannon-1948-mathematical-theory]]``
- ``[[references/s/@shannon-1948-mathematical-theory|@shannon-1948-mathematical-theory]]``
- ``[[some/path/and/filename|@shannon-1948-mathematical-theory]]``
- ``[[references/s/@shannon-1948-mathematical-theory]]``

However, the above will not be processed correctly by the default Pandoc.
The citations themselves are recognized and processed, but the link syntax cruft remains.
In combination with the built-in "`wikilinks_title_after_pipe`" extension and a bundled lua filter, this plugin solves the problem. 😊

Specifying a Pandoc citation token, which is a "@" character followed by the citekey ("`@cite-key`") as the title or display for an Obsidian internal link will result in the link markup elements being stripped and the citekey processed as a regular Pandoc citation.

## Development State

Working alpha.

All the output formats are supported with default options and custom tweaks.

The UI is clunky and ugly, but enough to get the job done.

Settings/ options/ customizations of rlanned.

## License

obsidian-impressario © 2023 by Jeet Sukumaran is licensed under Attribution-ShareAlike 4.0 International.
See LICENSE.md for more information.

