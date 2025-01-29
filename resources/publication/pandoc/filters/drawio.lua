-- drawio2svg.lua
-- Pandoc Lua filter to convert embedded Draw.io diagrams to SVG
-- Requires: draw.io CLI (drawio) to be installed and accessible in PATH

local function get_temp_svg_path(input_filename)
    local temp_dir = os.getenv("TMPDIR") or "/tmp"
    -- Generate unique temp filename while preserving original name for debugging
    local base_name = input_filename:gsub("%.drawio$", "")
    return temp_dir .. "/drawio_" .. os.tmpname():match("[^/]+$") .. "_" .. base_name .. ".svg"
end

function Image(img)
    -- Check if this is a drawio image
    if img.src:match("%.drawio$") then
        -- Get absolute path to input file, keeping vault directory structure
        local input_file = img.src
        -- if not input_file:match("^/") then
        --     -- If relative path, make it absolute using current directory
        --     input_file = pandoc.path.join({pandoc.system.get_working_directory(), input_file})
        -- end

        -- Create temporary SVG path outside the vault
        local temp_svg = get_temp_svg_path(pandoc.path.filename(input_file))

        -- Construct the draw.io CLI command
        local cmd = string.format(
            'drawio --export --format svg --output "%s" "%s"',
            temp_svg,
            input_file
        )

        io.stderr:write(string.format("Executing:\n\n%s\n\n", cmd))
        -- io.stderr:write(string.format("Converting: %s\n", img.src))

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

                -- Clean up the temporary file when done
                os.execute(string.format('rm -f "%s" > /dev/null 2>&1', temp_svg))

                return img
            else
                io.stderr:write(string.format("Warning: Could not read generated SVG file: %s\n", temp_svg))
            end
        else
            io.stderr:write(string.format("Warning: Failed to convert Draw.io file: %s\n", input_file))
        end
    end

    -- Return unchanged image if not a drawio file or if conversion failed
    return img
end
