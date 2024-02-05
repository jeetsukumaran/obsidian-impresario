
-- function processContentBlock(block, block_content_i)
--     if block_content_i.t == "BulletList" then
--         return pandoc.utils.stringify(pandoc.BulletList(block_content_i.content))
--     else
--         return pandoc.utils.stringify(block_content_i)
--     end
-- end

function processContentBlock(block, format)
    local tempDoc = pandoc.Pandoc({block})
    local latexString = pandoc.write(tempDoc, format)
    return latexString
end


function BlockQuote (block)
    local first_para = block.content[1]
    if not first_para or not first_para.content or #first_para.content == 0 then
        return nil
    end
    local first_line = pandoc.utils.stringify(first_para.content[1])
    local callout_type, callout_title = first_line:match("%[!(%w+)%]%s*(.*)$")
    if not callout_type then
        return nil
    end
    first_para.content[1].text = first_line:gsub("%[!" .. callout_type .. "%]%s*", "")
    local div = pandoc.Div(block.content, {class = "callout " .. callout_type})
    if FORMAT:match 'latex' then
        local latex_code = '\\begin{tcolorbox}[title={' .. pandoc.utils.stringify(pandoc.Plain(first_para.content)) .. '}]'
        for i = 2, #block.content do
            latex_code = latex_code .. processContentBlock(block.content[i], "latex")
        end
        latex_code = latex_code .. '\\end{tcolorbox}'
        return pandoc.RawBlock('latex', latex_code)
    elseif FORMAT:match 'html' then
        div.attributes.style = "border: 1px solid; padding: 10px; border-radius: 5px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,.1);"
        div.content[1] = pandoc.Para({pandoc.Strong(callout_title)}, table.unpack(first_para.content))
        return div
    elseif FORMAT == 'beamer' then
        -- For Beamer, wrap content in a block environment with the title
        local beamer_code = '\\begin{block}{' .. callout_title .. '}'
        for i, elem in ipairs(block.content) do
            beamer_code = beamer_code .. pandoc.utils.stringify(elem)
        end
        beamer_code = beamer_code .. '\\end{block}'
        return pandoc.RawBlock('latex', beamer_code)
    elseif FORMAT == 'rtf' then
        -- RTF has limited styling options; might opt for a simple paragraph prefix
        local rtf_content = '{\\b ' .. callout_title .. ':}\\par'
        for i, elem in ipairs(block.content) do
            rtf_content = rtf_content .. pandoc.utils.stringify(elem) .. '\\par'
        end
        return pandoc.RawBlock('rtf', rtf_content)
    else
        -- Fallback for other formats
        return div
    end
end

return {
    {BlockQuote = BlockQuote}
}

