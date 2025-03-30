#!/bin/bash

# This script creates placeholder SVG icons for the ChatGPT Navigator extension
# You can replace these with your own custom icons later

cat > icon16.svg << EOF
<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
  <rect width="16" height="16" fill="#10a37f" rx="2" />
  <path d="M3 4h10M3 8h10M3 12h6" stroke="white" stroke-width="2" stroke-linecap="round" />
</svg>
EOF

cat > icon48.svg << EOF
<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" fill="#10a37f" rx="6" />
  <path d="M9 12h30M9 24h30M9 36h18" stroke="white" stroke-width="4" stroke-linecap="round" />
</svg>
EOF

cat > icon128.svg << EOF
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="#10a37f" rx="16" />
  <path d="M24 32h80M24 64h80M24 96h48" stroke="white" stroke-width="8" stroke-linecap="round" />
</svg>
EOF

# Optional: If you have imagemagick installed, convert SVG to PNG
# Comment out or remove this section if you don't have imagemagick
if command -v convert >/dev/null 2>&1; then
  echo "Converting SVGs to PNGs..."
  convert -background none icon16.svg icon16.png
  convert -background none icon48.svg icon48.png
  convert -background none icon128.svg icon128.png
  echo "PNG icons created!"
else
  echo "ImageMagick not found. SVG icons created but not converted to PNG."
  echo "Please manually convert the SVG files to PNG or install ImageMagick and run this script again."
fi 