#!/bin/bash
mkdir -p icons
if command -v convert &>/dev/null; then
    convert -size 48x48 xc:none -fill "#6B46C1" -draw "circle 24,24 24,5" -fill white -draw "font-size 24 text 16,32 'C'" icons/icon-48.png
    convert -size 96x96 xc:none -fill "#6B46C1" -draw "circle 48,48 48,10" -fill white -draw "font-size 48 text 32,64 'C'" icons/icon-96.png
    echo "Icons created successfully!"
else
    echo "ImageMagick not found. Please create icons manually."
    echo "You need icons in sizes: 48x48 and 96x96."
    echo "Save them in the 'icons' directory as icon-48.png and icon-96.png."
fi
