function dumpTable(elem)
  for key, value in pairs(elem) do
    -- Print the key; for simple inspection, you might print the value as well
    print("Key:", key, "Value:", tostring(value))

    -- If the value is itself a table, you can recursively call this function
    -- to print its contents. Uncomment the following lines if you need deep inspection.
    --[[
    if type(value) == "table" then
      dumpTable(value)
    end
    --]]
  end
end


function Image(elem)
    -- Ensure the caption is a plain string for easier manipulation
    local captionStr = pandoc.utils.stringify(elem.caption)

    -- Split the caption string by "|" into parts
    local parts = {}
    for part in string.gmatch(captionStr, "[^|]+") do
        table.insert(parts, string.match(part, "^%s*(.-)%s*$")) -- Trim whitespace
    end

    -- Check for dimension specifier in the last part
    local width, height = nil, nil
    if #parts > 0 then
        width, height = parts[#parts]:match("^(%d+)%s*x?%s*(%d*)$")
        if width then
            -- Remove dimension specifier from parts
            table.remove(parts, #parts)
        end
    end

    -- Handle the image source update and attribute setting
    if width then
        elem.attributes.width = width
        if height and height ~= "" then
            elem.attributes.height = height
        end
    end

    -- Reconstruct the caption, excluding the dimension specifier if it was present
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
        Image = Image,
    }
}

