
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

-- function extractCalloutContent(block)
--     -- Attempt to find the callout type and title within the first paragraph's inlines
--     local first_para = block.content[1]
--     if not first_para then return nil end -- Early return if no content

--     local callout_type, callout_title
--     local content_start_index = nil

--     for i, el in ipairs(first_para.content) do
--         if el.t == "Str" then
--             local type_match, title_match = el.text:match("%[!(%w+)%]%s*(.*)")
--             if type_match then
--                 callout_type = type_match
--                 -- Remaining text in the matched element might be part of the title
--                 if title_match ~= "" then
--                     callout_title = title_match
--                     content_start_index = i
--                 else
--                     -- Title might be in the next element if this one only contains the type
--                     if first_para.content[i + 1] and first_para.content[i + 1].t == "Str" then
--                         callout_title = first_para.content[i + 1].text
--                         content_start_index = i + 1
--                     end
--                 end
--                 break -- Stop loop after finding the callout type
--             end
--         end
--     end

--     -- If callout type is found, prepare the content excluding the title part
--     if not callout_type then return nil end -- Not a callout if no type was found

--     -- Remove the title from the first paragraph's content
--     if content_start_index then
--         table.remove(first_para.content, content_start_index)
--         if #first_para.content == 0 then
--             -- Remove the first paragraph if it's empty after removing the title
--             table.remove(block.content, 1)
--         end
--     end

--     return callout_type, callout_title, block.content
-- end



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

