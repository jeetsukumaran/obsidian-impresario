function dumpTable(elem)
  for key, value in pairs(elem) do
    print("Key:", key, "Value:", tostring(value))
    --[[
    if type(value) == "table" then
      dumpTable(value)
    end
    --]]
  end
end

-- https://pandoc-discuss.narkive.com/G6JWrgXk/how-would-i-set-the-the-caption-inside-a-lua-filter
-- function Image (img)
--     local new_caption = pandoc.Str'desired caption'
--     return pandoc.Image(
--         new_caption,
--         img.src,
--         img.title,
--         img.attr
--     )
-- end


function xImage(elem)
    -- Check if the output format is LaTeX (or Beamer, which is a subset of LaTeX)
    if FORMAT == "latex" or FORMAT == "pdf" or FORMAT == "beamer" then
        -- Construct the LaTeX code for the figure
        local latexString = "\\begin{figure}[htbp]\n\\centering\n"
        latexString = latexString .. "\\includegraphics[width=\\textwidth]{" .. "/home/jeetsukumaran/site/storage/workspaces/note/projects/scribery/scribery.notes/" .. elem.src .. "}\n"
        latexString = latexString .. "\\caption{Custom Caption Here}\n"
        latexString = latexString .. "\\end{figure}"

        -- Return the LaTeX code as a RawBlock element
        return pandoc.RawInline('latex', latexString)
    else
        -- For other formats, return the image unchanged
        return elem
    end
end


-- function Image(elem)
--     local captionStr = pandoc.utils.stringify(elem.caption)
--     local parts = {}
--     for part in string.gmatch(captionStr, "[^|]+") do
--         table.insert(parts, string.match(part, "^%s*(.-)%s*$")) -- Trim whitespace
--     end
--     local width, height = nil, nil
--     if #parts > 0 then
--         width, height = parts[#parts]:match("^(%d+)%s*x?%s*(%d*)$")
--         if width then
--             table.remove(parts, #parts)
--         end
--     end
--     if width then
--         elem.attributes.width = width
--         if height and height ~= "" then
--             elem.attributes.height = height
--         end
--     end
--     if #parts > 0 then
--         local newCaption = table.concat(parts, " | ")
--         elem.caption = pandoc.read(newCaption, 'markdown').blocks[1].content
--     else
--         elem.caption = {}
--     end
--     if FORMAT == "latex" or FORMAT == "pdf" or FORMAT == "beamer" then
--         local rootPath = "/home/jeetsukumaran/site/storage/workspaces/note/projects/scribery/scribery.notes/"
--         local absSrcPath = rootPath .. elem.src
--         local latexString = "\\begin{figure}[htbp]\n\\centering\n"
--         if (elem.attributes.width) then
--             latexString = latexString .. "\\includegraphics[width=" .. elem.attributes.width .. "px]"
--         end
--         latexString = latexString .. "{" .. absSrcPath .. "}\n"
--         latexString = latexString .. "\\caption{" .. pandoc.utils.stringify(elem.caption) .. "}\n"
--         latexString = latexString .. "\\end{figure}"
--         return pandoc.RawInline('latex', latexString)
--     else
--         return elem
--     end
-- end

function Image(elem)
    local captionStr = pandoc.utils.stringify(elem.caption)
    local parts = {}
    for part in string.gmatch(captionStr, "[^|]+") do
        table.insert(parts, string.match(part, "^%s*(.-)%s*$")) -- Trim whitespace
    end
    local width, height = nil, nil
    if #parts > 0 then
        width, height = parts[#parts]:match("^(%d+)%s*x?%s*(%d*)$")
        if width then
            table.remove(parts, #parts)
        end
    end
    if width then
        elem.attributes.width = width .. "px"
        if height and height ~= "" then
            elem.attributes.height = height .. "px"
        end
    end
    if #parts > 0 then
        local newCaption = table.concat(parts, " | ")
        elem.caption = pandoc.read(newCaption, 'markdown').blocks[1].content
    else
        elem.caption = {}
    end

    -- if FORMAT == "latex" or FORMAT == "pdf" or FORMAT == "beamer" then
    --     -- Dynamically get the first resource path or use a default if not set
    --     local rootPath = PANDOC_STATE.resource_path[1] or "."
    --     local absSrcPath = rootPath .. "/" .. elem.src
    --     local latexString = "\\begin{figure}[htbp]\n\\centering\n"
    --     if elem.attributes.width then
    --         -- Convert width attribute to LaTeX compatible format if specified
    --         latexString = latexString .. "\\includegraphics[width=" .. elem.attributes.width .. "]"
    --     else
    --         latexString = latexString .. "\\includegraphics"
    --     end
    --     latexString = latexString .. "{" .. absSrcPath .. "}\n"
    --     -- latexString = latexString .. "\\caption{" .. pandoc.utils.stringify(elem.caption) .. "}\n"
    --     -- latexString = latexString .. "\\end{figure}"
    --     latexString = latexString .. "\\caption{" .. pandoc.utils.stringify(elem.caption) .. "}\n"
    --     latexString = latexString .. "\\end{figure}"

    --     -- Return the raw LaTeX block
    --     -- return pandoc.RawBlock('latex', latexString)
    --     return pandoc.RawInline('latex', latexString)
    -- else
    --     return elem
    -- end

    return elem
end

return {
    {
        Image = Image
        -- Figure = Figure
    }
}
