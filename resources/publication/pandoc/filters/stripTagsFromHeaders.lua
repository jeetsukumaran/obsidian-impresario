#!/usr/bin/env lua
-- -*- coding: utf-8 -*-

-- Define the characters or tags to be stripped from headers
-- Define the pattern to match any Unicode character preceded by `#`
local tag_pattern = "#[%z\1-\127\194-\244][\128-\191]*"
-- local tag_pattern = "#[A-Za-z_-/]+$"

-- Function to strip specific tag characters from headers
local function strip_tags_from_header(header)
  -- Iterate through the header content
  for i, element in ipairs(header.content) do
    if element.t == "Str" then
      -- Remove the specified Unicode characters and tags
      element.text = element.text:gsub(tag_pattern, ""):gsub("^#", "")
    end
  end
  return header
end

-- Pandoc filter to process headers
return {
  {
    Header = strip_tags_from_header
  }
}
