#! #! /usr/bin/env python
# -*- coding: utf-8 -*-

from pandocfilters import toJSONFilter, RawBlock
import sys
import re

def tikz_to_latex_advanced(key, value, format, meta):
    if key == 'CodeBlock':
        [[ident, classes, kvs], code] = value
        if 'tikz' in classes:
            begin_doc_pattern = r"\\begin\s*{\s*document\s*}"
            end_doc_pattern = r"\\end\s*{\s*document\s*}"
            tikz_code = re.sub(f"{begin_doc_pattern}.*", "", code, 1)
            tikz_code = re.sub(f".*{end_doc_pattern}", "", tikz_code, 1)
            # sys.stderr.write(tikz_code + "\n")
            latex = '\\begin{tikzpicture}[domain=0:4]\n' + tikz_code + '\n\\end{tikzpicture}'
            return RawBlock('latex', latex)

if __name__ == "__main__":
    toJSONFilter(tikz_to_latex_advanced)

