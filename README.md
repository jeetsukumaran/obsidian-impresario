# Obsidian Impresario



## Features

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

> [!note]
> I now use [Obsidian Pandoc Reference List](https://github.com/mgmeyers/obsidian-pandoc-reference-list) which resolves the issue much better, as I can use the full range of native Pandoc citation styles, and this Pandoc Reference List plugin will automatically create links to the reference notes "dynamically" in both editing as well as reading view.
> In other words, for references I use pandoc-native `[@citekey]` throughout my notes, so they are all rendered nicely by pandoc, and I rely on [Obsidian Pandoc Reference List](https://github.com/mgmeyers/obsidian-pandoc-reference-list) to take care of the internal linking.


### Transpilation of transcluded notes!

Another fantastic plugin is [Easy Bake](https://github.com/mgmeyers/obsidian-easy-bake) -- this "bakes-in" transclusions or embedded documents creating a compiled or "baked" Markdown document in your vault: a single file with all the content from all the embedded documents.

The Impresario plugin "bakes-in" this baking into the printing process: the source document is passed through a lighter version of this process (based on code shared and used under the GNU GPL 3.0 license) before the results are passed through Pandoc.

This means that you can develop your articles, presentations, and other manuscripts all the way to the completion as networked notes, and in an instant have a single cohesive document in any format Pandoc can product, without going through an intermediate compilation step.

### Slide level processed from YAML frontmatter

I recognize that the slide level is not metadata and does not belong here.
But I wanted a way to package this data organically within the document.

### Support for (auto-refactoring!) internal link paths for bibliography

Pandoc natively reads bibliographic data file paths using the "``bibliography``" key:

```yaml
---
bibliography: "path/to/refs.bib"
---

```

```yaml
---
bibliography:
  - "path/to/project/refs1.bib"
  - "path/to/common/refs2.bib"
---
```

Pandoc, however, does not work with Obsidian internal link paths ("`[[path/to/refs1.bib]]`"), which get tracked and updated by Obsidian as I move files around.
This plugin supports specifying the bibliographical data files as internal links managed by Obsidian, and processes these to be passed as "``--bibliography <path>`` when compiling the document.

```yaml
---
production-reference-data: "[[path/to/refs.bib]]"
---

```

```yaml
---
production-reference-data:
  - "[[path/to/project/refs1.bib]]"
  - "[[path/to/common/refs2.bib]]"
---
```

### Nice templates

Currently focusing on developing only PDF's (articles etc.), Beamer presentations (PDF), and HTML presentations (reveal.js etc.).

### Embedded SVG images rendered

#### Requirements

- ``[Sphinx SVG to PDF Converter Extension](https://github.com/missinglinkelectronics/sphinxcontrib-svg2pdfconverter)``:

   ```
   $ pip install sphinxcontrib-svg2pdfconverter
   ```

### Embedded ``[draw.io](https://www.drawio.com/) rendered``

#### Requirements

Installation of ``[drawi.io desktop](https://www.drawio.com/blog/diagrams-offline)``

### Mermaid codeblocks rendered

Mermaid code blocks in your slides/documents will be rendered.


#### Requirements

- ``[mermaid-filter](https://github.com/raghur/mermaid-filter)``:

   ```
   npm install --global mermaid-filter
   ```

### TikZ codeblocks rendered

TikZ code blocks in your slides/documents will be rendered.

### Obsidian callouts rendered

Callouts in your slides/documents will be rendered.

### Image width through image attributes

```

## Slide 2

![path/to/image.jpg|200] \

```

### A"Scratch" space


A special heading lets you keep text that you do not want rendered but want to maintain together in the document; useful for, e.g. background notes, sections/slides in progress, scraps, etc.


## Development State

> [!quote]
>
> > "She may not look like much, but she's got it where it counts."
>
> -- Han Solo, Star Wars: A New Hope (1977)

All the output formats are supported with default options and custom tweaks.

The UI is clunky and ugly, but enough to get the job done.

Settings/ options/ customizations of planned.

### Issues/limitations

#### Application path

Sometimes paths in my `.bashrc` get added to the shell that spawns, sometimes they do not.
If Impresario cannot find pandoc, either set the path to the program in the Settings explicitly, or link or otherwise place the Pandoc executable on one of the system default paths.


#### Link parsing

The link needs to be separated from surrounding text by spaces to be seen by `wikilinks_title_after_pipe`:

This works:

```
[[discovery/sources/references/s/sole2000|@sole2000]] : Signs of life: how complexity pervades biology
```

But this fails:

```
[[discovery/sources/references/s/sole2000|@sole2000]]: Signs of life: how complexity pervades biology
```

## License

obsidian-impresario © 2023 by Jeet Sukumaran is licensed under the GNU GPL 3.the GNU GPL 3.0.
See LICENSE.md for more information.

### Acknowledgements

Embedding or transclusion printing capabilities are based on code originally written and generously shared by [Matthew Meyers](http://matthewmeye.rs): [Easy Bake](https://github.com/mgmeyers/obsidian-easy-bake/tree/master).


