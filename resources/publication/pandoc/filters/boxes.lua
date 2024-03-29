function Div(element)
-- function based on https://tex.stackexchange.com/a/526036
    if
        element.classes[1] == "note"
        or element.classes[1] == "side-note"
        or element.classes[1] == "warning"
        or element.classes[1] == "info"
        or element.classes[1] == "reading"
        or element.classes[1] == "exercise"
        or element.classes[1] == "center"
        or element.classes[1] == "highlight"
        or element.classes[1] == "tiny"
        or element.classes[1] == "scriptsize"
        or element.classes[1] == "footnotesize"
        or element.classes[1] == "small"
        or element.classes[1] == "normalsize"
        or element.classes[1] == "large"
        or element.classes[1] == "Large"
        or element.classes[1] == "LARGE"
        or element.classes[1] == "huge"
        or element.classes[1] == "Huge"
    then

        -- get latex environment name from class name
        div = element.classes[1]
        -- div = element.classes[1]:gsub("-", " ")
        -- div = div:gsub("(%l)(%w*)", function(a, b) return string.upper(a)..b end)
        -- div = "Div"..div:gsub(" ", "")
        div = div:gsub(" ", "")

        -- insert element in front
        table.insert(
            element.content, 1,
            pandoc.RawBlock("latex", "\\begin{"..div.."}"))

        -- insert element at the back
        table.insert(
            element.content,
            pandoc.RawBlock("latex", "\\end{"..div.."}"))

    end
    return element
end

return {
    {Div = Div}
}
