
function Encite(citekey)
	local citation = pandoc.Citation(citekey, 'AuthorInText')
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
        print("---")
        if inline.t == 'Link' then
        	print("Link: " .. inline.target)
            local citekey = inline.target:match("^@(.+)$")
			table.insert(newInlines, replaceWithCitation(inline, citekey))
        elseif inline.t == 'Str' then
        	print("Str: " .. inline.text)
            local citekey = inline.text:match("^@(.+)$")
			table.insert(newInlines, replaceWithCitation(inline, citekey))
        else
            table.insert(newInlines, inline)
        end
    end
    return newInlines
end

function Block(block)
    if block.t == "Para" then
        return pandoc.Para(Inlines(block.content))
    else
        return block
    end
end

return {
    {
		Inlines = Inlines,
		Block = Block,
    }
}

