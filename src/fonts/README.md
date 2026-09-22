# Display font

`archivo-wdth-88.woff2` is Archivo, cut down to what this site uses.

Google Fonts serves Archivo's width axis all or nothing. Asking for the
axis costs 90 KB, and the file is preloaded, so it competes with the
recipe photo for bandwidth. Only one width is ever used, so the width is
pinned in the file instead and the download drops to 42 KB.

What the file holds:

- width pinned at 88%, matching `font-stretch: 88%` in `globals.css`
- weight variable from 600 to 700, the only two weights the site sets
- the latin, latin extended and vietnamese character ranges, which is
  everything the three Google files covered between them

A heading set below 600 clamps to 600. Widen the range below and rebuild
if the design ever needs a lighter heading.

## Rebuilding

Needs Python. Archivo is under the SIL Open Font License, a copy of
which is in `archivo-OFL.txt`.

1. Install the tools: `pip install "fonttools[woff]"`.
2. Download the source: `curl -Lo 'Archivo.ttf' 'https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/Archivo%5Bwdth%2Cwght%5D.ttf'`.
3. Pin the width and narrow the weight: `fonttools varLib.instancer Archivo.ttf wdth=88 wght=600:700 -o instance.ttf`.
4. Subset and compress, with the ranges listed in `ranges.txt`: `fonttools subset instance.ttf "--unicodes=$(cat ranges.txt)" --layout-features='*' --flavor=woff2 --output-file=archivo-wdth-88.woff2`.

Keep `--layout-features='*'`. Dropping it loses `tnum`, which the
ingredient amounts and step numbers rely on for aligned figures.
