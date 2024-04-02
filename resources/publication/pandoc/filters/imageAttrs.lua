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
    return elem
end

return {
    {
        Image = Image
        -- Figure = Figure
    }
}
