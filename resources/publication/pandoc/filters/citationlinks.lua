
function Encite(citekey)
	local citation = pandoc.Citation(citekey, 'NormalCitation')
	return pandoc.Cite({pandoc.Str(citekey)}, {citation})
end

function replaceWithCitation(inline, matched_citekey_pattern)
	if matched_citekey_pattern
		and type(matched_citekey_pattern) == 'string'
		and matched_citekey_pattern ~= ''
	then
		return Encite(matched_citekey_pattern)
	else
		return inline
	end
end

function Inlines(inlines)
    local newInlines = {}
    for _, inline in ipairs(inlines) do
        if inline.t == 'Link' then
            local citekey = inline.target:match("^-?@(.+)$")
			table.insert(newInlines, replaceWithCitation(inline, citekey))
        elseif inline.t == 'Str' then
            -- local citekey = inline.text:match("^-?@(.+)$")
			-- table.insert(newInlines, replaceWithCitation(inline, citekey))
            table.insert(newInlines, inline)
        else
            table.insert(newInlines, inline)
        end
    end
    return newInlines
end

function Block(block)
    if block.t == "Para" then
        return pandoc.Para(Inlines(block.content))
    elseif block.t == "OrderedList" then
        return pandoc.OrderedList(Inlines(block.content))
    else
        return block
    end
end

function BlockQuote (block)
    if block.t == "Para" then
        return pandoc.Para(Inlines(block.content))
    elseif block.t == "OrderedList" then
        return pandoc.OrderedList(Inlines(block.content))
    elseif block.t == "BulletList" then
        return pandoc.BulletList(Inlines(block.content))
    else
        return block
    end
end

return {
    {
		Inlines = Inlines,
		Block = Block,
		BlockQuote = BlockQuote,
    }
}

