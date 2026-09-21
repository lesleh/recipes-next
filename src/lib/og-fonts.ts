/**
 * `ImageResponse` needs a font file, not a font family name, and only reads
 * ttf, otf or woff. Google's own CSS endpoint hands back exactly that when
 * the request has no browser `Accept` header, which `fetch` from Node never
 * sends. The `text` param also trims the file to the glyphs actually drawn.
 */
async function loadGoogleFont(family: string, weight: number, text: string) {
  const params = new URLSearchParams({ family: `${family}:wght@${weight}`, text });
  const css = await fetch(`https://fonts.googleapis.com/css2?${params}`).then((res) => res.text());
  const match = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);

  if (!match) throw new Error(`No font data found for ${family}`);

  return fetch(match[1]).then((res) => res.arrayBuffer());
}

/** Archivo, the site's display face, at the weight the headings use. */
export function loadDisplayFont(text: string) {
  return loadGoogleFont("Archivo", 700, text);
}

/** Atkinson Hyperlegible, the site's body face, at its regular weight. */
export function loadBodyFont(text: string) {
  return loadGoogleFont("Atkinson Hyperlegible", 400, text);
}
