function Image(img)
    -- Check if this is a drawio image
    if img.src:match("%.drawio$") then
        -- Create temporary file paths
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
            -- Create new image with SVG attributes
            return pandoc.Image(
                img.caption,
                temp_name,
                img.title,
                img.attr
            )
        else
            io.stderr:write(string.format("Error: Failed to convert Draw.io file: %s\n", img.src))
        end

        -- Cleanup on failure
        os.remove(temp_name)
    end

    -- Return unchanged image if not a drawio file or if conversion failed
    return img
end
