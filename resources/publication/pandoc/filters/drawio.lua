function Image(img)
    -- Check if this is a drawio image
    if img.src:match("%.drawio$") then
        -- Create temporary file paths using a more reliable method
        local temp_dir = os.getenv("TMPDIR") or "/tmp"
        local temp_name = string.format("%s/drawio_%d.svg",
            temp_dir,
            os.time()
        )

        -- Construct the draw.io CLI command
        local cmd = string.format(
            'drawio --export --format svg --output "%s" "%s"',
            temp_name,
            img.src
        )

        -- Log the conversion attempt
        io.stderr:write(string.format("Converting: %s -> %s\n", img.src, temp_name))

        -- Execute the conversion
        local success = os.execute(cmd)

        if success then
            -- Read the generated SVG
            local svg_file = io.open(temp_name, "r")
            if svg_file then
                local svg_content = svg_file:read("*all")
                svg_file:close()
                os.remove(temp_name)

                -- Update the image attributes
                img.src = temp_name
                img.mime_type = "image/svg+xml"

                return img
            else
                io.stderr:write(string.format("Error: Could not read SVG file: %s\n", temp_name))
            end
        else
            io.stderr:write(string.format("Error: Failed to convert Draw.io file: %s\n", img.src))
        end

        -- Cleanup on failure
        os.remove(temp_name)
    end

    -- Return unchanged image if not a drawio file or if conversion failed
    return img
end
