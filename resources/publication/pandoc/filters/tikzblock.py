#! #! /usr/bin/env python
# -*- coding: utf-8 -*-

from pandocfilters import toJSONFilter, RawBlock
import sys
import re

begin_doc_pattern = re.compile(
        r"^.*?\\begin\s*{\s*document\s*}",
        re.DOTALL,
)
end_doc_pattern = re.compile(
    r"\\end\s*{\s*document\s*}",
    re.DOTALL,
)

def tikz_to_latex_advanced(key, value, format, meta):
    if key == 'CodeBlock':
        [[ident, classes, kvs], code] = value
        if 'tikz' in classes:
            tikz_code = code
            # sys.stderr.write(f"\n>>>\n{tikz_code}\n<<<")
            tikz_code = begin_doc_pattern.sub("", tikz_code, 1)
            # sys.stderr.write(f"\n>>>\n{tikz_code}\n<<<")
            tikz_code = end_doc_pattern.sub("", tikz_code, 1)
            # sys.stderr.write(f"\n>>>\n{tikz_code}\n<<<")
            latex = '\\begin{tikzpicture}[domain=0:4]\n' + tikz_code + '\n\\end{tikzpicture}'
            return RawBlock('latex', latex)

if __name__ == "__main__":
    toJSONFilter(tikz_to_latex_advanced)

