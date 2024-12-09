-- Lua filter to ignore content after a specified heading defined in YAML frontmatter
-- with kebab-case key and default value

-- This function checks if a block is the specified heading
function is_ignorable_heading(block, heading)
  return block.t == "Header" and pandoc.utils.stringify(block) == heading
end

-- This function processes each Pandoc document
function Pandoc(doc)
  -- Read the heading value from document metadata, using kebab-case. Use default if not specified.
  -- local ignore_after_heading = pandoc.utils.stringify(doc.meta['ignore-after-heading'] or "Scratch")
  local ignore_after_heading = pandoc.utils.stringify(doc.meta['ignore-after-heading'] or "---" or ":::")
  -- Normalize the heading to remove potential leading '#' used in markdown
  ignore_after_heading = ignore_after_heading:gsub("^#", ""):gsub("^%s+", ""):gsub("%s+$", "")

  -- Iterate through the block elements of the document
  for i, block in ipairs(doc.blocks) do
    if is_ignorable_heading(block, ignore_after_heading) then
      -- Once the specified heading is found, truncate the document from this point
      doc.blocks = {table.unpack(doc.blocks, 1, i-1)}
      break
    end
  end
  return pandoc.Pandoc(doc.blocks, doc.meta)
end

return {
  {Pandoc = Pandoc}
}

