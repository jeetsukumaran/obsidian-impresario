-- drawio2svg.lua
-- Pandoc Lua filter to convert embedded Draw.io diagrams to SVG
-- Requires: draw.io CLI (drawio) to be installed and accessible in PATH

-- Get the current working directory at filter startup
local initial_dir = pandoc.system.get_working_directory()

function Image(img)
    -- Check if this is a drawio image
    if img.src:match("%.drawio$") then
        -- Get absolute path for the input file
        local input_file = img.src
        if not input_file:match("^/") then
            -- If relative path, make it absolute using the resource path
            input_file = pandoc.path.join({initial_dir, input_file})
        end

        -- Use Pandoc's temporary directory for output
        return pandoc.system.with_temporary_directory("drawio", function()
            -- Create output filename in the temp directory
            -- local temp_svg = pandoc.path.join({pandoc.system.get_working_directory(),
            --                                  pandoc.path.filename(img.src):gsub("%.drawio$", ".svg")})
            local temp_svg = pandoc.path.join({
                pandoc.system.get_working_directory(),
                pandoc.path.filename(img.src):gsub("%.drawio$", "") .. ".svg"
            })

            -- Construct the draw.io CLI command
            local cmd = string.format(
                'drawio --export --format svg --output "%s" "%s"',
                temp_svg,
                input_file
            )

            io.stderr:write(string.format("Executing:\n\n%s\n\n", cmd))
            io.stderr:write(string.format("Source: %s\n", input_file))
            io.stderr:write(string.format("Output: %s\n", temp_svg))

            -- Execute the conversion
            local success = os.execute(cmd)

            if success then
                -- Read the generated SVG
                local svg_file = io.open(temp_svg, "r")
                if svg_file then
                    svg_file:close()  -- We don't need to read the content, just verify it exists

                    -- Update the image source
                    img.src = temp_svg

                    -- Special handling for LaTeX
                    if FORMAT:match("latex") then
                        -- Add includegraphics attribute for SVG in LaTeX
                        img.attributes["includegraphics"] = "true"
                    end

                    return img
                else
                    io.stderr:write(string.format("Warning: Could not read generated SVG file: %s\n", temp_svg))
                end
            else
                io.stderr:write(string.format("Warning: Failed to convert Draw.io file: %s\n", input_file))
            end

            -- Return unchanged image if conversion failed
            return img
        end)
    end

    -- Return unchanged image if not a drawio file
    return img
end

-- Function to verify paths exist
function verify_path(path)
    local file = io.open(path, "r")
    if file then
        file:close()
        return true
    end
    return false
end

-- Test if draw.io is available and working directory is accessible
function Meta(meta)
    -- Check drawio installation
    local handle = io.popen("which drawio")
    local result = handle:read("*a")
    handle:close()

    if result == "" then
        io.stderr:write([[
Warning: draw.io CLI not found in PATH.
Please install draw.io CLI to use this filter.
Installation instructions:
- Linux: sudo snap install drawio
- macOS: brew install drawio
- Windows: Install Draw.io Desktop and ensure it's in PATH
]])
    end

    -- Add working directory info to metadata
    meta.drawio_working_dir = initial_dir

    return meta
end
