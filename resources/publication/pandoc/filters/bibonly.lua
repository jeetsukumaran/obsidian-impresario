local cites = {}

-- collect all citations
function Cite (cite)
  table.insert(cites, cite)
end

-- use citations, but omit rest of the document
function Pandoc (doc)
  doc.meta.nocite = cites
  doc.blocks = {}
  return doc
end
