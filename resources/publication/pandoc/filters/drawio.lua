-- drawio2svg.lua
-- Pandoc Lua filter to convert embedded Draw.io diagrams to SVG
-- Requires: draw.io CLI (drawio) to be installed and accessible in PATH

local function get_temp_svg_path(input_filename)
    local temp_dir = os.getenv("TMPDIR") or "/tmp"
    -- Generate unique temp filename while preserving original name for debugging
    local base_name = input_filename:gsub("%.drawio$", "")
    return temp_dir .. "/drawio_" .. os.tmpname():match("[^/]+$") .. "_" .. base_name .. ".svg"
end

function file_exists(path)
    local f = io.open(path, "r")
    if f then f:close() return true end
    return false
end


function resolve_pandoc_resource(rel_path)
    -- Function to check if a file exists
    -- Get resource paths from Pandoc's options
    -- local resource_paths = pandoc.system.get_option("resource-path") or {}
    local resource_paths = PANDOC_STATE.resource_path

    -- Ensure resource_paths is a table (convert from string if necessary)
    if type(resource_paths) == "string" then
        resource_paths = { resource_paths }
    end
    -- print("\n\n***\n\n")
    -- print(resource_paths)
    -- print("\n\n***\n\n")

    -- Search for the file in the current working directory and resource paths
    local search_dirs = { ".", table.unpack(resource_paths) }
    for _, dir in ipairs(search_dirs) do
        local candidate_path = dir .. "/" .. rel_path
        if file_exists(candidate_path) then
            return candidate_path
        end
    end

    -- If no valid file is found, return nil
    return nil
end

function Image(img)
    -- Check if this is a drawio image
    if img.src:match("%.drawio$") then
        -- Get absolute path to input file, keeping vault directory structure
        local input_file = img.src
        if not input_file:match("^/") then
            -- If relative path,
            -- search through the following directories as parent directories for the path, in order, until an existing file is found and then return then absolute path;
            -- if any of the directories do not exist or if the directory + img.src do not exist, ignore
            -- If NO existing file is is found anywhere ignore/leave path as is (show hwo to return an error string to be used in the out eg,. "not found: path")
            -- The first existing file found: this is the full input file
            -- DIrectories:
            -- - (current working directory)
            -- - each of pandoc's --resource-path or -resource-path arguments
            input_file = resolve_pandoc_resource(input_file)

        end

        -- Create temporary SVG path outside the vault
        local temp_svg = get_temp_svg_path(pandoc.path.filename(input_file))

        -- Construct the draw.io CLI command
        local cmd = string.format(
            'drawio --export --format svg --output "%s" "%s"',
            temp_svg,
            input_file
        )

        io.stderr:write(string.format("Working directory: %s\n", pandoc.system.get_working_directory()))
        io.stderr:write(string.format("Executing:\n\n%s\n\n", cmd))
        -- io.stderr:write(string.format("Converting: %s\n", img.src))

        -- Execute the conversion
        local success = os.execute(cmd)

        if success then
            -- Read the generated SVG
            if file_exists(temp_svg) then
                io.stderr:write(string.format("Output SVG file found: %s\n", temp_svg))
            else
                io.stderr:write(string.format("Warning: Output SVG file not found: %s\n", temp_svg))
            end

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
