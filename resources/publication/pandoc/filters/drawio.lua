-- Pandoc Lua filter to convert embedded Draw.io diagrams to SVG
-- Requires: draw.io CLI (drawio) to be installed and accessible in PATH
--
--

local function parse_output_format(elem)
    local captionStr = pandoc.utils.stringify(elem.caption)
    local parts = {}
    for part in string.gmatch(captionStr, "[^|]+") do
        table.insert(parts, string.match(part, "^%s*(.-)%s*$")) -- Trim whitespace
    end
    return "png"
    -- local output_format = nil
    -- if #parts > 0 then
    --     width, height = parts[#parts]:match("^(%d+)%s*x?%s*(%d*)$")
    --     if width then
    --         table.remove(parts, #parts)
    --     end
    -- end

    -- local width, height = nil, nil
    -- if #parts > 0 then
    --     width, height = parts[#parts]:match("^(%d+)%s*x?%s*(%d*)$")
    --     if width then
    --         table.remove(parts, #parts)
    --     end
    -- end
    -- if width then
    --     elem.attributes.width = width .. "px"
    --     if height and height ~= "" then
    --         elem.attributes.height = height .. "px"
    --     end
    -- end
end

local function get_rendered_image_path(input_filename, output_format)
    local temp_dir = os.getenv("TMPDIR") or "/tmp"
    -- Generate unique temp filename while preserving original name for debugging
    local base_name = input_filename:gsub("%.drawio$", "")
    return temp_dir .. "/drawio_" .. os.tmpname():match("[^/]+$") .. "_" .. base_name .. "." .. output_format
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
        local output_format = parse_output_format(img)
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
        local rendered_image = get_rendered_image_path(pandoc.path.filename(input_file), output_format)

        -- Construct the draw.io CLI command
        local cmd = string.format(
            'drawio --export --format %s --output "%s" "%s"',
            output_format,
            rendered_image,
            input_file
        )

        io.stderr:write(string.format("Working directory: %s\n", pandoc.system.get_working_directory()))
        io.stderr:write(string.format("Executing:\n\n%s\n\n", cmd))
        -- io.stderr:write(string.format("Converting: %s\n", img.src))

        -- Execute the conversion
        local success = os.execute(cmd)

        if success then
            if not file_exists(rendered_image) then
                io.stderr:write(string.format("Warning: Rendered file not found: %s\n", rendered_image))
            else
                io.stderr:write(string.format("Rendered file found: %s\n", rendered_image))

                -- Update the image source
                img.src = rendered_image

                -- Special handling for LaTeX
                if FORMAT:match("latex") then
                    -- Add includegraphics attribute for SVG in LaTeX
                    img.attributes["includegraphics"] = "true"
                end

                return img
            -- else
            --     io.stderr:write(string.format("Warning: Could not read generated SVG file: %s\n", rendered_image))
            end
        else
            io.stderr:write(string.format("Warning: Failed to convert Draw.io file: %s\n", input_file))
        end
    end

    -- Return unchanged image if not a drawio file or if conversion failed
    return img
end
