#!/usr/bin/env python

"""
Pandoc filter to convert divs with classes to LaTeX
environments in LaTeX output, and colored boxes in HTML output.

Source: <https://gist.github.com/martinmch/8e5dfdd9880762dfeb281e3751264954>

"""

from pandocfilters import toJSONFilter, RawBlock, Div


def latex(x):
    return RawBlock('latex', x)

def html(x):
    return RawBlock('html', x)

# wrapInEnvs :: [string] -> string -> string
def wrapInEnvs(classes,contents):
    if classes == []:
        return contents
    cls = classes[0]
    wrapped = [latex('\\begin{'+cls+'}')] + contents + [latex('\\end{'+cls+'}')]
    return wrapInEnvs(classes[1:], wrapped)

def boxit(key, value, format, meta):
    if key == 'Div':
        [[ident, classes, kvs], contents] = value
        if format == "latex":
            return wrapInEnvs(classes,contents)
        else:
            return Div([ident, classes, kvs], contents)

if __name__ == "__main__":
    toJSONFilter(boxit)
