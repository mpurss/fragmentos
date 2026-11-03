#!/bin/sh
# Une las partes en un único archivo index.html
cd "$(dirname "$0")"
mkdir -p dist  # (index.html final = dist/index.html)
cat src/00_head.html src/01_core.js src/02_audio.js src/03_input.js src/04_common.js src/05_intro.js src/06_ocean.js src/07_museum.js src/08_house.js src/09_final.js src/10_main.js src/99_tail.html > dist/index.html
wc -c dist/index.html
