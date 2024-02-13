-- tikz-to-latex-advanced.lua
-- Pandoc filter to convert TikZ code blocks to raw LaTeX, removing surrounding document commands

function CodeBlock(block)
  -- Check if the block is TikZ code
  if block.classes[1] == 'tikz' then
    -- Define patterns to match \begin{document} and \end{document} with arbitrary spaces
    local beginDocPattern = "\\begin%s*{%s*document%s*}"
    local endDocPattern = "\\end%s*{%s*document%s*}"

    -- Remove everything from the beginning of the block to the end of the \begin{document} pattern
    local tikzCode = block.text:gsub(beginDocPattern .. ".*", "", 1)

    -- Remove everything from the \end{document} pattern to the end of the block
    tikzCode = tikzCode:gsub(".*" .. endDocPattern, "", 1)

    -- Construct the LaTeX code for the tikzpicture environment
    local latex = '\\begin{tikzpicture}[domain=0:4]\n' ..
                  tikzCode ..
                  '\n\\end{tikzpicture}'

    -- Return the block as raw LaTeX for Pandoc to process
    return pandoc.RawBlock('latex', latex)
  end
end

return {
  {CodeBlock = CodeBlock}
}

