
function extractCalloutContent(block)
    -- Concatenate the entire first paragraph to get the full first line text
    local full_first_paragraph_text = pandoc.utils.stringify(block.content[1])
    local callout_type, callout_title_and_rest = full_first_paragraph_text:match("%[!(%w+)%]%s*(.*)$")
    if not callout_type then
        return nil -- Not a callout block
    end

    -- Attempt to separate the title from the rest of the first paragraph (if any)
    local callout_title, first_line_rest = callout_title_and_rest:match("(.-)\n(.*)")
    callout_title = callout_title or callout_title_and_rest -- Use the full line if no newline is found

    -- Prepare the remaining content
    local remaining_content = {}
    if first_line_rest then
        -- If there's remaining text in the first paragraph, add it back as a new paragraph
        table.insert(remaining_content, pandoc.Para({pandoc.Str(first_line_rest)}))
    end
    -- Append the rest of the block content after the first paragraph
    for i = 2, #block.content do
        table.insert(remaining_content, block.content[i])
    end

    return callout_type, callout_title, remaining_content
end


function renderCallout(callout_type, callout_title, body_blocks, format)
    local formattedBody = pandoc.write(pandoc.Pandoc(body_blocks, pandoc.Meta({})), format)

    if format == 'latex' or format == 'beamer' then
        return pandoc.RawBlock('latex', '\\begin{tcolorbox}[title={' .. callout_title .. '}]' .. formattedBody .. '\\end{tcolorbox}')
    elseif format:match 'html' then -- Covers Slidy, DZSlides, S5
        local style = "border: 1px solid; padding: 10px; border-radius: 5px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,.1);"
        local html = '<div class="callout ' .. callout_type .. '" style="' .. style .. '"><strong>' .. callout_title .. '</strong>' .. formattedBody .. '</div>'
        return pandoc.RawBlock('html', html)
    elseif format == 'docx' then
        -- DOCX does not support custom styles directly here; consider using a paragraph with a specific style if possible.
        return pandoc.Para({pandoc.Strong(callout_title)}, table.unpack(body_blocks))
    elseif format == 'pptx' then
        -- PPTX handling could be similar to DOCX; custom styling is limited.
        return pandoc.Para({pandoc.Strong(callout_title)}, table.unpack(body_blocks))
    elseif format == 'asciidoc' then
        -- AsciiDoc supports admonitions which can be used for callouts. Example: [NOTE] for notes.
        local admonition = '[' .. callout_type:upper() .. ']\n' .. callout_title .. '\n----\n' .. formattedBody .. '\n----\n'
        return pandoc.RawBlock('asciidoc', admonition)
    else
        -- Fallback or other formats not explicitly handled
        return pandoc.Div({pandoc.Para({pandoc.Strong(callout_title)}), pandoc.RawBlock(format, formattedBody)}, {class = "callout " .. callout_type})
    end
end


function BlockQuote(block)
    local callout_type, callout_title, body_blocks = extractCalloutContent(block)
    if not callout_type then
        return nil -- Return nil if not a callout block, leaving the block unchanged
    end

    -- Determine the output format for rendering
    local targetFormat = FORMAT:match 'latex' and 'latex' or FORMAT
    if FORMAT:match 'html' then
        targetFormat = 'html'
    elseif FORMAT == 'beamer' then
        targetFormat = 'latex' -- Beamer is a special case of LaTeX
    elseif FORMAT == 'rtf' then
        targetFormat = 'rtf'
    end

    return renderCallout(callout_type, callout_title, body_blocks, targetFormat)
end

return {
    {BlockQuote = BlockQuote}
}

